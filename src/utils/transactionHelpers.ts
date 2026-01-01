/**
 * Helpers para formatação e parsing de transações
 */

// Formata valor em centavos para moeda brasileira (R$ 1.234,56)
export function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, '') || '0';
  const num = parseInt(digits, 10);
  const cents = (num % 100).toString().padStart(2, '0');
  const integer = Math.floor(num / 100);
  const integerStr = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${integerStr},${cents}`;
}

// Parse string de moeda para número
export function parseCurrency(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

// Formata data para exibição (DD/MM/YYYY)
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Formata data por extenso (01 de janeiro de 2026)
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Retorna quantidade de dias no mês
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Nomes dos meses abreviados
export const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Nomes dos meses completos
export const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Dias da semana abreviados
export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Calcula próxima data baseado na recorrência
export function getNextRecurrenceDate(
  baseDate: Date,
  recurrence: 'weekly' | 'biweekly' | 'monthly' | 'yearly',
  index: number
): Date {
  const newDate = new Date(baseDate);
  
  switch (recurrence) {
    case 'weekly':
      newDate.setDate(newDate.getDate() + (7 * index));
      break;
    case 'biweekly':
      newDate.setDate(newDate.getDate() + (14 * index));
      break;
    case 'monthly':
      newDate.setMonth(newDate.getMonth() + index);
      break;
    case 'yearly':
      newDate.setFullYear(newDate.getFullYear() + index);
      break;
  }
  
  return newDate;
}

// Cores por tipo de transação
export const TRANSACTION_COLORS = {
  expense: '#E07A3F', // Laranja
  income: '#2FAF8E',  // Verde
  transfer: '#6366F1', // Roxo/Azul
} as const;

// Ícones por tipo de transação
export const TRANSACTION_ICONS = {
  expense: 'arrow-down',
  income: 'arrow-up',
  transfer: 'swap-horizontal',
} as const;

// Labels por tipo de transação
export const TRANSACTION_LABELS = {
  expense: 'Despesa',
  income: 'Receita',
  transfer: 'Transferência',
} as const;
