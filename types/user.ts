export interface Profile {
  id: string;
  username: string;
  email: string;
  rating: number;
  city: string | null;
  country: string | null;
  coins: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_game_date: string | null;
  updated_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_key: string;
  badge_label: string;
  earned_at: string;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  game_id: string | null;
  type: CoinTransactionType;
  amount: number;
  balance_after: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export type CoinTransactionType =
  | 'stake_reserve'
  | 'stake_win'
  | 'stake_loss'
  | 'purchase'
  | 'coach_purchase'
  | 'cosmetic_purchase'
  | 'streak_save'
  | 'platform_fee'
  | 'signup_bonus';

export type PurchaseItem =
  | 'ai_coach'
  | 'board_classic'
  | 'board_wood'
  | 'board_neon'
  | 'board_marble';

export interface Purchase {
  id: string;
  user_id: string;
  item: PurchaseItem;
  purchased_at: string;
}
