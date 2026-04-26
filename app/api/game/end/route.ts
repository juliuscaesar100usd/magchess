import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateNewRating } from '@/lib/chess/elo';
import type { GameResult } from '@/types/game';

const STREAK_BADGES: [number, string, string][] = [
  [1, 'newbie', 'Newbie'],
  [3, 'not_bad', 'Not Bad'],
  [5, 'pretty_good', 'Pretty Good'],
  [10, 'strong_enough', 'Strong Enough'],
  [30, 'sigma', 'Sigma'],
  [50, 'are_you_cheater', 'Are You a Cheater?'],
];

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, result, pgn } = await req.json() as {
    gameId: string;
    result: GameResult;
    pgn: string;
  };

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.result) return NextResponse.json({ message: 'Game already ended' });

  // Update game record
  await supabase.from('games').update({ result, pgn, ended_at: new Date().toISOString() }).eq('id', gameId);

  const isAI = !game.black_player_id;
  const whiteId: string = game.white_player_id;
  const blackId: string | null = game.black_player_id;

  // Fetch white player
  const { data: whiteProfile } = await supabase.from('profiles').select('id, rating, coins, city, country').eq('id', whiteId).single();
  if (!whiteProfile) return NextResponse.json({ error: 'White player not found' }, { status: 404 });

  const whiteBefore = game.white_rating_before ?? whiteProfile.rating;
  const blackBefore = game.black_rating_before ?? (isAI ? game.ai_level : 1400);

  const { count: whiteGamesPlayed } = await supabase
    .from('rating_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', whiteId);

  const whiteScore = result === 'white_wins' ? 1 : result === 'draw' ? 0.5 : 0;
  const newWhiteRating = calculateNewRating(whiteBefore, blackBefore, whiteScore, whiteGamesPlayed ?? 0);

  // Update white rating
  await supabase.from('profiles').update({ rating: newWhiteRating, updated_at: new Date().toISOString() }).eq('id', whiteId);
  await supabase.from('rating_history').insert({
    user_id: whiteId,
    game_id: gameId,
    rating_before: whiteBefore,
    rating_after: newWhiteRating,
    delta: newWhiteRating - whiteBefore,
  });

  // Update black rating if PvP
  if (!isAI && blackId) {
    const { data: blackProfile } = await supabase.from('profiles').select('id, rating, coins').eq('id', blackId).single();
    if (blackProfile) {
      const { count: blackGamesPlayed } = await supabase
        .from('rating_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', blackId);

      const blackScore = result === 'black_wins' ? 1 : result === 'draw' ? 0.5 : 0;
      const newBlackRating = calculateNewRating(blackBefore, whiteBefore, blackScore, blackGamesPlayed ?? 0);

      await supabase.from('profiles').update({ rating: newBlackRating, updated_at: new Date().toISOString() }).eq('id', blackId);
      await supabase.from('rating_history').insert({
        user_id: blackId,
        game_id: gameId,
        rating_before: blackBefore,
        rating_after: newBlackRating,
        delta: newBlackRating - blackBefore,
      });

      // Update game with final ratings
      await supabase.from('games').update({ white_rating_after: newWhiteRating, black_rating_after: newBlackRating }).eq('id', gameId);

      // Handle stake for PvP
      if (game.stake_amount > 0) {
        const poolWinner = result === 'white_wins' ? whiteId : result === 'black_wins' ? blackId : null;
        const totalPool = game.stake_amount * 2;
        const fee = Math.floor(totalPool * 0.1);
        const payout = totalPool - fee;

        if (poolWinner) {
          await supabase.rpc('add_coins', { p_user_id: poolWinner, p_amount: payout });
          const { data: winnerProfile } = await supabase.from('profiles').select('coins').eq('id', poolWinner).single();
          await supabase.from('coin_transactions').insert({
            user_id: poolWinner, game_id: gameId, type: 'stake_win', amount: payout, balance_after: winnerProfile?.coins ?? 0,
          });

          const loser = poolWinner === whiteId ? blackId : whiteId;
          const { data: loserProfile } = await supabase.from('profiles').select('coins').eq('id', loser).single();
          await supabase.from('coin_transactions').insert({
            user_id: loser, game_id: gameId, type: 'stake_loss', amount: 0, balance_after: loserProfile?.coins ?? 0,
          });
        } else {
          // Draw: refund both minus fee
          const refund = game.stake_amount - Math.floor(fee / 2);
          for (const pid of [whiteId, blackId]) {
            if (!pid) continue;
            await supabase.rpc('add_coins', { p_user_id: pid, p_amount: refund });
            const { data: p } = await supabase.from('profiles').select('coins').eq('id', pid).single();
            await supabase.from('coin_transactions').insert({
              user_id: pid, game_id: gameId, type: 'stake_win', amount: refund, balance_after: p?.coins ?? 0,
            });
          }
        }
      }

      // Handle streaks for black player
      const blackWon = result === 'black_wins';
      await updateStreak(supabase, blackId, blackWon);
    }
  } else {
    await supabase.from('games').update({ white_rating_after: newWhiteRating }).eq('id', gameId);
  }

  // Handle streaks for white player (if AI game or current user is white)
  const whiteWon = result === 'white_wins';
  const streakResult = await updateStreak(supabase, whiteId, whiteWon);

  // City badge check
  await checkCityBadge(supabase, whiteId, whiteProfile.city as string, whiteProfile.country as string);

  // Response for the requesting user
  const isWhitePlayer = user.id === whiteId;
  const userWon = (isWhitePlayer && result === 'white_wins') || (!isWhitePlayer && result === 'black_wins');
  const streakAtRisk = !userWon && result !== 'draw' ? (isWhitePlayer ? streakResult.prevStreak : 0) : 0;

  return NextResponse.json({
    result,
    newRating: isWhitePlayer ? newWhiteRating : undefined,
    ratingDelta: isWhitePlayer ? newWhiteRating - whiteBefore : undefined,
    streakAtRisk,
  });
}

async function updateStreak(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  won: boolean
) {
  const { data: streak } = await supabase
    .from('streaks')
    .select('current_streak, best_streak')
    .eq('user_id', userId)
    .single();

  const prevStreak = streak?.current_streak ?? 0;

  if (won) {
    const newStreak = prevStreak + 1;
    const newBest = Math.max(newStreak, streak?.best_streak ?? 0);
    await supabase.from('streaks').update({
      current_streak: newStreak,
      best_streak: newBest,
      last_game_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    // Award streak badges
    for (const [threshold, key, label] of STREAK_BADGES) {
      if (newStreak >= threshold) {
        await supabase.from('badges').upsert({ user_id: userId, badge_key: key, badge_label: label }, { onConflict: 'user_id,badge_key', ignoreDuplicates: true });
      }
    }

    // Coin reward for milestones
    const milestoneCoins: Record<number, number> = { 5: 10, 10: 25, 30: 50, 50: 100 };
    if (milestoneCoins[newStreak]) {
      await supabase.rpc('add_coins', { p_user_id: userId, p_amount: milestoneCoins[newStreak] });
    }
  }
  // Note: streak reset happens via /api/game/save-streak or /api/game/end-streak

  return { prevStreak };
}

async function checkCityBadge(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  city: string,
  country: string
) {
  if (!city) return;
  const { data: topPlayer } = await supabase
    .from('profiles')
    .select('id')
    .eq('city', city)
    .eq('country', country)
    .order('rating', { ascending: false })
    .limit(1)
    .single();

  if (topPlayer?.id === userId) {
    await supabase.from('badges').upsert(
      { user_id: userId, badge_key: `top1_${city.toLowerCase().replace(/\s+/g, '_')}`, badge_label: `Top 1 in ${city}` },
      { onConflict: 'user_id,badge_key', ignoreDuplicates: true }
    );
  }
}
