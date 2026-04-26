'use client';

import { Flag, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BoardControlsProps {
  onResign: () => void;
  onDrawOffer: () => void;
  drawOfferPending?: boolean;
  onDrawAccept?: () => void;
  onDrawDecline?: () => void;
  gameType: 'ai' | 'pvp';
  disabled?: boolean;
}

export function BoardControls({
  onResign,
  onDrawOffer,
  drawOfferPending,
  onDrawAccept,
  onDrawDecline,
  gameType,
  disabled,
}: BoardControlsProps) {
  if (drawOfferPending) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
        <p className="text-sm text-zinc-300 mb-2 text-center">Opponent offers a draw</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onDrawAccept}>Accept</Button>
          <Button variant="danger" size="sm" className="flex-1" onClick={onDrawDecline}>Decline</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {gameType === 'pvp' && (
        <Button variant="ghost" size="sm" onClick={onDrawOffer} disabled={disabled} className="flex-1">
          <Handshake size={15} className="mr-1.5" />
          Draw
        </Button>
      )}
      <Button variant="danger" size="sm" onClick={onResign} disabled={disabled} className="flex-1">
        <Flag size={15} className="mr-1.5" />
        Resign
      </Button>
    </div>
  );
}
