'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type LucideProps, Bot, Users, Zap, Timer, Clock } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { StakeSelector } from './StakeSelector';
import { Button } from '@/components/ui/Button';
import { AI_LEVEL_OPTIONS } from '@/lib/stockfish/skillMap';
import { TIME_CONTROLS } from '@/lib/chess/timeControls';
import type { GameMode, GameType } from '@/types/game';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics/track';

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const MODE_ICONS: Record<GameMode, LucideIcon> = {
  bullet: Zap,
  blitz: Timer,
  rapid: Clock,
};

export function GameLobby() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { gameType, gameMode, aiLevel, stakeAmount, setGameType, setGameMode, setAiLevel } = useGameStore();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');

  const startGame = async () => {
    if (!profile) return;
    setError('');
    setWaiting(true);

    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: gameType,
          mode: gameMode,
          aiLevel: gameType === 'ai' ? aiLevel : null,
          stakeAmount: gameType === 'pvp' ? stakeAmount : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start game');
        return;
      }

      trackEvent('game_start', { type: gameType, mode: gameMode, stake: stakeAmount }, profile.id);
      router.push(`/game/${data.gameId}`);
    } finally {
      setWaiting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Game Mode</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['ai', 'pvp'] as GameType[]).map((type) => (
              <button
                key={type}
                onClick={() => setGameType(type)}
                className={clsx(
                  'flex items-center justify-center gap-2 rounded-xl border p-4 font-semibold transition-all',
                  gameType === type
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {type === 'ai' ? <Bot size={18} /> : <Users size={18} />}
                {type === 'ai' ? 'vs Computer' : 'vs Player'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-3">Time Control</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TIME_CONTROLS) as [GameMode, typeof TIME_CONTROLS[GameMode]][]).map(([mode, tc]) => {
              const Icon = MODE_ICONS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-xl border p-3 transition-all',
                    gameMode === mode
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <Icon size={18} />
                  <span className="text-sm font-semibold capitalize">{mode}</span>
                  <span className="text-xs text-zinc-500">{tc.label.split('•')[1].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {gameType === 'ai' && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">
              AI Difficulty <span className="text-amber-400 font-normal">{aiLevel} ELO</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {AI_LEVEL_OPTIONS.map((elo) => (
                <button
                  key={elo}
                  onClick={() => setAiLevel(elo)}
                  className={clsx(
                    'rounded-lg px-3 py-1 text-sm font-medium border transition-all',
                    aiLevel === elo
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {elo}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1000}
              max={2500}
              step={100}
              value={aiLevel}
              onChange={(e) => setAiLevel(Number(e.target.value))}
              className="mt-3 w-full accent-amber-500"
            />
          </div>
        )}

        {gameType === 'pvp' && <StakeSelector />}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button onClick={startGame} size="lg" className="w-full" disabled={waiting}>
          {waiting ? (gameType === 'pvp' ? 'Finding opponent…' : 'Starting…') : (
            gameType === 'pvp' ? 'Find Opponent' : 'Play vs Computer'
          )}
        </Button>
      </div>
    </div>
  );
}
