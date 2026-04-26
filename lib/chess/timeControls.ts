import type { GameMode, TimeControl } from '@/types/game';

export const TIME_CONTROLS: Record<GameMode, TimeControl> = {
  bullet: { minutes: 1, increment: 0, label: 'Bullet • 1+0' },
  blitz: { minutes: 3, increment: 2, label: 'Blitz • 3+2' },
  rapid: { minutes: 5, increment: 0, label: 'Rapid • 5+0' },
};

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
