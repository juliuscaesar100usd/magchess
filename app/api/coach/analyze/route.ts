import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Chess } from 'chess.js';
import type { CoachLevel, MoveCritique, KeyMoment } from '@/types/coach';
import Stockfish from 'stockfish';

export const runtime = 'nodejs';

type StockfishEngine = {
  postMessage: (msg: string) => void;
  onmessage: (line: string) => void;
};

function createEngine(): StockfishEngine {
  return Stockfish() as StockfishEngine;
}

async function analyzePosition(fen: string, depth = 14): Promise<number> {
  return new Promise((resolve) => {
    try {
      const engine = createEngine();
      let lastCp = 0;
      engine.onmessage = (line: string) => {
        if (line.includes('score cp')) {
          const m = line.match(/score cp (-?\d+)/);
          if (m) lastCp = parseInt(m[1], 10);
        } else if (line.includes('score mate')) {
          const m = line.match(/score mate (-?\d+)/);
          if (m) lastCp = parseInt(m[1], 10) > 0 ? 30000 : -30000;
        }
        if (line.startsWith('bestmove')) {
          const isBlack = fen.split(' ')[1] === 'b';
          engine.postMessage('quit');
          resolve(isBlack ? -lastCp : lastCp);
        }
      };
      engine.postMessage('uci');
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(`go depth ${depth}`);
    } catch {
      resolve(0);
    }
  });
}

async function getBestMoveSan(fen: string, depth = 12): Promise<string> {
  return new Promise((resolve) => {
    try {
      const engine = createEngine();
      engine.onmessage = (line: string) => {
        if (line.startsWith('bestmove')) {
          engine.postMessage('quit');
          const uci = line.split(' ')[1] ?? '';
          const tempChess = new Chess(fen);
          const from = uci.slice(0, 2);
          const to = uci.slice(2, 4);
          const promotion = uci[4];
          try {
            const result = tempChess.move({ from, to, promotion: promotion || undefined });
            resolve(result?.san ?? uci);
          } catch {
            resolve(uci);
          }
        }
      };
      engine.postMessage('uci');
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(`go depth ${depth}`);
    } catch {
      resolve('');
    }
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, level = 'beginner' } = await req.json() as { gameId: string; level?: CoachLevel };

  // Check for cached analysis
  const { data: cached } = await supabase
    .from('ai_coach_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .single();

  if (cached) return NextResponse.json(cached);

  // Check one-free rule
  const { count: freeCount } = await supabase
    .from('ai_coach_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('was_free', true);

  const { data: coachPurchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('item', 'ai_coach')
    .single();

  const hasUsedFree = (freeCount ?? 0) > 0;
  const hasPurchased = !!coachPurchase;

  if (hasUsedFree && !hasPurchased) {
    return NextResponse.json({ error: 'COACH_REQUIRES_PURCHASE', coinsRequired: 500 }, { status: 402 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('pgn')
    .eq('id', gameId)
    .single();

  if (!game?.pgn) return NextResponse.json({ error: 'Game not found or no PGN' }, { status: 404 });

  const chess = new Chess();
  chess.loadPgn(game.pgn);
  const history = chess.history({ verbose: true });

  const tempChess = new Chess();
  const blunders: MoveCritique[] = [];
  const mistakes: MoveCritique[] = [];
  const keyMoments: KeyMoment[] = [];

  let totalWhiteAccuracy = 0;
  let totalBlackAccuracy = 0;
  let whiteMovesCount = 0;
  let blackMovesCount = 0;

  for (let i = 0; i < Math.min(history.length, 60); i++) {
    const move = history[i];
    const fenBefore = tempChess.fen();
    const evalBefore = await analyzePosition(fenBefore, 14);

    tempChess.move(move.san);
    const fenAfter = tempChess.fen();
    const evalAfter = await analyzePosition(fenAfter, 14);

    const isWhiteMove = move.color === 'w';
    const evalFromMover = isWhiteMove ? evalBefore : -evalBefore;
    const evalAfterFromMover = isWhiteMove ? evalAfter : -evalAfter;
    const drop = evalFromMover - evalAfterFromMover;

    const accuracy = Math.max(0, 100 - Math.min(100, drop / 5));
    if (isWhiteMove) { totalWhiteAccuracy += accuracy; whiteMovesCount++; }
    else { totalBlackAccuracy += accuracy; blackMovesCount++; }

    if (drop >= 200) {
      const suggestedSan = await getBestMoveSan(fenBefore, 12);
      const critique: MoveCritique = {
        move_number: Math.ceil((i + 1) / 2),
        san: move.san,
        fen_before: fenBefore,
        fen_after: fenAfter,
        eval_before: evalBefore,
        eval_after: evalAfter,
        eval_drop: drop,
        quality: 'blunder',
        suggested_san: suggestedSan,
        explanation_beginner: `${move.color === 'w' ? 'White' : 'Black'} played ${move.san}, which is a serious error. The evaluation dropped by ${(drop / 100).toFixed(1)} pawns. Consider ${suggestedSan} instead.`,
        explanation_advanced: `${move.san} causes a centipawn loss of ${drop}. The engine prefers ${suggestedSan} (eval before: ${(evalBefore / 100).toFixed(2)}, after: ${(evalAfter / 100).toFixed(2)}).`,
      };
      blunders.push(critique);
    } else if (drop >= 100) {
      const critique: MoveCritique = {
        move_number: Math.ceil((i + 1) / 2),
        san: move.san,
        fen_before: fenBefore,
        fen_after: fenAfter,
        eval_before: evalBefore,
        eval_after: evalAfter,
        eval_drop: drop,
        quality: 'mistake',
        suggested_san: '',
        explanation_beginner: `${move.san} is a mistake — there was a better option. Eval dropped by ${(drop / 100).toFixed(1)} pawns.`,
        explanation_advanced: `${move.san} causes ${drop} centipawn loss. Eval: ${(evalBefore / 100).toFixed(2)} → ${(evalAfter / 100).toFixed(2)}.`,
      };
      mistakes.push(critique);
    }

    if (Math.abs(drop) >= 150 && keyMoments.length < 5) {
      keyMoments.push({
        move_number: Math.ceil((i + 1) / 2),
        san: move.san,
        description: drop >= 150 ? 'Critical error changed the game' : 'Strong move that shifted the advantage',
        eval: evalAfter,
      });
    }
  }

  const accuracyWhite = whiteMovesCount > 0 ? totalWhiteAccuracy / whiteMovesCount : 100;
  const accuracyBlack = blackMovesCount > 0 ? totalBlackAccuracy / blackMovesCount : 100;

  const analysis = {
    user_id: user.id,
    game_id: gameId,
    pgn: game.pgn,
    blunders,
    mistakes,
    key_moments: keyMoments,
    accuracy_white: Math.round(accuracyWhite * 100) / 100,
    accuracy_black: Math.round(accuracyBlack * 100) / 100,
    level,
    was_free: !hasUsedFree,
  };

  const { data: saved, error } = await supabase
    .from('ai_coach_analyses')
    .insert(analysis)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(saved);
}
