'use client';

import { create } from 'zustand';
import type { Profile } from '@/types/user';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  updateCoins: (coins: number) => void;
  updateRating: (rating: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  updateCoins: (coins) =>
    set((s) => ({ profile: s.profile ? { ...s.profile, coins } : null })),
  updateRating: (rating) =>
    set((s) => ({ profile: s.profile ? { ...s.profile, rating } : null })),
}));
