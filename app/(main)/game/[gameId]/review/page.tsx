'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Chessboard } from 'react-chessboard';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft, Swords } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CoachPanel } from '@/components/coach/CoachPanel';
import { MoveHistory } from '@/components/board/MoveHistory';
import { getFenHistory, parsePgn } from '@/lib/chess/pgn';
import { BOARD_THEMES } from '@/lib/chess/boardThemes';
import type { GameWithPlayers } from '@/types/game';
import clsx from 'clsx';

interface PageProps { params: Promise<{ gameId: string }> }

export default function GameReviewPage({ params }: PageProps) {
  const { gameId } = use(params);
  const profile = useAuthStore((s) => s.profile);
  const { boardTheme } = useSettingsStore();
  const theme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.default;

  const [game, setGame] = useState<GameWithPlayers | null>(null);
  const [loading, setLoading] = useState(true);
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [moveList, setMoveList] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('games')
        .select('*, white_player:white_player_id(username, rating), black_player:black_player_id(username, rating)')
        .eq('id', gameId)
        .single();

      if (data) {
        setGame(data as GameWithPlayers);
        if (data.pgn) {
          try {
            const fens = getFenHistory(data.pgn);
            const moves = parsePgn(data.pgn).history();
            setFenHistory(fens);
            setMoveList(moves);
            setReviewIndex(fens.length - 1);
          } catch {
            setFenHistory([]);
            setMoveList([]);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [gameId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setReviewIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setReviewIndex((i) => Math.min(fenHistory.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fenHistory.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm animate-pulse">
        Loading game…
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 mb-3">Game not found.</p>
        <Link href="/profile" className="text-amber-400 text-sm hover:underline">
          ← Back to profile
        </Link>
      </div>
    );
  }

  const isOwnGame = profile?.id === game.white_player_id || profile?.id === game.black_player_id;
  const isWhite = game.white_player_id === profile?.id;
  const isAI = !game.black_player_id;
  const isDraw = game.result === 'draw';
  const isWin = (isWhite && game.result === 'white_wins') || (!isWhite && game.result === 'black_wins');
  const resultLabel = !game.result ? 'Ongoing' : isDraw ? 'Draw' : isWin ? 'Won' : 'Lost';

  const ratingAfter = isWhite ? game.white_rating_after : game.black_rating_after;
  const ratingBefore = isWhite ? game.white_rating_before : game.black_rating_before;
  const delta = ratingAfter && ratingBefore ? ratingAfter - ratingBefore : null;

  const opponentName = isAI
    ? `AI (level ${game.ai_level})`
    : (isWhite ? game.black_player?.username : game.white_player?.username) ?? 'Unknown';

  const playerName = profile?.username ?? 'You';
  const boardOrientation = isOwnGame && !isWhite ? 'black' : 'white';
  const currentFen = fenHistory[reviewIndex] ?? 'start';
  const atStart = reviewIndex === 0;
  const atEnd = fenHistory.length === 0 || reviewIndex === fenHistory.length - 1;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={15} />
        Back to profile
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: board + controls */}
        <div className="flex flex-col gap-2 w-full lg:max-w-[520px]">
          <div className="flex items-center gap-2 px-1 h-7">
            <Swords size={13} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300">{boardOrientation === 'white' ? opponentName : playerName}</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-zinc-700 shadow-2xl">
            <Chessboard
              options={{
                position: currentFen,
                allowDragging: false,
                boardOrientation,
                darkSquareStyle: theme.dark,
                lightSquareStyle: theme.light,
                boardStyle: { borderRadius: '0px' },
              }}
            />
          </div>

          <div className="flex items-center gap-2 px-1 h-7">
            <Swords size={13} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300">{boardOrientation === 'white' ? playerName : opponentName}</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <button
              onClick={() => setReviewIndex(0)}
              disabled={atStart}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
              title="First move"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
              disabled={atStart}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-zinc-400 min-w-[90px] text-center tabular-nums">
              {reviewIndex === 0 ? 'Start' : `Move ${reviewIndex} / ${fenHistory.length - 1}`}
            </span>
            <button
              onClick={() => setReviewIndex((i) => Math.min(fenHistory.length - 1, i + 1))}
              disabled={atEnd}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
              title="Next (→)"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setReviewIndex(fenHistory.length - 1)}
              disabled={atEnd}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 transition-colors"
              title="Last move"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
          <p className="text-xs text-zinc-600 text-center">Use ← → arrow keys to navigate</p>
        </div>

        {/* Right: metadata + moves + coach */}
        <div className="flex flex-col gap-4 w-full lg:max-w-xs">
          {/* Metadata card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white truncate mr-2">{opponentName}</span>
              <span className={clsx(
                'text-sm font-bold flex-shrink-0',
                isDraw ? 'text-zinc-400' : isWin ? 'text-green-400' : !game.result ? 'text-zinc-400' : 'text-red-400'
              )}>
                {resultLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span className="capitalize">{game.mode}</span>
              {delta !== null && (
                <span className={clsx('font-medium', delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400')}>
                  {delta > 0 ? '+' : ''}{delta} ELO
                </span>
              )}
              {game.stake_amount > 0 && (
                <span className="text-amber-500/80">{game.stake_amount} coins staked</span>
              )}
            </div>
            <div className="text-xs text-zinc-600">
              {new Date(game.started_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </div>
          </div>

          {/* Move history */}
          {moveList.length > 0 ? (
            <MoveHistory
              moves={moveList}
              currentIndex={reviewIndex > 0 ? reviewIndex - 1 : undefined}
              onSelect={(idx) => setReviewIndex(idx + 1)}
            />
          ) : (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-6 text-center text-sm text-zinc-500">
              No moves recorded for this game.
            </div>
          )}

          {/* AI Coach — own completed games only */}
          {isOwnGame && game.pgn && game.result && (
            <CoachPanel gameId={gameId} pgn={game.pgn} />
          )}
        </div>
      </div>
    </div>
  );
}
