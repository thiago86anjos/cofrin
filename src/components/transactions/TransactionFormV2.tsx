/**
 * TransactionFormV2 - Formulário de transação com UX moderna
 * 
 * Layout baseado em referências: Nubank, Revolut, Wise, Mercury
 * 
 * Estrutura:
 * 1. Descrição (input principal)
 * 2. Categoria (dropdown)
 * ─────────────────────────
 * 3. Conta (dropdown full-width)
 * 4. Data (dropdown full-width com quick picks integrados)
 * ─────────────────────────
 * 5. Recorrência (toggle colapsável)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';
import { RecurrenceType, Category } from '../../types/firebase';
import { formatCurrency } from '../../utils/transactionHelpers';
import { normalizeText } from '../../utils/normalizeText';
import { getSuggestionForNormalizedDescription } from '../../services/suggestions.service';

export type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
export type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

interface Account {
  id: string;
  name: string;
  icon?: string;
  balance?: number;
  color?: string;
}

type SimpleAccount = { id: string; name: string };
type SimpleCreditCard = { id: string; name: string; color?: string };

type SuggestedPayment =
  | { method: 'account'; accountId: string }
  | { method: 'creditCard'; creditCardId: string };

interface TransactionFormV2Props {
  // User (suggestions)
  userId?: string;

  // Type
  type: LocalTransactionType;
  
  // Description
  description: string;
  onDescriptionChange: (text: string) => void;
  hasAmount: boolean;
  
  // Category
  categoryId: string;
  categoryName: string;
  categories: Category[];
  onSelectCategory: (categoryId: string, categoryName: string) => void;
  disableCategoryChange?: boolean;
  showCategory?: boolean;
  
  // Account
  accountId: string;
  accountName: string;
  useCreditCard: boolean;
  creditCardId: string;
  creditCardName: string;
  creditCardColor?: string;
  sourceAccount?: Account | null;

  // Payment suggestions helpers
  accountsForSuggestion?: SimpleAccount[];
  creditCardsForSuggestion?: SimpleCreditCard[];
  onApplyPaymentSuggestion?: (payment: SuggestedPayment) => void;
  
  // Transfer
  toAccountId: string;
  toAccountName: string;
  
  // Date
  date: Date;
  onDateChange: (date: Date) => void;
  
  // Recurrence
  recurrence: RecurrenceType;
  recurrenceType: 'installment' | 'fixed';
  repetitions: number;
  installmentValue: number;
  onRecurrenceChange: (recurrence: RecurrenceType) => void;
  onRecurrenceTypeChange: (type: 'installment' | 'fixed') => void;
  onRepetitionsChange: (repetitions: number) => void;
  showRecurrence?: boolean;
  hasSeriesId?: boolean;
  
  // Special states
  isFutureInstallment?: boolean;
  isFirstInstallmentOfSeries?: boolean;
  installmentInfo?: { current: number; total: number } | null;
  
  // Picker handlers
  onOpenPicker: (picker: PickerType) => void;
  
  // Action handlers
  onAnticipate?: () => void;
  onMoveSeries?: (monthsToMove: number) => void;
  onRecurrenceToggled?: (enabled: boolean) => void;
  
  // Validation
  sameAccountError?: boolean;
  
  // Theme colors
  colors: {
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryBg: string;
    grayLight: string;
    gray: string;
    expense: string;
    income: string;
    success: string;
    successBg?: string;
    danger: string;
    warning: string;
    warningBg: string;
  };
}

// Formatar data de forma amigável
const formatDateFriendly = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Hoje';
  if (isYesterday) return 'Ontem';
  if (isTomorrow) return 'Amanhã';

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export default function TransactionFormV2({
  userId,
  type,
  description,
  onDescriptionChange,
  hasAmount,
  categoryId,
  categoryName,
  categories,
  onSelectCategory,
  disableCategoryChange = false,
  showCategory = true,
  accountId,
  accountName,
  useCreditCard,
  creditCardId,
  creditCardName,
  creditCardColor,
  sourceAccount,
  accountsForSuggestion,
  creditCardsForSuggestion,
  onApplyPaymentSuggestion,
  toAccountId,
  toAccountName,
  date,
  onDateChange,
  recurrence,
  recurrenceType,
  repetitions,
  installmentValue,
  onRecurrenceChange,
  onRecurrenceTypeChange,
  onRepetitionsChange,
  showRecurrence = true,
  hasSeriesId = false,
  isFutureInstallment = false,
  isFirstInstallmentOfSeries = false,
  installmentInfo,
  onOpenPicker,
  onAnticipate,
  onMoveSeries,
  onRecurrenceToggled,
  sameAccountError = false,
  colors,
}: TransactionFormV2Props) {

  const toAlphaHex = (hexColor: string, alphaHex: string) => {
    if (typeof hexColor !== 'string') return null;
    if (hexColor.startsWith('#') && hexColor.length === 7) return `${hexColor}${alphaHex}`;
    return null;
  };
  
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(recurrence !== 'none');
  
  // Pegar as 5 categorias mais usadas (por ordem de criação como proxy)
  const frequentCategories = useMemo(() => {
    return categories.slice(0, 5);
  }, [categories]);

  const hasMoreCategories = categories.length > 5;
  
  const typeColor = type === 'despesa' ? colors.expense : type === 'receita' ? colors.income : colors.primary;

  const rawDescription = useMemo(() => description.trim(), [description]);
  const normalizedDescription = useMemo(() => normalizeText(description), [description]);
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [suggestedPayment, setSuggestedPayment] = useState<SuggestedPayment | null>(null);
  const [ignoredSuggestionKey, setIgnoredSuggestionKey] = useState<string | null>(null);
  const lastCategoryIdRef = useRef<string>(categoryId);
  const lastAppliedRef = useRef<{ key: string; categoryId: string } | null>(null);
  const lastPaymentRef = useRef<{ useCreditCard: boolean; accountId: string; creditCardId: string }>({
    useCreditCard,
    accountId,
    creditCardId,
  });
  const requestIdRef = useRef(0);

  const suggestedCategory = useMemo(() => {
    if (!suggestedCategoryId) return null;
    return categories.find((c) => c.id === suggestedCategoryId) || null;
  }, [categories, suggestedCategoryId]);

  useEffect(() => {
    const previousCategoryId = lastCategoryIdRef.current;
    if (previousCategoryId === categoryId) return;

    const applied = lastAppliedRef.current;
    const wasAppliedNow =
      applied && applied.key === normalizedDescription && applied.categoryId === categoryId;

    if (!wasAppliedNow) {
      setSuggestedCategoryId(null);
    }

    lastCategoryIdRef.current = categoryId;
  }, [categoryId, normalizedDescription]);

  useEffect(() => {
    const previous = lastPaymentRef.current;
    const current = { useCreditCard, accountId, creditCardId };

    // If user changed payment manually, clear payment suggestion.
    if (
      previous.useCreditCard !== current.useCreditCard ||
      previous.accountId !== current.accountId ||
      previous.creditCardId !== current.creditCardId
    ) {
      setSuggestedPayment(null);
    }

    lastPaymentRef.current = current;
  }, [useCreditCard, accountId, creditCardId]);

  useEffect(() => {
    if (!userId) {
      setSuggestedCategoryId(null);
      setSuggestedPayment(null);
      return;
    }

    if (type === 'transfer' || !showCategory || disableCategoryChange) {
      setSuggestedCategoryId(null);
      setSuggestedPayment(null);
      return;
    }

    // Start only after the 3rd character typed (UX)
    if (!rawDescription || rawDescription.length < 3) {
      setSuggestedCategoryId(null);
      setSuggestedPayment(null);
      return;
    }

    if (ignoredSuggestionKey === normalizedDescription) {
      setSuggestedCategoryId(null);
      setSuggestedPayment(null);
      return;
    }

    // Clear any previous suggestion while we debounce the next lookup
    setSuggestedCategoryId(null);
    setSuggestedPayment(null);

    const currentRequestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const suggestion = await getSuggestionForNormalizedDescription({
          userId,
          normalizedDescription,
        });

        if (requestIdRef.current !== currentRequestId) return;

        if (!suggestion) {
          const candidates = categories.filter((c) =>
            normalizeText(c.name || '').startsWith(normalizedDescription)
          );

          if (candidates.length === 1 && candidates[0]?.id && candidates[0].id !== categoryId) {
            setSuggestedCategoryId(candidates[0].id);
          } else {
            setSuggestedCategoryId(null);
          }
          return;
        }

        if (suggestion.categoryId === categoryId) {
          setSuggestedCategoryId(null);
        } else {
          setSuggestedCategoryId(suggestion.categoryId);
        }

        // Payment suggestion (only if we have apply handler + reference data)
        if (onApplyPaymentSuggestion) {
          const paymentMethod = suggestion.paymentMethod;
          const suggestedAccountId = suggestion.accountId || undefined;
          const suggestedCreditCardId = suggestion.creditCardId || undefined;

          if (paymentMethod === 'account' && suggestedAccountId) {
            const exists = (accountsForSuggestion || []).some((a) => a.id === suggestedAccountId);
            if (!exists) {
              setSuggestedPayment(null);
              return;
            }

            if (!useCreditCard && accountId === suggestedAccountId) {
              setSuggestedPayment(null);
              return;
            }

            setSuggestedPayment({ method: 'account', accountId: suggestedAccountId });
            return;
          }

          if (paymentMethod === 'creditCard' && suggestedCreditCardId) {
            // Only suggest credit card for expenses
            if (type !== 'despesa') {
              setSuggestedPayment(null);
              return;
            }

            const exists = (creditCardsForSuggestion || []).some((c) => c.id === suggestedCreditCardId);
            if (!exists) {
              setSuggestedPayment(null);
              return;
            }

            if (useCreditCard && creditCardId === suggestedCreditCardId) {
              setSuggestedPayment(null);
              return;
            }

            setSuggestedPayment({ method: 'creditCard', creditCardId: suggestedCreditCardId });
            return;
          }

          setSuggestedPayment(null);
        }
      } catch (err) {
        console.warn('[TransactionFormV2] suggestion fetch failed:', err);
        if (requestIdRef.current !== currentRequestId) return;
        setSuggestedCategoryId(null);
        setSuggestedPayment(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    userId,
    type,
    showCategory,
    disableCategoryChange,
    rawDescription,
    normalizedDescription,
    ignoredSuggestionKey,
    categoryId,
    categories,
    onApplyPaymentSuggestion,
    accountsForSuggestion,
    creditCardsForSuggestion,
    useCreditCard,
    accountId,
    creditCardName,
  ]);

  const suggestedPaymentLabel = useMemo(() => {
    if (!suggestedPayment) return null;
    if (suggestedPayment.method === 'account') {
      const acc = (accountsForSuggestion || []).find((a) => a.id === suggestedPayment.accountId);
      return acc ? `Conta: ${acc.name}` : null;
    }
    const card = (creditCardsForSuggestion || []).find((c) => c.id === suggestedPayment.creditCardId);
    return card ? `Cartão: ${card.name}` : null;
  }, [suggestedPayment, accountsForSuggestion, creditCardsForSuggestion]);

  const suggestionText = useMemo(() => {
    const categoryText = suggestedCategory?.name || null;

    if (categoryText && suggestedPaymentLabel) {
      return `Sugestão: ${categoryText} • ${suggestedPaymentLabel}`;
    }
    if (categoryText) {
      return `Sugestão: ${categoryText}`;
    }
    if (suggestedPaymentLabel) {
      return `Sugestão: ${suggestedPaymentLabel}`;
    }
    return null;
  }, [suggestedCategory, suggestedPaymentLabel]);

  // Quick date options
  const setToday = () => {
    const today = new Date();
    onDateChange(today);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    onDateChange(yesterday);
  };

  // Recurrence quick options
  const QUICK_RECURRENCE = [
    { label: 'Mensal', value: 'monthly' as RecurrenceType },
    { label: 'Semanal', value: 'weekly' as RecurrenceType },
    { label: 'Anual', value: 'yearly' as RecurrenceType },
  ];

  const QUICK_REPETITIONS = [2, 3, 6, 12];

  return (
    <View style={styles.container}>
      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 1: O QUÊ - Descrição + Categoria
          ═══════════════════════════════════════════════════════════ */}
      <View style={styles.formSection}>
        {/* Descrição */}
        <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons 
            name="pencil-outline" 
            size={20} 
            color={colors.textMuted} 
          />
          <TextInput
            value={description}
            onChangeText={onDescriptionChange}
            placeholder={hasAmount ? "Descrição (ex: Mercado, Salário...)" : "Preencha o valor primeiro"}
            placeholderTextColor={colors.textMuted}
            style={[styles.fieldInput, { color: colors.text }]}
            maxLength={60}
            editable={hasAmount}
          />
        </View>

        {!!suggestionText && type !== 'transfer' && showCategory && !disableCategoryChange && (
          <View style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.suggestionHeader}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={2}>
                {suggestionText}
              </Text>
            </View>
            <View style={styles.suggestionActions}>
              <Pressable
                onPress={() => {
                  if (!suggestedCategory && !suggestedPayment) return;

                  if (suggestedCategoryId && suggestedCategory) {
                    lastAppliedRef.current = { key: normalizedDescription, categoryId: suggestedCategoryId };
                    onSelectCategory(suggestedCategory.id, suggestedCategory.name);
                  }

                  if (suggestedPayment && onApplyPaymentSuggestion) {
                    onApplyPaymentSuggestion(suggestedPayment);
                  }

                  setSuggestedCategoryId(null);
                  setSuggestedPayment(null);
                }}
                style={[
                  styles.suggestionPrimaryButton,
                  {
                    backgroundColor: colors.primaryBg,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.suggestionPrimaryButtonText, { color: colors.primary }]}>Aplicar</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setIgnoredSuggestionKey(normalizedDescription);
                  setSuggestedCategoryId(null);
                  setSuggestedPayment(null);
                }}
                style={[styles.suggestionSecondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.suggestionSecondaryButtonText, { color: colors.text }]}>Ignorar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Categoria */}
        {type !== 'transfer' && showCategory && (
          <Pressable
            onPress={() => {
              if (disableCategoryChange) return;
              onOpenPicker('category');
            }}
            disabled={disableCategoryChange}
            style={[
              styles.fieldRow,
              { 
                backgroundColor: categoryId ? typeColor + '08' : colors.card,
                borderColor: categoryId ? typeColor : colors.border,
              }
            ]}
          >
            <MaterialCommunityIcons 
              name={categoryId ? (categories.find(c => c.id === categoryId)?.icon as any || 'tag') : 'tag-outline'} 
              size={20} 
              color={categoryId ? typeColor : colors.textMuted} 
            />
            <Text 
              style={[
                styles.fieldText, 
                { color: categoryId ? colors.text : colors.textMuted }
              ]}
            >
              {categoryName || 'Categoria'}
            </Text>
            <MaterialCommunityIcons 
              name={disableCategoryChange ? 'lock-outline' : 'chevron-down'}
              size={20} 
              color={disableCategoryChange ? colors.textMuted : (categoryId ? typeColor : colors.gray)}
            />
          </Pressable>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 2: ONDE/QUANDO - Conta + Data
          ═══════════════════════════════════════════════════════════ */}
      <View style={styles.formSection}>
        {/* Conta */}
        <Pressable
          onPress={() => onOpenPicker('account')}
          style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {(() => {
            const tint = useCreditCard ? creditCardColor : sourceAccount?.color;
            const bg = tint ? (toAlphaHex(tint, '20') || colors.grayLight) : colors.grayLight;
            const iconColor = tint || colors.textMuted;
            const iconName = useCreditCard
              ? 'credit-card'
              : ((sourceAccount?.icon || 'bank') as any);

            return (
              <View style={[styles.leadingIconCircle, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
              </View>
            );
          })()}
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {type === 'despesa' ? 'Pago com' : type === 'receita' ? 'Recebido em' : 'Conta origem'}
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
              {useCreditCard ? creditCardName : (accountName || 'Selecionar conta')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.gray} />
        </Pressable>

        {/* Conta destino (transferência) */}
        {type === 'transfer' && (
          <Pressable
            onPress={() => onOpenPicker('toAccount')}
            style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="bank-transfer-in" size={20} color={colors.textMuted} />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Conta destino</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
                {toAccountName || 'Selecionar destino'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.gray} />
          </Pressable>
        )}

        {/* Aviso: mesma conta */}
        {sameAccountError && (
          <View style={[styles.alertBanner, { backgroundColor: colors.warningBg }]}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>
              Não é possível transferir para a mesma conta
            </Text>
          </View>
        )}

        {/* Data */}
        <Pressable
          onPress={() => onOpenPicker('date')}
          style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.textMuted} />
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Data</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {formatDateFriendly(date)}
            </Text>
          </View>
          {/* Quick date picks */}
          <View style={styles.quickDatePicks}>
            <Pressable
              onPress={(e) => { e.stopPropagation(); setToday(); }}
              style={[
                styles.quickDateChip,
                { 
                  backgroundColor: formatDateFriendly(date) === 'Hoje' ? colors.primaryBg : 'transparent',
                  borderColor: formatDateFriendly(date) === 'Hoje' ? colors.primary : colors.border,
                }
              ]}
            >
              <Text style={[
                styles.quickDateText,
                { color: formatDateFriendly(date) === 'Hoje' ? colors.primary : colors.textMuted }
              ]}>Hoje</Text>
            </Pressable>
            <Pressable
              onPress={(e) => { e.stopPropagation(); setYesterday(); }}
              style={[
                styles.quickDateChip,
                { 
                  backgroundColor: formatDateFriendly(date) === 'Ontem' ? colors.primaryBg : 'transparent',
                  borderColor: formatDateFriendly(date) === 'Ontem' ? colors.primary : colors.border,
                }
              ]}
            >
              <Text style={[
                styles.quickDateText,
                { color: formatDateFriendly(date) === 'Ontem' ? colors.primary : colors.textMuted }
              ]}>Ontem</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 3: RECORRÊNCIA - Toggle colapsável
          ═══════════════════════════════════════════════════════════ */}
      {showRecurrence && !hasSeriesId && (
        <View style={styles.formSection}>
          {/* Toggle */}
          <Pressable
            onPress={() => {
              if (showRecurrenceOptions) {
                onRecurrenceChange('none');
                setShowRecurrenceOptions(false);
                onRecurrenceToggled?.(false);
              } else {
                setShowRecurrenceOptions(true);
                // Aguarda o painel renderizar antes de chamar o callback
                setTimeout(() => onRecurrenceToggled?.(true), 100);
              }
            }}
            style={[styles.toggleField, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons 
              name="repeat" 
              size={20} 
              color={showRecurrenceOptions ? colors.primary : colors.textMuted} 
            />
            <Text style={[styles.toggleText, { color: colors.text }]}>Repetir transação?</Text>
            <View style={[
              styles.toggleSwitch,
              { backgroundColor: showRecurrenceOptions ? colors.primary : colors.border }
            ]}>
              <View style={[
                styles.toggleKnob,
                { transform: [{ translateX: showRecurrenceOptions ? 14 : 2 }] }
              ]} />
            </View>
          </Pressable>

          {/* Opções expandidas */}
          {showRecurrenceOptions && (
            <View style={[styles.recurrencePanel, { backgroundColor: colors.grayLight }]}>
              {/* Frequência */}
              <View style={styles.recurrenceGroup}>
                <Text style={[styles.recurrenceLabel, { color: colors.textMuted }]}>Frequência</Text>
                <View style={styles.chipRow}>
                  {QUICK_RECURRENCE.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => onRecurrenceChange(opt.value)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: recurrence === opt.value ? colors.primaryBg : colors.card,
                          borderColor: recurrence === opt.value ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: recurrence === opt.value ? colors.primary : colors.text }
                      ]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Tipo */}
              <View style={styles.recurrenceGroup}>
                <Text style={[styles.recurrenceLabel, { color: colors.textMuted }]}>Tipo</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => onRecurrenceTypeChange('installment')}
                    style={[
                      styles.chip,
                      styles.chipFlex,
                      { 
                        backgroundColor: recurrenceType === 'installment' ? colors.primaryBg : colors.card,
                        borderColor: recurrenceType === 'installment' ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: recurrenceType === 'installment' ? colors.primary : colors.text }
                    ]}>Parcelada</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onRecurrenceTypeChange('fixed')}
                    style={[
                      styles.chip,
                      styles.chipFlex,
                      { 
                        backgroundColor: recurrenceType === 'fixed' ? colors.primaryBg : colors.card,
                        borderColor: recurrenceType === 'fixed' ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: recurrenceType === 'fixed' ? colors.primary : colors.text }
                    ]}>Fixa</Text>
                  </Pressable>
                </View>
              </View>

              {/* Repetições */}
              <View style={styles.recurrenceGroup}>
                <Text style={[styles.recurrenceLabel, { color: colors.textMuted }]}>Quantas vezes?</Text>
                <View style={styles.chipRow}>
                  {QUICK_REPETITIONS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => onRepetitionsChange(n)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: repetitions === n ? colors.primaryBg : colors.card,
                          borderColor: repetitions === n ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: repetitions === n ? colors.primary : colors.text }
                      ]}>{n}x</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => onOpenPicker('repetitions')}
                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: colors.textMuted }]}>
                      {!QUICK_REPETITIONS.includes(repetitions) ? `${repetitions}x` : 'Outro'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Info de parcelas */}
              {repetitions > 1 && installmentValue > 0 && (
                <View style={[styles.infoBox, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.primary }]}>
                    {recurrenceType === 'installment'
                      ? `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())}`
                      : `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())} (Total: ${formatCurrency(Math.round(installmentValue * repetitions * 100).toString())})`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SEÇÃO 4: AÇÕES ESPECIAIS (Antecipar, Mover série)
          ═══════════════════════════════════════════════════════════ */}
      {isFutureInstallment && onAnticipate && (
        <View style={[styles.actionCard, { backgroundColor: colors.successBg || colors.grayLight }]}>
          <MaterialCommunityIcons name="clock-fast" size={20} color={colors.success} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Parcela futura</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>Antecipar para próxima fatura?</Text>
          </View>
          <Pressable
            onPress={onAnticipate}
            style={[styles.actionButton, { backgroundColor: colors.success }]}
          >
            <Text style={styles.actionButtonText}>Antecipar</Text>
          </Pressable>
        </View>
      )}

      {isFirstInstallmentOfSeries && onMoveSeries && installmentInfo && (
        <View style={[styles.actionCard, { backgroundColor: colors.grayLight }]}>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>Mover série</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textMuted }]}>{installmentInfo.total} parcelas</Text>
          </View>
          <Pressable
            onPress={() => onMoveSeries(-1)}
            style={[styles.moveButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => onMoveSeries(1)}
            style={[styles.moveButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════
  // CONTAINER & SECTIONS
  // ═══════════════════════════════════════════════════════════
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  formSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  // ═══════════════════════════════════════════════════════════
  // FIELD ROWS (Input, Dropdowns)
  // ═══════════════════════════════════════════════════════════
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  leadingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
  } as any,
  fieldText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  fieldContent: {
    flex: 1,
    gap: 2,
  },
  suggestionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  suggestionPrimaryButton: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  suggestionPrimaryButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  suggestionSecondaryButton: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  suggestionSecondaryButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ═══════════════════════════════════════════════════════════
  // QUICK DATE PICKS
  // ═══════════════════════════════════════════════════════════
  quickDatePicks: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickDateChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ═══════════════════════════════════════════════════════════
  // ALERTS & BANNERS
  // ═══════════════════════════════════════════════════════════
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ═══════════════════════════════════════════════════════════
  // TOGGLE FIELD
  // ═══════════════════════════════════════════════════════════
  toggleField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  toggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0px 2px 4px rgba(0,0,0,0.20)' } as any)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }),
  },

  // ═══════════════════════════════════════════════════════════
  // RECURRENCE PANEL
  // ═══════════════════════════════════════════════════════════
  recurrencePanel: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  recurrenceGroup: {
    gap: spacing.xs,
  },
  recurrenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginLeft: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  chipFlex: {
    flex: 1,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // ═══════════════════════════════════════════════════════════
  // ACTION CARDS (Antecipar, Mover série)
  // ═══════════════════════════════════════════════════════════
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  moveButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
