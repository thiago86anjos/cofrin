/**
 * Hook para gerenciar o estado do formulário de transação
 * Extrai a lógica de estado do AddTransactionModal
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { TextInput } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { RecurrenceType, Category } from '../types/firebase';
import { formatCurrency, parseCurrency } from '../utils/transactionHelpers';

export type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
export type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'creditCard' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

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

interface Account {
  id: string;
  name: string;
  icon?: string;
  balance?: number;
}

interface CreditCard {
  id: string;
  name: string;
  limit: number;
  currentUsed?: number;
  closingDay: number;
}

interface UseTransactionFormProps {
  initialType?: LocalTransactionType;
  editTransaction?: EditableTransaction | null;
  activeAccounts: Account[];
  activeCards: CreditCard[];
  categories: Category[];
}

export function useTransactionForm({
  initialType = 'despesa',
  editTransaction,
  activeAccounts,
  activeCards,
  categories,
}: UseTransactionFormProps) {
  // Mode flags
  const isEditMode = !!editTransaction;
  const isGoalTransaction = !!editTransaction?.goalId;
  const isMetaCategoryTransaction = editTransaction?.categoryId && 
    categories.find(c => c.id === editTransaction.categoryId)?.isMetaCategory;

  // Form state
  const [type, setType] = useState<LocalTransactionType>(initialType);
  const [amount, setAmount] = useState('R$ 0,00');
  const [description, setDescription] = useState('');
  
  // Category state
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  
  // Create category inline state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Account state
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [toAccountName, setToAccountName] = useState('');
  
  // Credit card state
  const [creditCardId, setCreditCardId] = useState('');
  const [creditCardName, setCreditCardName] = useState('');
  const [useCreditCard, setUseCreditCard] = useState(false);
  
  // Date and recurrence
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
  const shouldAutoFocus = useRef(false);
  const amountInputRef = useRef<TextInput>(null);

  // Computed values
  const hasAmount = useMemo(() => parseCurrency(amount) > 0, [amount]);

  const installmentValue = useMemo(() => {
    if (recurrence !== 'none' && repetitions > 1) {
      const parsed = parseCurrency(amount);
      return recurrenceType === 'installment' ? parsed / repetitions : parsed;
    }
    return 0;
  }, [amount, repetitions, recurrence, recurrenceType]);

  const sourceAccount = useMemo(() => {
    if (type === 'transfer' || (type === 'despesa' && !useCreditCard)) {
      return activeAccounts.find(acc => acc.id === accountId);
    }
    return null;
  }, [type, accountId, useCreditCard, activeAccounts]);

  const canConfirm = useMemo(() => {
    if (!hasAmount || !description.trim()) return false;
    if (type === 'transfer' && accountId && toAccountId && accountId === toAccountId) {
      return false;
    }
    return true;
  }, [type, accountId, toAccountId, hasAmount, description]);

  const isFutureInstallment = useMemo(() => {
    if (!editTransaction || !editTransaction.creditCardId || editTransaction.anticipatedFrom) {
      return false;
    }
    
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const txMonth = editTransaction.month || currentMonth;
    const txYear = editTransaction.year || currentYear;
    
    if (txYear < currentYear || (txYear === currentYear && txMonth <= currentMonth)) {
      return false;
    }
    
    const card = activeCards.find(c => c.id === editTransaction.creditCardId);
    if (!card) return false;
    
    const targetMonth = currentDay > card.closingDay ? currentMonth + 1 : currentMonth;
    const targetYear = targetMonth > 12 ? currentYear + 1 : currentYear;
    const normalizedTargetMonth = targetMonth > 12 ? 1 : targetMonth;
    
    const txIsAhead = txYear > targetYear || (txYear === targetYear && txMonth > normalizedTargetMonth);
    return txIsAhead;
  }, [editTransaction, activeCards]);

  const isAnticipationDiscount = useMemo(() => {
    if (!editTransaction) return false;
    return Boolean(editTransaction.relatedTransactionId || editTransaction.description?.startsWith('Desconto antecipação - '));
  }, [editTransaction]);

  // Filtered categories by type
  const filteredCategories = useMemo(() => {
    if (type === 'transfer') return [];
    const categoryType = type === 'despesa' ? 'expense' : 'income';
    const allCategories = categories.filter(c => c.type === categoryType);
    
    const rootCategories = allCategories.filter(c => !c.parentId);
    const subcategories = allCategories.filter(c => c.parentId);
    
    const organized: Array<{ category: Category; isSubcategory: boolean }> = [];
    rootCategories.forEach(parent => {
      organized.push({ category: parent, isSubcategory: false });
      const children = subcategories.filter(sub => sub.parentId === parent.id);
      children.forEach(child => {
        organized.push({ category: child, isSubcategory: true });
      });
    });
    
    return organized;
  }, [categories, type]);

  // Handlers
  const handleAmountChange = useCallback((text: string) => {
    setAmount(formatCurrency(text));
  }, []);

  const resetForm = useCallback(() => {
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
    setActivePicker('none');
    setSaving(false);
    
    if (activeAccounts.length > 0) {
      setAccountId(activeAccounts[0].id);
      setAccountName(activeAccounts[0].name);
      if (activeAccounts.length > 1) {
        setToAccountId(activeAccounts[1].id);
        setToAccountName(activeAccounts[1].name);
      }
    }
  }, [initialType, activeAccounts]);

  const populateFromEdit = useCallback(() => {
    if (!editTransaction) return;
    
    const localType: LocalTransactionType = 
      editTransaction.type === 'expense' ? 'despesa' : 
      editTransaction.type === 'income' ? 'receita' : 'transfer';
    setType(localType);
    
    const cents = Math.round(editTransaction.amount * 100);
    setAmount(formatCurrency(cents.toString()));
    
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
    } else {
      setUseCreditCard(false);
      setAccountId('');
      setAccountName('');
      setCreditCardId('');
      setCreditCardName('');
    }
    
    if (editTransaction.toAccountId) {
      setToAccountId(editTransaction.toAccountId);
      setToAccountName(editTransaction.toAccountName || '');
    } else {
      setToAccountId('');
      setToAccountName('');
    }
  }, [editTransaction]);

  return {
    // Form state
    type, setType,
    amount, setAmount: handleAmountChange,
    description, setDescription,
    categoryId, setCategoryId,
    categoryName, setCategoryName,
    accountId, setAccountId,
    accountName, setAccountName,
    toAccountId, setToAccountId,
    toAccountName, setToAccountName,
    creditCardId, setCreditCardId,
    creditCardName, setCreditCardName,
    useCreditCard, setUseCreditCard,
    date, setDate,
    recurrence, setRecurrence,
    recurrenceType, setRecurrenceType,
    repetitions, setRepetitions,
    
    // Create category state
    isCreatingCategory, setIsCreatingCategory,
    newCategoryName, setNewCategoryName,
    newCategoryIcon, setNewCategoryIcon,
    savingCategory, setSavingCategory,
    
    // UI state
    saving, setSaving,
    savingProgress, setSavingProgress,
    activePicker, setActivePicker,
    tempDate, setTempDate,
    
    // Anticipation state
    showAnticipateModal, setShowAnticipateModal,
    hasDiscount, setHasDiscount,
    discountAmount, setDiscountAmount,
    
    // Refs
    shouldAutoFocus,
    amountInputRef,
    
    // Computed values
    hasAmount,
    installmentValue,
    sourceAccount,
    canConfirm,
    isFutureInstallment,
    isAnticipationDiscount,
    filteredCategories,
    
    // Mode flags
    isEditMode,
    isGoalTransaction,
    isMetaCategoryTransaction,
    
    // Handlers
    resetForm,
    populateFromEdit,
  };
}
