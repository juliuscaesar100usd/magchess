import type { MoveQuality } from '@/types/game';

export function getMoveQuality(
  evalBefore: number,
  evalAfter: number,
  isWhiteMove: boolean
): MoveQuality {
  // Normalize from white's perspective
  const before = isWhiteMove ? evalBefore : -evalBefore;
  const after = isWhiteMove ? evalAfter : -evalAfter;
  const drop = before - after; // positive = position got worse for the mover

  if (drop < -50) return 'brilliant';
  if (drop < 0) return 'good';
  if (drop < 50) return 'neutral';
  if (drop < 100) return 'inaccuracy';
  if (drop < 200) return 'mistake';
  return 'blunder';
}
