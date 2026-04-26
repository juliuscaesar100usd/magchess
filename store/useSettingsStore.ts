'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PurchaseItem } from '@/types/user';

export type BoardTheme = 'default' | 'board_classic' | 'board_wood' | 'board_neon' | 'board_marble';

interface SettingsState {
  boardTheme: BoardTheme;
  podcastEnabled: boolean;
  setBoardTheme: (theme: BoardTheme) => void;
  togglePodcast: () => void;
  setPodcast: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      boardTheme: 'default',
      podcastEnabled: true,
      setBoardTheme: (boardTheme) => set({ boardTheme }),
      togglePodcast: () => set((s) => ({ podcastEnabled: !s.podcastEnabled })),
      setPodcast: (podcastEnabled) => set({ podcastEnabled }),
    }),
    { name: 'magchess-settings' }
  )
);
