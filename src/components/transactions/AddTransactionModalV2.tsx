/**
 * AddTransactionModalV2 - Modal de transação refatorado
 * Layout: Card centralizado (não fullscreen)
 * Arquitetura modular com componentes extraídos
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Platform,
    Pressable,
    Modal,
    Text,
    TextInput, Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Timestamp } from 'firebase/firestore';
import { useAppTheme } from '../../contexts/themeContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '../../theme';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useCreditCards } from '../../hooks/useCreditCards';
import { useTransactions } from '../../hooks/useFirebaseTransactions';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { useSnackbar } from '../../hooks/useSnackbar';
import CustomAlert from '../CustomAlert';
import Snackbar from '../Snackbar';
import LoadingOverlay from '../LoadingOverlay';
import { TransactionType, RecurrenceType, CreateTransactionInput } from '../../types/firebase';
import { useTransactionRefresh } from '../../contexts/transactionRefreshContext';
import { useAuth } from '../../contexts/authContext';
import { moveSeriesMonth, anticipateInstallment } from '../../services/transactionService';
import { learnSuggestionPattern } from '../../services/suggestions.service';

// Componentes extraídos
import TransactionHeader from './TransactionHeader';
import TransactionFormV2 from './TransactionFormV2';
import { CategoryPicker, AccountPicker, RecurrencePicker, RecurrenceTypePicker, RepetitionsPicker } from './pickers';
import { formatCurrency, parseCurrency, getDaysInMonth, MONTHS_SHORT } from '../../utils/transactionHelpers';
import { RECURRENCE_OPTIONS, RECURRENCE_TYPE_OPTIONS } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

export interface EditableTransaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  description: string;
  date: Date;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  creditCardId?: string;
  creditCardName?: string;
  recurrence?: RecurrenceType;
  recurrenceType?: 'installment' | 'fixed';
  goalId?: string;
  goalName?: string;
  seriesId?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  month?: number;
  year?: number;
  anticipatedFrom?: { month: number; year: number; date: Timestamp };
  anticipationDiscount?: number;
  relatedTransactionId?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: (id: string) => void;
  onDeleteSeries?: (seriesId: string, fromInstallment?: number) => void;
  initialType?: LocalTransactionType;
  /** ID da conta pré-selecionada (usado quando FAB é clicado dentro de uma conta) */
  initialAccountId?: string;
  editTransaction?: EditableTransaction | null;
  /** Quando true, impede alterar a categoria (somente leitura) */
  disableCategoryChange?: boolean;
}

export default function AddTransactionModalV2({
  visible,
  onClose,
  onSave,
  onDelete,
  onDeleteSeries,
  initialType = 'despesa',
  initialAccountId,
  editTransaction,
  disableCategoryChange,
}: Props) {
  const { colors } = useAppTheme();
  const { refreshKey } = useTransactionRefresh();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Firebase hooks
  const { categories, refresh: refreshCategories, createCategory } = useCategories();
  const { activeAccounts, refresh: refreshAccounts } = useAccounts();
  const { activeCards, refresh: refreshCreditCards } = useCreditCards();
  const { createTransaction, updateTransaction } = useTransactions();

  // Filtrar contas ocultas (includeInTotal !== false)
  const visibleAccounts = useMemo(() => 
    activeAccounts.filter(acc => acc.includeInTotal !== false),
    [activeAccounts]
  );

  // Mode
  const isEditMode = !!editTransaction;
  const isGoalTransaction = !!editTransaction?.goalId;
  const isMetaCategoryTransaction = editTransaction?.categoryId && categories.find(c => c.id === editTransaction.categoryId)?.isMetaCategory;

  // Form state
  const [type, setType] = useState<LocalTransactionType>(initialType);
  const [amount, setAmount] = useState('R$ 0,00');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [toAccountName, setToAccountName] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [creditCardName, setCreditCardName] = useState('');
  const [useCreditCard, setUseCreditCard] = useState(false);
  const [date, setDate] = useState(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceType, setRecurrenceType] = useState<'installment' | 'fixed'>('installment');
  const [repetitions, setRepetitions] = useState(1);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);
  const [activePicker, setActivePicker] = useState<PickerType>('none');
  const [tempDate, setTempDate] = useState(new Date());
  
  // Anticipation state
  const [showAnticipateModal, setShowAnticipateModal] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');

  // Refs
  const amountInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Hooks for alerts and snackbar
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();

  // Computed values
  const hasAmount = React.useMemo(() => parseCurrency(amount) > 0, [amount]);
  
  const installmentValue = React.useMemo(() => {
    if (recurrence !== 'none' && repetitions > 1) {
      const parsed = parseCurrency(amount);
      return recurrenceType === 'installment' ? parsed / repetitions : parsed;
    }
    return 0;
  }, [amount, repetitions, recurrence, recurrenceType]);

  const sourceAccount = React.useMemo(() => {
    if (type === 'transfer' || (type === 'despesa' && !useCreditCard)) {
      return visibleAccounts.find(acc => acc.id === accountId);
    }
    return null;
  }, [type, accountId, useCreditCard, visibleAccounts]);

  const canConfirm = React.useMemo(() => {
    if (!hasAmount) return false;
    // Descrição obrigatória apenas para despesa/receita, não para transferência
    if (type !== 'transfer' && !description.trim()) return false;
    if (type === 'transfer' && accountId && toAccountId && accountId === toAccountId) return false;
    if (type !== 'transfer' && !categoryId) return false;
    return true;
  }, [type, accountId, toAccountId, hasAmount, description, categoryId]);

  const isFutureInstallment = React.useMemo(() => {
    if (!editTransaction || !editTransaction.creditCardId || editTransaction.anticipatedFrom) return false;
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const txMonth = editTransaction.month || currentMonth;
    const txYear = editTransaction.year || currentYear;
    
    if (txYear < currentYear || (txYear === currentYear && txMonth <= currentMonth)) return false;
    
    const card = activeCards.find(c => c.id === editTransaction.creditCardId);
    if (!card) return false;
    
    const currentDay = now.getDate();
    const targetMonth = currentDay > card.closingDay ? currentMonth + 1 : currentMonth;
    const targetYear = targetMonth > 12 ? currentYear + 1 : currentYear;
    const normalizedTargetMonth = targetMonth > 12 ? 1 : targetMonth;
    
    return txYear > targetYear || (txYear === targetYear && txMonth > normalizedTargetMonth);
  }, [editTransaction, activeCards]);

  const isAnticipationDiscount = React.useMemo(() => {
    if (!editTransaction) return false;
    return Boolean(editTransaction.relatedTransactionId || editTransaction.description?.startsWith('Desconto antecipação - '));
  }, [editTransaction]);

  // Filtered categories
  const filteredCategories = React.useMemo(() => {
    if (type === 'transfer') return [];
    const categoryType = type === 'despesa' ? 'expense' : 'income';
    return categories.filter(c => c.type === categoryType && !c.isMetaCategory && c.name !== 'Meta');
  }, [categories, type]);

  // Initialize form on open
  useEffect(() => {
    if (visible) {
      refreshCategories();
      refreshAccounts();
      refreshCreditCards();
      setActivePicker('none');
      setSaving(false);
      
      if (editTransaction) {
        const localType: LocalTransactionType = 
          editTransaction.type === 'expense' ? 'despesa' : 
          editTransaction.type === 'income' ? 'receita' : 'transfer';
        setType(localType);
        setAmount(formatCurrency(Math.round(editTransaction.amount * 100).toString()));
        setDescription(editTransaction.description || '');
        setDate(editTransaction.date);
        setRecurrence(editTransaction.recurrence || 'none');
        setRecurrenceType(editTransaction.recurrenceType || 'installment');
        setRepetitions(1);
        
        if (editTransaction.categoryId) {
          setCategoryId(editTransaction.categoryId);
          setCategoryName(editTransaction.categoryName || '');
        } else {
          setCategoryId('');
          setCategoryName('');
        }
        
        if (editTransaction.accountId) {
          setAccountId(editTransaction.accountId);
          setAccountName(editTransaction.accountName || '');
          setUseCreditCard(false);
          setCreditCardId('');
          setCreditCardName('');
        } else if (editTransaction.creditCardId) {
          setUseCreditCard(true);
          setCreditCardId(editTransaction.creditCardId);
          setCreditCardName(editTransaction.creditCardName || '');
          setAccountId('');
          setAccountName('');
        }
        
        if (editTransaction.toAccountId) {
          setToAccountId(editTransaction.toAccountId);
          setToAccountName(editTransaction.toAccountName || '');
        }
      } else {
        // Reset form
        setType(initialType);
        setAmount('R$ 0,00');
        setDescription('');
        setDate(new Date());
        setRecurrence('none');
        setRepetitions(1);
        setUseCreditCard(false);
        setCreditCardId('');
        setCreditCardName('');
        setCategoryId('');
        setCategoryName('');
        setAccountId('');
        setAccountName('');
        setToAccountId('');
        setToAccountName('');
      }
      
      // Focus amount after delay
      setTimeout(() => amountInputRef.current?.focus(), 350);
    }
  }, [visible, initialType, refreshCategories, refreshAccounts, refreshCreditCards, refreshKey]);

  // Definir conta inicial após carregar contas (separado para evitar loop)
  useEffect(() => {
    if (!visible || editTransaction) return;
    if (visibleAccounts.length === 0) return;
    
    // Só definir se ainda não tem conta selecionada
    if (accountId) return;
    
    // Aplicar conta pré-selecionada (initialAccountId) ou primeira conta visível
    if (initialAccountId) {
      const preselectedAccount = visibleAccounts.find(acc => acc.id === initialAccountId);
      if (preselectedAccount) {
        setAccountId(preselectedAccount.id);
        setAccountName(preselectedAccount.name);
      } else if (visibleAccounts.length > 0) {
        setAccountId(visibleAccounts[0].id);
        setAccountName(visibleAccounts[0].name);
      }
    } else {
      setAccountId(visibleAccounts[0].id);
      setAccountName(visibleAccounts[0].name);
    }
    
    // Para transferência, definir conta destino
    if (visibleAccounts.length > 1 && !toAccountId) {
      const sourceId = initialAccountId || visibleAccounts[0]?.id;
      const destAccount = visibleAccounts.find(acc => acc.id !== sourceId);
      if (destAccount) {
        setToAccountId(destAccount.id);
        setToAccountName(destAccount.name);
      }
    }
  }, [visible, editTransaction, visibleAccounts, initialAccountId, accountId, toAccountId]);

  // Sync tempDate when opening date picker
  useEffect(() => {
    if (activePicker === 'date') {
      setTempDate(date);
    }
  }, [activePicker, date]);

  // Handlers
  const handleAmountChange = useCallback((text: string) => {
    setAmount(formatCurrency(text));
  }, []);

  const handleDescriptionPress = () => {
    if (!hasAmount) {
      const transactionTypeLabel = type === 'despesa' ? 'despesa' : type === 'receita' ? 'receita' : 'transferência';
      showAlert(
        'Atenção',
        `Para lançar uma ${transactionTypeLabel}, você precisa preencher o valor primeiro.`,
        [{ text: 'OK', style: 'default', onPress: () => amountInputRef.current?.focus() }]
      );
    }
  };

  const handleDateChangeNative = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setActivePicker('none');
    if (event.type === 'set' && selectedDate) setDate(selectedDate);
  }, []);

  // Move series handler
  const handleMoveSeries = useCallback(async (monthsToMove: number) => {
    if (!user?.uid || !editTransaction?.seriesId || !editTransaction?.creditCardId) return;
    
    const direction = monthsToMove > 0 ? 'próximo mês' : 'mês anterior';
    const totalParcelas = editTransaction.installmentTotal || 0;
    
    showAlert(
      'Mover Série Completa',
      `Deseja mover todas as ${totalParcelas} parcelas desta série para o ${direction}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mover',
          style: 'default',
          onPress: async () => {
            setSaving(true);
            try {
              const success = await moveSeriesMonth(user.uid, editTransaction.seriesId!, monthsToMove);
              if (success) {
                showSnackbar(`Série movida para ${direction}!`);
                onSave?.();
                onClose();
              } else {
                showAlert('Erro', 'Não foi possível mover a série.', [{ text: 'OK' }]);
              }
            } catch (error) {
              showAlert('Erro', 'Ocorreu um erro ao mover a série.', [{ text: 'OK' }]);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }, [user?.uid, editTransaction, showAlert, showSnackbar, onSave, onClose]);

  // Anticipate handler
  const handleAnticipate = useCallback(() => {
    if (!user?.uid || !editTransaction?.id || !editTransaction?.creditCardId) return;
    setShowAnticipateModal(true);
  }, [user?.uid, editTransaction]);

  const confirmAnticipate = useCallback(async () => {
    if (!user?.uid || !editTransaction?.id || !editTransaction?.creditCardId) return;
    
    setSaving(true);
    setShowAnticipateModal(false);
    
    try {
      const discount = hasDiscount && discountAmount ? parseCurrency(discountAmount) : 0;
      const now = new Date();
      const card = activeCards.find(c => c.id === editTransaction.creditCardId);
      if (!card) {
        showAlert('Erro', 'Cartão não encontrado.', [{ text: 'OK' }]);
        setSaving(false);
        return;
      }
      
      let targetMonth = now.getMonth() + 1;
      let targetYear = now.getFullYear();
      
      if (now.getDate() > card.closingDay) {
        targetMonth += 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      }
      
      const result = await anticipateInstallment(user.uid, editTransaction.id, targetMonth, targetYear, discount > 0 ? discount : undefined);
      
      if (result.success) {
        showSnackbar(discount > 0 ? `Antecipado com desconto de ${formatCurrency(Math.round(discount * 100).toString())}!` : 'Antecipado!');
        setHasDiscount(false);
        setDiscountAmount('');
        onSave?.();
        onClose();
      } else {
        showAlert('Erro', 'Não foi possível antecipar.', [{ text: 'OK' }]);
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao antecipar.', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }, [user?.uid, editTransaction, hasDiscount, discountAmount, activeCards, showAlert, showSnackbar, onSave, onClose]);

  // Save handler
  const handleSave = useCallback(async () => {
    const parsed = parseCurrency(amount);
    if (parsed <= 0) {
      showAlert('Erro', 'O valor deve ser maior que zero', [{ text: 'OK' }]);
      return;
    }

    if (!accountId && !useCreditCard) {
      showAlert('Erro', 'Selecione uma conta', [{ text: 'OK' }]);
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      showAlert('Erro', 'Selecione a conta de destino', [{ text: 'OK' }]);
      return;
    }

    setSaving(true);
    try {
      const firebaseType: TransactionType = type === 'despesa' ? 'expense' : type === 'receita' ? 'income' : 'transfer';

      const getNextDate = (baseDate: Date, occurrence: number): Date => {
        const newDate = new Date(baseDate);
        switch (recurrence) {
          case 'weekly': newDate.setDate(newDate.getDate() + (7 * occurrence)); break;
          case 'biweekly': newDate.setDate(newDate.getDate() + (14 * occurrence)); break;
          case 'monthly': newDate.setMonth(newDate.getMonth() + occurrence); break;
          case 'yearly': newDate.setFullYear(newDate.getFullYear() + occurrence); break;
        }
        return newDate;
      };

      const seriesId = recurrence !== 'none' && repetitions > 1 
        ? `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : undefined;

      const buildTransactionData = (transactionDate: Date, amountPerTransaction?: number, installmentIndex?: number): CreateTransactionInput => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const txDate = new Date(transactionDate); txDate.setHours(0, 0, 0, 0);
        const transactionStatus = txDate > today ? 'pending' : 'completed';
        const transactionAmount = amountPerTransaction ?? (recurrence !== 'none' && repetitions > 1 && recurrenceType === 'installment' ? parsed / repetitions : parsed);

        const localDate = new Date(transactionDate);
        const dateWithNoon = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0, 0);

        const data: CreateTransactionInput = {
          type: firebaseType,
          amount: transactionAmount,
          description: description.trim() || categoryName,
          date: Timestamp.fromDate(dateWithNoon),
          recurrence,
          status: transactionStatus,
        };

        if (recurrence !== 'none' && repetitions > 1) data.recurrenceType = recurrenceType;
        if (useCreditCard && type === 'despesa' && creditCardId) {
          data.creditCardId = creditCardId;
          data.accountId = accountId || undefined;
        } else {
          data.accountId = accountId;
        }
        if (type !== 'transfer' && categoryId) data.categoryId = categoryId;
        if (type === 'transfer' && toAccountId) data.toAccountId = toAccountId;
        if (seriesId) data.seriesId = seriesId;
        if (recurrence !== 'none' && repetitions > 1 && recurrenceType === 'installment' && installmentIndex !== undefined) {
          data.installmentCurrent = installmentIndex + 1;
          data.installmentTotal = repetitions;
        }

        return data;
      };

      let success = false;
      
      if (isEditMode && editTransaction) {
        const transactionData = buildTransactionData(date);
        success = await updateTransaction(editTransaction.id, transactionData);
        if (success) showSnackbar('Lançamento atualizado!');
      } else {
        const totalToCreate = recurrence === 'none' ? 1 : repetitions;
        const amountPerInstallment = recurrence === 'none' ? parsed : (recurrenceType === 'installment' ? parsed / totalToCreate : parsed);
        let createdCount = 0;

        for (let i = 0; i < totalToCreate; i++) {
          if (totalToCreate > 1) setSavingProgress({ current: i + 1, total: totalToCreate });
          const transactionDate = getNextDate(date, i);
          const transactionData = buildTransactionData(transactionDate, amountPerInstallment, i);
          const result = await createTransaction(transactionData);
          if (result) createdCount++;
        }
        setSavingProgress(null);

        success = createdCount === totalToCreate;
        if (success) {
          if (totalToCreate > 1) {
            showSnackbar(`${createdCount} lançamentos criados! ${totalToCreate}x de ${formatCurrency(Math.round(amountPerInstallment * 100).toString())}`);
          } else {
            showSnackbar('Lançamento salvo!');
          }
        }
      }

      if (success) {
        if (!isEditMode && user?.uid && type !== 'transfer' && categoryId) {
          const effectiveDescription = (description.trim() || categoryName).trim();
          learnSuggestionPattern({
            userId: user.uid,
            description: effectiveDescription,
            categoryId,
          }).catch((err) => {
            console.warn('[AddTransactionModalV2] learnSuggestionPattern failed:', err);
          });
        }

        try {
          onSave?.();
        } catch (callbackError) {
          console.warn('[AddTransactionModalV2] onSave callback error:', callbackError);
        }

        try {
          onClose();
        } catch (callbackError) {
          console.warn('[AddTransactionModalV2] onClose callback error:', callbackError);
        }
      } else {
        showAlert('Erro', `Não foi possível ${isEditMode ? 'atualizar' : 'salvar'} o lançamento`, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('[AddTransactionModalV2] handleSave error:', error);
      showAlert('Erro', 'Ocorreu um erro ao salvar', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }, [type, amount, description, categoryId, categoryName, accountId, toAccountId, creditCardId, useCreditCard, date, recurrence, repetitions, recurrenceType, createTransaction, updateTransaction, isEditMode, editTransaction, onSave, onClose, showAlert, showSnackbar]);

  // Delete handler
  const handleDelete = useCallback(() => {
    if (!editTransaction || !onDelete) return;
    
    if (editTransaction.seriesId && onDeleteSeries) {
      const isLastInstallment = editTransaction.installmentCurrent === editTransaction.installmentTotal;
      
      if (isLastInstallment) {
        showAlert('Excluir lançamento', 'Tem certeza?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: () => { onDelete(editTransaction.id); onClose(); }}
        ]);
      } else {
        const remaining = (editTransaction.installmentTotal || 1) - (editTransaction.installmentCurrent || 1) + 1;
        showAlert('Excluir lançamento', 'Este lançamento faz parte de uma série.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir apenas este', onPress: () => { onDelete(editTransaction.id); onClose(); }},
          { text: `Excluir desta em diante (${remaining}x)`, style: 'destructive', onPress: async () => {
            onDeleteSeries(editTransaction.seriesId!, editTransaction.installmentCurrent);
            onClose();
          }}
        ]);
      }
    } else {
      showAlert('Excluir lançamento', 'Tem certeza?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => { onDelete(editTransaction.id); onClose(); }}
      ]);
    }
  }, [editTransaction, onDelete, onDeleteSeries, onClose, showAlert]);

  // Custom Date Picker
  const CustomDatePicker = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const goToPrevMonth = () => setTempDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
    const goToNextMonth = () => setTempDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });

    const selectDay = (d: number) => {
      const newDate = new Date(year, month, d, 12, 0, 0, 0);
      setDate(newDate);
      setActivePicker('none');
    };

    const isToday = (d: number) => {
      const today = new Date();
      return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const isSelected = (d: number) => d === date.getDate() && month === date.getMonth() && year === date.getFullYear();

    return (
      <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecionar Data</Text>
          <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.calendarHeader}>
          <Pressable onPress={goToPrevMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.gray} />
          </Pressable>
          <Text style={[styles.calendarTitle, { color: colors.text }]}>{MONTHS_SHORT[month]} {year}</Text>
          <Pressable onPress={goToNextMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.gray} />
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <Text key={i} style={[styles.weekdayText, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {days.map((d, i) => (
            <View key={i} style={styles.dayCell}>
              {d !== null && (
                <Pressable
                  onPress={() => selectDay(d)}
                  style={[
                    styles.dayButton,
                    isSelected(d) && { backgroundColor: colors.primary },
                    isToday(d) && !isSelected(d) && { backgroundColor: colors.primaryBg },
                  ]}
                >
                  <Text style={[styles.dayText, { color: colors.text }, isSelected(d) && { color: '#fff', fontWeight: '600' }, isToday(d) && !isSelected(d) && { color: colors.primary, fontWeight: '600' }]}>
                    {d}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
        <View style={[styles.quickDateActions, { borderTopColor: colors.border }]}>
          <Pressable onPress={() => { setDate(new Date()); setActivePicker('none'); }} style={[styles.quickDateButton, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.quickDateText, { color: colors.primary }]}>Hoje</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render picker content
  const renderPickerContent = () => {
    if (activePicker === 'none') return null;

    if (activePicker === 'date' && Platform.OS !== 'web') {
      return (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChangeNative}
        />
      );
    }

    if (activePicker === 'date') return <CustomDatePicker />;

    if (activePicker === 'category') {
      return (
        <CategoryPicker
          categories={filteredCategories}
          selectedCategoryId={categoryId}
          transactionType={type === 'receita' ? 'receita' : 'despesa'}
          onSelect={(id, name) => { setCategoryId(id); setCategoryName(name); }}
          onClose={() => setActivePicker('none')}
          onCreateCategory={createCategory}
          onShowSnackbar={showSnackbar}
          colors={{
            card: colors.card,
            text: colors.text,
            textMuted: colors.textMuted,
            border: colors.border,
            primary: colors.primary,
            primaryBg: colors.primaryBg,
            grayLight: colors.grayLight,
            expense: colors.expense,
            income: colors.income,
          }}
          insets={insets}
        />
      );
    }

    if (activePicker === 'account' || activePicker === 'toAccount') {
      const isToAccount = activePicker === 'toAccount';
      const accountsList = isToAccount ? visibleAccounts.filter(a => a.id !== accountId) : visibleAccounts;
      
      return (
        <AccountPicker
          accounts={accountsList}
          creditCards={!isToAccount ? activeCards : []}
          selectedAccountId={isToAccount ? toAccountId : accountId}
          selectedCreditCardId={creditCardId}
          useCreditCard={useCreditCard}
          transactionType={type}
          isGoalTransaction={isGoalTransaction}
          isMetaCategoryTransaction={!!isMetaCategoryTransaction}
          onSelectAccount={(id, name) => {
            if (isToAccount) { setToAccountId(id); setToAccountName(name); }
            else { setAccountId(id); setAccountName(name); setUseCreditCard(false); }
          }}
          onSelectCreditCard={(id, name) => {
            setCreditCardId(id);
            setCreditCardName(name);
            setUseCreditCard(true);
          }}
          onClose={() => setActivePicker('none')}
          colors={{
            card: colors.card,
            text: colors.text,
            textMuted: colors.textMuted,
            border: colors.border,
            primary: colors.primary,
            primaryBg: colors.primaryBg,
            grayLight: colors.grayLight,
          }}
          insets={insets}
          title={isToAccount ? 'Conta de Destino' : undefined}
        />
      );
    }

    if (activePicker === 'recurrence') {
      return (
        <RecurrencePicker
          options={RECURRENCE_OPTIONS}
          selectedValue={recurrence}
          onSelect={(value) => {
            setRecurrence(value);
            if (value === 'none') setRepetitions(1);
          }}
          onClose={() => setActivePicker('none')}
          colors={{ card: colors.card, text: colors.text, textMuted: colors.textMuted, border: colors.border, primary: colors.primary, primaryBg: colors.primaryBg, grayLight: colors.grayLight }}
          insets={insets}
        />
      );
    }

    if (activePicker === 'recurrenceType') {
      return (
        <RecurrenceTypePicker
          options={RECURRENCE_TYPE_OPTIONS}
          selectedValue={recurrenceType}
          onSelect={setRecurrenceType}
          onClose={() => setActivePicker('none')}
          colors={{ card: colors.card, text: colors.text, textMuted: colors.textMuted, border: colors.border, primary: colors.primary, primaryBg: colors.primaryBg, grayLight: colors.grayLight }}
          insets={insets}
        />
      );
    }

    if (activePicker === 'repetitions') {
      return (
        <RepetitionsPicker
          value={repetitions}
          onChange={setRepetitions}
          onClose={() => setActivePicker('none')}
          colors={{ card: colors.card, text: colors.text, textMuted: colors.textMuted, border: colors.border, primary: colors.primary, primaryBg: colors.primaryBg, grayLight: colors.grayLight }}
          insets={insets}
        />
      );
    }

    return null;
  };

  // No accounts message
  if (visible && visibleAccounts.length === 0) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.noAccountsContainer}>
              <MaterialCommunityIcons name="account-plus" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
              <Text style={[styles.noAccountsTitle, { color: colors.text }]}>Bem-vindo ao Cofrin!</Text>
              <Text style={[styles.noAccountsText, { color: colors.textMuted }]}>
                Para iniciar os lançamentos, cadastre sua primeira conta.
              </Text>
              <Pressable
                onPress={() => { onClose(); navigation.navigate('ConfigureAccounts'); }}
                style={[styles.noAccountsButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.noAccountsButtonText}>Cadastrar Conta</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        {activePicker !== 'none' ? (
          <Pressable style={styles.overlay} onPress={() => setActivePicker('none')}>
            <Pressable onPress={(e) => e.stopPropagation()} style={styles.pickerContainer}>
              {renderPickerContent()}
            </Pressable>
          </Pressable>
        ) : (
          <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              {/* Header com tipo e valor */}
              <TransactionHeader
                type={type}
                onTypeChange={setType}
                amount={amount}
                onAmountChange={handleAmountChange}
                amountInputRef={amountInputRef}
                disabled={visibleAccounts.length === 0 || !!isGoalTransaction}
                hideTypeSelector={!!isGoalTransaction || !!isMetaCategoryTransaction || isAnticipationDiscount}
                colors={{
                  text: colors.text,
                  textMuted: colors.textMuted,
                  card: colors.card,
                  border: colors.border,
                  expense: colors.expense,
                  income: colors.income,
                  primary: colors.primary,
                  bg: colors.bg,
                }}
              />

              {/* Formulário scrollável */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.formScroll}
                contentContainerStyle={{ paddingBottom: spacing.md }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {!isAnticipationDiscount && (
                  <TransactionFormV2
                    userId={user?.uid}
                    type={type}
                    description={description}
                    onDescriptionChange={setDescription}
                    hasAmount={hasAmount}
                    categoryId={categoryId}
                    categoryName={categoryName}
                    categories={filteredCategories}
                    onSelectCategory={(id, name) => { setCategoryId(id); setCategoryName(name); }}
                    disableCategoryChange={disableCategoryChange}
                    showCategory={type !== 'transfer' && !isGoalTransaction && !isMetaCategoryTransaction}
                    accountId={accountId}
                    accountName={accountName}
                    useCreditCard={useCreditCard}
                    creditCardName={creditCardName}
                    creditCardColor={activeCards.find(c => c.id === creditCardId)?.color}
                    sourceAccount={sourceAccount}
                    toAccountId={toAccountId}
                    toAccountName={toAccountName}
                    date={date}
                    onDateChange={setDate}
                    recurrence={recurrence}
                    recurrenceType={recurrenceType}
                    repetitions={repetitions}
                    installmentValue={installmentValue}
                    onRecurrenceChange={setRecurrence}
                    onRecurrenceTypeChange={setRecurrenceType}
                    onRepetitionsChange={setRepetitions}
                    showRecurrence={!isGoalTransaction && !isMetaCategoryTransaction}
                    hasSeriesId={!!editTransaction?.seriesId}
                    isFutureInstallment={isFutureInstallment}
                    isFirstInstallmentOfSeries={isEditMode && !!editTransaction?.seriesId && editTransaction?.installmentCurrent === 1 && (editTransaction?.installmentTotal || 0) > 1}
                    installmentInfo={editTransaction?.installmentTotal ? { current: editTransaction.installmentCurrent || 1, total: editTransaction.installmentTotal } : null}
                    onOpenPicker={(picker) => {
                      if (disableCategoryChange && picker === 'category') return;
                      setActivePicker(picker as PickerType);
                    }}
                    onAnticipate={handleAnticipate}
                    onMoveSeries={handleMoveSeries}
                    onRecurrenceToggled={(enabled) => {
                      if (enabled) {
                        // Scroll para o final quando ativar recorrência
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }
                    }}
                    sameAccountError={type === 'transfer' && accountId === toAccountId && !!accountId}
                    colors={{
                      card: colors.card,
                      text: colors.text,
                      textMuted: colors.textMuted,
                      border: colors.border,
                      primary: colors.primary,
                      primaryBg: colors.primaryBg,
                      grayLight: colors.grayLight,
                      gray: colors.gray,
                      expense: colors.expense,
                      income: colors.income,
                      success: colors.success,
                      successBg: colors.successBg,
                      danger: colors.danger,
                      warning: colors.warning,
                      warningBg: colors.warningBg,
                    }}
                  />
                )}
              </ScrollView>

              {/* Botões de ação */}
              <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
                {isEditMode && onDelete && editTransaction && (
                  <Pressable 
                    onPress={handleDelete} 
                    style={[styles.deleteButton, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.text} />
                  </Pressable>
                )}
                <Pressable 
                  onPress={onClose} 
                  disabled={saving}
                  style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.bg }, saving && { opacity: 0.5 }]}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving || !canConfirm}
                  style={[styles.saveButton, { backgroundColor: colors.primary }, (saving || !canConfirm) && { opacity: 0.6 }]}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        )}
      </Modal>

      {/* Modal de Antecipação */}
      <Modal visible={showAnticipateModal} transparent animationType="fade" onRequestClose={() => setShowAnticipateModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAnticipateModal(false)}>
          <Pressable style={[styles.anticipateModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.anticipateModalHeader}>
              <MaterialCommunityIcons name="clock-fast" size={24} color={colors.success} />
              <Text style={[styles.anticipateModalTitle, { color: colors.text }]}>Antecipar Parcela</Text>
            </View>
            <Text style={[styles.anticipateModalDescription, { color: colors.textMuted }]}>
              Esta parcela será movida para a próxima fatura disponível.
            </Text>
            <View style={[styles.discountSection, { backgroundColor: colors.grayLight }]}>
              <Text style={[styles.discountQuestion, { color: colors.text }]}>Você obteve desconto ao antecipar?</Text>
              <View style={styles.discountToggle}>
                <Pressable
                  onPress={() => setHasDiscount(false)}
                  style={[styles.discountOption, { backgroundColor: !hasDiscount ? colors.primary + '20' : 'transparent' }]}
                >
                  <Text style={[styles.discountOptionText, { color: !hasDiscount ? colors.primary : colors.textMuted }]}>Não</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHasDiscount(true)}
                  style={[styles.discountOption, { backgroundColor: hasDiscount ? colors.success + '20' : 'transparent' }]}
                >
                  <Text style={[styles.discountOptionText, { color: hasDiscount ? colors.success : colors.textMuted }]}>Sim</Text>
                </Pressable>
              </View>
              {hasDiscount && (
                <View style={styles.discountInputSection}>
                  <Text style={[styles.discountInputLabel, { color: colors.text }]}>Valor do desconto:</Text>
                  <TextInput
                    value={discountAmount}
                    onChangeText={(t) => setDiscountAmount(formatCurrency(t))}
                    placeholder="R$ 0,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[styles.discountInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  />
                </View>
              )}
            </View>
            <View style={styles.anticipateModalButtons}>
              <Pressable onPress={() => { setShowAnticipateModal(false); setHasDiscount(false); setDiscountAmount(''); }} style={[styles.anticipateModalButton, { backgroundColor: colors.grayLight }]}>
                <Text style={[styles.anticipateModalButtonText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmAnticipate} style={[styles.anticipateModalButton, { backgroundColor: colors.success }]}>
                <Text style={[styles.anticipateModalButtonText, { color: '#FFFFFF' }]}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomAlert visible={alertState.visible} title={alertState.title} message={alertState.message} buttons={alertState.buttons} onClose={hideAlert} />
      <Snackbar visible={snackbarState.visible} message={snackbarState.message} type={snackbarState.type} duration={snackbarState.duration} onDismiss={hideSnackbar} />
      <LoadingOverlay visible={saving && savingProgress !== null && savingProgress.total > 3} message="Criando lançamentos..." progress={savingProgress} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: borderRadius.xl,
  },
  formScroll: {
    maxHeight: 400,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: 500,
  },
  pickerContent: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  calendarNavButton: {
    padding: spacing.sm,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  quickDateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  quickDateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noAccountsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noAccountsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  noAccountsText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  noAccountsButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  noAccountsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  anticipateModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  anticipateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  anticipateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  anticipateModalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  discountSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  discountQuestion: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  discountOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  discountOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountInputSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  discountInputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  discountInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  anticipateModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  anticipateModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  anticipateModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
