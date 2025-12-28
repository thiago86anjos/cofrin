/**
 * Julius Data Service
 * LÓGICA SIMPLIFICADA:
 * - Despesas normais: status === 'completed'
 * - Faturas de cartão: isPaid === true E vencimento no mês atual
 */

import * as transactionService from '../transactionService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { Transaction, CreditCardBill } from '../../types/firebase';

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
 * Busca faturas PAGAS com vencimento no mês especificado
 */
async function getPaidBillsInMonth(
  userId: string,
  targetMonth: number,
  targetYear: number
): Promise<CreditCardBill[]> {
  // Definir range do mês (1º dia 00:00 até último dia 23:59)
  const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59); // último dia do mês

  const billsRef = collection(db, COLLECTIONS.CREDIT_CARD_BILLS);
  const q = query(
    billsRef,
    where('userId', '==', userId),
    where('isPaid', '==', true),
    where('dueDate', '>=', Timestamp.fromDate(startDate)),
    where('dueDate', '<=', Timestamp.fromDate(endDate))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CreditCardBill[];
}

/**
 * Busca dados do mês - LÓGICA SIMPLIFICADA
 * 
 * Despesas normais: status === 'completed' (sem cartão)
 * Cartão de crédito: soma faturas PAGAS com vencimento no mês
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

  // Buscar em paralelo
  const [currentTx, previousTx, paidBillsCurrentMonth, paidBillsPrevMonth] = await Promise.all([
    transactionService.getTransactionsByMonth(userId, targetMonth, targetYear),
    transactionService.getTransactionsByMonth(userId, prevMonth, prevYear),
    getPaidBillsInMonth(userId, targetMonth, targetYear),
    getPaidBillsInMonth(userId, prevMonth, prevYear),
  ]);

  // Criar set de IDs de faturas pagas no mês (para associar transações)
  const paidBillIds = new Set(paidBillsCurrentMonth.map(b => b.id));
  const paidBillsPrevIds = new Set(paidBillsPrevMonth.map(b => b.id));

  // Total de faturas pagas no mês
  const creditCardExpenses = paidBillsCurrentMonth.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const creditCardExpensesPrev = paidBillsPrevMonth.reduce((sum, bill) => sum + bill.totalAmount, 0);

  console.log(`[Julius] Mês ${targetMonth}/${targetYear}:`);
  console.log(`[Julius] Faturas PAGAS com vencimento neste mês: ${paidBillsCurrentMonth.length}`);
  paidBillsCurrentMonth.forEach(b => {
    const dueDate = b.dueDate?.toDate?.() || new Date();
    console.log(`  - ${b.creditCardName}: R$${b.totalAmount.toFixed(2)} (venc: ${dueDate.toLocaleDateString('pt-BR')})`);
  });
  console.log(`[Julius] Total faturas pagas: R$${creditCardExpenses.toFixed(2)}`);

  // Filtrar transações: incluir apenas despesas NORMAIS
  // - Sem creditCardId (não é compra no cartão)
  // - Sem creditCardBillId (não é pagamento de fatura)
  // - status === 'completed'
  const normalExpenses = currentTx.filter((t) => 
    !t.creditCardId && 
    !(t as any).creditCardBillId && // Exclui pagamentos de fatura
    t.status === 'completed' && 
    t.type === 'expense'
  );

  const normalIncomes = currentTx.filter((t) => 
    t.status === 'completed' && t.type === 'income'
  );

  // Todas as transações "válidas" (sem cartão, sem pagamento de fatura)
  const filteredTransactions = currentTx.filter((t) => 
    !t.creditCardId && 
    !(t as any).creditCardBillId && 
    t.status === 'completed'
  );

  // Calcular totais
  const normalExpensesTotal = normalExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = normalExpensesTotal + creditCardExpenses;
  const totalIncomes = normalIncomes.reduce((sum, t) => sum + t.amount, 0);

  console.log(`[Julius] Despesas normais (sem cartão): R$${normalExpensesTotal.toFixed(2)}`);
  console.log(`[Julius] TOTAL despesas (normais + cartão pago): R$${totalExpenses.toFixed(2)}`);

  // Agrupar por categoria (apenas transações normais por enquanto)
  const expenseMap = new Map<string, CategoryTotal>();
  const incomeMap = new Map<string, CategoryTotal>();

  for (const t of filteredTransactions) {
    if (!t.categoryId) continue;

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

  // Adicionar categoria "Cartão de Crédito" se houver faturas pagas
  if (creditCardExpenses > 0) {
    expenseMap.set('credit-card-bills', {
      categoryId: 'credit-card-bills',
      categoryName: 'Cartão de Crédito',
      categoryIcon: '💳',
      total: creditCardExpenses,
      count: paidBillsCurrentMonth.length,
    });
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

  // Calcular mês anterior (mesma lógica simplificada)
  const normalExpensesPrev = previousTx.filter((t) => 
    !t.creditCardId && 
    !(t as any).creditCardBillId && // Exclui pagamentos de fatura
    t.status === 'completed' && 
    t.type === 'expense'
  );
  const previousMonthExpenses = normalExpensesPrev.reduce((sum, t) => sum + t.amount, 0) + creditCardExpensesPrev;

  return {
    transactions: filteredTransactions,
    totalExpenses,
    totalIncomes,
    balance: totalIncomes - totalExpenses,
    expensesByCategory,
    incomesByCategory,
    transactionCount: filteredTransactions.length,
    expenseCount: normalExpenses.length + paidBillsCurrentMonth.length,
    incomeCount: normalIncomes.length,
    previousMonthExpenses,
    previousMonthData: previousTx.filter((t) => 
      !t.creditCardId && 
      !(t as any).creditCardBillId && 
      t.status === 'completed'
    ),
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
 * USA LÓGICA SIMPLIFICADA: faturas PAGAS com vencimento no mês
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
 * Busca dados de cartão de crédito - APENAS FATURAS PAGAS NO MÊS
 * Considera apenas faturas com isPaid=true E vencimento no mês atual
 */
export async function getCreditCardData(
  userId: string,
  month?: number,
  year?: number
): Promise<CreditCardData> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  // Buscar faturas PAGAS com vencimento no mês
  const paidBills = await getPaidBillsInMonth(userId, targetMonth, targetYear);
  
  // Buscar receitas do mês
  const homeData = await getHomeConsistentData(userId, targetMonth, targetYear);
  const totalIncome = homeData.totalIncomes;

  // Agrupar por cartão
  const cardMap = new Map<string, { id: string; name: string; amount: number }>();
  let totalUsed = 0;

  for (const bill of paidBills) {
    totalUsed += bill.totalAmount;
    
    const existing = cardMap.get(bill.creditCardId);
    if (existing) {
      existing.amount += bill.totalAmount;
    } else {
      cardMap.set(bill.creditCardId, {
        id: bill.creditCardId,
        name: bill.creditCardName || 'Cartão',
        amount: bill.totalAmount,
      });
    }
  }

  // Ordenar por valor (maior primeiro)
  const cardAmounts = Array.from(cardMap.values()).sort((a, b) => b.amount - a.amount);

  // Calcular porcentagem e status
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
