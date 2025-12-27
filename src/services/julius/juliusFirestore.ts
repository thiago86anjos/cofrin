/**
 * Julius Firestore Service
 * Consultas ao Firestore para dados financeiros do usuário
 */

import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export interface JuliusTransaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  description: string;
  date: Date;
  categoryId?: string;
  categoryName?: string;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  percentage?: number;
}

/**
 * Retorna o primeiro e último dia do mês
 */
function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Busca despesas do mês atual
 */
export async function getExpensesCurrentMonth(userId: string): Promise<JuliusTransaction[]> {
  const now = new Date();
  return getExpensesByMonth(userId, now.getFullYear(), now.getMonth() + 1);
}

/**
 * Busca despesas do mês anterior
 */
export async function getExpensesPreviousMonth(userId: string): Promise<JuliusTransaction[]> {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed, então já é o mês anterior
  
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  
  return getExpensesByMonth(userId, year, month);
}

/**
 * Busca despesas de um mês específico
 */
export async function getExpensesByMonth(
  userId: string,
  year: number,
  month: number
): Promise<JuliusTransaction[]> {
  const { start, end } = getMonthRange(year, month);
  
  const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('type', '==', 'expense'),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end)),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date.toDate(),
      categoryId: data.categoryId,
      categoryName: data.categoryName || 'Sem categoria',
    };
  });
}

/**
 * Agrupa despesas por categoria
 */
export async function getExpensesGroupedByCategory(
  userId: string,
  year?: number,
  month?: number
): Promise<CategoryTotal[]> {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;
  
  const expenses = await getExpensesByMonth(userId, targetYear, targetMonth);
  
  const categoryMap = new Map<string, CategoryTotal>();
  let totalAmount = 0;
  
  for (const expense of expenses) {
    const key = expense.categoryId || 'uncategorized';
    const existing = categoryMap.get(key);
    
    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
    } else {
      categoryMap.set(key, {
        categoryId: key,
        categoryName: expense.categoryName || 'Sem categoria',
        total: expense.amount,
        count: 1,
      });
    }
    
    totalAmount += expense.amount;
  }
  
  // Calcular percentuais
  const result = Array.from(categoryMap.values()).map((cat) => ({
    ...cat,
    percentage: totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0,
  }));
  
  // Ordenar por total (maior primeiro)
  return result.sort((a, b) => b.total - a.total);
}

/**
 * Busca os maiores gastos do mês
 */
export async function getTopExpenses(
  userId: string,
  limit: number = 5
): Promise<JuliusTransaction[]> {
  const expenses = await getExpensesCurrentMonth(userId);
  
  return expenses
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Busca receitas do mês atual
 */
export async function getIncomesCurrentMonth(userId: string): Promise<JuliusTransaction[]> {
  const now = new Date();
  const { start, end } = getMonthRange(now.getFullYear(), now.getMonth() + 1);
  
  const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('type', '==', 'income'),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<=', Timestamp.fromDate(end))
  );

  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date.toDate(),
      categoryId: data.categoryId,
      categoryName: data.categoryName,
    };
  });
}
