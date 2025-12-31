/**
 * Design System - Padrões visuais consistentes para toda a aplicação
 */

// ============================================
// CORES
// ============================================

export const DS_COLORS = {
  // Primária
  primary: '#28043b',
  primaryLight: '#E8E4FF',
  primaryDark: '#28043b',
  
  // Background
  background: '#F7F8FC',
  card: '#FFFFFF',
  
  // Texto
  textTitle: '#28043b',
  textBody: '#322438',
  textMuted: '#9AA0A6',
  textInverse: '#FFFFFF',
  
  // Status - Positivo
  success: '#1BB88A',
  successLight: '#E6F9F4',
  
  // Status - Warning
  warning: '#cf5799',
  warningLight: '#FCE8F2',
  
  // Status - Erro/Grave
  error: '#d1195d',
  errorLight: '#FBE3ED',
  
  // Status - Info
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  
  // Bordas e separadores
  border: '#E6E6EB',
  divider: '#E6E6EB',
  
  // Neutros
  gray: '#9AA0A6',
  grayLight: '#F5F5F5',
};

// ============================================
// TIPOGRAFIA
// ============================================

export const DS_TYPOGRAPHY = {
  // Tamanhos
  size: {
    title: 18,        // Título de seção
    subtitle: 16,     // Subtítulo de card
    valueMain: 26,    // Valor principal
    valueSecondary: 15, // Valor secundário
    label: 12,        // Labels
    body: 14,         // Texto padrão
  },
  
  // Pesos
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Estilos combinados
  styles: {
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: DS_COLORS.primary,
    },
    cardSubtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: DS_COLORS.primary,
    },
    valueMain: {
      fontSize: 26,
      fontWeight: '700' as const,
      color: DS_COLORS.success,
    },
    valueSecondary: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    label: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: DS_COLORS.textMuted,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: DS_COLORS.textBody,
    },
  },
};

// ============================================
// ÍCONES
// ============================================

export const DS_ICONS = {
  size: {
    default: 20,
    large: 24,
    small: 16,
  },
  color: DS_COLORS.primary,
  
  // Ícone em destaque (com fundo circular)
  featured: {
    size: 20,
    containerSize: 36,
    backgroundColor: DS_COLORS.primaryLight,
    color: DS_COLORS.primary,
  },
};

// ============================================
// CARDS
// ============================================

export const DS_CARD = {
  padding: 16,
  borderRadius: 16,
  backgroundColor: DS_COLORS.card,
  gap: 12, // Espaçamento entre elementos dentro do card
  
  // Sombra suave
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
};

// ============================================
// BADGES E STATUS
// ============================================

export const DS_BADGE = {
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
  
  variants: {
    // Estado neutro/pendente
    neutral: {
      backgroundColor: DS_COLORS.grayLight,
      color: DS_COLORS.gray,
    },
    // Sucesso/positivo
    success: {
      backgroundColor: DS_COLORS.successLight,
      color: DS_COLORS.success,
    },
    // Warning/atenção
    warning: {
      backgroundColor: DS_COLORS.warningLight,
      color: DS_COLORS.warning,
    },
    // Erro/grave
    error: {
      backgroundColor: DS_COLORS.errorLight,
      color: DS_COLORS.error,
    },
  },
};

// ============================================
// ESPAÇAMENTOS
// ============================================

export const DS_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// ============================================
// HELPERS
// ============================================

/**
 * Retorna as cores do badge baseado na severidade
 */
export const getBadgeColors = (severity: 'neutral' | 'success' | 'warning' | 'error') => {
  return DS_BADGE.variants[severity];
};

/**
 * Retorna a cor do valor baseado no tipo
 */
export const getValueColor = (type: 'positive' | 'negative' | 'neutral' | 'warning' | 'error') => {
  switch (type) {
    case 'positive':
      return DS_COLORS.success;
    case 'negative':
    case 'error':
      return DS_COLORS.error;
    case 'warning':
      return DS_COLORS.warning;
    case 'neutral':
    default:
      return DS_COLORS.textMuted;
  }
};
