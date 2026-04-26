export type CoachLevel = 'beginner' | 'advanced';

export interface MoveCritique {
  move_number: number;
  san: string;
  fen_before: string;
  fen_after: string;
  eval_before: number;
  eval_after: number;
  eval_drop: number;
  quality: 'blunder' | 'mistake';
  suggested_san: string;
  explanation_beginner: string;
  explanation_advanced: string;
}

export interface KeyMoment {
  move_number: number;
  san: string;
  description: string;
  eval: number;
}

export interface CoachAnalysis {
  id: string;
  user_id: string;
  game_id: string;
  pgn: string;
  blunders: MoveCritique[];
  mistakes: MoveCritique[];
  key_moments: KeyMoment[];
  accuracy_white: number;
  accuracy_black: number;
  level: CoachLevel;
  was_free: boolean;
  evals: number[];
  created_at: string;
}
