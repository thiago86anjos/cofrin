/**
 * Julius Data Service
 * USA AS MESMAS FUNÇÕES QUE A HOME para garantir dados consistentes
 * 
 * IMPORTANTE: Este serviço usa transactionService e creditCardBillService
 * para que os números do Julius sejam IDÊNTICOS aos exibidos na UI.
 */

import * as transactionService from '../transactionService';
import {
    getPendingBillsMap,
    getCreditCardTransactionsByMonth,
    calculateBillTotal,
} from '../creditCardBillService';
import * as creditCardService from '../creditCardService';
import { Transaction } from '../../types/firebase';

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  total: number;
  count: number;
  percentage?: number;
}

export interface HomeConsistentData {
  // Transações filtradas (sem faturas pendentes)
  transactions: Transaction[];
  
  // Totais (idênticos à Home)
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
  
  // Categorias (idênticas à Home)
  expensesByCategory: CategoryTotal[];
  incomesByCategory: CategoryTotal[];
  
  // Estatísticas
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
  
  // Mês anterior
  previousMonthExpenses: number;
  previousMonthData: Transaction[];
}

/**
 * Busca dados do mês EXATAMENTE como a Home faz
 * Filtra transações de cartão com fatura pendente
 */
export async function getHomeConsistentData(
  userId: string,
  month?: number,
  year?: number
): Promise<HomeConsistentData> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();
  
  // Calcular mês anterior
  let prevMonth = targetMonth - 1;
  let prevYear = targetYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // Buscar em paralelo (igual useHomeData)
  const [currentTx, previousTx, pendingBillsMap] = await Promise.all([
    transactionService.getTransactionsByMonth(userId, targetMonth, targetYear),
    transactionService.getTransactionsByMonth(userId, prevMonth, prevYear),
    getPendingBillsMap(userId),
  ]);

  const pendingBillsKeys = new Set(pendingBillsMap.keys());

  // Filtrar transações (EXATAMENTE como useHomeData faz)
  const filteredTransactions = currentTx.filter((t) => {
    // Ignorar transações de cartão com fatura pendente
    if (t.creditCardId && t.month && t.year) {
      const billKey = `${t.creditCardId}-${t.month}-${t.year}`;
      if (pendingBillsKeys.has(billKey)) {
        return false;
      }
    }
    return true;
  });

  // Calcular totais (EXATAMENTE como useHomeData faz)
  let totalExpenses = 0;
  let totalIncomes = 0;
  let expenseCount = 0;
  let incomeCount = 0;

  for (const t of filteredTransactions) {
    if (t.status !== 'completed') continue;

    if (t.type === 'income') {
      totalIncomes += t.amount;
      incomeCount += 1;
    } else if (t.type === 'expense') {
      totalExpenses += t.amount;
      expenseCount += 1;
    }
  }

  // Agrupar por categoria (EXATAMENTE como useHomeData faz)
  const expenseMap = new Map<string, CategoryTotal>();
  const incomeMap = new Map<string, CategoryTotal>();

  for (const t of filteredTransactions) {
    if (t.status !== 'completed' || !t.categoryId) continue;

    const map = t.type === 'expense' ? expenseMap : t.type === 'income' ? incomeMap : null;
    if (!map) continue;

    const existing = map.get(t.categoryId);
    if (existing) {
      existing.total += t.amount;
      existing.count += 1;
    } else {
      map.set(t.categoryId, {
        categoryId: t.categoryId,
        categoryName: t.categoryName || 'Sem categoria',
        categoryIcon: t.categoryIcon,
        total: t.amount,
        count: 1,
      });
    }
  }

  // Calcular percentuais e ordenar
  const expensesByCategory = Array.from(expenseMap.values())
    .map((cat) => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const incomesByCategory = Array.from(incomeMap.values())
    .map((cat) => ({
      ...cat,
      percentage: totalIncomes > 0 ? (cat.total / totalIncomes) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Calcular mês anterior (com mesma lógica de filtro)
  const filteredPreviousTx = previousTx.filter((t) => {
    if (t.creditCardId && t.month && t.year) {
      const billKey = `${t.creditCardId}-${t.month}-${t.year}`;
      if (pendingBillsKeys.has(billKey)) {
        return false;
      }
    }
    return true;
  });

  let previousMonthExpenses = 0;
  for (const t of filteredPreviousTx) {
    if (t.status === 'completed' && t.type === 'expense') {
      previousMonthExpenses += t.amount;
    }
  }

  return {
    transactions: filteredTransactions,
    totalExpenses,
    totalIncomes,
    balance: totalIncomes - totalExpenses,
    expensesByCategory,
    incomesByCategory,
    transactionCount: filteredTransactions.length,
    expenseCount,
    incomeCount,
    previousMonthExpenses,
    previousMonthData: filteredPreviousTx,
  };
}

/**
 * Busca top gastos do mês (maiores valores)
 */
export async function getTopExpenses(
  userId: string,
  limit: number = 5,
  month?: number,
  year?: number
): Promise<Transaction[]> {
  const data = await getHomeConsistentData(userId, month, year);
  
  return data.transactions
    .filter((t) => t.type === 'expense' && t.status === 'completed')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Dados de gastos com cartão de crédito
 * USA AS MESMAS FUNÇÕES que o CreditCardsCard da Home
 */
export interface CreditCardData {
  totalUsed: number;
  totalIncome: number;
  usagePercentage: number;
  cards: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  status: 'controlled' | 'warning' | 'alert' | 'no-income';
  statusMessage: string;
}

/**
 * Busca dados de cartão de crédito EXATAMENTE como o CreditCardsCard faz
 */
export async function getCreditCardData(
  userId: string,
  month?: number,
  year?: number
): Promise<CreditCardData> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  // Buscar cartões do usuário
  const cards = await creditCardService.getCreditCards(userId);
  
  // Buscar receitas do mês para calcular porcentagem
  const homeData = await getHomeConsistentData(userId, targetMonth, targetYear);
  const totalIncome = homeData.totalIncomes;

  // Buscar gastos de cada cartão no mês (IGUAL ao CreditCardsCard)
  const cardAmounts: Array<{ id: string; name: string; amount: number }> = [];
  let totalUsed = 0;

  for (const card of cards) {
    try {
      const transactions = await getCreditCardTransactionsByMonth(
        userId,
        card.id!,
        targetMonth,
        targetYear
      );
      const amount = calculateBillTotal(transactions);
      
      if (amount > 0) {
        cardAmounts.push({
          id: card.id!,
          name: card.name,
          amount,
        });
        totalUsed += amount;
      }
    } catch (error) {
      console.error(`Erro ao buscar gastos do cartão ${card.id}:`, error);
    }
  }

  // Ordenar por valor (maior primeiro)
  cardAmounts.sort((a, b) => b.amount - a.amount);

  // Calcular porcentagem e status (IGUAL ao CreditCardsCard)
  const usagePercentage = totalIncome > 0 ? (totalUsed / totalIncome) * 100 : 0;
  
  let status: CreditCardData['status'];
  let statusMessage: string;

  if (totalIncome === 0) {
    status = 'no-income';
    statusMessage = 'Sem receitas registradas neste mês';
  } else if (usagePercentage <= 30) {
    status = 'controlled';
    statusMessage = 'Gastos controlados';
  } else if (usagePercentage <= 50) {
    status = 'warning';
    statusMessage = 'Cuidado, você está se aproximando do limite recomendado';
  } else {
    status = 'alert';
    statusMessage = 'Atenção, gastos elevados no cartão';
  }

  return {
    totalUsed,
    totalIncome,
    usagePercentage,
    cards: cardAmounts,
    status,
    statusMessage,
  };
}

/**
 * Dados de metas do usuário
 */
export interface GoalData {
  // Metas mensais (por categoria)
  monthlyGoals: Array<{
    id: string;
    name: string;
    categoryId: string;
    goalType: 'expense' | 'income';
    targetAmount: number;
    currentAmount: number;
    percentage: number;
    status: 'ok' | 'warning' | 'exceeded';
  }>;
  
  // Metas de longo prazo (poupança)
  longTermGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    percentage: number;
  }>;
  
  // Resumo
  hasMonthlyGoals: boolean;
  hasLongTermGoals: boolean;
  monthlyGoalsExceeded: number;
  monthlyGoalsWarning: number;
}

/**
 * Busca dados de metas do usuário
 */
export async function getGoalsData(userId: string): Promise<GoalData> {
  // Import dinâmico para evitar dependência circular
  const { getCurrentMonthlyGoals, updateMonthlyGoalsProgress } = await import('../monthlyGoalService');
  const goalService = await import('../goalService');

  // Atualizar progresso antes de buscar
  await updateMonthlyGoalsProgress(userId);

  // Buscar metas em paralelo
  const [monthlyGoalsRaw, longTermGoalsRaw] = await Promise.all([
    getCurrentMonthlyGoals(userId),
    goalService.getActiveGoals(userId),
  ]);

  // Processar metas mensais
  const monthlyGoals = monthlyGoalsRaw.map((goal) => {
    const percentage = goal.targetAmount > 0 
      ? (goal.currentAmount / goal.targetAmount) * 100 
      : 0;
    
    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (goal.goalType === 'expense') {
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 85) status = 'warning';
    }

    return {
      id: goal.id,
      name: goal.name,
      categoryId: goal.categoryId || '',
      goalType: goal.goalType as 'expense' | 'income',
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      percentage,
      status,
    };
  });

  // Metas de longo prazo (não são mensais)
  const longTermGoals = longTermGoalsRaw
    .filter((g) => !g.isMonthlyGoal)
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      percentage: goal.targetAmount > 0 
        ? (goal.currentAmount / goal.targetAmount) * 100 
        : 0,
    }));

  return {
    monthlyGoals,
    longTermGoals,
    hasMonthlyGoals: monthlyGoals.length > 0,
    hasLongTermGoals: longTermGoals.length > 0,
    monthlyGoalsExceeded: monthlyGoals.filter((g) => g.status === 'exceeded').length,
    monthlyGoalsWarning: monthlyGoals.filter((g) => g.status === 'warning').length,
  };
}
