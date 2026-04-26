'use client';

import type { MoveCritique, CoachLevel } from '@/types/coach';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import clsx from 'clsx';

interface BlunderCardProps {
  critique: MoveCritique;
  level: CoachLevel;
  onSelect?: (fen: string) => void;
}

export function BlunderCard({ critique, level, onSelect }: BlunderCardProps) {
  const isBlunder = critique.quality === 'blunder';
  const explanation = level === 'beginner' ? critique.explanation_beginner : critique.explanation_advanced;

  return (
    <button
      onClick={() => onSelect?.(critique.fen_before)}
      className={clsx(
        'w-full text-left rounded-xl border p-3 transition-all hover:scale-[1.01]',
        isBlunder
          ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
          : 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50'
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {isBlunder
          ? <AlertOctagon size={14} className="text-red-400 flex-shrink-0" />
          : <AlertTriangle size={14} className="text-orange-400 flex-shrink-0" />}
        <span className={clsx('text-xs font-semibold', isBlunder ? 'text-red-400' : 'text-orange-400')}>
          Move {critique.move_number}: {critique.san} {isBlunder ? '— Blunder' : '— Mistake'}
        </span>
        <span className="ml-auto text-xs text-zinc-500">
          -{(critique.eval_drop / 100).toFixed(1)}
        </span>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{explanation}</p>
      {critique.suggested_san && (
        <p className="mt-1.5 text-xs text-green-400">
          Better: <span className="font-medium">{critique.suggested_san}</span>
        </p>
      )}
    </button>
  );
}
