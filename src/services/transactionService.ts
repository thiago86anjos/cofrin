// ==========================================
// SERVIÇO DE TRANSAÇÕES / LANÇAMENTOS
// ==========================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where, Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import {
    Transaction,
    CreateTransactionInput,
    UpdateTransactionInput,
    TransactionType,
} from '../types/firebase';
import { updateAccountBalance } from './accountService';
import { getCategoryById } from './categoryService';
import { getAccountById } from './accountService';
import { getCreditCardById } from './creditCardService';

const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);

// ==========================================
// CRIAR TRANSAÇÃO
// ==========================================

export async function createTransaction(
  userId: string,
  data: CreateTransactionInput
): Promise<Transaction> {
  const now = Timestamp.now();
  const transactionDate = data.date.toDate();
  const month = transactionDate.getMonth() + 1;
  const year = transactionDate.getFullYear();

  // Buscar dados desnormalizados
  let categoryName: string | undefined;
  let categoryIcon: string | undefined;
  let accountName: string | undefined;
  let toAccountName: string | undefined;
  let creditCardName: string | undefined;

  // Categoria
  if (data.categoryId) {
    const category = await getCategoryById(data.categoryId);
    if (category) {
      categoryName = category.name;
      categoryIcon = category.icon;
    }
  }

  // Conta origem
  const account = await getAccountById(data.accountId);
  if (account) {
    accountName = account.name;
  }

  // Conta destino (transferência)
  if (data.toAccountId) {
    const toAccount = await getAccountById(data.toAccountId);
    if (toAccount) {
      toAccountName = toAccount.name;
    }
  }

  // Cartão de crédito
  if (data.creditCardId) {
    const card = await getCreditCardById(data.creditCardId);
    if (card) {
      creditCardName = card.name;
    }
  }

  // Criar transação - construir objeto sem campos undefined
  const transactionData: Record<string, any> = {
    type: data.type,
    amount: data.amount,
    description: data.description,
    date: data.date,
    accountId: data.accountId,
    recurrence: data.recurrence,
    status: data.status,
    userId,
    month,
    year,
    createdAt: now,
    updatedAt: now,
  };

  // Adicionar campos opcionais apenas se tiverem valor
  if (data.categoryId) {
    transactionData.categoryId = data.categoryId;
    if (categoryName) transactionData.categoryName = categoryName;
    if (categoryIcon) transactionData.categoryIcon = categoryIcon;
  }
  if (accountName) transactionData.accountName = accountName;
  if (data.toAccountId) {
    transactionData.toAccountId = data.toAccountId;
    if (toAccountName) transactionData.toAccountName = toAccountName;
  }
  if (data.creditCardId) {
    transactionData.creditCardId = data.creditCardId;
    if (creditCardName) transactionData.creditCardName = creditCardName;
  }
  if (data.notes) transactionData.notes = data.notes;
  if (data.tags && data.tags.length > 0) transactionData.tags = data.tags;
  if (data.recurrenceEndDate) transactionData.recurrenceEndDate = data.recurrenceEndDate;
  if (data.parentTransactionId) transactionData.parentTransactionId = data.parentTransactionId;
  if (data.seriesId) transactionData.seriesId = data.seriesId;

  const docRef = await addDoc(transactionsRef, transactionData);

  // Atualizar saldos das contas apenas se status for 'completed' e não for cartão de crédito
  if (!data.creditCardId && data.status === 'completed') {
    await updateBalancesForTransaction(data);
  }

  // Retornar transação criada (com os mesmos dados salvos)
  return {
    id: docRef.id,
    ...transactionData,
  } as Transaction;
}

// Atualizar saldos das contas baseado na transação
async function updateBalancesForTransaction(
  data: CreateTransactionInput | UpdateTransactionInput & { accountId: string },
  isReverse: boolean = false
): Promise<void> {
  const multiplier = isReverse ? -1 : 1;
  const amount = (data.amount ?? 0) * multiplier;

  switch (data.type) {
    case 'expense':
      // Despesa: subtrai da conta
      await updateAccountBalance(data.accountId!, -amount);
      break;
    case 'income':
      // Receita: adiciona na conta
      await updateAccountBalance(data.accountId!, amount);
      break;
    case 'transfer':
      // Transferência: subtrai da origem, adiciona no destino
      await updateAccountBalance(data.accountId!, -amount);
      if (data.toAccountId) {
        await updateAccountBalance(data.toAccountId, amount);
      }
      break;
  }
}

// ==========================================
// BUSCAR TRANSAÇÕES
// ==========================================

// Buscar transações por mês/ano
export async function getTransactionsByMonth(
  userId: string,
  month: number,
  year: number
): Promise<Transaction[]> {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('month', '==', month),
    where('year', '==', year)
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

// Buscar transações por período
export async function getTransactionsByPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

// Buscar transações por tipo
export async function getTransactionsByType(
  userId: string,
  type: TransactionType,
  month?: number,
  year?: number
): Promise<Transaction[]> {
  let q;

  if (month && year) {
    q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('type', '==', type),
      where('month', '==', month),
      where('year', '==', year)
    );
  } else {
    q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('type', '==', type)
    );
  }

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

// Buscar transações por conta
export async function getTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<Transaction[]> {
  // Transações onde a conta é origem
  const q1 = query(
    transactionsRef,
    where('userId', '==', userId),
    where('accountId', '==', accountId)
  );

  // Transações onde a conta é destino (transferências)
  const q2 = query(
    transactionsRef,
    where('userId', '==', userId),
    where('toAccountId', '==', accountId)
  );

  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2),
  ]);

  const transactions = [
    ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })),
  ] as Transaction[];

  // Ordenar por data e remover duplicatas
  return transactions
    .filter((t, index, self) => self.findIndex(x => x.id === t.id) === index)
    .sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

// Buscar transações por cartão de crédito
export async function getTransactionsByCreditCard(
  userId: string,
  creditCardId: string,
  month?: number,
  year?: number
): Promise<Transaction[]> {
  let q;

  if (month && year) {
    q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('creditCardId', '==', creditCardId),
      where('month', '==', month),
      where('year', '==', year)
    );
  } else {
    q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('creditCardId', '==', creditCardId)
    );
  }

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions.sort((a, b) => b.date.toMillis() - a.date.toMillis());
}

// Buscar transações recentes
export async function getRecentTransactions(
  userId: string,
  limitCount: number = 10
): Promise<Transaction[]> {
  // Buscar todas do usuário e limitar no cliente
  const q = query(
    transactionsRef,
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions
    .sort((a, b) => b.date.toMillis() - a.date.toMillis())
    .slice(0, limitCount);
}

// Buscar transação por ID
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Transaction;
}

// ==========================================
// ATUALIZAR TRANSAÇÃO
// ==========================================

export async function updateTransaction(
  transactionId: string,
  data: UpdateTransactionInput,
  oldTransaction: Transaction
): Promise<void> {
  const oldWasCompleted = oldTransaction.status === 'completed';
  const newStatus = data.status ?? oldTransaction.status;
  const newWillBeCompleted = newStatus === 'completed';

  // Reverter saldos antigos APENAS se a transação antiga era completed
  if (!oldTransaction.creditCardId && oldWasCompleted) {
    await updateBalancesForTransaction(
      { ...oldTransaction, type: oldTransaction.type },
      true
    );
  }

  // Atualizar transação
  const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
  
  const updateData: any = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  // Atualizar mês/ano se a data mudou
  if (data.date) {
    const transactionDate = data.date.toDate();
    updateData.month = transactionDate.getMonth() + 1;
    updateData.year = transactionDate.getFullYear();
  }

  await updateDoc(docRef, updateData);

  // Aplicar novos saldos APENAS se a transação nova é completed
  const newData = { ...oldTransaction, ...data };
  if (!newData.creditCardId && newWillBeCompleted) {
    await updateBalancesForTransaction(newData as any);
  }
}

// ==========================================
// DELETAR TRANSAÇÃO
// ==========================================

export async function deleteTransaction(transaction: Transaction): Promise<void> {
  // Reverter saldos apenas se status era 'completed' e não era cartão de crédito
  if (!transaction.creditCardId && transaction.status === 'completed') {
    await updateBalancesForTransaction(
      { ...transaction, type: transaction.type },
      true
    );
  }

  // Deletar transação
  const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transaction.id);
  await deleteDoc(docRef);
}

// Buscar transações por seriesId
export async function getTransactionsBySeries(
  userId: string,
  seriesId: string
): Promise<Transaction[]> {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('seriesId', '==', seriesId)
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];
  
  return transactions.sort((a, b) => a.date.toMillis() - b.date.toMillis());
}

// Deletar todas as transações de uma série
export async function deleteTransactionSeries(
  userId: string,
  seriesId: string
): Promise<number> {
  const transactions = await getTransactionsBySeries(userId, seriesId);
  let deletedCount = 0;

  for (const transaction of transactions) {
    try {
      await deleteTransaction(transaction);
      deletedCount++;
    } catch (error) {
      console.error(`Erro ao deletar transação ${transaction.id}:`, error);
    }
  }

  return deletedCount;
}

// ==========================================
// CÁLCULOS / TOTAIS
// ==========================================

// Calcular totais do mês
export async function getMonthTotals(
  userId: string,
  month: number,
  year: number
): Promise<{ income: number; expense: number; balance: number }> {
  const transactions = await getTransactionsByMonth(userId, month, year);
  
  let income = 0;
  let expense = 0;

  for (const t of transactions) {
    if (t.status === 'cancelled') continue;
    
    if (t.type === 'income') {
      income += t.amount;
    } else if (t.type === 'expense') {
      expense += t.amount;
    }
  }

  return {
    income,
    expense,
    balance: income - expense,
  };
}

// Buscar gastos por categoria
export async function getExpensesByCategory(
  userId: string,
  month: number,
  year: number
): Promise<Map<string, { categoryId: string; categoryName: string; categoryIcon: string; total: number }>> {
  const transactions = await getTransactionsByType(userId, 'expense', month, year);
  
  const byCategory = new Map<string, { categoryId: string; categoryName: string; categoryIcon: string; total: number }>();

  for (const t of transactions) {
    if (t.status === 'cancelled' || !t.categoryId) continue;

    const existing = byCategory.get(t.categoryId);
    if (existing) {
      existing.total += t.amount;
    } else {
      byCategory.set(t.categoryId, {
        categoryId: t.categoryId,
        categoryName: t.categoryName || 'Sem categoria',
        categoryIcon: t.categoryIcon || 'dots-horizontal',
        total: t.amount,
      });
    }
  }

  return byCategory;
}

// ==========================================
// SALDO HISTÓRICO
// ==========================================

// Buscar saldo acumulado até antes de um mês específico
// Isso retorna o saldo de todos os meses anteriores ao mês/ano especificado
export async function getCarryOverBalance(
  userId: string,
  beforeMonth: number,
  beforeYear: number
): Promise<number> {
  // Buscar TODAS as transações do usuário
  const q = query(
    transactionsRef,
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  const transactions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];

  let carryOver = 0;

  for (const t of transactions) {
    // Apenas lançamentos concluídos entram no saldo histórico
    if (t.status !== 'completed') continue;
    
    // Verificar se a transação é de um mês ANTERIOR ao mês especificado
    const isBeforeMonth = 
      t.year < beforeYear || 
      (t.year === beforeYear && t.month < beforeMonth);
    
    if (isBeforeMonth) {
      if (t.type === 'income') {
        carryOver += t.amount;
      } else if (t.type === 'expense') {
        carryOver -= t.amount;
      }
      // Transferências não afetam o saldo total (apenas movem entre contas)
    }
  }

  return carryOver;
}

// ==========================================
// AJUSTE DE SALDO
// ==========================================

// Criar transação de ajuste de saldo
export async function createBalanceAdjustment(
  userId: string,
  accountId: string,
  accountName: string,
  oldBalance: number,
  newBalance: number
): Promise<Transaction | null> {
  const difference = newBalance - oldBalance;
  
  if (difference === 0) return null; // Sem mudança
  
  const now = Timestamp.now();
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const adjustmentType: TransactionType = difference > 0 ? 'income' : 'expense';
  const amount = Math.abs(difference);

  const docRef = await addDoc(transactionsRef, {
    userId,
    type: adjustmentType,
    amount,
    description: `Ajuste de saldo${difference > 0 ? ' (crédito)' : ' (débito)'}`,
    date: now,
    month,
    year,
    accountId,
    accountName,
    recurrence: 'none',
    status: 'completed',
    isAdjustment: true, // Marca como ajuste de saldo
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    type: adjustmentType,
    amount,
    description: `Ajuste de saldo${difference > 0 ? ' (crédito)' : ' (débito)'}`,
    date: now,
    month,
    year,
    accountId,
    accountName,
    recurrence: 'none',
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  } as Transaction;
}

// ==========================================
// DELETAR TRANSAÇÕES POR CONTA
// ==========================================

// Deletar todas as transações de uma conta específica
export async function deleteTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<{ deleted: number; error?: string }> {
  try {
    // Buscar todas as transações da conta
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('accountId', '==', accountId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { deleted: 0 };
    }

    // Deletar cada transação
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return { deleted: snapshot.docs.length };
  } catch (error) {
    console.error('Erro ao deletar transações da conta:', error);
    return { deleted: 0, error: 'Erro ao deletar transações' };
  }
}

// Contar transações de uma conta
export async function countTransactionsByAccount(
  userId: string,
  accountId: string
): Promise<number> {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('accountId', '==', accountId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.length;
}

// ==========================================
// CARTÃO DE CRÉDITO - AJUSTE E RESET
// ==========================================

// Criar transação de ajuste de uso do cartão de crédito
export async function createCreditCardAdjustment(
  userId: string,
  creditCardId: string,
  creditCardName: string,
  oldUsed: number,
  newUsed: number
): Promise<Transaction | null> {
  const difference = newUsed - oldUsed;
  
  if (difference === 0) return null; // Sem mudança
  
  const now = Timestamp.now();
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Se aumentou o uso, é uma despesa; se diminuiu, é um estorno/ajuste
  const adjustmentType: TransactionType = difference > 0 ? 'expense' : 'income';
  const amount = Math.abs(difference);

  const docRef = await addDoc(transactionsRef, {
    userId,
    type: adjustmentType,
    amount,
    description: `Ajuste de fatura${difference > 0 ? ' (débito)' : ' (estorno)'}`,
    date: now,
    month,
    year,
    creditCardId,
    creditCardName,
    recurrence: 'none',
    status: 'completed',
    isAdjustment: true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    type: adjustmentType,
    amount,
    description: `Ajuste de fatura${difference > 0 ? ' (débito)' : ' (estorno)'}`,
    date: now,
    month,
    year,
    creditCardId,
    creditCardName,
    recurrence: 'none',
    status: 'completed',
    createdAt: now,
    updatedAt: now,
  } as Transaction;
}

// Deletar todas as transações de um cartão de crédito
export async function deleteTransactionsByCreditCard(
  userId: string,
  creditCardId: string
): Promise<{ deleted: number; error?: string }> {
  try {
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('creditCardId', '==', creditCardId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { deleted: 0 };
    }

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return { deleted: snapshot.docs.length };
  } catch (error) {
    console.error('Erro ao deletar transações do cartão:', error);
    return { deleted: 0, error: 'Erro ao deletar transações' };
  }
}

// Contar transações de um cartão de crédito
export async function countTransactionsByCreditCard(
  userId: string,
  creditCardId: string
): Promise<number> {
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('creditCardId', '==', creditCardId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.length;
}
