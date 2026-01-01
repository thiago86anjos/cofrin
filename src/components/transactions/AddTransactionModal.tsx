import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Modal,
  Dimensions,
  Text,
  TextInput,
  ActivityIndicator
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
import { TransactionType, RecurrenceType, CreateTransactionInput, CATEGORY_ICONS, Category, CreateCategoryInput } from '../../types/firebase';
import { useTransactionRefresh } from '../../contexts/transactionRefreshContext';
import { validateBillForTransaction } from '../../services/creditCardBillService';
import { useAuth } from '../../contexts/authContext';
import { moveSeriesMonth, anticipateInstallment, deleteSeriesFromInstallment } from '../../services/transactionService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'creditCard' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

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
  seriesId?: string; // ID da série para transações recorrentes
  installmentCurrent?: number; // Número da parcela atual (ex: 1)
  installmentTotal?: number; // Total de parcelas (ex: 12)
  month?: number; // Mês da fatura (1-12)
  year?: number; // Ano da fatura
  anticipatedFrom?: { month: number; year: number; date: Timestamp }; // Se foi antecipada
  anticipationDiscount?: number; // Valor do desconto obtido na antecipação
  relatedTransactionId?: string; // ID da transação relacionada (para descontos de antecipação)
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: (id: string) => void;
  onDeleteSeries?: (seriesId: string, fromInstallment?: number) => void;
  initialType?: LocalTransactionType;
  editTransaction?: EditableTransaction | null;
}

// Constants
const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'Não repetir', value: 'none' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

// Opções de tipo de recorrência (parcelada ou fixa)
const RECURRENCE_TYPE_OPTIONS = [
  { label: 'Parcelada', value: 'installment', description: 'Valor total dividido pelas repetições' },
  { label: 'Fixa', value: 'fixed', description: 'Mesmo valor em cada repetição' },
];

// Opções de número de repetições (1-72)
const REPETITION_OPTIONS = Array.from({ length: 72 }, (_, i) => ({
  label: `${i + 1}x`,
  value: i + 1,
}));

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Helpers
function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, '') || '0';
  const num = parseInt(digits, 10);
  const cents = (num % 100).toString().padStart(2, '0');
  const integer = Math.floor(num / 100);
  const integerStr = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${integerStr},${cents}`;
}

function parseCurrency(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function AddTransactionModal({
  visible,
  onClose,
  onSave,
  onDelete,
  onDeleteSeries,
  initialType = 'despesa',
  editTransaction,
}: Props) {
  const { colors } = useAppTheme();
  const { refreshKey } = useTransactionRefresh();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Firebase hooks
  const { categories, refresh: refreshCategories, createCategory } = useCategories();
  const { activeAccounts, refresh: refreshAccounts } = useAccounts();
  const { activeCards, refresh: refreshCreditCards } = useCreditCards();
  const { createTransaction, updateTransaction } = useTransactions();
  const navigation = useNavigation<any>();

  // Mode
  const isEditMode = !!editTransaction;
  const isGoalTransaction = !!editTransaction?.goalId;
  const isMetaCategoryTransaction = editTransaction?.categoryId && categories.find(c => c.id === editTransaction.categoryId)?.isMetaCategory;

  // State
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
  
  // Credit card state (optional for expenses)
  const [creditCardId, setCreditCardId] = useState('');
  const [creditCardName, setCreditCardName] = useState('');
  const [useCreditCard, setUseCreditCard] = useState(false);
  
  const [date, setDate] = useState(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceType, setRecurrenceType] = useState<'installment' | 'fixed'>('installment'); // Parcelada ou Fixa
  const [repetitions, setRepetitions] = useState(1); // Número de repetições (1-72)
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Estados para antecipação de parcela
  const [showAnticipateModal, setShowAnticipateModal] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');

  // Single picker state - evita modais aninhados
  const [activePicker, setActivePicker] = useState<PickerType>('none');
  
  // Date picker state for custom calendar
  const [tempDate, setTempDate] = useState(new Date());
  
  // Controlar autoFocus apenas na abertura inicial
  const shouldAutoFocus = useRef(false);
  
  // Ref para o campo de valor
  const amountInputRef = useRef<TextInput>(null);
  
  // Custom alert hook
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  
  // Snackbar hook
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  
  // Calcular valor por parcela
  const installmentValue = React.useMemo(() => {
    if (recurrence !== 'none' && repetitions > 1) {
      const parsed = parseCurrency(amount);
      // Se for parcelada, divide o valor. Se for fixa, mantém o valor integral
      return recurrenceType === 'installment' ? parsed / repetitions : parsed;
    }
    return 0;
  }, [amount, repetitions, recurrence, recurrenceType]);
  
  // Obter conta de origem e verificar saldo
  const sourceAccount = React.useMemo(() => {
    if (type === 'transfer' || (type === 'despesa' && !useCreditCard)) {
      return activeAccounts.find(acc => acc.id === accountId);
    }
    return null;
  }, [type, accountId, useCreditCard, activeAccounts]);
  
  // Handler para clicar no campo de descrição quando está desabilitado
  const handleDescriptionPress = () => {
    if (!hasAmount) {
      const transactionTypeLabel = type === 'despesa' ? 'despesa' : type === 'receita' ? 'receita' : 'transferência';
      showAlert(
        'Atenção',
        `Para lançar uma ${transactionTypeLabel}, você precisa preencher o valor primeiro.`,
        [
          {
            text: 'OK',
            style: 'default',
            onPress: () => {
              amountInputRef.current?.focus();
            }
          }
        ]
      );
    }
  };

  // Verificar se o valor foi preenchido (diferente de R$ 0,00)
  const hasAmount = React.useMemo(() => {
    const parsed = parseCurrency(amount);
    return parsed > 0;
  }, [amount]);

  // Verificar se pode confirmar
  const canConfirm = React.useMemo(() => {
    // Valor e descrição devem estar preenchidos
    if (!hasAmount || !description.trim()) {
      return false;
    }
    
    if (type === 'transfer') {
      // Não permitir transferência para a mesma conta
      if (accountId && toAccountId && accountId === toAccountId) {
        return false;
      }
    }
    return true;
  }, [type, accountId, toAccountId, hasAmount, description]);

  // Verificar se a transação pode ser antecipada (para fatura anterior não fechada)
  const isFutureInstallment = React.useMemo(() => {
    if (!editTransaction || !editTransaction.creditCardId || editTransaction.anticipatedFrom) {
      return false; // Não é cartão, não tem transação ou já foi antecipada
    }
    
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const txMonth = editTransaction.month || currentMonth;
    const txYear = editTransaction.year || currentYear;
    
    // Se a transação é do mês atual ou anterior, não pode antecipar
    if (txYear < currentYear || (txYear === currentYear && txMonth <= currentMonth)) {
      return false;
    }
    
    // Buscar cartão para verificar dia de fechamento
    const card = activeCards.find(c => c.id === editTransaction.creditCardId);
    if (!card) {
      return false;
    }
    
    // Calcular qual seria a fatura de destino (considerando se a atual já fechou)
    // Se hoje > dia de fechamento, a fatura "atual" já fechou e estamos na próxima
    const targetMonth = currentDay > card.closingDay ? currentMonth + 1 : currentMonth;
    const targetYear = targetMonth > 12 ? currentYear + 1 : currentYear;
    const normalizedTargetMonth = targetMonth > 12 ? 1 : targetMonth;
    
    // Só permitir antecipar se a transação está pelo menos 1 mês à frente da fatura destino
    const txIsAhead = txYear > targetYear || (txYear === targetYear && txMonth > normalizedTargetMonth);
    
    return txIsAhead;
  }, [editTransaction, activeCards]);

  // Verificar se é uma transação de desconto de antecipação (gerada automaticamente)
  const isAnticipationDiscount = React.useMemo(() => {
    if (!editTransaction) return false;
    return Boolean(editTransaction.relatedTransactionId || editTransaction.description?.startsWith('Desconto antecipação - '));
  }, [editTransaction]);

  // Filtrar categorias por tipo e organizar hierarquicamente
  const filteredCategories: Array<{ category: Category; isSubcategory: boolean }> = React.useMemo(() => {
    if (type === 'transfer') return [];
    const categoryType = type === 'despesa' ? 'expense' : 'income';
    const allCategories = categories.filter(c => c.type === categoryType);
    
    // Separar pais e filhos
    const rootCategories = allCategories.filter(c => !c.parentId);
    const subcategories = allCategories.filter(c => c.parentId);
    
    // Organizar: pai seguido de suas subcategorias
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

  // Atualizar categoria quando mudar o tipo (despesa/receita)
  useEffect(() => {
    if (type === 'transfer') {
      // Limpar categoria para transferências
      setCategoryId('');
      setCategoryName('');
    } else if (!editTransaction && categoryId) {
      // Verificar se a categoria atual é do tipo correto
      const categoryType = type === 'despesa' ? 'expense' : 'income';
      const currentCat = categories.find(c => c.id === categoryId);
      if (currentCat && currentCat.type !== categoryType) {
        // Categoria atual não é do tipo correto, limpar
        setCategoryId('');
        setCategoryName('');
      }
    }
  }, [type, categories, editTransaction, categoryId]);

  // Set default account when accounts load (only for new transactions)
  useEffect(() => {
    // Não setar conta padrão se estiver editando uma transação
    if (activeAccounts.length > 0 && !accountId && !useCreditCard && !editTransaction) {
      setAccountId(activeAccounts[0].id);
      setAccountName(activeAccounts[0].name);
      if (activeAccounts.length > 1) {
        setToAccountId(activeAccounts[1].id);
        setToAccountName(activeAccounts[1].name);
      }
    }
  }, [activeAccounts.length, useCreditCard, accountId, editTransaction]); // Verificar editTransaction diretamente

  // Não setar categoria padrão automaticamente - usuário deve escolher

  // Reset form when modal opens or populate with edit data
  useEffect(() => {
    if (visible) {
      // Ativar autoFocus apenas na abertura
      shouldAutoFocus.current = true;
      
      // Focar campo de valor após um pequeno delay
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
      
      // Recarregar listas quando abrir (corrige UI desatualizada após criar/editar/excluir)
      refreshCategories();
      refreshAccounts();
      refreshCreditCards();

      setActivePicker('none');
      setSaving(false);
      
      if (editTransaction) {
        // Populate form with existing transaction data
        
        const localType: LocalTransactionType = 
          editTransaction.type === 'expense' ? 'despesa' : 
          editTransaction.type === 'income' ? 'receita' : 'transfer';
        setType(localType);
        
        // Format amount for display
        const cents = Math.round(editTransaction.amount * 100);
        setAmount(formatCurrency(cents.toString()));
        
        setDescription(editTransaction.description || '');
        setDate(editTransaction.date);
        setRecurrence(editTransaction.recurrence || 'none');
        setRecurrenceType(editTransaction.recurrenceType || 'installment');
        setRepetitions(1); // Em edição, não alteramos repetições
        
        // Category
        if (editTransaction.categoryId) {
          setCategoryId(editTransaction.categoryId);
          setCategoryName(editTransaction.categoryName || '');
        } else {
          setCategoryId('');
          setCategoryName('');
        }
        
        // Account or Credit Card - clear the other when one is set
        if (editTransaction.accountId) {
          // Transaction is on account
          setAccountId(editTransaction.accountId);
          setAccountName(editTransaction.accountName || '');
          setUseCreditCard(false);
          // Clear credit card fields
          setCreditCardId('');
          setCreditCardName('');
        } else if (editTransaction.creditCardId) {
          // Transaction is on credit card
          setUseCreditCard(true);
          setCreditCardId(editTransaction.creditCardId);
          setCreditCardName(editTransaction.creditCardName || '');
          // Clear account fields
          setAccountId('');
          setAccountName('');
        } else {
          // Caso não tenha nem conta nem cartão (edge case)
          setUseCreditCard(false);
          setAccountId('');
          setAccountName('');
          setCreditCardId('');
          setCreditCardName('');
        }
        
        // To account (for transfers)
        if (editTransaction.toAccountId) {
          setToAccountId(editTransaction.toAccountId);
          setToAccountName(editTransaction.toAccountName || '');
        } else {
          setToAccountId('');
          setToAccountName('');
        }
      } else {
        // Reset to defaults for new transaction
        setType(initialType);
        setAmount('R$ 0,00');
        setDescription('');
        setDate(new Date());
        setRecurrence('none');
        setRepetitions(1);
        setUseCreditCard(false);
        setCreditCardId('');
        setCreditCardName('');
        
        // Reset to defaults
        if (activeAccounts.length > 0) {
          setAccountId(activeAccounts[0].id);
          setAccountName(activeAccounts[0].name);
          if (activeAccounts.length > 1) {
            setToAccountId(activeAccounts[1].id);
            setToAccountName(activeAccounts[1].name);
          }
        }
        // Não definir categoria padrão - usuário deve escolher
        setCategoryId('');
        setCategoryName('');
      }
    }
  }, [visible, initialType, refreshCategories, refreshAccounts, refreshCreditCards, refreshKey]); // Removido editTransaction para permitir edição de tipo

  // Sync tempDate when opening date picker
  useEffect(() => {
    if (activePicker === 'date') {
      setTempDate(date);
    }
  }, [activePicker, date]);

  // Colors based on type (usando theme tokens)
  const typeColors = {
    despesa: colors.expense,
    receita: colors.income,
    transfer: colors.textMuted,
  };
  
  const headerColor = typeColors[type];

  const handleAmountChange = useCallback((text: string) => {
    setAmount(formatCurrency(text));
  }, []);

  const handleDateChangeNative = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setActivePicker('none');
      }
      if (event.type === 'set' && selectedDate) {
        setDate(selectedDate);
      }
    },
    []
  );
  
  // Handler para mover série de transações
  const handleMoveSeries = useCallback(async (monthsToMove: number) => {
    if (!user?.uid || !editTransaction?.seriesId || !editTransaction?.creditCardId) return;
    
    const direction = monthsToMove > 0 ? 'próximo mês' : 'mês anterior';
    const totalParcelas = editTransaction.installmentTotal || 0;
    
    // Se está movendo para trás, validar se a fatura de destino não está fechada
    if (monthsToMove < 0 && editTransaction.creditCardId) {
      const card = activeCards.find(c => c.id === editTransaction.creditCardId);
      if (card) {
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        
        // Calcular mês de destino da primeira parcela
        const firstInstallmentMonth = editTransaction.month || currentMonth;
        const firstInstallmentYear = editTransaction.year || currentYear;
        
        let targetMonth = firstInstallmentMonth + monthsToMove;
        let targetYear = firstInstallmentYear;
        
        // Ajustar ano se necessário
        while (targetMonth < 1) {
          targetMonth += 12;
          targetYear -= 1;
        }
        
        // Verificar se a fatura de destino já fechou
        const isCurrentYearMonth = targetYear === currentYear && targetMonth === currentMonth;
        const isPastBill = targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth);
        const isCurrentButClosed = isCurrentYearMonth && currentDay > card.closingDay;
        
        if (isPastBill || isCurrentButClosed) {
          showAlert(
            'Fatura Fechada',
            'Não é possível mover a série para uma fatura que já está fechada.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
      }
    }
    
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
                // Recarregar dados e fechar modal
                onSave?.();
                onClose();
              } else {
                showAlert('Erro', 'Não foi possível mover a série de transações.', [
                  { text: 'OK', style: 'default' }
                ]);
              }
            } catch (error) {
              console.error('Erro ao mover série:', error);
              showAlert('Erro', 'Ocorreu um erro ao mover a série.', [
                { text: 'OK', style: 'default' }
              ]);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }, [user?.uid, editTransaction, activeCards, showAlert, showSnackbar, onSave, onClose]);

  const handleAnticipate = useCallback(async () => {
    if (!user?.uid || !editTransaction?.id || !editTransaction?.creditCardId) return;
    
    const parcelaNum = editTransaction.installmentCurrent || 1;
    const totalParcelas = editTransaction.installmentTotal || 1;
    
    setShowAnticipateModal(true);
  }, [user?.uid, editTransaction]);

  const confirmAnticipate = useCallback(async () => {
    if (!user?.uid || !editTransaction?.id || !editTransaction?.creditCardId) return;
    
    setSaving(true);
    setShowAnticipateModal(false);
    
    try {
      const discount = hasDiscount && discountAmount ? parseCurrency(discountAmount) : 0;
      
      // Calcular mês/ano de destino considerando o dia de fechamento
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      // Buscar cartão para verificar dia de fechamento
      const card = activeCards.find(c => c.id === editTransaction.creditCardId);
      if (!card) {
        showAlert('Erro', 'Cartão não encontrado.', [{ text: 'OK', style: 'default' }]);
        setSaving(false);
        return;
      }
      
      // Se já passou o dia de fechamento, antecipar para o próximo mês
      // Senão, antecipar para o mês atual
      let targetMonth = currentMonth;
      let targetYear = currentYear;
      
      if (currentDay > card.closingDay) {
        targetMonth += 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      }
      
      const result = await anticipateInstallment(
        user.uid,
        editTransaction.id,
        targetMonth,
        targetYear,
        discount > 0 ? discount : undefined
      );
      
      if (result.success) {
        const isParcela = editTransaction.installmentTotal && editTransaction.installmentTotal > 1;
        const parcelaNum = editTransaction.installmentCurrent || 1;
        const totalParcelas = editTransaction.installmentTotal || 1;
        
        let mensagem: string;
        if (isParcela) {
          mensagem = discount > 0 
            ? `Parcela ${parcelaNum}/${totalParcelas} antecipada com desconto de ${formatCurrency(Math.round(discount * 100).toString())}!`
            : `Parcela ${parcelaNum}/${totalParcelas} antecipada!`;
        } else {
          mensagem = discount > 0
            ? `Lançamento antecipado com desconto de ${formatCurrency(Math.round(discount * 100).toString())}!`
            : 'Lançamento antecipado!';
        }
        
        showSnackbar(mensagem);
        // Resetar estados
        setHasDiscount(false);
        setDiscountAmount('');
        // Recarregar dados e fechar modal
        onSave?.();
        onClose();
      } else {
        const isParcela = editTransaction.installmentTotal && editTransaction.installmentTotal > 1;
        showAlert('Erro', `Não foi possível antecipar ${isParcela ? 'a parcela' : 'o lançamento'}.`, [
          { text: 'OK', style: 'default' }
        ]);
      }
    } catch (error) {
      console.error('Erro ao antecipar:', error);
      const isParcela = editTransaction.installmentTotal && editTransaction.installmentTotal > 1;
      showAlert('Erro', `Ocorreu um erro ao antecipar ${isParcela ? 'a parcela' : 'o lançamento'}.`, [
        { text: 'OK', style: 'default' }
      ]);
    } finally {
      setSaving(false);
    }
  }, [user?.uid, editTransaction, hasDiscount, discountAmount, activeCards, showAlert, showSnackbar, onSave, onClose]);

  const handleSave = useCallback(async () => {
    const parsed = parseCurrency(amount);
    if (parsed <= 0) {
      showAlert('Erro', 'O valor deve ser maior que zero', [{ text: 'OK', style: 'default' }]);
      return;
    }

    if (!accountId && !useCreditCard) {
      showAlert('Erro', 'Selecione uma conta', [{ text: 'OK', style: 'default' }]);
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      showAlert('Erro', 'Selecione a conta de destino', [{ text: 'OK', style: 'default' }]);
      return;
    }

    // Validar limite do cartão de crédito
    if (useCreditCard && creditCardId && type === 'despesa') {
      const card = activeCards.find(c => c.id === creditCardId);
      if (card) {
        const currentUsed = card.currentUsed || 0;
        const availableLimit = card.limit - currentUsed;
        
        // Calcular valor total da transação (incluindo parcelas se for parcelado)
        const totalTransactionValue = recurrence !== 'none' && repetitions > 1 && recurrenceType === 'fixed' 
          ? parsed * repetitions  // Se for fixa, multiplica pelo número de repetições
          : parsed; // Se for parcelada ou única, usa o valor informado
        
        if (totalTransactionValue > availableLimit) {
          showAlert(
            'Limite Insuficiente',
            `O cartão "${card.name}" não possui limite disponível suficiente.\n\nLimite disponível: ${formatCurrency(Math.round(availableLimit * 100).toString())}\nValor da transação: ${formatCurrency(Math.round(totalTransactionValue * 100).toString())}`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Alterar limite', 
                style: 'default',
                onPress: () => {
                  onClose();
                  navigation.navigate('CreditCards', { editCardId: creditCardId });
                }
              }
            ]
          );
          return;
        }
      }
    }

    // Validar fatura de cartão de crédito - verificar se está paga
    if (useCreditCard && creditCardId && user?.uid) {
      const card = activeCards.find(c => c.id === creditCardId);
      if (card) {
        const validation = await validateBillForTransaction(
          user.uid,
          creditCardId,
          date,
          card.closingDay
        );
        
        if (validation.isPaid && validation.message) {
          // Mostrar aviso que será redirecionado para próxima fatura
          showAlert(
            'Fatura Paga',
            validation.message,
            [{ text: 'OK, entendi', style: 'default' }]
          );
          // Continua salvando pois o serviço vai redirecionar automaticamente
        }
      }
    }

    setSaving(true);
    try {
      // Map local type to Firebase type
      const firebaseType: TransactionType = 
        type === 'despesa' ? 'expense' : 
        type === 'receita' ? 'income' : 'transfer';

      // Função para calcular próxima data baseado na recorrência
      const getNextDate = (baseDate: Date, occurrence: number): Date => {
        const newDate = new Date(baseDate);
        switch (recurrence) {
          case 'weekly':
            newDate.setDate(newDate.getDate() + (7 * occurrence));
            break;
          case 'biweekly':
            newDate.setDate(newDate.getDate() + (14 * occurrence));
            break;
          case 'monthly':
            newDate.setMonth(newDate.getMonth() + occurrence);
            break;
          case 'yearly':
            newDate.setFullYear(newDate.getFullYear() + occurrence);
            break;
          default:
            break;
        }
        return newDate;
      };

      // Gerar seriesId único para transações em série
      const seriesId = recurrence !== 'none' && repetitions > 1 
        ? `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : undefined;

      // Build base transaction data without undefined fields
      const buildTransactionData = (transactionDate: Date, amountPerTransaction?: number, installmentIndex?: number): CreateTransactionInput => {
        // Status baseado na data: futuro = pendente, passado/hoje = concluído
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const txDate = new Date(transactionDate);
        txDate.setHours(0, 0, 0, 0);
        const transactionStatus = txDate > today ? 'pending' : 'completed';

        // Calcular valor da transação baseado no tipo de recorrência
        const transactionAmount = amountPerTransaction ?? (
          recurrence !== 'none' && repetitions > 1 && recurrenceType === 'installment'
            ? parsed / repetitions
            : parsed
        );

        // Criar data local (sem UTC) com horário meio-dia
        const localDate = new Date(transactionDate);
        // Criar uma nova data usando os componentes locais (ano, mês, dia) e setar meio-dia
        const dateWithNoon = new Date(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate(),
          12, 0, 0, 0
        );

        const data: CreateTransactionInput = {
          type: firebaseType,
          amount: transactionAmount,
          description: description.trim() || categoryName,
          date: Timestamp.fromDate(dateWithNoon),
          recurrence,
          status: transactionStatus,
        };

        // Adicionar recurrenceType apenas se tiver valor
        if (recurrence !== 'none' && repetitions > 1) {
          data.recurrenceType = recurrenceType;
        }

        // Tratar conta e cartão de crédito
        if (useCreditCard && type === 'despesa' && creditCardId) {
          // Despesa com cartão de crédito
          data.creditCardId = creditCardId;
          data.accountId = accountId || undefined; // Conta de pagamento da fatura
        } else {
          // Transação de conta (não é cartão)
          data.accountId = accountId;
          // Se está editando e removendo cartão, definir como null
          if (isEditMode && editTransaction?.creditCardId) {
            data.creditCardId = undefined;
          }
        }

        // Add optional fields only if they have values
        if (type !== 'transfer' && categoryId) {
          data.categoryId = categoryId;
        }
        if (type === 'transfer' && toAccountId) {
          data.toAccountId = toAccountId;
        }
        // Add seriesId for recurring transactions
        if (seriesId) {
          data.seriesId = seriesId;
        }
        
        // Adicionar informações de parcela se for transação parcelada
        if (recurrence !== 'none' && repetitions > 1 && recurrenceType === 'installment' && installmentIndex !== undefined) {
          data.installmentCurrent = installmentIndex + 1;
          data.installmentTotal = repetitions;
        }

        return data;
      };

      let success = false;
      
      if (isEditMode && editTransaction) {
        // Verificar se está tentando adicionar recorrência a uma transação existente
        const addingRecurrence = editTransaction.recurrence === 'none' && recurrence !== 'none' && repetitions > 1;
        
        if (addingRecurrence) {
          // Criar novas transações recorrentes a partir desta
          const totalToCreate = repetitions;
          const amountPerInstallment = parsed / totalToCreate;
          let createdCount = 0;

          for (let i = 0; i < totalToCreate; i++) {
            setSavingProgress({ current: i + 1, total: totalToCreate });
            const transactionDate = getNextDate(date, i);
            const transactionData = buildTransactionData(transactionDate, amountPerInstallment, i);
            const result = await createTransaction(transactionData);
            if (result) {
              createdCount++;
            }
          }
          setSavingProgress(null);

          // Deletar a transação original
          if (createdCount > 0 && onDelete) {
            onDelete(editTransaction.id);
          }

          success = createdCount === totalToCreate;
          if (success) {
            const valuePerInstallment = formatCurrency(Math.round(amountPerInstallment * 100).toString());
            showSnackbar(`${createdCount} lançamentos criados! ${totalToCreate}x de ${valuePerInstallment}`);
          }
        } else {
          // Update existing transaction normalmente (sem adicionar recorrência)
          const transactionData = buildTransactionData(date);
          success = await updateTransaction(editTransaction.id, transactionData);
          if (success) {
            showSnackbar('Lançamento atualizado!');
          }
        }
      } else {
        // Create new transaction(s)
        const totalToCreate = recurrence === 'none' ? 1 : repetitions;
        // Calcular valor considerando o tipo de recorrência
        const amountPerInstallment = recurrence === 'none' 
          ? parsed 
          : (recurrenceType === 'installment' ? parsed / totalToCreate : parsed);
        let createdCount = 0;

        for (let i = 0; i < totalToCreate; i++) {
          if (totalToCreate > 1) {
            setSavingProgress({ current: i + 1, total: totalToCreate });
          }
          const transactionDate = getNextDate(date, i);
          const transactionData = buildTransactionData(transactionDate, amountPerInstallment, i);
          const result = await createTransaction(transactionData);
          if (result) {
            createdCount++;
          }
        }
        setSavingProgress(null);

        success = createdCount === totalToCreate;
        if (success) {
          if (totalToCreate > 1) {
            const valuePerInstallment = formatCurrency(Math.round(amountPerInstallment * 100).toString());
            const totalMessage = recurrenceType === 'fixed' 
              ? ` (Total: ${formatCurrency(Math.round(amountPerInstallment * totalToCreate * 100).toString())})`
              : '';
            showSnackbar(`${createdCount} lançamentos criados! ${totalToCreate}x de ${valuePerInstallment}${totalMessage}`);
          } else {
            showSnackbar('Lançamento salvo!');
          }
        } else if (createdCount > 0) {
          showSnackbar(`${createdCount} de ${totalToCreate} lançamentos criados`, 'info');
          success = true; // Considerar parcialmente bem sucedido
        }
      }

      if (success) {
        onSave?.();
        onClose();
      } else {
        showAlert('Erro', `Não foi possível ${isEditMode ? 'atualizar' : 'salvar'} o lançamento`, [{ text: 'OK', style: 'default' }]);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showAlert('Erro', 'Ocorreu um erro ao salvar', [{ text: 'OK', style: 'default' }]);
    } finally {
      setSaving(false);
    }
  }, [
    type, amount, description, categoryId, categoryName,
    accountId, toAccountId, creditCardId, useCreditCard,
    date, recurrence, repetitions, createTransaction, updateTransaction, 
    isEditMode, editTransaction, onSave, onClose, activeAccounts, activeCards, user
  ]);

  // Componente de campo selecionável
  const SelectField = ({
    label,
    value,
    icon,
    onPress,
    subtitle,
    subtitleColor,
    disabled,
  }: {
    label: string;
    value: string;
    icon: string;
    onPress?: () => void;
    subtitle?: string;
    subtitleColor?: string;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.selectField,
        { backgroundColor: pressed ? colors.grayLight : 'transparent' },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: disabled ? colors.border : colors.grayLight }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={disabled ? colors.textMuted : colors.gray} />
      </View>
      <View style={styles.fieldContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
          {subtitle && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>|</Text>
              <Text style={[styles.fieldSubtitle, { color: subtitleColor || colors.textMuted }]}>{subtitle}</Text>
            </>
          )}
        </View>
        <Text style={[styles.fieldValue, { color: disabled ? colors.textMuted : colors.text }]}>{value}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={disabled ? colors.border : colors.gray} />
    </Pressable>
  );

  // Custom Date Picker Component (funciona em todas as plataformas)
  const CustomDatePicker = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const day = tempDate.getDate();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Empty slots for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const goToPrevMonth = () => {
      const newDate = new Date(tempDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setTempDate(newDate);
    };

    const goToNextMonth = () => {
      const newDate = new Date(tempDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setTempDate(newDate);
    };

    const selectDay = (selectedDay: number) => {
      const newDate = new Date(year, month, selectedDay);
      setDate(newDate);
      setActivePicker('none');
    };

    const isToday = (d: number) => {
      const today = new Date();
      return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const isSelected = (d: number) => {
      return d === date.getDate() && month === date.getMonth() && year === date.getFullYear();
    };

    return (
      <View style={styles.pickerContainer}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecionar Data</Text>
          <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Month/Year Navigation */}
        <View style={styles.calendarHeader}>
          <Pressable onPress={goToPrevMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.gray} />
          </Pressable>
          <Text style={[styles.calendarTitle, { color: colors.text }]}>
            {MONTHS[month]} {year}
          </Text>
          <Pressable onPress={goToNextMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.gray} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <Text key={i} style={[styles.weekdayText, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
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
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      isSelected(d) && { color: '#fff', fontWeight: '600' },
                      isToday(d) && !isSelected(d) && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickDateActions, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              setDate(new Date());
              setActivePicker('none');
            }}
            style={[styles.quickDateButton, { backgroundColor: colors.primaryBg }]}
          >
            <Text style={[styles.quickDateText, { color: colors.primary }]}>Hoje</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Picker Content based on activePicker
  const renderPickerContent = () => {
    if (activePicker === 'none') return null;

    // Para data no iOS/Android nativo
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

    // Custom date picker for web
    if (activePicker === 'date') {
      return <CustomDatePicker />;
    }

    // Render category picker
    if (activePicker === 'category') {
      const categoryType = type === 'despesa' ? 'expense' : 'income';
      const availableCategoriesForCreation = categories.filter(c => 
        c.type === categoryType &&
        !c.isMetaCategory && c.name !== 'Meta'
      );
      const typeColor = type === 'despesa' ? colors.expense : colors.income;
      const availableIcons = CATEGORY_ICONS[categoryType];
      
      // Handler para criar categoria
      const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
          showSnackbar('Digite um nome para a categoria');
          return;
        }
        if (!newCategoryIcon) {
          showSnackbar('Selecione um ícone para a categoria');
          return;
        }
        
        setSavingCategory(true);
        try {
          // Garantir que a cor seja sempre uma string válida ou undefined (não null)
          const categoryColor = typeColor || (type === 'despesa' ? '#FF6B6B' : '#51CF66');
          
          const categoryData: CreateCategoryInput = {
            name: newCategoryName.trim(),
            type: categoryType,
            icon: newCategoryIcon,
          };
          
          // Adicionar cor apenas se for uma string válida
          if (categoryColor && typeof categoryColor === 'string') {
            categoryData.color = categoryColor;
          }
          
          const newCategory = await createCategory(categoryData);
          
          if (newCategory) {
            // Selecionar a nova categoria
            setCategoryId(newCategory.id);
            setCategoryName(newCategory.name);
            showSnackbar(`Categoria "${newCategory.name}" criada!`);
            
            // Resetar estado e fechar picker
            setIsCreatingCategory(false);
            setNewCategoryName('');
            setNewCategoryIcon('');
            setActivePicker('none');
          }
        } catch (error) {
          showSnackbar('Erro ao criar categoria');
        } finally {
          setSavingCategory(false);
        }
      };
      
      // Se estiver no modo de criar categoria
      if (isCreatingCategory) {
        return (
          <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Pressable 
                onPress={() => {
                  setIsCreatingCategory(false);
                  setNewCategoryName('');
                  setNewCategoryIcon('');
                }} 
                hitSlop={12}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textMuted} />
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Nova Categoria</Text>
              </Pressable>
              <Pressable onPress={() => {
                setIsCreatingCategory(false);
                setNewCategoryName('');
                setNewCategoryIcon('');
                setActivePicker('none');
              }} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            
            <ScrollView 
              style={styles.pickerScroll} 
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
              showsVerticalScrollIndicator={false}
            >
              {/* Campo de nome */}
              <View style={styles.createCategoryForm}>
                <Text style={[styles.createCategoryLabel, { color: colors.text }]}>Nome da categoria</Text>
                <View style={[styles.createCategoryInput, { borderColor: colors.border }]}>
                  <TextInput
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder={type === 'despesa' ? 'Ex: Streaming, Academia...' : 'Ex: Freelance, Bônus...'}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.createCategoryInputText, { color: colors.text }]}
                    autoFocus
                    maxLength={30}
                  />
                </View>
              </View>
              
              {/* Seleção de ícone */}
              <View style={styles.createCategoryForm}>
                <Text style={[styles.createCategoryLabel, { color: colors.text }]}>Escolha um ícone</Text>
                <View style={styles.iconGrid}>
                  {availableIcons.map((icon) => (
                    <Pressable
                      key={icon}
                      onPress={() => setNewCategoryIcon(icon)}
                      style={[
                        styles.iconOption,
                        { 
                          borderColor: newCategoryIcon === icon ? typeColor : colors.border,
                          backgroundColor: newCategoryIcon === icon ? typeColor + '15' : 'transparent',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={icon as any} 
                        size={22} 
                        color={newCategoryIcon === icon ? typeColor : colors.textMuted} 
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
              
              {/* Preview */}
              {newCategoryName.trim() && newCategoryIcon && (
                <View style={[styles.createCategoryPreview, { borderColor: colors.border }]}>
                  <Text style={[styles.createCategoryPreviewLabel, { color: colors.textMuted }]}>Preview:</Text>
                  <View style={styles.createCategoryPreviewChip}>
                    <View style={[styles.createCategoryPreviewIcon, { backgroundColor: typeColor + '20' }]}>
                      <MaterialCommunityIcons 
                        name={newCategoryIcon as any} 
                        size={16} 
                        color={typeColor} 
                      />
                    </View>
                    <Text style={[styles.createCategoryPreviewName, { color: colors.text }]}>
                      {newCategoryName.trim()}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Botão de criar */}
              <Pressable
                onPress={handleCreateCategory}
                disabled={savingCategory || !newCategoryName.trim() || !newCategoryIcon}
                style={({ pressed }) => [
                  styles.createCategoryButton,
                  { backgroundColor: typeColor },
                  (savingCategory || !newCategoryName.trim() || !newCategoryIcon) && { opacity: 0.5 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                {savingCategory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                    <Text style={styles.createCategoryButtonText}>Criar categoria</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        );
      }
      
      // Picker normal com botão de adicionar
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecionar Categoria</Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView 
            style={styles.pickerScroll} 
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
            showsVerticalScrollIndicator={false}
          >
            {/* Botão de criar nova categoria */}
            <Pressable
              onPress={() => setIsCreatingCategory(true)}
              style={({ pressed }) => [
                styles.createCategoryOption,
                { backgroundColor: pressed ? colors.primaryBg : 'transparent', borderColor: colors.primary },
              ]}
            >
              <View style={[styles.createCategoryIconCircle, { backgroundColor: colors.primaryBg }]}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.createCategoryOptionText, { color: colors.primary }]}>
                Nova categoria de {type === 'despesa' ? 'despesa' : 'receita'}
              </Text>
            </Pressable>
            
            {/* Divisor */}
            <View style={[styles.pickerDivider, { backgroundColor: colors.border }]} />
            
            {/* Lista de categorias existentes */}
            {filteredCategories.map((item) => {
              const cat = item.category;
              const isSubcategory = item.isSubcategory;
              const categoryColor = cat.color || (type === 'despesa' ? colors.expense : colors.income);
              
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setCategoryName(cat.name);
                    setActivePicker('none');
                  }}
                  style={({ pressed }) => [
                    styles.pickerOption,
                    { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                    categoryId === cat.id && { backgroundColor: colors.primaryBg },
                    isSubcategory && { paddingLeft: spacing.xl + spacing.lg }, // Indentação para subcategorias
                  ]}
                >
                  <View style={styles.pickerOptionWithIcon}>
                    {isSubcategory ? (
                      <>
                        <MaterialCommunityIcons 
                          name="subdirectory-arrow-right" 
                          size={16} 
                          color={colors.textMuted} 
                          style={{ marginRight: spacing.xs }}
                        />
                        <View style={[styles.categoryColorDot, { backgroundColor: categoryColor }]} />
                      </>
                    ) : (
                      <View style={[styles.categoryColorCircle, { backgroundColor: categoryColor }]}>
                        <MaterialCommunityIcons 
                          name={(cat.icon || 'tag') as any} 
                          size={18} 
                          color="#FFFFFF" 
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.text, marginLeft: spacing.sm },
                        categoryId === cat.id && { color: colors.primary, fontWeight: '600' },
                        isSubcategory && { fontSize: 14 }, // Fonte menor para subcategorias
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </View>
                  {categoryId === cat.id && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    // Render account picker
    if (activePicker === 'account') {
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              {type === 'transfer' ? 'Conta de Origem' : 'Selecionar Conta'}
            </Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>
            {activeAccounts.map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => {
                  setAccountId(acc.id);
                  setAccountName(acc.name);
                  setUseCreditCard(false);
                  setActivePicker('none');
                }}
                style={({ pressed }) => [
                  styles.pickerOption,
                  { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                  accountId === acc.id && !useCreditCard && { backgroundColor: colors.primaryBg },
                ]}
              >
                <View style={styles.pickerOptionWithIcon}>
                  <MaterialCommunityIcons 
                    name={(acc.icon || 'bank') as any} 
                    size={20} 
                    color={accountId === acc.id && !useCreditCard ? colors.primary : colors.textMuted} 
                  />
                  <Text
                    style={[
                      styles.pickerOptionText,
                      { color: colors.text, marginLeft: spacing.sm },
                      accountId === acc.id && !useCreditCard && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {acc.name}
                  </Text>
                </View>
                {accountId === acc.id && !useCreditCard && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
            
            {/* Credit cards option for expenses - não permitir para transações de meta */}
            {type === 'despesa' && activeCards.length > 0 && !isGoalTransaction && !isMetaCategoryTransaction && (
              <>
                <View style={[styles.pickerDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.pickerSectionTitle, { color: colors.textMuted }]}>
                  CARTÕES DE CRÉDITO
                </Text>
                {activeCards.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => {
                      setCreditCardId(card.id);
                      setCreditCardName(card.name);
                      setUseCreditCard(true);
                      setActivePicker('none');
                    }}
                    style={({ pressed }) => [
                      styles.pickerOption,
                      { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                      creditCardId === card.id && useCreditCard && { backgroundColor: colors.primaryBg },
                    ]}
                  >
                    <View style={styles.pickerOptionWithIcon}>
                      <MaterialCommunityIcons 
                        name="credit-card" 
                        size={20} 
                        color={creditCardId === card.id && useCreditCard ? colors.primary : colors.textMuted} 
                      />
                      <Text
                        style={[
                          styles.pickerOptionText,
                          { color: colors.text, marginLeft: spacing.sm },
                          creditCardId === card.id && useCreditCard && { color: colors.primary, fontWeight: '600' },
                        ]}
                      >
                        {card.name}
                      </Text>
                    </View>
                    {creditCardId === card.id && useCreditCard && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      );
    }

    // Render toAccount picker (for transfers)
    if (activePicker === 'toAccount') {
      const filteredAccounts = activeAccounts.filter(a => a.id !== accountId);
      
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Conta de Destino</Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>
            {filteredAccounts.map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => {
                  setToAccountId(acc.id);
                  setToAccountName(acc.name);
                  setActivePicker('none');
                }}
                style={({ pressed }) => [
                  styles.pickerOption,
                  { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                  toAccountId === acc.id && { backgroundColor: colors.primaryBg },
                ]}
              >
                <View style={styles.pickerOptionWithIcon}>
                  <MaterialCommunityIcons 
                    name={(acc.icon || 'bank') as any} 
                    size={20} 
                    color={toAccountId === acc.id ? colors.primary : colors.textMuted} 
                  />
                  <Text
                    style={[
                      styles.pickerOptionText,
                      { color: colors.text, marginLeft: spacing.sm },
                      toAccountId === acc.id && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {acc.name}
                  </Text>
                </View>
                {toAccountId === acc.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Render recurrence picker
    if (activePicker === 'recurrence') {
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Repetir Lançamento</Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>
            {RECURRENCE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setRecurrence(option.value);
                  // Se escolher "Não repetir", reseta repetições para 1
                  if (option.value === 'none') {
                    setRepetitions(1);
                  }
                  setActivePicker('none');
                }}
                style={({ pressed }) => [
                  styles.pickerOption,
                  { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                  recurrence === option.value && { backgroundColor: colors.primaryBg },
                ]}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    { color: colors.text },
                    recurrence === option.value && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {option.label}
                </Text>
                {recurrence === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Render picker for recurrence type (installment or fixed)
    if (activePicker === 'recurrenceType') {
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Tipo de Recorrência</Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}>
            {RECURRENCE_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setRecurrenceType(option.value as 'installment' | 'fixed');
                  setActivePicker('none');
                }}
                style={({ pressed }) => [
                  styles.pickerOption,
                  { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                  recurrenceType === option.value && { backgroundColor: colors.primaryBg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      { color: colors.text },
                      recurrenceType === option.value && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.pickerOptionDescription, { color: colors.textMuted }]}>
                    {option.description}
                  </Text>
                </View>
                {recurrenceType === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Render repetitions picker - Input numérico moderno
    if (activePicker === 'repetitions') {
      const quickNumbers = [3, 6, 12, 24];
      
      const handleIncrement = () => {
        if (repetitions < 72) setRepetitions(repetitions + 1);
      };
      
      const handleDecrement = () => {
        if (repetitions > 1) setRepetitions(repetitions - 1);
      };
      
      const handleQuickNumber = (num: number) => {
        setRepetitions(num);
      };
      
      return (
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Quantas vezes repetir?</Text>
            <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          
          <View style={{ 
            padding: spacing.lg,
            paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl),
            gap: spacing.lg,
          }}>
            {/* Input numérico com botões +/- */}
            <View style={styles.numericInputRow}>
              <Pressable
                onPress={handleDecrement}
                disabled={repetitions <= 1}
                style={[
                  styles.numericButton,
                  { borderColor: repetitions <= 1 ? colors.border : colors.primary },
                ]}
              >
                <MaterialCommunityIcons 
                  name="minus" 
                  size={28} 
                  color={repetitions <= 1 ? colors.textMuted : colors.primary} 
                />
              </Pressable>
              
              <Text style={[styles.numericValue, { color: colors.text }]}>
                {repetitions}x
              </Text>
              
              <Pressable
                onPress={handleIncrement}
                disabled={repetitions >= 72}
                style={[
                  styles.numericButton,
                  { borderColor: repetitions >= 72 ? colors.border : colors.primary },
                ]}
              >
                <MaterialCommunityIcons 
                  name="plus" 
                  size={28} 
                  color={repetitions >= 72 ? colors.textMuted : colors.primary} 
                />
              </Pressable>
            </View>
            
            {/* Botões rápidos */}
            <View style={{ gap: spacing.sm }}>
              <Text style={[styles.numericInputLabel, { color: colors.textMuted, fontSize: 14, marginBottom: 0 }]}>
                Valores comuns:
              </Text>
              <View style={styles.numericInputButtons}>
                {quickNumbers.map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => handleQuickNumber(num)}
                    style={[
                      styles.quickNumberButton,
                      { 
                        borderColor: repetitions === num ? colors.primary : colors.border,
                        backgroundColor: repetitions === num ? colors.primaryBg : 'transparent',
                      },
                    ]}
                  >
                    <Text 
                      style={[
                        styles.quickNumberText,
                        { color: repetitions === num ? colors.primary : colors.text }
                      ]}
                    >
                      {num}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            {/* Botão Confirmar */}
            <Pressable
              onPress={() => setActivePicker('none')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.md + 2,
                paddingHorizontal: spacing.lg,
                borderRadius: borderRadius.lg,
                gap: spacing.sm,
                backgroundColor: colors.primary,
              }}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {activePicker !== 'none' ? (
          // Modal overlay centralizada
          <Pressable
            style={styles.pickerOverlay}
            onPress={() => setActivePicker('none')}
          >
            <Pressable 
              onPress={(e) => e.stopPropagation()}
              style={[styles.centerModalContainer, { backgroundColor: colors.card }]}
            >
              {renderPickerContent()}
            </Pressable>
          </Pressable>
        ) : (
          // Main form fullscreen
          <View style={[styles.fullscreenModal, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
            {/* Header colorido com valor e gradiente sutil */}
            <View style={[styles.header, { backgroundColor: headerColor }]}> 
              {/* Type selector com título integrado - ocultar para transações de meta e descontos de antecipação */}
              {!isGoalTransaction && !isMetaCategoryTransaction && !isAnticipationDiscount && (
                <View style={styles.typeSelector}> 
                  {(['despesa', 'receita', 'transfer'] as LocalTransactionType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={({ pressed }) => [ 
                        styles.typeChip,
                        type === t && styles.typeChipActive,
                        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                      ]}
                      disabled={activeAccounts.length === 0}
                    >
                      <MaterialCommunityIcons 
                        name={t === 'despesa' ? 'arrow-down' : t === 'receita' ? 'arrow-up' : 'swap-horizontal'} 
                        size={16} 
                        color={type === t ? '#322438' : 'rgba(255,255,255,0.9)'} 
                      />
                      <Text
                        style={[ 
                          styles.typeChipText,
                          type === t && styles.typeChipTextActive,
                        ]}
                      >
                        {t === 'despesa' ? 'Despesa' : t === 'receita' ? 'Receita' : 'Transf.'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {/* Amount input */}
              <TextInput
                ref={amountInputRef}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                style={styles.amountInput}
                placeholder="R$ 0,00"
                placeholderTextColor="rgba(255,255,255,0.5)"
                selectionColor="#fff"
                editable={activeAccounts.length > 0 && !isGoalTransaction}
                onFocus={() => { shouldAutoFocus.current = false; }}
              />
            </View>
                
                {/* Onboarding message if no accounts */}
                {activeAccounts.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                    <MaterialCommunityIcons name="account-plus" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 12 }}>
                      Bem-vindo ao Cofrin!
                    </Text>
                    <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>
                      Verificamos que você não tem conta cadastrada e para iniciar os lançamentos isso é importante. Por favor, cadastre sua primeira conta para começar a usar o Cofrin.
                    </Text>
                    <Pressable
                      onPress={() => {
                        onClose();
                        navigation.navigate('ConfigureAccounts');
                      }}
                      style={({ pressed }) => [
                        styles.onboardingButton,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.onboardingButtonText}>Cadastrar Conta</Text>
                    </Pressable>
                  </View>
            ) : (
              <ScrollView
                style={styles.fullscreenContent}
                contentContainerStyle={styles.fullscreenContentContainer}
                showsVerticalScrollIndicator={false}
              >
                  {/* Descrição */}
                  <Pressable
                    onPress={handleDescriptionPress}
                    disabled={hasAmount}
                    style={[styles.fieldRow, { backgroundColor: colors.card, opacity: hasAmount ? 1 : 0.6 }]}
                  >
                    <View style={[styles.fieldIcon, { backgroundColor: hasAmount ? colors.primaryBg : colors.grayLight }]}>
                      <MaterialCommunityIcons name="text" size={20} color={hasAmount ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Descrição</Text>
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder={hasAmount ? "Ex: Almoço, Salário..." : "Preencha o valor primeiro"}
                        placeholderTextColor={colors.textMuted}
                        style={[styles.textInput, { color: colors.text }]}
                        maxLength={60}
                        editable={hasAmount}
                        pointerEvents={hasAmount ? 'auto' : 'none'}
                      />
                    </View>
                  </Pressable>
                  
                  {/* Linha tracejada */}
                  <View style={[styles.dashedDivider, { borderColor: colors.border }]} />

                  {/* Campos adicionais - ocultos para descontos de antecipação */}
                  {!isAnticipationDiscount && (
                    <>
                      {/* Campos sem wrapper - direto na lista */}
                      {/* Campos sem wrapper - direto na lista */}
                      {/* Categoria - não mostrar para transferências ou transações de meta */}
                      {type !== 'transfer' && !isGoalTransaction && !isMetaCategoryTransaction && (
                        <>
                          <SelectField
                            label="Categoria"
                            value={categoryName || 'Selecione uma categoria'}
                            icon="tag-outline"
                            onPress={description.trim() ? () => setActivePicker('category') : undefined}
                            disabled={!description.trim()}
                          />
                          <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                        </>
                      )}
                      {/* Conta - desabilitado para transações de meta */}
                      {type === 'transfer' ? (
                        <>
                          <SelectField
                            label="De (conta origem)"
                            value={accountName || 'Selecione'}
                            icon="bank-transfer-out"
                            onPress={() => setActivePicker('account')}
                            subtitle={sourceAccount ? `Saldo atual: ${formatCurrency(Math.round(sourceAccount.balance * 100).toString())}` : undefined}
                            subtitleColor={sourceAccount && sourceAccount.balance < 0 ? colors.danger : colors.textMuted}
                          />
                          <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                          <SelectField
                            label="Para (conta destino)"
                            value={toAccountName || 'Selecione'}
                            icon="bank-transfer-in"
                          onPress={() => {
                            if (activeAccounts.length <= 1) {
                              showAlert(
                                'Mais contas necessárias',
                                'É preciso ter mais de uma conta cadastrada para fazer transferências.',
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  {
                                    text: 'Criar conta',
                                    onPress: () => {
                                      onClose();
                                      navigation.navigate('ConfigureAccounts');
                                    }
                                  }
                                ]
                              );
                            } else {
                              setActivePicker('toAccount');
                            }
                          }}
                        />
                      </>
                    ) : (
                      <SelectField
                        label={type === 'despesa' ? 'Pago com' : 'Recebido em'}
                        value={useCreditCard ? creditCardName : (accountName || 'Selecione')}
                        icon={useCreditCard ? 'credit-card' : 'bank-outline'}
                        onPress={() => setActivePicker('account')}
                        subtitle={!useCreditCard && sourceAccount ? `Saldo atual: ${formatCurrency(Math.round(sourceAccount.balance * 100).toString())}` : undefined}
                        subtitleColor={!useCreditCard && sourceAccount && sourceAccount.balance < 0 ? colors.danger : colors.textMuted}
                      />
                    )}
                    <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                    {/* Data */}
                    <SelectField
                      label="Data"
                      value={formatDate(date)}
                      icon="calendar"
                      onPress={() => setActivePicker('date')}
                    />
                    
                    {/* Botão de antecipar parcela - só aparece se for parcela futura */}
                    {isFutureInstallment && (
                      <View style={[styles.anticipateContainer, { backgroundColor: colors.successBg || colors.grayLight }]}>
                        <MaterialCommunityIcons name="clock-fast" size={20} color={colors.success} />
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={[styles.anticipateLabel, { color: colors.text }]}>
                            {editTransaction?.installmentTotal && editTransaction.installmentTotal > 1
                              ? 'Esta parcela é de uma fatura futura'
                              : 'Este lançamento é de uma fatura futura'}
                          </Text>
                          <Text style={[styles.anticipateSubLabel, { color: colors.textMuted }]}>
                            {editTransaction?.installmentTotal && editTransaction.installmentTotal > 1
                              ? 'Você pode antecipá-la para a próxima fatura'
                              : 'Você pode antecipá-lo para a próxima fatura'}
                          </Text>
                        </View>
                        <Pressable
                          onPress={handleAnticipate}
                          style={({ pressed }) => [
                            styles.anticipateButton,
                            { 
                              backgroundColor: pressed ? colors.success + '30' : colors.success,
                            },
                          ]}
                        >
                          <Text style={[styles.anticipateButtonText, { color: '#FFFFFF' }]}>
                            Antecipar
                          </Text>
                        </Pressable>
                      </View>
                    )}
                    
                    {/* Botões de mover série - só aparece se for primeira parcela de uma série */}
                    {isEditMode && editTransaction?.seriesId && editTransaction?.installmentCurrent === 1 && editTransaction?.installmentTotal && editTransaction.installmentTotal > 1 && (
                      <View style={[styles.moveSeriesContainer, { backgroundColor: colors.grayLight }]}>
                        <Text style={[styles.moveSeriesLabel, { color: colors.textMuted }]}>
                          Mover série completa ({editTransaction.installmentTotal} parcelas)
                        </Text>
                        <View style={styles.moveSeriesButtons}>
                          <Pressable
                            onPress={() => handleMoveSeries(-1)}
                            style={({ pressed }) => [
                              styles.moveSeriesButton,
                              { 
                                backgroundColor: pressed ? colors.primary + '20' : colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
                            <Text style={[styles.moveSeriesButtonText, { color: colors.text }]}>
                              Mês anterior
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleMoveSeries(1)}
                            style={({ pressed }) => [
                              styles.moveSeriesButton,
                              { 
                                backgroundColor: pressed ? colors.primary + '20' : colors.card,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text style={[styles.moveSeriesButtonText, { color: colors.text }]}>
                              Próximo mês
                            </Text>
                            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.text} />
                          </Pressable>
                        </View>
                      </View>
                    )}
                    
                    <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                    
                    {/* Recorrência - desabilitado para transações de meta ou transações que já fazem parte de uma série */}
                    {!editTransaction?.seriesId && (
                      <>
                        <SelectField
                          label="Repetir"
                          value={RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label || 'Não repetir'}
                          icon="repeat"
                          onPress={(!isGoalTransaction && !isMetaCategoryTransaction) ? () => setActivePicker('recurrence') : () => {}}
                        />
                        {/* Tipo de recorrência - só aparece se recorrência != none */}
                        {recurrence !== 'none' && (
                          <>
                            <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                            <SelectField
                              label="Tipo"
                              value={RECURRENCE_TYPE_OPTIONS.find((r) => r.value === recurrenceType)?.label || 'Parcelada'}
                              icon="cash-multiple"
                              onPress={() => setActivePicker('recurrenceType')}
                            />
                          </>
                        )}
                        {/* Número de repetições - só aparece se recorrência != none */}
                        {recurrence !== 'none' && (
                          <>
                            <View style={[styles.dashedDivider, { borderColor: colors.border }]} />
                            <SelectField
                              label="Quantas vezes?"
                              value={`${repetitions}x`}
                              icon="counter"
                              onPress={() => setActivePicker('repetitions')}
                            />
                            {/* Informação do valor por parcela */}
                            {repetitions > 1 && installmentValue > 0 && (
                              <View style={[styles.installmentInfo, { backgroundColor: colors.primaryBg }]}>
                                <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
                            <Text style={[styles.installmentText, { color: colors.primary }]}>
                              {recurrenceType === 'installment' 
                                ? `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())}`
                                : `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())} cada (Total: ${formatCurrency(Math.round(installmentValue * repetitions * 100).toString())})`
                              }
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    </>
                    )}
                    </>
                  )}

                {/* Aviso: mesma conta */}
                {type === 'transfer' && accountId && toAccountId && accountId === toAccountId && (
                  <View style={[styles.warningInfo, { backgroundColor: colors.warningBg }]}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.warning} />
                    <Text style={[styles.warningText, { color: colors.warning }]}>
                      Não é possível transferir para a mesma conta
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Botões fixos no bottom - sempre visíveis quando tem contas */}
            {activeAccounts.length > 0 && (
              <View style={[styles.fixedButtonContainer, { backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {/* Botão Excluir - só aparece em modo edição */}
                {isEditMode && onDelete && editTransaction && (
                    <Pressable
                      onPress={() => {
                        // Verificar se faz parte de uma série
                        if (editTransaction.seriesId && onDeleteSeries) {
                          const isLastInstallment = editTransaction.installmentCurrent === editTransaction.installmentTotal;
                          
                          if (isLastInstallment) {
                            // É a última parcela, não há série futura para excluir
                            showAlert(
                              'Excluir lançamento',
                              'Tem certeza que deseja excluir este lançamento?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { 
                                  text: 'Excluir', 
                                  style: 'destructive',
                                  onPress: () => {
                                    onDelete(editTransaction.id);
                                    onClose();
                                  }
                                },
                              ]
                            );
                          } else {
                            // Não é a última parcela, mostrar opções
                            const currentInstallment = editTransaction.installmentCurrent || 1;
                            const totalInstallments = editTransaction.installmentTotal || 1;
                            const remainingInstallments = totalInstallments - currentInstallment + 1;
                            
                            showAlert(
                              'Excluir lançamento',
                              'Este lançamento faz parte de uma série. O que deseja fazer?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { 
                                  text: 'Excluir apenas este', 
                                  onPress: () => {
                                    onDelete(editTransaction.id);
                                    onClose();
                                  }
                                },
                                { 
                                  text: `Excluir desta em diante (${remainingInstallments}x)`, 
                                  style: 'destructive',
                                  onPress: async () => {
                                    try {
                                      // Usar callback se disponível (para Launches) ou função direta (para CreditCardBillDetails)
                                      if (onDeleteSeries) {
                                        onDeleteSeries(editTransaction.seriesId!, currentInstallment);
                                        onClose();
                                      } else if (user?.uid) {
                                        const deletedCount = await deleteSeriesFromInstallment(
                                          user.uid,
                                          editTransaction.seriesId!,
                                          currentInstallment
                                        );
                                        
                                        if (deletedCount > 0) {
                                          showSnackbar(`${deletedCount} parcela(s) excluída(s)!`);
                                          onSave?.();
                                        } else {
                                          showSnackbar('Nenhuma parcela foi excluída');
                                        }
                                        onClose();
                                      } else {
                                        console.error('User não disponível para exclusão de série');
                                      }
                                    } catch (error) {
                                      console.error('Erro ao excluir série:', error);
                                      showAlert('Erro', 'Não foi possível excluir as parcelas', [{ text: 'OK' }]);
                                    }
                                  }
                                },
                              ]
                            );
                          }
                        } else {
                          // Transação única - confirmar normalmente
                          showAlert(
                            'Excluir lançamento',
                            'Tem certeza que deseja excluir este lançamento?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { 
                                text: 'Excluir', 
                                style: 'destructive',
                                onPress: () => {
                                  onDelete(editTransaction.id);
                                  onClose();
                                }
                              },
                            ]
                          );
                        }
                      }}
                      style={({ pressed }) => [
                        styles.ghostButton,
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textMuted} />
                    </Pressable>
                  )}
                  
                  <View style={{ flex: 1 }} />
                  
                  {/* Botão Cancelar */}
                  <Pressable
                    onPress={onClose}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.ghostButton,
                      pressed && { opacity: 0.6 },
                      saving && { opacity: 0.5 },
                    ]}
                  >
                    <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                  
                  {/* Botão Salvar - apenas ícone check */}
                  <Pressable
                    onPress={handleSave}
                    disabled={saving || !canConfirm}
                    style={({ pressed }) => [
                      styles.iconButtonPrimary,
                      { backgroundColor: colors.success },
                      pressed && { opacity: 0.9 },
                      (saving || !canConfirm) && { opacity: 0.6 },
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialCommunityIcons name="check" size={24} color="#fff" />
                    )}
                  </Pressable>
                </View>
              )}
          </View>
        )}
      </Modal>
      
      {/* Modal de Antecipação */}
      <Modal
        visible={showAnticipateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnticipateModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowAnticipateModal(false)}
        >
          <Pressable style={[styles.anticipateModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.anticipateModalHeader}>
              <MaterialCommunityIcons name="clock-fast" size={28} color={colors.success} />
              <Text style={[styles.anticipateModalTitle, { color: colors.text }]}>
                {editTransaction?.installmentTotal && editTransaction.installmentTotal > 1
                  ? 'Antecipar Parcela'
                  : 'Antecipar Lançamento'}
              </Text>
            </View>
            
            <Text style={[styles.anticipateModalDescription, { color: colors.textMuted }]}>
              {editTransaction?.installmentTotal && editTransaction.installmentTotal > 1
                ? `Você está antecipando a parcela ${editTransaction?.installmentCurrent}/${editTransaction?.installmentTotal} para a próxima fatura disponível.`
                : 'Você está antecipando este lançamento para a próxima fatura disponível.'}
            </Text>
            
            <View style={[styles.discountSection, { backgroundColor: colors.grayLight }]}>
              <Text style={[styles.discountQuestion, { color: colors.text }]}>
                Você conseguiu desconto na antecipação?
              </Text>
              
              <View style={styles.discountToggle}>
                <Pressable
                  onPress={() => setHasDiscount(false)}
                  style={[
                    styles.discountOption,
                    { 
                      backgroundColor: !hasDiscount ? colors.primary : 'transparent',
                      borderColor: !hasDiscount ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[
                    styles.discountOptionText,
                    { color: !hasDiscount ? '#FFFFFF' : colors.text }
                  ]}>
                    Não
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setHasDiscount(true)}
                  style={[
                    styles.discountOption,
                    { 
                      backgroundColor: hasDiscount ? colors.primary : 'transparent',
                      borderColor: hasDiscount ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[
                    styles.discountOptionText,
                    { color: hasDiscount ? '#FFFFFF' : colors.text }
                  ]}>
                    Sim
                  </Text>
                </Pressable>
              </View>
              
              {hasDiscount && (
                <View style={styles.discountInputSection}>
                  <Text style={[styles.discountInputLabel, { color: colors.text }]}>
                    Qual o valor do desconto?
                  </Text>
                  <TextInput
                    value={discountAmount}
                    onChangeText={(text) => setDiscountAmount(formatCurrency(text))}
                    placeholder="R$ 0,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[
                      styles.discountInput,
                      { 
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                      }
                    ]}
                  />
                </View>
              )}
            </View>
            
            <View style={styles.anticipateModalButtons}>
              <Pressable
                onPress={() => {
                  setShowAnticipateModal(false);
                  setHasDiscount(false);
                  setDiscountAmount('');
                }}
                style={[styles.anticipateModalButton, { backgroundColor: colors.grayLight }]}
              >
                <Text style={[styles.anticipateModalButtonText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </Pressable>
              
              <Pressable
                onPress={confirmAnticipate}
                style={[styles.anticipateModalButton, { backgroundColor: colors.success }]}
              >
                <Text style={[styles.anticipateModalButtonText, { color: '#FFFFFF' }]}>
                  Confirmar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Snackbar para mensagens de sucesso */}
      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
      
      {/* Loading overlay para criação de múltiplas parcelas */}
      <LoadingOverlay
        visible={saving && savingProgress !== null && savingProgress.total > 3}
        message={savingProgress ? `Criando lançamentos...` : 'Salvando...'}
        progress={savingProgress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Fullscreen modal styles
  fullscreenModal: {
    flex: 1,
    overflow: 'hidden',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderBottomWidth: 0,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenContent: {
    flex: 1,
  },
  fullscreenContentContainer: {
    paddingBottom: 100, // Espaço para os botões fixos
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: 0,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  typeChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.2,
  },
  typeChipTextActive: {
    color: '#322438',
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: spacing.sm,
    letterSpacing: -0.5,
    outlineStyle: 'none',
  } as any,
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E6E2F0',
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    fontSize: 15,
    paddingVertical: 2,
    outlineStyle: 'none',
  } as any,
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E6E2F0',
  },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dashedDivider: {
    height: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  moveSeriesContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  moveSeriesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  moveSeriesButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  moveSeriesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 0,
    gap: spacing.xs,
  },
  moveSeriesButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  anticipateContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  anticipateLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  anticipateSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  anticipateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  anticipateButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
    marginBottom: spacing.xs,
  },
  discountToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  discountOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 0,
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
    fontWeight: '600',
  },
  discountInput: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    fontSize: 15,
  },
  anticipateModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  fixedButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E6E2F0',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#28043b',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPrimary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(47, 175, 142, 0.4)',
      },
      default: {
        elevation: 6,
        shadowColor: '#2FAF8E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
  onboardingButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  onboardingButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Picker overlay styles
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  centerModalContainer: {
    width: '100%',
    maxWidth: 380,
    maxHeight: SCREEN_HEIGHT * 0.65,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  pickerContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerScroll: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pickerOptionWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerOptionText: {
    fontSize: 15,
  },
  pickerOptionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerDivider: {
    height: 1,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  pickerSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  // Numeric input for repetitions
  numericInputContainer: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  numericInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  numericInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  numericButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  numericValue: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
  },
  numericInputButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickNumberButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    alignItems: 'center',
  },
  quickNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Custom Date Picker styles - removido datePickerContainer, usando pickerContainer
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
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
    paddingBottom: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayButton: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  quickDateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  quickDateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  installmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  installmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountBalanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  accountBalanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: 0,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  goalBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  goalBannerText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  goalBannerSubtext: {
    fontSize: 12,
  },
  // Create category inline styles
  createCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  createCategoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCategoryOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createCategoryForm: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  createCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  createCategoryInput: {
    borderWidth: 0,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  createCategoryInputText: {
    fontSize: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCategoryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
    borderRadius: borderRadius.md,
  },
  createCategoryPreviewLabel: {
    fontSize: 12,
  },
  createCategoryPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  createCategoryPreviewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCategoryPreviewName: {
    fontSize: 14,
    fontWeight: '600',
  },
  createCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  createCategoryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
