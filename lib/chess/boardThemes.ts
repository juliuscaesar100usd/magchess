import type { BoardTheme } from '@/store/useSettingsStore';

interface BoardSquareStyle {
  backgroundColor?: string;
  background?: string;
}

interface Theme {
  dark: BoardSquareStyle;
  light: BoardSquareStyle;
}

export const BOARD_THEMES: Record<BoardTheme, Theme> = {
  default: {
    dark: { backgroundColor: '#779952' },
    light: { backgroundColor: '#edeed1' },
  },
  board_classic: {
    dark: { backgroundColor: '#b58863' },
    light: { backgroundColor: '#f0d9b5' },
  },
  board_wood: {
    dark: { backgroundColor: '#8b5e3c' },
    light: { backgroundColor: '#d4a96a' },
  },
  board_neon: {
    dark: { backgroundColor: '#1a1a3e' },
    light: { backgroundColor: '#2d2d6b' },
  },
  board_marble: {
    dark: { backgroundColor: '#7c7c8e' },
    light: { backgroundColor: '#e8e8f0' },
  },
};
