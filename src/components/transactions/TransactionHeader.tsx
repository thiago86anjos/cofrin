/**
 * TransactionHeader - Header do modal de transação com seletor de tipo e campo de valor
 * Design simplificado: apenas uma linha colorida sutil + chips de tipo
 */

import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';

export type LocalTransactionType = 'despesa' | 'receita' | 'transfer';

interface TransactionHeaderProps {
  type: LocalTransactionType;
  onTypeChange: (type: LocalTransactionType) => void;
  amount: string;
  onAmountChange: (text: string) => void;
  amountInputRef?: React.RefObject<TextInput | null>;
  disabled?: boolean;
  hideTypeSelector?: boolean;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    expense: string;
    income: string;
    primary: string;
    bg: string;
  };
}

export default function TransactionHeader({
  type,
  onTypeChange,
  amount,
  onAmountChange,
  amountInputRef,
  disabled = false,
  hideTypeSelector = false,
  colors,
}: TransactionHeaderProps) {
  const typeColor = type === 'despesa' ? colors.expense : type === 'receita' ? colors.income : colors.textMuted;
  const typeBgColor = type === 'despesa' ? colors.expense + '15' : type === 'receita' ? colors.income + '15' : colors.border;

  return (
    <View style={styles.container}>
      {/* Seletor de tipo - chips simples */}
      {!hideTypeSelector && (
        <View style={styles.typeSelector}>
          {(['despesa', 'receita', 'transfer'] as LocalTransactionType[]).map((t) => {
            const isSelected = type === t;
            const chipColor = t === 'despesa' ? colors.expense : t === 'receita' ? colors.income : colors.textMuted;
            
            return (
              <Pressable
                key={t}
                onPress={() => onTypeChange(t)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.typeChip,
                  { 
                    backgroundColor: isSelected ? chipColor + '15' : 'transparent',
                    borderColor: isSelected ? chipColor : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons
                  name={t === 'despesa' ? 'arrow-down' : t === 'receita' ? 'arrow-up' : 'swap-horizontal'}
                  size={16}
                  color={isSelected ? chipColor : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    { color: isSelected ? chipColor : colors.textMuted },
                  ]}
                >
                  {t === 'despesa' ? 'Despesa' : t === 'receita' ? 'Receita' : 'Transf.'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Campo de valor */}
      <View style={[styles.amountContainer, { backgroundColor: typeBgColor, borderColor: typeColor + '30' }]}>
        <View style={[styles.amountIconContainer, { backgroundColor: typeColor + '20' }]}>
          <MaterialCommunityIcons name="currency-brl" size={16} color={typeColor} />
        </View>
        <TextInput
          ref={amountInputRef}
          value={amount}
          onChangeText={onAmountChange}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          style={[styles.amountInput, { color: typeColor }]}
          placeholder="R$ 0,00"
          placeholderTextColor={typeColor + '50'}
          editable={!disabled}
          maxLength={20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minWidth: 80,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  amountIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
  } as any,
});
