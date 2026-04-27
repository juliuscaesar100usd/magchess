import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { GameMode, GameType } from '@/types/game';

export async function POST(req: NextRequest) {
  // SSR client (user cookies) for auth only — it sends the user JWT, not the service role key.
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin client sends the service role key as the bearer → bypasses RLS for all DB ops.
  const db = createAdminClient();

  const body = await req.json() as {
    type: GameType;
    mode: GameMode;
    aiLevel?: number;
    stakeAmount?: number;
  };

  const { type, mode, aiLevel, stakeAmount = 0 } = body;

  const { data: profile } = await db
    .from('profiles')
    .select('id, rating, coins')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (type === 'pvp' && stakeAmount > 0 && profile.coins < stakeAmount) {
    return NextResponse.json({ error: 'Insufficient coins for this stake' }, { status: 400 });
  }

  if (type === 'ai') {
    const { data: game, error } = await db
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

  // PvP — clean up any orphaned waiting games this user left behind (e.g. browser closed).
  await db
    .from('games')
    .delete()
    .eq('white_player_id', user.id)
    .is('black_player_id', null)
    .is('result', null)
    .is('ai_level', null);

  // Look for a waiting PvP game to join.
  // .maybeSingle() returns null (not an error) when no rows match.
  const { data: waitingGame } = await db
    .from('games')
    .select('id, white_player_id')
    .eq('mode', mode)
    .eq('stake_amount', stakeAmount)
    .is('black_player_id', null)
    .is('result', null)
    .is('ai_level', null)           // exclude AI games
    .neq('white_player_id', user.id)
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (waitingGame) {
    // Atomically join: only if black_player_id is still null (guards against two players
    // finding the same game simultaneously).
    const { data: joinedGame } = await db
      .from('games')
      .update({
        black_player_id: user.id,
        black_rating_before: profile.rating,
        realtime_channel: `game:${waitingGame.id}`,
      })
      .eq('id', waitingGame.id)
      .is('black_player_id', null)  // atomic guard
      .select('id')
      .maybeSingle();

    if (joinedGame) {
      if (stakeAmount > 0) {
        await Promise.all([
          db.rpc('deduct_coins', { p_user_id: user.id, p_amount: stakeAmount }),
          db.rpc('deduct_coins', { p_user_id: waitingGame.white_player_id, p_amount: stakeAmount }),
        ]);
        const [{ data: wp }, { data: bp }] = await Promise.all([
          db.from('profiles').select('coins').eq('id', waitingGame.white_player_id).single(),
          db.from('profiles').select('coins').eq('id', user.id).single(),
        ]);
        await db.from('coin_transactions').insert([
          { user_id: waitingGame.white_player_id, game_id: joinedGame.id, type: 'stake_reserve', amount: -stakeAmount, balance_after: wp?.coins ?? 0 },
          { user_id: user.id, game_id: joinedGame.id, type: 'stake_reserve', amount: -stakeAmount, balance_after: bp?.coins ?? 0 },
        ]);
      }
      return NextResponse.json({ gameId: joinedGame.id, color: 'black' });
    }
    // Another player joined first — fall through to create a new waiting game.
  }

  // Create a new waiting game as white.
  const { data: newGame, error } = await db
    .from('games')
    .insert({
      white_player_id: user.id,
      black_player_id: null,
      mode,
      stake_amount: stakeAmount,
      white_rating_before: profile.rating,
      realtime_channel: null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Poll until an opponent joins (max 30 s).
  const pollStart = Date.now();
  while (Date.now() - pollStart < 30_000) {
    await new Promise((r) => setTimeout(r, 1000));
    const { data: updated } = await db
      .from('games')
      .select('id, black_player_id')
      .eq('id', newGame.id)
      .maybeSingle();

    if (updated?.black_player_id) {
      if (stakeAmount > 0) {
        await db.rpc('deduct_coins', { p_user_id: user.id, p_amount: stakeAmount });
        const { data: wp } = await db.from('profiles').select('coins').eq('id', user.id).single();
        await db.from('coin_transactions').insert({
          user_id: user.id, game_id: newGame.id, type: 'stake_reserve',
          amount: -stakeAmount, balance_after: wp?.coins ?? 0,
        });
      }
      return NextResponse.json({ gameId: newGame.id, color: 'white' });
    }
  }

  // No opponent joined — clean up and report.
  await db.from('games').delete().eq('id', newGame.id);
  return NextResponse.json({ error: 'No opponent found. Try again.' }, { status: 408 });
}
