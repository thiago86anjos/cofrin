/**
 * Julius Summary Generator
 * Gera resumos financeiros baseados nos dados do Firestore
 */

import {
    getExpensesCurrentMonth,
    getExpensesPreviousMonth,
    getExpensesGroupedByCategory,
    getTopExpenses,
    getIncomesCurrentMonth,
    CategoryTotal,
    JuliusTransaction,
} from './juliusFirestore';

export interface FinancialSummary {
  // Mês atual
  currentMonth: {
    year: number;
    month: number;
    monthName: string;
  };
  
  // Totais
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  
  // Categorias
  categories: CategoryTotal[];
  topCategory?: CategoryTotal;
  categoryCount: number;
  
  // Comparação
  previousMonthTotal?: number;
  monthVariation?: number; // positivo = gastou mais, negativo = gastou menos
  monthVariationPercent?: number;
  
  // Estatísticas
  transactionCount: number;
  averageExpense: number;
  dailyAverage: number;
  daysInMonth: number;
  daysPassed: number;
  
  // Top gastos
  topExpenses: JuliusTransaction[];
  
  // Flags
  hasData: boolean;
  hasPreviousMonthData: boolean;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Gera um resumo financeiro completo do usuário
 */
export async function generateFinancialSummary(userId: string): Promise<FinancialSummary> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysPassed = now.getDate();

  // Buscar dados em paralelo
  const [
    currentExpenses,
    previousExpenses,
    categories,
    topExpenses,
    currentIncomes,
  ] = await Promise.all([
    getExpensesCurrentMonth(userId),
    getExpensesPreviousMonth(userId),
    getExpensesGroupedByCategory(userId),
    getTopExpenses(userId, 5),
    getIncomesCurrentMonth(userId),
  ]);

  // Calcular totais
  const totalExpenses = currentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncomes = currentIncomes.reduce((sum, t) => sum + t.amount, 0);
  const previousMonthTotal = previousExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Variação mensal
  let monthVariation: number | undefined;
  let monthVariationPercent: number | undefined;
  
  if (previousExpenses.length > 0) {
    monthVariation = totalExpenses - previousMonthTotal;
    monthVariationPercent = previousMonthTotal > 0
      ? ((monthVariation / previousMonthTotal) * 100)
      : 0;
  }

  // Estatísticas
  const transactionCount = currentExpenses.length;
  const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;
  const dailyAverage = daysPassed > 0 ? totalExpenses / daysPassed : 0;

  return {
    currentMonth: {
      year: currentYear,
      month: currentMonth,
      monthName: monthNames[currentMonth - 1],
    },
    
    totalExpenses,
    totalIncomes,
    balance: totalIncomes - totalExpenses,
    
    categories,
    topCategory: categories[0],
    categoryCount: categories.length,
    
    previousMonthTotal: previousExpenses.length > 0 ? previousMonthTotal : undefined,
    monthVariation,
    monthVariationPercent,
    
    transactionCount,
    averageExpense,
    dailyAverage,
    daysInMonth,
    daysPassed,
    
    topExpenses,
    
    hasData: currentExpenses.length > 0,
    hasPreviousMonthData: previousExpenses.length > 0,
  };
}

/**
 * Formata valor em reais
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata porcentagem
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
