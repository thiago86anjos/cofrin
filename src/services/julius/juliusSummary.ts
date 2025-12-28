/**
 * Julius Summary Generator
 * 
 * IMPORTANTE: Usa juliusDataService que aplica as MESMAS regras de filtro
 * que a Home (faturas pendentes, status, etc).
 * Isso garante que os números do Julius sejam IDÊNTICOS aos da UI.
 */

import {
    getHomeConsistentData,
    getTopExpenses as getTopExpensesList,
    getCreditCardData,
    getGoalsData,
    CategoryTotal,
    CreditCardData
} from './juliusDataService';
import * as accountService from '../accountService';

// Re-export CategoryTotal para compatibilidade
export { CategoryTotal, CreditCardData, GoalData } from './juliusDataService';

// Tipo simplificado para top expenses (compatível com respostas)
export interface TopExpense {
  id: string;
  amount: number;
  description: string;
  categoryName?: string;
  date: Date;
}

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
  
  // Categorias de despesas
  categories: CategoryTotal[];
  topCategory?: CategoryTotal;
  categoryCount: number;
  
  // Categorias de receitas
  incomeCategories: CategoryTotal[];
  topIncomeCategory?: CategoryTotal;
  incomeCategoryCount: number;
  
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
  topExpenses: TopExpense[];
  
  // Cartões de crédito (IGUAL ao CreditCardsCard)
  creditCard?: CreditCardData;
  
  // Metas (mensais e longo prazo)
  goals?: GoalData;
  
  // Saldo das contas
  accountsBalance: number;
  
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
 * USA getHomeConsistentData para garantir dados IDÊNTICOS à Home
 */
export async function generateFinancialSummary(userId: string): Promise<FinancialSummary> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysPassed = now.getDate();

  // Buscar dados CONSISTENTES com a Home (já filtrados)
  const [homeData, topExpensesTx, creditCardData, goalsData, accounts] = await Promise.all([
    getHomeConsistentData(userId, currentMonth, currentYear),
    getTopExpensesList(userId, 5, currentMonth, currentYear),
    getCreditCardData(userId, currentMonth, currentYear),
    getGoalsData(userId),
    accountService.getAccounts(userId),
  ]);

  // Saldo total das contas
  const accountsBalance = accounts
    .filter(acc => acc.includeInTotal)
    .reduce((sum, acc) => sum + acc.balance, 0);

  // Dados já calculados pelo homeData (IDÊNTICOS à Home)
  const { 
    totalExpenses, 
    totalIncomes, 
    balance,
    expensesByCategory: categories,
    incomesByCategory: incomeCategories,
    expenseCount: transactionCount,
    previousMonthExpenses: previousMonthTotal,
    previousMonthData,
  } = homeData;

  // Variação mensal
  let monthVariation: number | undefined;
  let monthVariationPercent: number | undefined;
  
  if (previousMonthData.length > 0) {
    monthVariation = totalExpenses - previousMonthTotal;
    monthVariationPercent = previousMonthTotal > 0
      ? ((monthVariation / previousMonthTotal) * 100)
      : 0;
  }

  // Estatísticas
  const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;
  const dailyAverage = daysPassed > 0 ? totalExpenses / daysPassed : 0;

  // Converter top expenses para formato simplificado
  const topExpenses: TopExpense[] = topExpensesTx.map((t) => ({
    id: t.id!,
    amount: t.amount,
    description: t.description,
    categoryName: t.categoryName,
    date: t.date.toDate(),
  }));

  return {
    currentMonth: {
      year: currentYear,
      month: currentMonth,
      monthName: monthNames[currentMonth - 1],
    },
    
    totalExpenses,
    totalIncomes,
    balance,
    
    categories,
    topCategory: categories[0],
    categoryCount: categories.length,
    
    incomeCategories,
    topIncomeCategory: incomeCategories[0],
    incomeCategoryCount: incomeCategories.length,
    
    previousMonthTotal: previousMonthData.length > 0 ? previousMonthTotal : undefined,
    monthVariation,
    monthVariationPercent,
    
    transactionCount,
    averageExpense,
    dailyAverage,
    daysInMonth,
    daysPassed,
    
    topExpenses,
    
    creditCard: creditCardData,
    
    goals: goalsData,
    
    accountsBalance,
    
    hasData: homeData.transactionCount > 0,
    hasPreviousMonthData: previousMonthData.length > 0,
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
