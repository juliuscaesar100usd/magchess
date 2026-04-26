'use client';

import { Coins } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function CoinBalance() {
  const coins = useAuthStore((s) => s.profile?.coins ?? 0);
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1">
      <Coins size={14} className="text-amber-400" />
      <span className="text-sm font-semibold text-amber-400">{coins.toLocaleString()}</span>
    </div>
  );
}
