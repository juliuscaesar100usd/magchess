'use client';

import { useEffect, useState } from 'react';
import { Flame, Coins } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';

interface StreakSaveModalProps {
  open: boolean;
  streak: number;
  gameId: string;
  onClose: () => void;
}

export function StreakSaveModal({ open, streak, gameId, onClose }: StreakSaveModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [saving, setSaving] = useState(false);
  const { profile, updateCoins } = useAuthStore();

  useEffect(() => {
    if (!open) { setCountdown(10); return; }
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); onClose(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, onClose]);

  const handleSave = async () => {
    if (!profile || profile.coins < 10) return;
    setSaving(true);
    try {
      const res = await fetch('/api/game/save-streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (res.ok) {
        updateCoins(profile.coins - 10);
      }
    } finally {
      setSaving(false);
      onClose();
    }
  };

  const canAfford = (profile?.coins ?? 0) >= 10;

  return (
    <Modal open={open} title="" hideClose>
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15">
            <Flame size={28} className="text-orange-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Your streak is at risk!</h2>
        <p className="text-zinc-400 text-sm mb-1">
          Your <span className="text-orange-400 font-semibold">{streak}-win streak</span> is about to end.
        </p>
        <p className="text-zinc-400 text-sm mb-5">
          Do you want to save your win-streak for <span className="text-amber-400 font-semibold flex-inline items-center">10 <Coins size={12} className="inline mb-0.5 ml-0.5" /></span>?
        </p>

        {!canAfford && (
          <p className="text-red-400 text-xs mb-3">Not enough coins (need 10)</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !canAfford}
          >
            {saving ? 'Saving…' : `Save Streak (10 coins)`}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Don&apos;t Save ({countdown}s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
