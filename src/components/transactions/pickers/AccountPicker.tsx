/**
 * AccountPicker - Componente para seleção de conta ou cartão de crédito
 * Extraído do AddTransactionModal para melhor organização
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface Account {
  id: string;
  name: string;
  icon?: string;
  balance?: number;
}

interface CreditCard {
  id: string;
  name: string;
}

interface AccountPickerProps {
  accounts: Account[];
  creditCards?: CreditCard[];
  selectedAccountId: string;
  selectedCreditCardId?: string;
  useCreditCard?: boolean;
  transactionType: 'despesa' | 'receita' | 'transfer';
  isGoalTransaction?: boolean;
  isMetaCategoryTransaction?: boolean;
  onSelectAccount: (accountId: string, accountName: string) => void;
  onSelectCreditCard?: (cardId: string, cardName: string) => void;
  onClose: () => void;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryBg: string;
    grayLight: string;
  };
  insets: { bottom: number };
  title?: string;
}

export default function AccountPicker({
  accounts,
  creditCards = [],
  selectedAccountId,
  selectedCreditCardId,
  useCreditCard = false,
  transactionType,
  isGoalTransaction = false,
  isMetaCategoryTransaction = false,
  onSelectAccount,
  onSelectCreditCard,
  onClose,
  colors,
  insets,
  title,
}: AccountPickerProps) {
  const showCreditCards =
    transactionType === 'despesa' &&
    creditCards.length > 0 &&
    !isGoalTransaction &&
    !isMetaCategoryTransaction &&
    onSelectCreditCard;

  const displayTitle =
    title ||
    (transactionType === 'transfer'
      ? 'Conta de Origem'
      : transactionType === 'despesa'
      ? 'Pago com'
      : 'Recebido em');

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
      >
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id && !useCreditCard;

          return (
            <Pressable
              key={acc.id}
              onPress={() => {
                onSelectAccount(acc.id, acc.name);
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                isSelected && { backgroundColor: colors.primaryBg },
              ]}
            >
              <View style={styles.optionContent}>
                <MaterialCommunityIcons
                  name={(acc.icon || 'bank') as any}
                  size={20}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text, marginLeft: spacing.sm },
                    isSelected && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {acc.name}
                </Text>
              </View>
              {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}

        {/* Credit cards section */}
        {showCreditCards && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              CARTÕES DE CRÉDITO
            </Text>
            {creditCards.map((card) => {
              const isSelected = selectedCreditCardId === card.id && useCreditCard;

              return (
                <Pressable
                  key={card.id}
                  onPress={() => {
                    onSelectCreditCard?.(card.id, card.name);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                    isSelected && { backgroundColor: colors.primaryBg },
                  ]}
                >
                  <View style={styles.optionContent}>
                    <MaterialCommunityIcons
                      name="credit-card"
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text, marginLeft: spacing.sm },
                        isSelected && { color: colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {card.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
