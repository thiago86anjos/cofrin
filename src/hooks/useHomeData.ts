// ==========================================
// HOOK CONSOLIDADO PARA HOME
// Otimização: Reduz ~14-16 queries para ~6 queries
// ==========================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/authContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import { Transaction, Account, CreditCard, Goal } from '../types/firebase';
import * as transactionService from '../services/transactionService';
import * as accountService from '../services/accountService';
import * as creditCardService from '../services/creditCardService';
import * as goalService from '../services/goalService';
import { getPendingBillsMap } from '../services/creditCardBillService';

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  total: number;
}

interface HomeData {
  // Transações
  transactions: Transaction[];
  pendingIncomes: Transaction[];
  pendingExpenses: Transaction[];
  
  // Totais derivados
  totalIncome: number;
  totalExpense: number;
  monthBalance: number;
  
  // Categorias derivadas
  expensesByCategory: CategoryTotal[];
  incomesByCategory: CategoryTotal[];
  
  // Contas
  accounts: Account[];
  totalAccountsBalance: number;
  
  // Cartões
  activeCards: CreditCard[];
  
  // Metas
  primaryGoal: Goal | null;
  allGoals: Goal[];
  progressPercentage: number;
  
  // Estados de loading individuais para shimmer progressivo
  loadingPending: boolean;
  loadingAccounts: boolean;
  loadingCards: boolean;
  loadingGoal: boolean;
  loadingCategories: boolean;
  
  // Loading geral
  loading: boolean;
  error: string | null;
  
  // Refresh functions
  refresh: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshCards: () => Promise<void>;
  refreshGoals: () => Promise<void>;
}

export function useHomeData(month: number, year: number): HomeData {
  const { user } = useAuth();
  const { refreshKey } = useTransactionRefresh();
  
  // Estados principais
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pendingBillsKeys, setPendingBillsKeys] = useState<Set<string>>(new Set());
  
  // Estados de loading individuais
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // FUNÇÕES DE CARREGAMENTO
  // ==========================================

  // Carregar transações do mês + faturas pendentes (para filtrar corretamente)
  const loadTransactionsAndBills = useCallback(async () => {
    if (!user?.uid) {
      setTransactions([]);
      setPendingBillsKeys(new Set());
      setLoadingTransactions(false);
      return;
    }

    try {
      setLoadingTransactions(true);
      
      // Buscar em paralelo: transações do mês e mapa de faturas pendentes
      const [txData, billsMap] = await Promise.all([
        transactionService.getTransactionsByMonth(user.uid, month, year),
        getPendingBillsMap(user.uid),
      ]);
      
      setTransactions(txData);
      // Converter Map para Set de keys
      setPendingBillsKeys(new Set(billsMap.keys()));
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
      setError('Erro ao carregar transações');
    } finally {
      setLoadingTransactions(false);
    }
  }, [user?.uid, month, year]);

  // Carregar transações pendentes futuras
  const loadPendingTransactions = useCallback(async () => {
    if (!user?.uid) {
      setPendingTransactions([]);
      setLoadingPending(false);
      return;
    }

    try {
      setLoadingPending(true);
      const data = await transactionService.getPendingFutureTransactions(user.uid);
      setPendingTransactions(data);
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err);
    } finally {
      setLoadingPending(false);
    }
  }, [user?.uid]);

  // Carregar contas
  const loadAccounts = useCallback(async () => {
    if (!user?.uid) {
      setAccounts([]);
      setLoadingAccounts(false);
      return;
    }

    try {
      setLoadingAccounts(true);
      const data = await accountService.getAccounts(user.uid);
      setAccounts(data);
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [user?.uid]);

  // Carregar cartões
  const loadCards = useCallback(async () => {
    if (!user?.uid) {
      setCreditCards([]);
      setLoadingCards(false);
      return;
    }

    try {
      setLoadingCards(true);
      const data = await creditCardService.getCreditCards(user.uid);
      setCreditCards(data);
    } catch (err) {
      console.error('Erro ao carregar cartões:', err);
    } finally {
      setLoadingCards(false);
    }
  }, [user?.uid]);

  // Carregar metas
  const loadGoals = useCallback(async () => {
    if (!user?.uid) {
      setGoals([]);
      setLoadingGoals(false);
      return;
    }

    try {
      setLoadingGoals(true);
      const data = await goalService.getActiveGoals(user.uid);
      setGoals(data);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setLoadingGoals(false);
    }
  }, [user?.uid]);

  // ==========================================
  // DADOS DERIVADOS (calculados localmente)
  // ==========================================

  // Totais de income/expense (filtrando faturas pendentes de cartão)
  const { totalIncome, totalExpense, monthBalance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.status !== 'completed') continue;
      
      // Ignorar transações de cartão com fatura pendente
      if (t.creditCardId && t.month && t.year) {
        const billKey = `${t.creditCardId}-${t.month}-${t.year}`;
        if (pendingBillsKeys.has(billKey)) {
          continue;
        }
      }
      
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
      }
    }

    return { 
      totalIncome: income, 
      totalExpense: expense, 
      monthBalance: income - expense 
    };
  }, [transactions, pendingBillsKeys]);

  // Gastos por categoria (derivado das transações já carregadas)
  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, CategoryTotal>();

    for (const t of transactions) {
      if (t.type !== 'expense' || t.status !== 'completed' || !t.categoryId) continue;
      
      // Ignorar transações de cartão com fatura pendente
      if (t.creditCardId && t.month && t.year) {
        const billKey = `${t.creditCardId}-${t.month}-${t.year}`;
        if (pendingBillsKeys.has(billKey)) {
          continue;
        }
      }

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

    return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
  }, [transactions, pendingBillsKeys]);

  // Receitas por categoria
  const incomesByCategory = useMemo(() => {
    const byCategory = new Map<string, CategoryTotal>();

    for (const t of transactions) {
      if (t.type !== 'income' || t.status !== 'completed' || !t.categoryId) continue;

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

    return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Transações pendentes separadas por tipo
  const { pendingIncomes, pendingExpenses } = useMemo(() => {
    const incomes = pendingTransactions.filter(t => t.type === 'income');
    const expenses = pendingTransactions.filter(t => t.type === 'expense');
    return { pendingIncomes: incomes, pendingExpenses: expenses };
  }, [pendingTransactions]);

  // Saldo total das contas
  const totalAccountsBalance = useMemo(() => {
    return accounts
      .filter(acc => acc.includeInTotal)
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Cartões ativos
  const activeCards = useMemo(() => {
    return creditCards.filter(card => !card.isArchived);
  }, [creditCards]);

  // Meta principal e progresso
  const { primaryGoal, progressPercentage } = useMemo(() => {
    const primary = goals.find(g => g.isPrimary) || goals[0] || null;
    const progress = primary 
      ? goalService.calculateGoalProgress(primary.currentAmount, primary.targetAmount)
      : 0;
    return { primaryGoal: primary, progressPercentage: progress };
  }, [goals]);

  // ==========================================
  // EFEITOS DE CARREGAMENTO
  // ==========================================

  // Carregamento inicial - todas as chamadas em paralelo
  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([
        loadTransactionsAndBills(),
        loadPendingTransactions(),
        loadAccounts(),
        loadCards(),
        loadGoals(),
      ]);
    };
    
    loadAll();
  }, [loadTransactionsAndBills, loadPendingTransactions, loadAccounts, loadCards, loadGoals]);

  // Recarregar quando refreshKey mudar
  useEffect(() => {
    if (refreshKey > 0) {
      Promise.all([
        loadTransactionsAndBills(),
        loadPendingTransactions(),
        loadAccounts(),
        loadCards(),
        loadGoals(),
      ]);
    }
  }, [refreshKey]);

  // ==========================================
  // FUNÇÕES DE REFRESH
  // ==========================================

  const refresh = useCallback(async () => {
    await Promise.all([
      loadTransactionsAndBills(),
      loadPendingTransactions(),
    ]);
  }, [loadTransactionsAndBills, loadPendingTransactions]);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

  const refreshCards = useCallback(async () => {
    await loadCards();
  }, [loadCards]);

  const refreshGoals = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  // ==========================================
  // RETORNO
  // ==========================================

  const loading = loadingTransactions || loadingAccounts || loadingCards;
  const loadingCategories = loadingTransactions; // Categorias derivam das transações

  return {
    // Transações
    transactions,
    pendingIncomes,
    pendingExpenses,
    
    // Totais
    totalIncome,
    totalExpense,
    monthBalance,
    
    // Categorias
    expensesByCategory,
    incomesByCategory,
    
    // Contas
    accounts,
    totalAccountsBalance,
    
    // Cartões
    activeCards,
    
    // Metas
    primaryGoal,
    allGoals: goals,
    progressPercentage,
    
    // Loading states
    loadingPending,
    loadingAccounts,
    loadingCards,
    loadingGoal: loadingGoals,
    loadingCategories,
    loading,
    error,
    
    // Refresh functions
    refresh,
    refreshAccounts,
    refreshCards,
    refreshGoals,
  };
}
