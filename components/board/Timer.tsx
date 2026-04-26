'use client';

import { formatTime } from '@/lib/chess/timeControls';
import clsx from 'clsx';

interface TimerProps {
  timeMs: number;
  active: boolean;
  label: string;
}

export function Timer({ timeMs, active, label }: TimerProps) {
  const critical = timeMs < 10_000;
  return (
    <div className={clsx(
      'flex items-center justify-between rounded-xl border px-4 py-2.5 transition-all',
      active
        ? critical
          ? 'border-red-500/60 bg-red-500/10 animate-pulse-amber'
          : 'border-amber-500/60 bg-amber-500/10'
        : 'border-zinc-700 bg-zinc-800/50'
    )}>
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      <span className={clsx(
        'text-2xl font-mono font-bold tabular-nums',
        active ? (critical ? 'text-red-400' : 'text-amber-400') : 'text-zinc-300'
      )}>
        {formatTime(timeMs)}
      </span>
    </div>
  );
}
