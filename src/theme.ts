// Design System Cofrin - Roxo Premium + Laranja Elegante
// NÃO usar vermelho. Laranja apenas para alertas/negativos.
import { Platform } from 'react-native';

export const palette = {
  // === BACKGROUNDS ===
  bg: '#F9F8FD',           // off-white arroxeado (fundo principal)
  card: '#FFFFFF',         // cards
  surface: '#FFFFFF',      // superfícies
  
  // === TEXT ===
  text: '#1F1B2E',         // títulos (preto arroxeado)
  textDefault: '#4B475C',  // conteúdo padrão
  textSecondary: '#8A8699', // texto secundário
  textMuted: '#9A96B0',    // texto auxiliar / ícones inativos
  textInverse: '#FFFFFF',  // texto sobre fundos escuros
  
  // === PRIMARY (Roxo Marca) ===
  primary: '#5B3CC4',      // roxo principal (botões, ícones ativos)
  primaryLight: '#7B5CD6', // roxo claro
  primaryDark: '#4A2FA8',  // roxo escuro
  primaryBg: '#EDE9FF',    // fundo roxo suave (ícones, cards destacados)
  
  // === STATUS ===
  success: '#2FAF8E',      // verde elegante (saldo positivo)
  successBg: '#E8F7F3',    // fundo verde suave
  danger: '#C4572D',       // laranja escuro (negativo, SEM vermelho)
  dangerBg: '#FFF1E8',     // fundo laranja suave
  warning: '#E07A3F',      // laranja atenção
  warningBg: '#FFF1E8',    // fundo alerta
  
  // === TRANSACTIONS ===
  income: '#2FAF8E',       // receita (verde)
  expense: '#C4572D',      // despesa (laranja escuro)
  
  // === NEUTRAL ===
  gray: '#9A96B0',         // cinza arroxeado
  grayLight: '#F1EFF9',    // cinza claro
  border: '#E6E2F0',       // bordas
  progressBg: '#E8E6F3',   // fundo barras de progresso
  
  // === BUTTONS ===
  buttonDisabledBg: '#D6D2E3',
  buttonDisabledText: '#9A96B0',
};

export const spacing = { 
  xs: 4, 
  sm: 8, 
  md: 16, 
  lg: 20, 
  xl: 24 
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // Font weights
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Font sizes
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },
};

export const shadows = {
  sm: {
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Android
    elevation: 1,
  },
  md: {
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Android
    elevation: 1,
  },
  lg: {
    // iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Android
    elevation: 2,
  },
};

// Helper function to get cross-platform shadow
export function getShadow(colors: { card: string }, size: 'sm' | 'md' | 'lg' = 'md') {
  const shadow = shadows[size];
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${shadow.shadowOffset.height * 2}px ${shadow.shadowRadius * 2}px rgba(0,0,0,${shadow.shadowOpacity})`,
    } as const;
  }

  return shadow;
}

export default { palette, spacing, borderRadius, typography, shadows, getShadow };
