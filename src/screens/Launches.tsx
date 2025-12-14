import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TransactionsList from '../components/transactions/TransactionsList';
import type { Transaction } from '../state/transactionsState';
import { useTransactionsState, useTransactionsTotals } from '../state/useTransactions';
import { useAppTheme } from '../contexts/themeContext';
import { formatCurrencyBRL } from '../utils/format';
import AppHeader from '../components/AppHeader';
import MainLayout from '../components/MainLayout';
import { spacing, borderRadius, getShadow } from '../theme';

export default function Launches() {
  const [items, setItems] = useTransactionsState();
  const totals = useTransactionsTotals();
  const { colors } = useAppTheme();

  function handleAdd(transaction: any) {
    const t: Transaction = { id: String(Date.now()), date: new Date().toISOString(), title: transaction.description || 'Novo lançamento', account: transaction.account || 'Conta', amount: transaction.amount, type: transaction.type === 'despesa' ? 'paid' : 'received' };
    setItems((s: Transaction[]) => [t, ...s]);
  }

  // Bootstrapping some demo items if state is empty
  useEffect(() => {
    let mounted = true;

    if (items.length === 0) {
      const mock: Transaction[] = [
        { id: 't1', date: '2025-12-01', title: 'CDI', account: 'Nuconta', amount: 2.3, type: 'received' },
        { id: 't2', date: '2025-12-01', title: 'AZZA3', account: 'Nuconta', amount: 4.45, type: 'received' },
        { id: 't3', date: '2025-12-01', title: 'Parcela Tio Pelé celular 4/8', account: 'Nuconta', amount: 100.0, type: 'received' },
        { id: 't4', date: '2025-12-01', title: 'Miguel Mãe', account: 'Nuconta', amount: 100.0, type: 'received' },
        { id: 't5', date: '2025-12-01', title: 'Água', account: 'Nuconta', amount: -152.6, type: 'paid' },
        { id: 't6', date: '2025-12-01', title: 'Poupança Miguel ( Eu e Mãe )', account: 'Nuconta', amount: 200.0, type: 'received' },
        { id: 't7', date: '2025-12-01', title: 'Escola do Guel', account: 'Nuconta', amount: -803.33, type: 'paid' },
      ];
      if (mounted) setItems(mock);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Cores específicas para o resumo
  const incomeColor = '#10b981';  // Verde claro
  const expenseColor = '#dc2626'; // Vermelho
  const balanceColor = colors.primary; // Cor primária do tema

  return (
    <MainLayout>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <AppHeader />
          <View style={styles.content}>
            <View style={styles.maxWidth}>
              <Text style={[styles.title, { color: colors.text }]}>Fluxo de caixa</Text>
              
              {items.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum lançamento encontrado</Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Toque no botão + para adicionar sua primeira despesa, receita ou transferência.
                  </Text>
                </View>
              ) : (
                <View style={[styles.listCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <TransactionsList items={items} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Summary Bar - Fixo acima do footer */}
        <View style={[styles.summaryBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: incomeColor }]}>{formatCurrencyBRL(totals.income)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>entradas</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: expenseColor }]}>{formatCurrencyBRL(-totals.expenses)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>saídas</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: balanceColor }]}>{formatCurrencyBRL(totals.balance)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>saldo</Text>
          </View>
        </View>
      </View>
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
    paddingBottom: spacing.md,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 980,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  summaryBar: {
    borderTopWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  summaryValue: {
    fontWeight: '700',
    fontSize: 15,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
