'use client';

interface EvalBarProps {
  evaluation: number; // centipawns from white's perspective; ±30000 = mate
}

export function EvalBar({ evaluation }: EvalBarProps) {
  const MAX = 600;
  const clampedEval = Math.max(-MAX, Math.min(MAX, evaluation));
  const whitePercent = ((clampedEval + MAX) / (2 * MAX)) * 100;

  const displayEval =
    Math.abs(evaluation) >= 30000
      ? `M${Math.round(evaluation > 0 ? 1 : -1)}`
      : (evaluation / 100).toFixed(1);

  return (
    <div className="flex flex-col items-center gap-1 w-6">
      <span className="text-[10px] text-zinc-400 font-mono">
        {evaluation > 0 ? '+' : ''}{displayEval}
      </span>
      <div className="w-4 flex-1 rounded-full overflow-hidden bg-zinc-800 flex flex-col" style={{ minHeight: 200 }}>
        {/* Black side at top */}
        <div
          className="w-full bg-zinc-300 transition-all duration-300"
          style={{ height: `${100 - whitePercent}%` }}
        />
        {/* White side at bottom */}
        <div
          className="w-full bg-white transition-all duration-300"
          style={{ height: `${whitePercent}%` }}
        />
      </div>
    </div>
  );
}
