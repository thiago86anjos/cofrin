import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import type { Goal, Transaction } from '../types/firebase';

/**
 * Calcula o progresso de uma meta mensal
 * REGRA CRÍTICA: Evita duplicidade entre transações e faturas
 * Considera:
 * - Transações em contas (pendentes ou concluídas)
 * - Transações de cartão de crédito (do mês, independente de status da fatura)
 */
export async function calculateMonthlyGoalProgress(
  userId: string,
  categoryId: string,
  goalType: 'expense' | 'income',
  month: number,
  year: number
): Promise<number> {
  // Buscar todas as transações do mês vigente para a categoria
  const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
  const transactionsQuery = query(
    transactionsRef,
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('month', '==', month),
    where('year', '==', year)
  );

  const transactionsSnapshot = await getDocs(transactionsQuery);
  const transactions = transactionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Transaction[];

  let total = 0;

  // Para DESPESA: considerar transações + transações de cartão
  if (goalType === 'expense') {
    // ✅ Transações em contas (pendentes ou concluídas, exceto canceladas)
    const accountTransactions = transactions.filter(
      t => !t.creditCardId && t.type === 'expense' && t.status !== 'cancelled'
    );
    
    const accountTotal = accountTransactions.reduce((sum, t) => sum + t.amount, 0);

    // ✅ Transações de cartão de crédito do mês
    // IMPORTANTE: Pega transações do mês independente se a fatura foi paga ou não
    // A transação do cartão já tem o mês/ano da compra, não da fatura
    const creditCardTransactions = transactions.filter(
      t => t.creditCardId && t.type === 'expense' && t.status !== 'cancelled'
    );

    const creditCardTotal = creditCardTransactions.reduce((sum, t) => sum + t.amount, 0);

    total = accountTotal + creditCardTotal;

  } else {
    // Para RECEITA: transações em contas (pendentes ou concluídas, exceto canceladas)
    const incomeTransactions = transactions.filter(
      t => t.type === 'income' && t.status !== 'cancelled'
    );

    total = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  }

  return total;
}

/**
 * Cria uma nova meta mensal
 * Valida se já existe uma meta para a categoria no mês atual
 */
export async function createMonthlyGoal(
  userId: string,
  categoryId: string,
  goalType: 'expense' | 'income',
  targetAmount: number,
  categoryName: string
): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Verificar se já existe meta para essa categoria no mês atual
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const existingGoalQuery = query(
    goalsRef,
    where('userId', '==', userId),
    where('categoryId', '==', categoryId),
    where('isMonthlyGoal', '==', true),
    where('isActive', '==', true),
    where('month', '==', month),
    where('year', '==', year)
  );

  const existingSnapshot = await getDocs(existingGoalQuery);
  if (!existingSnapshot.empty) {
    throw new Error('Já existe uma meta para esta categoria no mês atual');
  }

  const goalData: Omit<Goal, 'id'> = {
    userId,
    name: categoryName, // Usar nome da categoria como nome da meta
    targetAmount,
    currentAmount: 0, // Será calculado
    timeframe: 'short', // Placeholder, não usado para metas mensais
    isActive: true,
    isMonthlyGoal: true,
    goalType,
    categoryId,
    month,
    year,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(goalsRef, goalData);

  return docRef.id;
}

/**
 * Atualiza uma meta mensal existente
 */
export async function updateMonthlyGoal(
  goalId: string,
  targetAmount: number
): Promise<void> {
  console.log('[monthlyGoalService] Iniciando updateMonthlyGoal:', { goalId, targetAmount });
  const goalRef = doc(db, COLLECTIONS.GOALS, goalId);
  console.log('[monthlyGoalService] Goal ref criada:', goalRef.path);
  await updateDoc(goalRef, {
    targetAmount,
    updatedAt: Timestamp.now(),
  });
  console.log('[monthlyGoalService] updateDoc executado com sucesso');
}

/**
 * Atualiza o progresso de todas as metas mensais do usuário
 */
export async function updateMonthlyGoalsProgress(userId: string): Promise<void> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Buscar apenas metas mensais ativas do mês atual
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const goalsQuery = query(
    goalsRef,
    where('userId', '==', userId),
    where('isMonthlyGoal', '==', true),
    where('isActive', '==', true),
    where('month', '==', currentMonth),
    where('year', '==', currentYear)
  );

  const goalsSnapshot = await getDocs(goalsQuery);
  const goals = goalsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Goal[];

  // Atualizar progresso de cada meta
  for (const goal of goals) {
    if (!goal.categoryId || !goal.goalType) continue;

    const currentAmount = await calculateMonthlyGoalProgress(
      userId,
      goal.categoryId,
      goal.goalType,
      currentMonth,
      currentYear
    );

    const goalDocRef = doc(db, COLLECTIONS.GOALS, goal.id);
    await updateDoc(goalDocRef, {
      currentAmount,
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Busca metas mensais do mês atual
 */
export async function getCurrentMonthlyGoals(userId: string): Promise<Goal[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const goalsQuery = query(
    goalsRef,
    where('userId', '==', userId),
    where('isMonthlyGoal', '==', true),
    where('isActive', '==', true),
    where('month', '==', currentMonth),
    where('year', '==', currentYear)
  );

  // Forçar busca do servidor para evitar cache após atualização
  const snapshot = await getDocs(goalsQuery);
  const goals = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Goal[];
  
  return goals;
}

/**
 * Deleta uma meta mensal
 */
export async function deleteMonthlyGoal(goalId: string): Promise<void> {
  const goalDocRef = doc(db, COLLECTIONS.GOALS, goalId);
  await deleteDoc(goalDocRef);
}

/**
 * Verifica se há metas mensais de despesa >= 85% que não foram reconhecidas
 */
export async function hasMonthlyGoalsAlert(userId: string): Promise<boolean> {
  const goals = await getCurrentMonthlyGoals(userId);
  
  const expenseGoals = goals.filter(g => g.goalType === 'expense');
  
  return expenseGoals.some(goal => {
    // Ignorar se já foi reconhecido
    if (goal.alertAcknowledged) return false;
    
    const percentage = (goal.currentAmount / goal.targetAmount) * 100;
    return percentage >= 85;
  });
}
