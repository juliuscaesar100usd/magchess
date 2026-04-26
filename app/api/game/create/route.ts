import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { GameMode, GameType } from '@/types/game';

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    type: GameType;
    mode: GameMode;
    aiLevel?: number;
    stakeAmount?: number;
  };

  const { type, mode, aiLevel, stakeAmount = 0 } = body;

  // Fetch player profile for rating
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rating, coins')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // For PvP with stake, check coins
  if (type === 'pvp' && stakeAmount > 0) {
    if (profile.coins < stakeAmount) {
      return NextResponse.json({ error: 'Insufficient coins for this stake' }, { status: 400 });
    }
  }

  if (type === 'ai') {
    // Create AI game immediately
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        white_player_id: user.id,
        black_player_id: null,
        ai_level: aiLevel ?? 1400,
        mode,
        stake_amount: 0,
        white_rating_before: profile.rating,
        black_rating_before: aiLevel ?? 1400,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ gameId: game.id });
  }

  // PvP: look for a waiting game or create one
  const { data: waitingGame } = await supabase
    .from('games')
    .select('id, white_player_id')
    .eq('mode', mode)
    .eq('stake_amount', stakeAmount)
    .is('black_player_id', null)
    .is('result', null)
    .neq('white_player_id', user.id)
    .order('started_at', { ascending: true })
    .limit(1)
    .single();

  if (waitingGame) {
    // Join existing game as black
    const { data: game, error } = await supabase
      .from('games')
      .update({
        black_player_id: user.id,
        black_rating_before: profile.rating,
        realtime_channel: `game:${waitingGame.id}`,
      })
      .eq('id', waitingGame.id)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Reserve stake coins from both players
    if (stakeAmount > 0) {
      await supabase.rpc('deduct_coins', { p_user_id: user.id, p_amount: stakeAmount });
      await supabase.rpc('deduct_coins', { p_user_id: waitingGame.white_player_id, p_amount: stakeAmount });

      const { data: whiteProfile } = await supabase.from('profiles').select('coins').eq('id', waitingGame.white_player_id).single();
      const { data: blackProfile } = await supabase.from('profiles').select('coins').eq('id', user.id).single();

      await supabase.from('coin_transactions').insert([
        { user_id: waitingGame.white_player_id, game_id: game.id, type: 'stake_reserve', amount: -stakeAmount, balance_after: (whiteProfile?.coins ?? 0) },
        { user_id: user.id, game_id: game.id, type: 'stake_reserve', amount: -stakeAmount, balance_after: (blackProfile?.coins ?? 0) },
      ]);
    }

    return NextResponse.json({ gameId: game.id, color: 'black' });
  }

  // Create waiting game as white
  const { data: profile2 } = await supabase.from('profiles').select('rating').eq('id', user.id).single();

  const { data: newGame, error } = await supabase
    .from('games')
    .insert({
      white_player_id: user.id,
      black_player_id: null,
      mode,
      stake_amount: stakeAmount,
      white_rating_before: profile2?.rating ?? 1400,
      realtime_channel: null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Poll until an opponent joins (max 30s)
  const pollStart = Date.now();
  while (Date.now() - pollStart < 30000) {
    await new Promise((r) => setTimeout(r, 1000));
    const { data: updatedGame } = await supabase
      .from('games')
      .select('id, black_player_id')
      .eq('id', newGame.id)
      .single();

    if (updatedGame?.black_player_id) {
      // Reserve white's stake
      if (stakeAmount > 0) {
        await supabase.rpc('deduct_coins', { p_user_id: user.id, p_amount: stakeAmount });
        const { data: wp } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
        await supabase.from('coin_transactions').insert({
          user_id: user.id, game_id: newGame.id, type: 'stake_reserve', amount: -stakeAmount, balance_after: (wp?.coins ?? 0),
        });
      }
      return NextResponse.json({ gameId: newGame.id, color: 'white' });
    }
  }

  // No opponent found — clean up
  await supabase.from('games').delete().eq('id', newGame.id);
  return NextResponse.json({ error: 'No opponent found. Try again.' }, { status: 408 });
}
