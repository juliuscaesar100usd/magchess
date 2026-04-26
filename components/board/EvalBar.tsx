'use client';

interface EvalBarProps {
  evaluation: number; // centipawns from white's perspective; ±30000 = mate
}

export function EvalBar({ evaluation }: EvalBarProps) {
  const MAX = 600;
  const clampedEval = Math.max(-MAX, Math.min(MAX, evaluation));
  // 50% = equal; > 50% = white ahead; < 50% = black ahead
  const whitePercent = ((clampedEval + MAX) / (2 * MAX)) * 100;

  const isMate = Math.abs(evaluation) >= 30_000;
  const evalDisplay = isMate
    ? (evaluation > 0 ? '+M' : '-M')
    : `${evaluation > 0 ? '+' : ''}${(evaluation / 100).toFixed(1)}`;

  return (
    <div className="flex flex-col items-center gap-1.5 w-6 self-stretch">
      <div
        className="w-full flex-1 rounded overflow-hidden flex flex-col border border-zinc-600"
        style={{ minHeight: 200 }}
      >
        {/* Black — grows down from top */}
        <div
          className="w-full transition-all duration-500 ease-out"
          style={{ height: `${100 - whitePercent}%`, backgroundColor: '#3f3f46' }}
        />
        {/* White — grows up from bottom */}
        <div
          className="w-full transition-all duration-500 ease-out"
          style={{ height: `${whitePercent}%`, backgroundColor: '#f4f4f5' }}
        />
      </div>
      <span className="text-[9px] font-mono font-medium text-zinc-400">
        {evalDisplay}
      </span>
    </div>
  );
}
