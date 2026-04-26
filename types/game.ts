export type GameMode = 'bullet' | 'blitz' | 'rapid';
export type GameType = 'pvp' | 'ai';
export type GameResult = 'white_wins' | 'black_wins' | 'draw' | 'abandoned';

export interface TimeControl {
  minutes: number;
  increment: number;
  label: string;
}

export const TIME_CONTROLS: Record<GameMode, TimeControl> = {
  bullet: { minutes: 1, increment: 0, label: 'Bullet • 1+0' },
  blitz: { minutes: 3, increment: 2, label: 'Blitz • 3+2' },
  rapid: { minutes: 5, increment: 0, label: 'Rapid • 5+0' },
};

export const STAKE_OPTIONS = [10, 20, 50, 100, 200, 300, 500];

export interface Game {
  id: string;
  white_player_id: string | null;
  black_player_id: string | null;
  ai_level: number | null;
  mode: GameMode;
  pgn: string | null;
  result: GameResult | null;
  stake_amount: number;
  white_rating_before: number | null;
  black_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_after: number | null;
  started_at: string;
  ended_at: string | null;
  realtime_channel: string | null;
}

export interface GameWithPlayers extends Game {
  white_player?: { username: string; rating: number } | null;
  black_player?: { username: string; rating: number } | null;
}

export interface RatingHistory {
  id: string;
  user_id: string;
  game_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
  recorded_at: string;
}

export type MoveQuality = 'brilliant' | 'good' | 'neutral' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  pgn: string;
  moveNumber: number;
}

export type GameEvent =
  | { type: 'move'; payload: MovePayload }
  | { type: 'resign'; payload: { userId: string } }
  | { type: 'draw_offer'; payload: { userId: string } }
  | { type: 'draw_accept' }
  | { type: 'draw_decline' }
  | { type: 'game_end'; payload: { result: GameResult } };
