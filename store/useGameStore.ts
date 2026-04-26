'use client';

import { create } from 'zustand';
import type { GameMode, GameType, GameResult } from '@/types/game';

interface GameState {
  gameId: string | null;
  gameType: GameType;
  gameMode: GameMode;
  aiLevel: number;
  stakeAmount: number;
  playerColor: 'white' | 'black';
  isGameActive: boolean;
  result: GameResult | null;
  streakAtRisk: number;
  drawOfferedByOpponent: boolean;

  setGameId: (id: string | null) => void;
  setGameType: (type: GameType) => void;
  setGameMode: (mode: GameMode) => void;
  setAiLevel: (level: number) => void;
  setStakeAmount: (amount: number) => void;
  setPlayerColor: (color: 'white' | 'black') => void;
  setGameActive: (active: boolean) => void;
  setResult: (result: GameResult | null) => void;
  setStreakAtRisk: (streak: number) => void;
  setDrawOffered: (offered: boolean) => void;
  reset: () => void;
}

const defaults = {
  gameId: null,
  gameType: 'ai' as GameType,
  gameMode: 'rapid' as GameMode,
  aiLevel: 1400,
  stakeAmount: 0,
  playerColor: 'white' as const,
  isGameActive: false,
  result: null,
  streakAtRisk: 0,
  drawOfferedByOpponent: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...defaults,
  setGameId: (gameId) => set({ gameId }),
  setGameType: (gameType) => set({ gameType }),
  setGameMode: (gameMode) => set({ gameMode }),
  setAiLevel: (aiLevel) => set({ aiLevel }),
  setStakeAmount: (stakeAmount) => set({ stakeAmount }),
  setPlayerColor: (playerColor) => set({ playerColor }),
  setGameActive: (isGameActive) => set({ isGameActive }),
  setResult: (result) => set({ result }),
  setStreakAtRisk: (streakAtRisk) => set({ streakAtRisk }),
  setDrawOffered: (drawOfferedByOpponent) => set({ drawOfferedByOpponent }),
  reset: () => set(defaults),
}));
