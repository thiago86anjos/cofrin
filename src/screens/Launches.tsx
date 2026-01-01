import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomAlert } from "../hooks/useCustomAlert";
import { useSnackbar } from "../hooks/useSnackbar";
import CustomAlert from "../components/CustomAlert";
import Snackbar from "../components/Snackbar";
import TransactionsList, { TransactionListItem } from '../components/transactions/TransactionsList';
import AddTransactionModalV2, { EditableTransaction } from '../components/transactions/AddTransactionModalV2';
import { useTransactions } from '../hooks/useFirebaseTransactions';
import { useCreditCards } from '../hooks/useCreditCards';
import { useAppTheme } from '../contexts/themeContext';
import { useAuth } from '../contexts/authContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import { formatCurrencyBRL } from '../utils/format';
import MainLayout from '../components/MainLayout';
import SimpleHeader from '../components/SimpleHeader';
import { FOOTER_HEIGHT } from '../components/AppFooter';
import { spacing, borderRadius, getShadow } from '../theme';
import type { Transaction, TransactionStatus } from '../types/firebase';
import {
    generateBillsForMonth,
    CreditCardBillWithTransactions
} from '../services/creditCardBillService';

// Tipos dos parâmetros de navegação
interface RouteParams {
  accountId?: string;
  accountName?: string;
  month?: number;
  year?: number;
  filterType?: 'expense' | 'income';
  filterStatus?: TransactionStatus;
  filterCategoryIds?: string[];
  filterCategoryName?: string;
}

// Nomes dos meses em português
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Launches() {
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const { colors } = useAppTheme();
  const { refreshKey, triggerRefresh } = useTransactionRefresh();
  const { user } = useAuth();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  // Calcular posição do summary bar considerando insets
  const summaryBottom = useMemo(
    () => FOOTER_HEIGHT + Math.max(insets.bottom, 8),
    [insets.bottom]
  );
  
  // Parâmetros de navegação (filtro por conta)
  const params = (route.params as RouteParams) || {};
  const [filterAccountId, setFilterAccountId] = useState<string | undefined>(params.accountId);
  const [filterAccountName, setFilterAccountName] = useState<string | undefined>(params.accountName);

  const [filterCategoryIds, setFilterCategoryIds] = useState<string[] | undefined>(params.filterCategoryIds);
  const [filterCategoryName, setFilterCategoryName] = useState<string | undefined>(params.filterCategoryName);
  const [filterType, setFilterType] = useState<RouteParams['filterType']>(params.filterType);
  const [filterStatus, setFilterStatus] = useState<RouteParams['filterStatus']>(params.filterStatus);
  
  // Atualizar filtro quando parâmetros mudarem
  useEffect(() => {
    const newParams = (route.params as RouteParams) || {};
    setFilterAccountId(newParams.accountId);
    setFilterAccountName(newParams.accountName);

    setFilterCategoryIds(newParams.filterCategoryIds);
    setFilterCategoryName(newParams.filterCategoryName);
    setFilterType(newParams.filterType);
    setFilterStatus(newParams.filterStatus);

    // Se vier um mês/ano explícito pela navegação, respeitar
    if (newParams.month && newParams.year) {
      setSelectedMonth(newParams.month);
      setSelectedYear(newParams.year);
    }
  }, [route.params]);
  
  // Estado do mês/ano selecionado
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // Firebase usa 1-12
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Estado para modal de edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<EditableTransaction | null>(null);
  
  // Estado para tooltip de saldo previsto
  const [showForecastTooltip, setShowForecastTooltip] = useState(false);
  
  // Estado para faturas de cartão de crédito
  const [creditCardBills, setCreditCardBills] = useState<CreditCardBillWithTransactions[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  
  // Hook de cartões de crédito
  const { activeCards, refresh: refreshCreditCards } = useCreditCards();

  // Hook do Firebase - sempre passar mês/ano; incluir filterAccountId quando houver
  const transactionsOptions = {
    month: selectedMonth,
    year: selectedYear,
    ...(filterAccountId ? { accountId: filterAccountId } : {}),
  };
    
  const { 
    transactions,
    totalIncome, 
    totalExpense,
    monthBalance,
    carryOverBalance,
    balance,
    loading, 
    refresh,
    deleteTransaction,
    deleteTransactionSeries,
    updateTransaction 
  } = useTransactions(transactionsOptions);
  
  // Import function for deleting series from installment
  const { deleteSeriesFromInstallment } = require('../services/transactionService');
  
  // Carregar faturas de cartão de crédito
  const loadCreditCardBills = async () => {
    if (!user || activeCards.length === 0) {
      setCreditCardBills([]);
      return;
    }

    setBillsLoading(true);
    try {
      const bills = await generateBillsForMonth(
        user.uid,
        selectedMonth,
        selectedYear,
        activeCards
      );

      // Se há filtro de conta ativo, mostrar apenas faturas de cartões
      // cuja conta de pagamento seja a conta filtrada
      if (filterAccountId) {
        const filtered = bills.filter((bill) => {
          return bill.creditCard?.paymentAccountId === filterAccountId;
        });
        setCreditCardBills(filtered);
      } else {
        setCreditCardBills(bills);
      }
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    } finally {
      setBillsLoading(false);
    }
  };
  
  // Recarregar faturas quando mudar mês/ano ou cartões
  useEffect(() => {
    loadCreditCardBills();
  }, [user, selectedMonth, selectedYear, activeCards.length, filterAccountId]);
  
  // Recarregar faturas junto com transações
  useEffect(() => {
    if (refreshKey > 0) {
      loadCreditCardBills();
    }
  }, [refreshKey]);
  
  // Limpar filtro de conta
  const clearAccountFilter = () => {
    setFilterAccountId(undefined);
    setFilterAccountName(undefined);
    // Limpar parâmetros da navegação
    navigation.setParams({ accountId: undefined, accountName: undefined } as any);
  };

  const clearCategoryFilter = () => {
    setFilterCategoryIds(undefined);
    setFilterCategoryName(undefined);
    setFilterType(undefined);
    setFilterStatus(undefined);
    navigation.setParams({
      filterCategoryIds: undefined,
      filterCategoryName: undefined,
      filterType: undefined,
      filterStatus: undefined,
    } as any);
  };

  // Refresh when refreshKey changes (triggered after saving a new transaction)
  useEffect(() => {
    if (refreshKey > 0) {
      refresh();
      refreshCreditCards();
    }
  }, [refreshKey, refresh, refreshCreditCards]);

  // Refresh quando a tela ganhar foco (ex: voltar de Cartões/Contas)
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshCreditCards();
    }, [refresh, refreshCreditCards])
  );

  // Converte transações do Firebase para o formato do TransactionsList
  // Filtra transações de cartão de crédito (elas aparecem apenas nas faturas)
  // Filtra transações de pagamento de fatura (são automáticas e redundantes visualmente)
  // INCLUI faturas de cartão de crédito na lista, ordenadas por data de vencimento
  const listItems = useMemo(() => {
    const categorySet = filterCategoryIds && filterCategoryIds.length > 0
      ? new Set(filterCategoryIds)
      : null;

    // Fonte de transações:
    // - Normal: usar apenas `transactions` (evita duplicidade com faturas)
    // - Com filtro por categoria: também incluir transações vindas das faturas
    //   para garantir que compras de cartão apareçam mesmo quando não estiverem
    //   no array principal por algum motivo.
    const billTransactions = categorySet
      ? creditCardBills.flatMap((b) => b.transactions || [])
      : [];

    const mergedTransactions = categorySet
      ? Array.from(
          new Map(
            [...transactions, ...billTransactions]
              .filter(Boolean)
              .map((t) => [t.id, t] as const)
          ).values()
        )
      : transactions;

    const transactionItems = mergedTransactions
      .filter((t: Transaction) => {
        // Pagamentos de fatura são automáticos e redundantes visualmente
        if (t.creditCardBillId) return false;

        // No modo normal, compras de cartão aparecem apenas via fatura (evita duplicidade)
        // Porém, quando há filtro por categoria, precisamos incluir as compras de cartão
        // porque as faturas não têm categoryId e não conseguiriam passar no filtro.
        if (!categorySet && t.creditCardId) return false;

        return true;
      })
      .filter((t: Transaction) => {
        if (filterType && t.type !== filterType) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        if (categorySet) {
          if (!t.categoryId) return false;
          return categorySet.has(t.categoryId);
        }
        return true;
      })
      .map((t: Transaction) => {
        // Usar valor absoluto para garantir consistência
        const absAmount = Math.abs(t.amount);
        // Aplicar sinal baseado no tipo (transferência é neutra - não é ganho nem perda)
        const amount = t.type === 'expense' ? -absAmount : (t.type === 'transfer' ? absAmount : absAmount);
        
        // Para transferências, gerar título padronizado
        const title = t.type === 'transfer'
          ? `Transferência de ${t.accountName || 'Conta'} para ${t.toAccountName || 'Conta'}`
          : t.description;
        
        return {
          id: t.id,
          date: t.date.toDate().toISOString().split('T')[0],
          title,
          account: t.accountName || t.creditCardName || '',
          toAccountName: t.toAccountName, // Conta destino para transferências
          amount,
          type: t.type === 'transfer' ? 'transfer' : (t.type === 'expense' ? 'paid' : 'received'),
          category: t.categoryName,
          categoryIcon: t.categoryIcon,
          status: t.status,
          goalName: t.goalName, // Aporte em meta
          installmentCurrent: t.installmentCurrent,
          installmentTotal: t.installmentTotal,
          anticipatedFrom: t.anticipatedFrom,
          anticipationDiscount: t.anticipationDiscount,
          itemType: 'transaction' as const,
        };
      });

    // Adicionar faturas como itens especiais
    // - Não faz sentido quando há filtro por categoria
    // - Também não faz sentido quando filtroType=income
    const shouldIncludeBills = !categorySet && (!filterType || filterType === 'expense');
    const billItems = shouldIncludeBills ? creditCardBills.map((bill) => {
      // Calcular a data de vencimento correta
      // Se dueDay < closingDay, vencimento é no próximo mês
      // Caso contrário, é no mesmo mês da fatura
      let dueMonth = bill.month;
      let dueYear = bill.year;
      
      if (bill.creditCard) {
        const { closingDay, dueDay } = bill.creditCard;
        if (dueDay < closingDay) {
          // Vencimento é no mês seguinte
          dueMonth += 1;
          if (dueMonth > 12) {
            dueMonth = 1;
            dueYear += 1;
          }
        }
      }
      
      // Obter o dia de vencimento do cartão ou da fatura
      const dueDay = bill.creditCard?.dueDay || bill.dueDate?.toDate().getDate() || 1;
      
      // Garantir que o dia não ultrapasse o último dia do mês
      const lastDayOfMonth = new Date(dueYear, dueMonth, 0).getDate();
      const validDueDay = Math.min(dueDay, lastDayOfMonth);
      
      const dueDateString = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(validDueDay).padStart(2, '0')}`;
      
      return {
        id: `bill-${bill.creditCardId}-${bill.month}-${bill.year}`,
        date: dueDateString,
        title: `Fatura ${bill.creditCardName}`,
        account: bill.creditCardName,
        amount: -bill.totalAmount,
        type: 'paid' as const,
        status: bill.isPaid ? 'completed' as const : 'pending' as const,
        itemType: 'bill' as const,
        billData: bill, // Dados completos da fatura para renderização
      };
    }) : [];

    // Combinar e ordenar por data (mais antigo primeiro)
    return [...transactionItems, ...billItems].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [transactions, creditCardBills, filterCategoryIds, filterType, filterStatus]) as Array<{
    id: string;
    date: string;
    title: string;
    account: string;
    toAccountName?: string;
    amount: number;
    type: 'paid' | 'received' | 'transfer';
    category?: string;
    categoryIcon?: string;
    status?: 'pending' | 'completed' | 'cancelled';
    goalName?: string;
    itemType: 'transaction' | 'bill';
    billData?: any;
  }>;

  // Calcular totais separados por status (para previsão)
  const forecast = useMemo(() => {
    let completedIncome = 0;
    let completedExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    // Contar transações normais
    // Exclui: transações de cartão (aparecem nas faturas)
    transactions
      .filter((t: Transaction) => 
        !t.creditCardId              // Exclui transações de cartão
      )
      .forEach((t: Transaction) => {
        if (t.status === 'cancelled') return;
        
        if (t.status === 'completed') {
          if (t.type === 'income') completedIncome += t.amount;
          else if (t.type === 'expense') completedExpense += t.amount;
          else if (t.type === 'transfer') {
            // Transferências só afetam o saldo quando há filtro de conta
            if (filterAccountId) {
              // Se a conta filtrada é a ORIGEM da transferência = saída (despesa)
              if (t.accountId === filterAccountId) {
                completedExpense += t.amount;
              }
              // Se a conta filtrada é o DESTINO da transferência = entrada (receita)
              if (t.toAccountId === filterAccountId) {
                completedIncome += t.amount;
              }
            }
            // Sem filtro: transferências não afetam saldo total (apenas movem entre contas)
          }
        } else {
          // pending
          if (t.type === 'income') pendingIncome += t.amount;
          else if (t.type === 'expense') pendingExpense += t.amount;
          else if (t.type === 'transfer' && filterAccountId) {
            // Transferências pendentes também contam quando há filtro
            if (t.accountId === filterAccountId) {
              pendingExpense += t.amount;
            }
            if (t.toAccountId === filterAccountId) {
              pendingIncome += t.amount;
            }
          }
        }
      });

    // Adicionar faturas de cartão pendentes ao forecast
    creditCardBills.forEach((bill) => {
      if (!bill.isPaid && bill.totalAmount > 0) {
        pendingExpense += bill.totalAmount;
      }
    });

    const realizedBalance = carryOverBalance + completedIncome - completedExpense;
    const forecastBalance = realizedBalance + pendingIncome - pendingExpense;

    return {
      completedIncome,
      completedExpense,
      pendingIncome,
      pendingExpense,
      realizedBalance,
      forecastBalance,
    };
  }, [transactions, carryOverBalance, creditCardBills, filterAccountId]);

  // Navegação entre meses
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  // Handler para navegar para detalhes da fatura
  const handleBillPress = (bill: CreditCardBillWithTransactions) => {
    navigation.navigate('CreditCardBillDetails', {
      creditCardId: bill.creditCardId,
      creditCardName: bill.creditCardName,
      month: bill.month,
      year: bill.year,
    });
  };

  // Handler para editar transação
  const handleEditTransaction = (item: TransactionListItem) => {
    // Encontrar a transação original do Firebase
    const originalTransaction = transactions.find(t => t.id === item.id);
    if (!originalTransaction) return;

    // Bloquear edição de transações de pagamento de fatura
    if (originalTransaction.creditCardBillId) {
      showAlert(
        'Ação não permitida',
        'Esta transação é um pagamento de fatura de cartão de crédito. Para desfazer o pagamento, acesse a fatura do cartão.',
        [{ text: 'OK' }]
      );
      return;
    }

    const editData: EditableTransaction = {
      id: originalTransaction.id,
      type: originalTransaction.type,
      amount: originalTransaction.amount,
      description: originalTransaction.description,
      date: originalTransaction.date.toDate(),
      categoryId: originalTransaction.categoryId,
      categoryName: originalTransaction.categoryName,
      // Se tem creditCardId, NÃO passar accountId (evita confusão no modal)
      accountId: originalTransaction.creditCardId ? undefined : originalTransaction.accountId,
      accountName: originalTransaction.creditCardId ? undefined : originalTransaction.accountName,
      toAccountId: originalTransaction.toAccountId,
      toAccountName: originalTransaction.toAccountName,
      creditCardId: originalTransaction.creditCardId,
      creditCardName: originalTransaction.creditCardName,
      recurrence: originalTransaction.recurrence,
      seriesId: originalTransaction.seriesId,
      installmentCurrent: originalTransaction.installmentCurrent,
      installmentTotal: originalTransaction.installmentTotal,
      relatedTransactionId: (originalTransaction as any).relatedTransactionId,
    };

    setEditingTransaction(editData);
    setEditModalVisible(true);
  };

  // Handler para alternar status diretamente (sem modal)
  const handleStatusPress = async (item: TransactionListItem) => {
    const newStatus: TransactionStatus = item.status === 'completed' ? 'pending' : 'completed';
    
    const result = await updateTransaction(item.id, { status: newStatus });
    if (result) {
      triggerRefresh();
    } else {
      showAlert('Erro', 'Não foi possível atualizar o status');
    }
  };

  const getPaidBillAssociation = (t: Transaction): CreditCardBillWithTransactions | null => {
    // 1) Pagamento de fatura: match por creditCardBillId (id da fatura) ou paymentTransactionId
    // 2) Compra no cartão: match por cartão + mês/ano da fatura (month/year da transação)
    const bill = creditCardBills.find((b) => {
      if (!b.isPaid) return false;

      if (t.creditCardBillId && b.id === t.creditCardBillId) return true;
      if ((b as any).paymentTransactionId && (b as any).paymentTransactionId === t.id) return true;

      if (t.creditCardId && b.creditCardId === t.creditCardId && b.month === t.month && b.year === t.year) {
        return true;
      }

      return false;
    });

    return bill || null;
  };

  const formatBillLabel = (bill: CreditCardBillWithTransactions) => {
    const monthName = MONTHS[bill.month - 1] || String(bill.month);
    return `${bill.creditCardName} (${monthName}/${bill.year})`;
  };

  // Handler para deletar transação (chamado pelo modal)
  const handleDeleteTransaction = async (transactionId: string) => {
    const originalTransaction =
      transactions.find((t) => t.id === transactionId) ||
      creditCardBills.flatMap((b) => b.transactions || []).find((t) => t.id === transactionId);

    const performDelete = async () => {
      const result = await deleteTransaction(transactionId);
      if (result) {
        setEditModalVisible(false);
        setEditingTransaction(null);
        triggerRefresh();
        showSnackbar('Lançamento excluído!');
      } else {
        showAlert('Erro', 'Não foi possível excluir o lançamento');
      }
    };

    if (originalTransaction) {
      const paidBill = getPaidBillAssociation(originalTransaction);
      if (paidBill) {
        showAlert(
          'Atenção: fatura já paga',
          `Este lançamento está associado à fatura ${formatBillLabel(paidBill)}, que já está paga.\n\nExcluir agora pode gerar inconsistência (ex.: histórico da fatura e saldo/uso do cartão). Se sua intenção for desfazer o pagamento, faça isso pela tela da fatura.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir mesmo assim', style: 'destructive', onPress: () => void performDelete() },
          ]
        );
        return;
      }
    }

    await performDelete();
  };

  // Handler para deletar série de transações recorrentes
  const handleDeleteSeries = async (seriesId: string, fromInstallment?: number) => {
    if (!user?.uid) return;

    // Se a transação atualmente em edição estiver associada a uma fatura já paga,
    // deixar explícito o risco de inconsistência antes de excluir em massa.
    if (editingTransaction?.id) {
      const originalTransaction =
        transactions.find((t) => t.id === editingTransaction.id) ||
        creditCardBills.flatMap((b) => b.transactions || []).find((t) => t.id === editingTransaction.id);

      if (originalTransaction) {
        const paidBill = getPaidBillAssociation(originalTransaction);
        if (paidBill) {
          showAlert(
            'Atenção: fatura já paga',
            `A série contém um lançamento associado à fatura ${formatBillLabel(paidBill)}, que já está paga.\n\nExcluir essa série pode gerar inconsistência.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir série mesmo assim',
                style: 'destructive',
                onPress: () => void (async () => {
                  let count = 0;
                  if (fromInstallment) {
                    count = await deleteSeriesFromInstallment(user.uid, seriesId, fromInstallment);
                  } else {
                    count = await deleteTransactionSeries(seriesId);
                  }

                  if (count > 0) {
                    setEditModalVisible(false);
                    setEditingTransaction(null);
                    triggerRefresh();
                    showSnackbar(`${count} lançamento(s) excluído(s)`);
                  } else {
                    showAlert('Erro', 'Não foi possível excluir a série de lançamentos');
                  }
                })(),
              },
            ]
          );
          return;
        }
      }
    }
    
    let count = 0;
    
    if (fromInstallment) {
      // Excluir apenas da parcela atual em diante
      count = await deleteSeriesFromInstallment(user.uid, seriesId, fromInstallment);
    } else {
      // Excluir série completa (manter retrocompatibilidade)
      count = await deleteTransactionSeries(seriesId);
    }
    
    if (count > 0) {
      setEditModalVisible(false);
      setEditingTransaction(null);
      triggerRefresh();
      showSnackbar(`${count} lançamento(s) excluído(s)`);
    } else {
      showAlert('Erro', 'Não foi possível excluir a série de lançamentos');
    }
  };

  // Handler para salvar edição
  const handleEditSave = () => {
    setEditModalVisible(false);
    setEditingTransaction(null);
    triggerRefresh();
  };

  // Verifica se é o mês atual
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  
  // Verifica se é mês futuro
  const isFutureMonth = selectedYear > today.getFullYear() || 
    (selectedYear === today.getFullYear() && selectedMonth > (today.getMonth() + 1));

  // Cores específicas para o resumo
  const incomeColor = colors.income;
  const expenseColor = colors.expense;
  const balanceColor = colors.primary;

  return (
    <MainLayout>
      <SimpleHeader title="Fluxo de Caixa" />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.centeredContainer}>
            <View style={styles.content}>
              {/* Seletor de Mês/Ano (sempre visível, mesmo com filtro de conta) */}
              <View style={[styles.monthSelector, { backgroundColor: colors.card }, getShadow(colors)]}>
                <Pressable 
                  onPress={goToPreviousMonth}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
                </Pressable>
                
                <Pressable 
                  onPress={goToToday}
                  style={({ pressed }) => [styles.monthDisplay, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.monthText, { color: colors.text }]}>
                    {MONTHS[selectedMonth - 1]}
                  </Text>
                  <Text style={[styles.yearText, { color: colors.textSecondary }]}>
                    {selectedYear}
                  </Text>
                  {isFutureMonth && (
                    <View style={[styles.futureBadge, { backgroundColor: colors.primaryBg }]}>
                      <Text style={[styles.futureBadgeText, { color: colors.primary }]}>Futuro</Text>
                    </View>
                  )}
                </Pressable>
                
                <Pressable 
                  onPress={goToNextMonth}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
                </Pressable>
              </View>

              {/* Controls row: filter chip (left) and 'Ir para hoje' (right) aligned horizontally */}
              <View style={styles.controlsRow}>
                <View style={{ flex: 1 }}>
                  {filterAccountName && (
                    <View style={[styles.filterChip, { backgroundColor: colors.primaryBg, marginTop: 0 }]}>
                      <MaterialCommunityIcons name="filter-variant" size={16} color={colors.primary} />
                      <Text style={[styles.filterChipText, { color: colors.primary }]}> {filterAccountName} </Text>
                      <Pressable
                        onPress={clearAccountFilter}
                        hitSlop={8}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  )}

                  {filterCategoryName && (
                    <View style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, marginTop: filterAccountName ? spacing.xs : 0 }]}>
                      <MaterialCommunityIcons name="tag" size={16} color={colors.textMuted} />
                      <Text style={[styles.filterChipText, { color: colors.text }]}> {filterCategoryName} </Text>
                      <Pressable
                        onPress={clearCategoryFilter}
                        hitSlop={8}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </View>

                <View style={{ marginLeft: spacing.sm }}>
                  {!isCurrentMonth && (
                    <Pressable 
                      onPress={goToToday}
                      style={({ pressed }) => [
                        styles.todayButton, 
                        { backgroundColor: colors.primaryBg },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />
                      <Text style={[styles.todayButtonText, { color: colors.primary }]}>Ir para hoje</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Lista de Transações */}
              {loading ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Carregando...</Text>
                </View>
              ) : listItems.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons 
                      name={isFutureMonth ? "calendar-clock" : "calendar-blank"} 
                      size={40} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isFutureMonth ? 'Nenhum lançamento futuro' : 'Nenhum lançamento'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {isFutureMonth 
                      ? 'Você ainda não tem despesas programadas para este mês.'
                      : 'Não há lançamentos registrados neste período.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  <TransactionsList 
                    items={listItems} 
                    onEditItem={handleEditTransaction}
                    onStatusPress={handleStatusPress}
                    onBillPress={handleBillPress}
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Modal de Entenda seu Saldo */}
      {showForecastTooltip && (
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowForecastTooltip(false)}
        >
          <View style={[styles.forecastModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.forecastModalTitle, { color: colors.text }]}>Entenda seu saldo</Text>
            
            {/* Saldo Previsto - Destaque */}
            <View style={styles.forecastHighlight}>
              <Text style={[styles.forecastHighlightLabel, { color: colors.textMuted }]}>Saldo Previsto</Text>
              <Text style={[styles.forecastModalAmount, { color: forecast.forecastBalance >= 0 ? colors.income : expenseColor }]}>
                {formatCurrencyBRL(forecast.forecastBalance)}
              </Text>
            </View>
            
            <View style={[styles.forecastModalDivider, { backgroundColor: colors.border }]} />
            
            {/* Detalhamento Completo */}
            <View style={styles.forecastModalDetails}>
              <View style={styles.forecastModalRow}>
                <Text style={[styles.forecastModalLabel, { color: colors.textMuted }]}>Entradas:</Text>
                <Text style={[styles.forecastModalValue, { color: colors.income }]}>
                  +{formatCurrencyBRL(totalIncome)}
                </Text>
              </View>
              <View style={styles.forecastModalRow}>
                <Text style={[styles.forecastModalLabel, { color: colors.textMuted }]}>Saídas:</Text>
                <Text style={[styles.forecastModalValue, { color: expenseColor }]}>
                  -{formatCurrencyBRL(totalExpense)}
                </Text>
              </View>
              <View style={[styles.forecastModalDivider, { backgroundColor: colors.border, marginVertical: 8 }]} />
              <View style={styles.forecastModalRow}>
                <Text style={[styles.forecastModalLabel, { color: colors.textMuted }]}>Concluído:</Text>
                <Text style={[styles.forecastModalValue, { color: forecast.realizedBalance >= 0 ? colors.income : expenseColor }]}>
                  {formatCurrencyBRL(forecast.realizedBalance)}
                </Text>
              </View>
              <View style={styles.forecastModalRow}>
                <Text style={[styles.forecastModalLabel, { color: colors.textMuted }]}>Entradas pendentes:</Text>
                <Text style={[styles.forecastModalValue, { color: colors.income }]}>
                  +{formatCurrencyBRL(forecast.pendingIncome)}
                </Text>
              </View>
              <View style={styles.forecastModalRow}>
                <Text style={[styles.forecastModalLabel, { color: colors.textMuted }]}>Saídas pendentes:</Text>
                <Text style={[styles.forecastModalValue, { color: expenseColor }]}>
                  -{formatCurrencyBRL(forecast.pendingExpense)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      )}

      {/* Summary Bar - Colado no footer */}
      <View style={[styles.summaryContainer, { bottom: summaryBottom }]}>
        <View style={[styles.summaryBar, { backgroundColor: colors.card, borderTopColor: colors.border, borderBottomColor: colors.border, 
          paddingBottom: spacing.lg }, getShadow(colors)]}>
          {/* Linha principal - Saldo + Botão */}
          <View style={styles.summaryMainRow}>
            {/* Saldo Atual */}
            <View style={styles.summaryPrimary}>
              <Text style={[styles.summaryLabelMain, { color: colors.textMuted }]}>saldo atual</Text>
              <Text style={[styles.summaryAmountMain, { color: balance >= 0 ? colors.primary : expenseColor }]}>
                {formatCurrencyBRL(balance)}
              </Text>
            </View>

            {/* Botão Entenda seu Saldo */}
            <Pressable
              onPress={() => setShowForecastTooltip(true)}
              style={({ pressed }) => [
                styles.understandButton,
                { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                pressed && { opacity: 0.7 }
              ]}
            >
              <MaterialCommunityIcons name="chart-line" size={16} color={colors.primary} />
              <Text style={[styles.understandButtonText, { color: colors.primary }]}>
                Entenda seu saldo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Mini Modal de Status */}
      {/* Modal de edição */}
      <AddTransactionModalV2
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingTransaction(null);
        }}
        onSave={handleEditSave}
        onDelete={handleDeleteTransaction}
        onDeleteSeries={handleDeleteSeries}
        editTransaction={editingTransaction}
      />
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 64,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    zIndex: 10,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    marginTop: 2,
  },
  futureBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  futureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  listContainer: {
    gap: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  summaryBar: {
    maxWidth: 1200,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  summaryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryPrimary: {
    flex: 1,
    gap: 2,
  },
  summaryLabelMain: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryAmountMain: {
    fontSize: 20,
    fontWeight: '700',
  },
  understandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  understandButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forecastHighlight: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  forecastHighlightLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCellLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  summaryDividerVertical: {
    width: 1,
    height: 28,
  },
  forecastButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  forecastModal: {
    width: '85%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  forecastModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  forecastModalAmount: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  forecastModalDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  forecastModalDetails: {
    gap: spacing.sm,
  },
  forecastModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastModalLabel: {
    fontSize: 14,
  },
  forecastModalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModalContent: {
    width: '80%',
    maxWidth: 320,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statusModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
