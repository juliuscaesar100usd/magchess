'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CoachPanel } from '@/components/coach/CoachPanel';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/types/game';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { gameId } = use(params);
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { setGameId, setGameType, setGameMode, setAiLevel, setPlayerColor, setGameActive, result } = useGameStore();
  const [loaded, setLoaded] = useState(false);
  const [gamePgn, setGamePgn] = useState('');

  useEffect(() => {
    const loadGame = async () => {
      const supabase = createClient();
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (!game) { router.push('/game'); return; }

      const g = game as Game;
      setGameId(gameId);
      setGameType(g.black_player_id === null ? 'ai' : 'pvp');
      setGameMode(g.mode);
      if (g.ai_level) setAiLevel(g.ai_level);
      if (profile) {
        setPlayerColor(g.white_player_id === profile.id ? 'white' : 'black');
      }
      setGameActive(true);
      setLoaded(true);
    };
    if (profile) loadGame();
  }, [gameId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // After game ends, fetch PGN for coach
  useEffect(() => {
    if (!result) return;
    createClient()
      .from('games')
      .select('pgn')
      .eq('id', gameId)
      .single()
      .then(({ data }) => { if (data?.pgn) setGamePgn(data.pgn); });
  }, [result, gameId]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400 text-sm animate-pulse">Loading game…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChessBoard gameId={gameId} />
      {result && gamePgn && (
        <div className="max-w-sm mx-auto lg:mx-0">
          <CoachPanel gameId={gameId} pgn={gamePgn} />
        </div>
      )}
    </div>
  );
}
