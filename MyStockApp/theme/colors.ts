// theme/colors.ts

export type ThemeName = 'light' | 'dark' | 'pink';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  onAccent: string; // readable text/icon color when placed on top of `accent`
  danger: string;
  changedRowBg: string;
  placeholderBg: string;
}

const light: ThemeColors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f5',
  border: '#e0e0e0',
  textPrimary: '#000000',
  textSecondary: '#444444',
  textMuted: '#999999',
  accent: '#2563eb',
  onAccent: '#ffffff',
  danger: '#dc2626',
  changedRowBg: '#eff6ff',
  placeholderBg: '#f0f0f0',
};

const dark: ThemeColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceAlt: '#1c1c1c',
  border: '#2a2a2a',
  textPrimary: '#ffffff',
  textSecondary: '#bbbbbb',
  textMuted: '#888888',
  accent: '#ED93B1',
  onAccent: '#2C0F1A',
  danger: '#f09595',
  changedRowBg: '#241a1e',
  placeholderBg: '#1c1c1c',
};

const pink: ThemeColors = {
  background: '#4B1528',
  surface: '#5c1a32',
  surfaceAlt: '#3a0f1e',
  border: '#72243E',
  textPrimary: '#ffffff',
  textSecondary: '#ED93B1',
  textMuted: '#D4537E',
  accent: '#ffffff',
  onAccent: '#4B1528',
  danger: '#f09595',
  changedRowBg: '#6e2039',
  placeholderBg: '#3a0f1e',
};

export const themes: Record<ThemeName, ThemeColors> = { light, dark, pink };
export const THEME_ORDER: ThemeName[] = ['light', 'dark', 'pink'];
export const THEME_ICON: Record<ThemeName, 'sunny-outline' | 'moon-outline' | 'heart-outline'> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
  pink: 'heart-outline',
};
