'use client';

interface MoveHistoryProps {
  moves: string[];
  currentIndex?: number;
  onSelect?: (index: number) => void;
}

export function MoveHistory({ moves, currentIndex, onSelect }: MoveHistoryProps) {
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1]]);
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Moves</h3>
      </div>
      <div className="overflow-y-auto max-h-52 p-2">
        {pairs.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-3">No moves yet</p>
        ) : (
          <div className="space-y-0.5">
            {pairs.map(([white, black], i) => (
              <div key={i} className="grid grid-cols-[28px_1fr_1fr] gap-1 text-sm">
                <span className="text-zinc-500 text-xs pt-0.5">{i + 1}.</span>
                <button
                  onClick={() => onSelect?.(i * 2)}
                  className={`text-left rounded px-1.5 py-0.5 font-medium transition-colors ${
                    currentIndex === i * 2
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {white}
                </button>
                {black && (
                  <button
                    onClick={() => onSelect?.(i * 2 + 1)}
                    className={`text-left rounded px-1.5 py-0.5 font-medium transition-colors ${
                      currentIndex === i * 2 + 1
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {black}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
