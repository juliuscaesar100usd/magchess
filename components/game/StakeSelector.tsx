'use client';

import { STAKE_OPTIONS } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Coins } from 'lucide-react';
import clsx from 'clsx';

export function StakeSelector() {
  const { stakeAmount, setStakeAmount } = useGameStore();
  const coins = useAuthStore((s) => s.profile?.coins ?? 0);

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Stake <span className="text-zinc-500 font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStakeAmount(0)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium border transition-all',
            stakeAmount === 0
              ? 'bg-zinc-700 border-zinc-500 text-white'
              : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
          )}
        >
          None
        </button>
        {STAKE_OPTIONS.map((amount) => {
          const canAfford = coins >= amount;
          return (
            <button
              key={amount}
              disabled={!canAfford}
              onClick={() => setStakeAmount(amount)}
              className={clsx(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium border transition-all',
                stakeAmount === amount
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : canAfford
                  ? 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-amber-500/40 hover:text-amber-300'
                  : 'bg-zinc-800/20 border-zinc-800 text-zinc-600 cursor-not-allowed'
              )}
            >
              <Coins size={12} />
              {amount}
            </button>
          );
        })}
      </div>
      {stakeAmount > 0 && (
        <p className="mt-1.5 text-xs text-zinc-500">
          Winner gets <span className="text-amber-400">{Math.floor(stakeAmount * 2 * 0.9)} coins</span> (10% platform fee)
        </p>
      )}
    </div>
  );
}
