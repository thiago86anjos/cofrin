/**
 * Tipos e interfaces para o módulo de transações
 */

export type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
export type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'creditCard' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

export interface EditableTransaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  description: string;
  date: Date;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  creditCardId?: string;
  creditCardName?: string;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  recurrenceType?: 'installment' | 'fixed';
  goalId?: string;
  goalName?: string;
  seriesId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  month?: number;
  year?: number;
  anticipatedFrom?: { month: number; year: number; date: any };
  anticipationDiscount?: number;
  relatedTransactionId?: string;
}

export interface RecurrenceOption {
  label: string;
  value: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
}

export interface RecurrenceTypeOption {
  label: string;
  value: 'installment' | 'fixed';
  description: string;
}

// Opções de recorrência
export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { label: 'Não repetir', value: 'none' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Quinzenal', value: 'biweekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

// Opções de tipo de recorrência (parcelada ou fixa)
export const RECURRENCE_TYPE_OPTIONS: RecurrenceTypeOption[] = [
  { label: 'Parcelada', value: 'installment', description: 'Valor total dividido pelas repetições' },
  { label: 'Fixa', value: 'fixed', description: 'Mesmo valor em cada repetição' },
];

// Opções de número de repetições (1-72)
export const REPETITION_OPTIONS = Array.from({ length: 72 }, (_, i) => ({
  label: `${i + 1}x`,
  value: i + 1,
}));
