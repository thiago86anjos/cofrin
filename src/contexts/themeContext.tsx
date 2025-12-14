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
  
  // Text
  text: string;
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
}

// Tema Claro (original)
const lightTheme: ThemeColors = {
  bg: '#f8fafc',
  bgHeader: '#2563eb',
  card: '#ffffff',
  surface: '#ffffff',
  
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryBg: '#eff6ff',
  
  success: '#10b981',
  successBg: '#ecfdf5',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  
  income: '#10b981',
  expense: '#ef4444',
  
  border: '#e2e8f0',
  gray: '#64748b',
  grayLight: '#f1f5f9',
};

// Tema Escuro
const darkTheme: ThemeColors = {
  bg: '#0f172a',
  bgHeader: '#1e293b',
  card: '#1e293b',
  surface: '#334155',
  
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#0f172a',
  
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  primaryBg: '#1e3a5f',
  
  success: '#34d399',
  successBg: '#064e3b',
  danger: '#f87171',
  dangerBg: '#7f1d1d',
  warning: '#fbbf24',
  warningBg: '#78350f',
  
  income: '#34d399',
  expense: '#f87171',
  
  border: '#334155',
  gray: '#94a3b8',
  grayLight: '#1e293b',
};

// Tema Teal (azul-esverdeado) - o favorito!
const tealTheme: ThemeColors = {
  bg: '#f0fdfa',
  bgHeader: '#0d9488',
  card: '#ffffff',
  surface: '#ffffff',
  
  text: '#134e4a',
  textSecondary: '#0f766e',
  textMuted: '#64748b',
  textInverse: '#ffffff',
  
  primary: '#0d9488',
  primaryLight: '#14b8a6',
  primaryDark: '#0f766e',
  primaryBg: '#ccfbf1',
  
  success: '#10b981',
  successBg: '#ecfdf5',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  
  income: '#10b981',
  expense: '#ef4444',
  
  border: '#99f6e4',
  gray: '#64748b',
  grayLight: '#f1f5f9',
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
