import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'teal';

interface ThemeColors {
  // Backgrounds
  bg: string;
  bgHeader: string;
  card: string;
  surface: string;
  surfaceAlt: string;
  overlay: string;
  
  // Text
  text: string;
  textDefault: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Primary (accent)
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  
  // Status
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  
  // Transaction colors
  income: string;
  expense: string;
  
  // Neutral
  border: string;
  gray: string;
  grayLight: string;
  progressBg: string;
  
  // Interactions
  hoverBg: string;
  pressedBg: string;
  focus: string;
  buttonDisabledBg: string;
  buttonDisabledText: string;
}

// Tema Claro - Design System Roxo Premium
const lightTheme: ThemeColors = {
  bg: '#F9F8FD',
  bgHeader: '#28043b',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFF9',
  overlay: 'rgba(40, 4, 59, 0.6)',
  
  text: '#28043b',
  textDefault: '#322438',
  textSecondary: '#8A8699',
  textMuted: '#9A96B0',
  textInverse: '#FFFFFF',
  
  primary: '#28043b',
  primaryLight: '#7B5CD6',
  primaryDark: '#28043b',
  primaryBg: '#EDE9FF',
  
  success: '#2FAF8E',
  successBg: '#E8F7F3',
  danger: '#C4572D',
  dangerBg: '#FFF1E8',
  warning: '#E07A3F',
  warningBg: '#FFF1E8',
  
  income: '#2FAF8E',
  expense: '#C4572D',
  
  border: '#E6E2F0',
  gray: '#9A96B0',
  grayLight: '#F1EFF9',
  progressBg: '#E8E6F3',
  
  hoverBg: 'rgba(40, 4, 59, 0.05)',
  pressedBg: 'rgba(40, 4, 59, 0.1)',
  focus: '#7B5CD6',
  buttonDisabledBg: '#D6D2E3',
  buttonDisabledText: '#9A96B0',
};

// Tema Escuro - Design System Roxo Premium
const darkTheme: ThemeColors = {
  bg: '#0f0d1a',
  bgHeader: '#1a1528',
  card: '#1a1528',
  surface: '#252033',
  surfaceAlt: '#1a1528',
  overlay: 'rgba(15, 13, 26, 0.8)',
  
  text: '#f1f0f5',
  textDefault: '#d4d1e0',
  textSecondary: '#a8a3b8',
  textMuted: '#6b6580',
  textInverse: '#0f0d1a',
  
  primary: '#7B5CD6',
  primaryLight: '#9B7EF0',
  primaryDark: '#5B3CC4',
  primaryBg: '#2a2040',
  
  success: '#3DC9A0',
  successBg: '#1a2f2a',
  danger: '#E07A3F',
  dangerBg: '#2f1a15',
  warning: '#F0A060',
  warningBg: '#2f2515',
  
  income: '#3DC9A0',
  expense: '#E07A3F',
  
  border: '#352f45',
  gray: '#6b6580',
  grayLight: '#1a1528',
  progressBg: '#2a2040',
  
  hoverBg: 'rgba(123, 92, 214, 0.1)',
  pressedBg: 'rgba(123, 92, 214, 0.2)',
  focus: '#9B7EF0',
  buttonDisabledBg: '#2a2040',
  buttonDisabledText: '#6b6580',
};

// Tema Teal -> Convertido para Roxo Premium (mantém nome por compatibilidade)
const tealTheme: ThemeColors = {
  bg: '#F9F8FD',
  bgHeader: '#28043b',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFF9',
  overlay: 'rgba(40, 4, 59, 0.6)',
  
  text: '#28043b',
  textDefault: '#322438',
  textSecondary: '#8A8699',
  textMuted: '#9A96B0',
  textInverse: '#FFFFFF',
  
  primary: '#28043b',
  primaryLight: '#7B5CD6',
  primaryDark: '#28043b',
  primaryBg: '#EDE9FF',
  
  success: '#2FAF8E',
  successBg: '#E8F7F3',
  danger: '#C4572D',
  dangerBg: '#FFF1E8',
  warning: '#E07A3F',
  warningBg: '#FFF1E8',
  
  income: '#2FAF8E',
  expense: '#C4572D',
  
  border: '#E6E2F0',
  gray: '#9A96B0',
  grayLight: '#F1EFF9',
  progressBg: '#E8E6F3',
  
  hoverBg: 'rgba(40, 4, 59, 0.05)',
  pressedBg: 'rgba(40, 4, 59, 0.1)',
  focus: '#7B5CD6',
  buttonDisabledBg: '#D6D2E3',
  buttonDisabledText: '#9A96B0',
};

const themes: Record<ThemeMode, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
  teal: tealTheme,
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@cofrin_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('teal'); // Default: teal

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'teal')) {
        setMode(saved as ThemeMode);
      }
    } catch (e) {
      console.log('Error loading theme:', e);
    }
  }

  async function setThemeMode(newMode: ThemeMode) {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  }

  const colors = themes[mode];
  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, colors, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themes, ThemeColors };
