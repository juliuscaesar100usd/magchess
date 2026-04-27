import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Chess } from 'chess.js';
import type { CoachLevel, MoveCritique, KeyMoment } from '@/types/coach';

export const runtime = 'nodejs';

type StockfishEngine = {
  sendCommand: (msg: string) => void;
  listener: ((line: string) => void) | null;
};

// Load engine via initEngine(), await the Promise, then complete the UCI handshake.
// NOTE: stockfish's WASM loader assigns `fetch = null` (undeclared, non-strict) in Node.js,
// which clobbers globalThis.fetch. Save and restore it so Supabase calls still work after.
async function createReadyEngine(): Promise<StockfishEngine> {
  const g = globalThis as Record<string, unknown>;
  const savedFetch = g.fetch;

  const initEngine = ((await import('stockfish')).default) as unknown as (path?: string) => Promise<StockfishEngine>;
  const engine = await initEngine('lite-single');

  if (!g.fetch) g.fetch = savedFetch;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Engine init timeout')), 15_000);
    engine.listener = (line: string) => {
      if (line === 'uciok') {
        engine.sendCommand('isready');
      } else if (line === 'readyok') {
        clearTimeout(timer);
        resolve();
      }
    };
    engine.sendCommand('uci');
  });
  return engine;
}

// Returns centipawns from WHITE's perspective.
function evalPosition(engine: StockfishEngine, fen: string, depth: number): Promise<number> {
  return new Promise((resolve) => {
    let lastCp = 0;
    engine.listener = (line: string) => {
      if (line.includes('score cp')) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) lastCp = parseInt(m[1], 10);
      } else if (line.includes('score mate')) {
        const m = line.match(/score mate (-?\d+)/);
        if (m) lastCp = parseInt(m[1], 10) > 0 ? 30_000 : -30_000;
      } else if (line.startsWith('bestmove')) {
        const isBlack = fen.split(' ')[1] === 'b';
        resolve(isBlack ? -lastCp : lastCp);
      }
    };
    engine.sendCommand(`position fen ${fen}`);
    engine.sendCommand(`go depth ${depth}`);
  });
}

// Returns the best move in SAN notation.
function getBestMoveSan(engine: StockfishEngine, fen: string, depth: number): Promise<string> {
  return new Promise((resolve) => {
    engine.listener = (line: string) => {
      if (line.startsWith('bestmove')) {
        const uci = line.split(' ')[1] ?? '';
        if (!uci || uci === '(none)') { resolve(''); return; }
        const tmp = new Chess(fen);
        try {
          const mv = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
          resolve(mv?.san ?? uci);
        } catch {
          resolve(uci);
        }
      }
    };
    engine.sendCommand(`position fen ${fen}`);
    engine.sendCommand(`go depth ${depth}`);
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, level = 'beginner' } = await req.json() as { gameId: string; level?: CoachLevel };

  // Return cached analysis if available
  const { data: cached } = await supabase
    .from('ai_coach_analyses')
    .select('*')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .single();

  if (cached) return NextResponse.json(cached);

  // One-free-use gate
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

  let engine: StockfishEngine;
  try {
    engine = await createReadyEngine();
  } catch {
    return NextResponse.json({ error: 'Engine failed to initialize' }, { status: 500 });
  }

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

  const ANALYSIS_DEPTH = 14;
  const BEST_MOVE_DEPTH = 12;
  const MAX_MOVES = 60;

  // evals[i] = centipawn eval from white's perspective at position i
  // evals[0] = starting position, evals[k] = after move k-1
  const positionEvals: number[] = [];

  let prevEval = await evalPosition(engine, tempChess.fen(), ANALYSIS_DEPTH);
  positionEvals.push(prevEval);

  for (let i = 0; i < Math.min(history.length, MAX_MOVES); i++) {
    const move = history[i];
    const fenBefore = tempChess.fen();
    const evalBefore = prevEval;

    tempChess.move(move.san);
    const fenAfter = tempChess.fen();
    const evalAfter = await evalPosition(engine, fenAfter, ANALYSIS_DEPTH);
    prevEval = evalAfter;
    positionEvals.push(evalAfter);

    const isWhiteMove = move.color === 'w';
    const evalFromMover = isWhiteMove ? evalBefore : -evalBefore;
    const evalAfterFromMover = isWhiteMove ? evalAfter : -evalAfter;
    const drop = evalFromMover - evalAfterFromMover;

    const accuracy = Math.max(0, 100 - Math.min(100, drop / 5));
    if (isWhiteMove) { totalWhiteAccuracy += accuracy; whiteMovesCount++; }
    else { totalBlackAccuracy += accuracy; blackMovesCount++; }

    if (drop >= 200) {
      const suggestedSan = await getBestMoveSan(engine, fenBefore, BEST_MOVE_DEPTH);
      blunders.push({
        move_number: Math.ceil((i + 1) / 2),
        san: move.san,
        fen_before: fenBefore,
        fen_after: fenAfter,
        eval_before: evalBefore,
        eval_after: evalAfter,
        eval_drop: drop,
        quality: 'blunder',
        suggested_san: suggestedSan,
        explanation_beginner: `${move.color === 'w' ? 'White' : 'Black'} played ${move.san}, which is a serious error. The position dropped by ${(drop / 100).toFixed(1)} pawns. Consider ${suggestedSan || 'a different move'} instead.`,
        explanation_advanced: `${move.san} causes a centipawn loss of ${drop}. Engine prefers ${suggestedSan || '?'} (eval: ${(evalBefore / 100).toFixed(2)} → ${(evalAfter / 100).toFixed(2)}).`,
      });
    } else if (drop >= 100) {
      mistakes.push({
        move_number: Math.ceil((i + 1) / 2),
        san: move.san,
        fen_before: fenBefore,
        fen_after: fenAfter,
        eval_before: evalBefore,
        eval_after: evalAfter,
        eval_drop: drop,
        quality: 'mistake',
        suggested_san: '',
        explanation_beginner: `${move.san} is a mistake — there was a better option. The position dropped by ${(drop / 100).toFixed(1)} pawns.`,
        explanation_advanced: `${move.san} causes ${drop} centipawn loss. Eval: ${(evalBefore / 100).toFixed(2)} → ${(evalAfter / 100).toFixed(2)}.`,
      });
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

  engine.sendCommand('quit');

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
    evals: positionEvals,
  };

  const { data: saved, error } = await supabase
    .from('ai_coach_analyses')
    .insert(analysis)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(saved);
}
