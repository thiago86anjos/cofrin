// ==========================================
// TIPOS E INTERFACES DO FIREBASE
// ==========================================

import { Timestamp } from 'firebase/firestore';

// ==========================================
// BASE
// ==========================================

export interface BaseDocument {
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// CATEGORIAS
// ==========================================

export type CategoryType = 'expense' | 'income';

export interface Category extends BaseDocument {
  name: string;
  icon: string;
  type: CategoryType;
  color?: string;
  isDefault?: boolean; // Categorias padrão do sistema
}

export type CreateCategoryInput = Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ==========================================
// CONTAS
// ==========================================

export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'other';

export interface Account extends BaseDocument {
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  icon?: string;
  color?: string;
  includeInTotal: boolean; // Se inclui no saldo geral
  isArchived: boolean;
}

export type CreateAccountInput = Omit<Account, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'balance'> & {
  balance?: number;
};
export type UpdateAccountInput = Partial<CreateAccountInput>;

// Labels para tipos de conta
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  investment: 'Investimento',
  other: 'Outro',
};

// ==========================================
// CARTÕES DE CRÉDITO
// ==========================================

export interface CreditCard extends BaseDocument {
  name: string;
  lastDigits?: string; // Últimos 4 dígitos
  limit: number;
  closingDay: number; // Dia de fechamento (1-31)
  dueDay: number; // Dia de vencimento (1-31)
  icon?: string;
  color?: string;
  isArchived: boolean;
}

export type CreateCreditCardInput = Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
export type UpdateCreditCardInput = Partial<CreateCreditCardInput>;

// ==========================================
// TRANSAÇÕES / LANÇAMENTOS
// ==========================================

export type TransactionType = 'expense' | 'income' | 'transfer';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface Transaction extends BaseDocument {
  type: TransactionType;
  amount: number;
  description: string;
  date: Timestamp;
  
  // Categoria (não aplicável para transferências)
  categoryId?: string;
  categoryName?: string; // Desnormalizado para performance
  categoryIcon?: string;
  
  // Conta origem (sempre presente)
  accountId: string;
  accountName?: string; // Desnormalizado
  
  // Conta destino (apenas para transferências)
  toAccountId?: string;
  toAccountName?: string;
  
  // Cartão de crédito (opcional, para despesas no cartão)
  creditCardId?: string;
  creditCardName?: string;
  
  // Recorrência
  recurrence: RecurrenceType;
  recurrenceEndDate?: Timestamp;
  parentTransactionId?: string; // Se é uma transação gerada por recorrência
  
  // Status
  status: TransactionStatus;
  
  // Campos auxiliares
  notes?: string;
  tags?: string[];
  
  // Para organização por período
  month: number; // 1-12
  year: number;
}

export type CreateTransactionInput = Omit<
  Transaction, 
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'month' | 'year' | 'categoryName' | 'categoryIcon' | 'accountName' | 'toAccountName' | 'creditCardName'
>;
export type UpdateTransactionInput = Partial<CreateTransactionInput>;

// ==========================================
// FATURA DO CARTÃO
// ==========================================

export interface CreditCardBill extends BaseDocument {
  creditCardId: string;
  creditCardName: string;
  month: number;
  year: number;
  totalAmount: number;
  dueDate: Timestamp;
  isPaid: boolean;
  paidAt?: Timestamp;
  paidFromAccountId?: string;
}

// ==========================================
// METAS / OBJETIVOS
// ==========================================

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface Goal extends BaseDocument {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Timestamp;
  icon?: string;
  color?: string;
  status: GoalStatus;
}

export type CreateGoalInput = Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentAmount'>;
export type UpdateGoalInput = Partial<CreateGoalInput>;

// ==========================================
// PREFERÊNCIAS DO USUÁRIO
// ==========================================

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'teal' | 'dark' | 'light';
  currency: string;
  language: string;
  homeComponentsOrder: string[];
  notifications: {
    billReminders: boolean;
    goalProgress: boolean;
    weeklyReport: boolean;
  };
}

// ==========================================
// HELPERS / CONSTANTES
// ==========================================

// Categorias padrão de despesa
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Alimentação', icon: 'food', type: 'expense', isDefault: true },
  { name: 'Transporte', icon: 'bus', type: 'expense', isDefault: true },
  { name: 'Moradia', icon: 'home', type: 'expense', isDefault: true },
  { name: 'Saúde', icon: 'hospital-box', type: 'expense', isDefault: true },
  { name: 'Educação', icon: 'school', type: 'expense', isDefault: true },
  { name: 'Compras', icon: 'shopping', type: 'expense', isDefault: true },
  { name: 'Lazer', icon: 'gamepad-variant', type: 'expense', isDefault: true },
  { name: 'Outros', icon: 'dots-horizontal', type: 'expense', isDefault: true },
];

// Categorias padrão de receita
export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Salário', icon: 'briefcase', type: 'income', isDefault: true },
  { name: 'Freelance', icon: 'cash-multiple', type: 'income', isDefault: true },
  { name: 'Investimentos', icon: 'chart-line', type: 'income', isDefault: true },
  { name: 'Outros', icon: 'dots-horizontal', type: 'income', isDefault: true },
];

// Ícones disponíveis para categorias
export const CATEGORY_ICONS = {
  expense: [
    'food', 'bus', 'home', 'hospital-box', 'school', 'shopping', 
    'gamepad-variant', 'dumbbell', 'paw', 'car', 'cellphone', 'wifi',
    'lightning-bolt', 'water', 'gas-station', 'pill', 'gift', 'dots-horizontal',
  ],
  income: [
    'briefcase', 'cash-multiple', 'chart-line', 'hand-coin', 
    'gift', 'sale', 'cash-refund', 'dots-horizontal',
  ],
};

// Ícones para contas
export const ACCOUNT_ICONS = [
  'wallet', 'bank', 'piggy-bank', 'cash', 'credit-card', 
  'safe', 'chart-line', 'bitcoin', 'currency-usd',
];

// Ícones para cartões de crédito
export const CREDIT_CARD_ICONS = [
  'credit-card', 'credit-card-outline', 'credit-card-chip', 
  'credit-card-wireless', 'card-bulleted',
];
