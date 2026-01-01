/**
 * TransactionForm - Formulário com todos os campos da transação
 */

import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';
import { RecurrenceType } from '../../types/firebase';
import { formatCurrency, formatDate } from '../../utils/transactionHelpers';

export type LocalTransactionType = 'despesa' | 'receita' | 'transfer';
export type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'recurrence' | 'recurrenceType' | 'repetitions' | 'date';

interface Account {
  id: string;
  name: string;
  icon?: string;
  balance?: number;
}

interface TransactionFormProps {
  // Type
  type: LocalTransactionType;
  
  // Description
  description: string;
  onDescriptionChange: (text: string) => void;
  hasAmount: boolean;
  onDescriptionPress?: () => void;
  
  // Category
  categoryName: string;
  showCategory?: boolean;
  
  // Account
  accountName: string;
  useCreditCard: boolean;
  creditCardName: string;
  sourceAccount?: Account | null;
  
  // Transfer
  toAccountName: string;
  
  // Date
  date: Date;
  
  // Recurrence
  recurrence: RecurrenceType;
  recurrenceType: 'installment' | 'fixed';
  repetitions: number;
  installmentValue: number;
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
  
  // Options
  RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[];
  RECURRENCE_TYPE_OPTIONS: { label: string; value: string; description: string }[];
}

export default function TransactionForm({
  type,
  description,
  onDescriptionChange,
  hasAmount,
  onDescriptionPress,
  categoryName,
  showCategory = true,
  accountName,
  useCreditCard,
  creditCardName,
  sourceAccount,
  toAccountName,
  date,
  recurrence,
  recurrenceType,
  repetitions,
  installmentValue,
  showRecurrence = true,
  hasSeriesId = false,
  isFutureInstallment = false,
  isFirstInstallmentOfSeries = false,
  installmentInfo,
  onOpenPicker,
  onAnticipate,
  onMoveSeries,
  sameAccountError = false,
  colors,
  RECURRENCE_OPTIONS,
  RECURRENCE_TYPE_OPTIONS,
}: TransactionFormProps) {
  
  // Componente de campo selecionável inline
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
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && !disabled && { backgroundColor: colors.grayLight },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: disabled ? colors.border : colors.primaryBg }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={disabled ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldValue, { color: disabled ? colors.textMuted : colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.fieldSubtitle, { color: subtitleColor || colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={disabled ? colors.border : colors.gray} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Descrição */}
      <Pressable
        onPress={hasAmount ? undefined : onDescriptionPress}
        disabled={hasAmount}
        style={[
          styles.selectField, 
          { backgroundColor: colors.card, borderColor: colors.border, opacity: hasAmount ? 1 : 0.6 }
        ]}
      >
        <View style={[styles.fieldIcon, { backgroundColor: hasAmount ? colors.primaryBg : colors.grayLight }]}>
          <MaterialCommunityIcons name="text" size={18} color={hasAmount ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.fieldContent}>
          <TextInput
            value={description}
            onChangeText={onDescriptionChange}
            placeholder={hasAmount ? "Descrição (ex: Almoço, Salário...)" : "Preencha o valor primeiro"}
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, { color: colors.text }]}
            maxLength={60}
            editable={hasAmount}
            pointerEvents={hasAmount ? 'auto' : 'none'}
          />
        </View>
      </Pressable>

      <View style={styles.divider} />

      {/* Categoria - não mostrar para transferências */}
      {type !== 'transfer' && showCategory && (
        <>
          <SelectField
            label="Categoria"
            value={categoryName || 'Selecione uma categoria'}
            icon="tag-outline"
            onPress={description.trim() ? () => onOpenPicker('category') : undefined}
            disabled={!description.trim()}
          />
          <View style={styles.divider} />
        </>
      )}

      {/* Conta/Cartão ou Transferência */}
      {type === 'transfer' ? (
        <>
          <SelectField
            label="De (conta origem)"
            value={accountName || 'Selecione'}
            icon="bank-transfer-out"
            onPress={() => onOpenPicker('account')}
            subtitle={sourceAccount ? `Saldo: ${formatCurrency(Math.round((sourceAccount.balance || 0) * 100).toString())}` : undefined}
            subtitleColor={sourceAccount && (sourceAccount.balance || 0) < 0 ? colors.danger : colors.textMuted}
          />
          <View style={styles.divider} />
          <SelectField
            label="Para (conta destino)"
            value={toAccountName || 'Selecione'}
            icon="bank-transfer-in"
            onPress={() => onOpenPicker('toAccount')}
          />
        </>
      ) : (
        <SelectField
          label={type === 'despesa' ? 'Pago com' : 'Recebido em'}
          value={useCreditCard ? creditCardName : (accountName || 'Selecione')}
          icon={useCreditCard ? 'credit-card' : 'bank-outline'}
          onPress={() => onOpenPicker('account')}
          subtitle={!useCreditCard && sourceAccount ? `Saldo: ${formatCurrency(Math.round((sourceAccount.balance || 0) * 100).toString())}` : undefined}
          subtitleColor={!useCreditCard && sourceAccount && (sourceAccount.balance || 0) < 0 ? colors.danger : colors.textMuted}
        />
      )}

      <View style={styles.divider} />

      {/* Data */}
      <SelectField
        label="Data"
        value={formatDate(date)}
        icon="calendar"
        onPress={() => onOpenPicker('date')}
      />

      {/* Botão de antecipar parcela */}
      {isFutureInstallment && onAnticipate && (
        <View style={[styles.anticipateContainer, { backgroundColor: colors.successBg || colors.grayLight }]}>
          <MaterialCommunityIcons name="clock-fast" size={20} color={colors.success} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[styles.anticipateLabel, { color: colors.text }]}>
              {installmentInfo && installmentInfo.total > 1
                ? 'Esta parcela é de uma fatura futura'
                : 'Este lançamento é de uma fatura futura'}
            </Text>
            <Text style={[styles.anticipateSubLabel, { color: colors.textMuted }]}>
              Você pode antecipá-la para a próxima fatura
            </Text>
          </View>
          <Pressable
            onPress={onAnticipate}
            style={({ pressed }) => [
              styles.anticipateButton,
              { backgroundColor: pressed ? colors.success + '30' : colors.success },
            ]}
          >
            <Text style={[styles.anticipateButtonText, { color: '#FFFFFF' }]}>Antecipar</Text>
          </Pressable>
        </View>
      )}

      {/* Botões de mover série */}
      {isFirstInstallmentOfSeries && onMoveSeries && installmentInfo && (
        <View style={[styles.moveSeriesContainer, { backgroundColor: colors.grayLight }]}>
          <Text style={[styles.moveSeriesLabel, { color: colors.textMuted }]}>
            Mover série completa ({installmentInfo.total} parcelas)
          </Text>
          <View style={styles.moveSeriesButtons}>
            <Pressable
              onPress={() => onMoveSeries(-1)}
              style={({ pressed }) => [
                styles.moveSeriesButton,
                { backgroundColor: pressed ? colors.primary + '20' : colors.card, borderColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
              <Text style={[styles.moveSeriesButtonText, { color: colors.text }]}>Mês anterior</Text>
            </Pressable>
            <Pressable
              onPress={() => onMoveSeries(1)}
              style={({ pressed }) => [
                styles.moveSeriesButton,
                { backgroundColor: pressed ? colors.primary + '20' : colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.moveSeriesButtonText, { color: colors.text }]}>Próximo mês</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      {/* Recorrência */}
      {showRecurrence && !hasSeriesId && (
        <>
          <SelectField
            label="Repetir"
            value={RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label || 'Não repetir'}
            icon="repeat"
            onPress={() => onOpenPicker('recurrence')}
          />
          
          {recurrence !== 'none' && (
            <>
              <View style={styles.divider} />
              <SelectField
                label="Tipo"
                value={RECURRENCE_TYPE_OPTIONS.find((r) => r.value === recurrenceType)?.label || 'Parcelada'}
                icon="cash-multiple"
                onPress={() => onOpenPicker('recurrenceType')}
              />
              <View style={styles.divider} />
              <SelectField
                label="Quantas vezes?"
                value={`${repetitions}x`}
                icon="counter"
                onPress={() => onOpenPicker('repetitions')}
              />
              
              {repetitions > 1 && installmentValue > 0 && (
                <View style={[styles.installmentInfo, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
                  <Text style={[styles.installmentText, { color: colors.primary }]}>
                    {recurrenceType === 'installment'
                      ? `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())}`
                      : `${repetitions}x de ${formatCurrency(Math.round(installmentValue * 100).toString())} cada (Total: ${formatCurrency(Math.round(installmentValue * repetitions * 100).toString())})`}
                  </Text>
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* Aviso: mesma conta */}
      {sameAccountError && (
        <View style={[styles.warningInfo, { backgroundColor: colors.warningBg }]}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Não é possível transferir para a mesma conta
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginVertical: 2,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
  } as any,
  divider: {
    height: 2,
  },
  anticipateContainer: {
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
  moveSeriesContainer: {
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
    gap: spacing.xs,
  },
  moveSeriesButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  installmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  installmentText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  warningInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
