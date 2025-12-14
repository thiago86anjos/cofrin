import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TransactionsList from '../components/transactions/TransactionsList';
import type { Transaction } from '../state/transactionsState';
import { useTransactionsState, useTransactionsTotals } from '../state/useTransactions';
import { useAppTheme } from '../contexts/themeContext';
import { formatCurrencyBRL } from '../utils/format';
import AppHeader from '../components/AppHeader';
import MainLayout from '../components/MainLayout';

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

  

  return (
    <MainLayout>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 18 }} keyboardShouldPersistTaps="handled">
          <AppHeader />
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: '100%', maxWidth: 980, paddingHorizontal: 12 }}>
              <Text style={[styles.title, { color: colors.text }]}>Fluxo de caixa</Text>
          {items.length === 0 ? (
            <View style={{ padding: 16, backgroundColor: colors.card, borderRadius: 12, elevation: 2 }}>
              <Text style={{ fontWeight: '700', marginBottom: 8, color: colors.text }}>Nenhum lançamento encontrado</Text>
              <Text style={{ color: colors.textMuted }}>Toque no botão + para adicionar sua primeira despesa, receita ou transferência.</Text>
            </View>
          ) : (
            <TransactionsList items={items} />
          )}
          <View style={{ height: 48 }} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}><Text style={{ color: colors.primary, fontWeight: '700' }}>{formatCurrencyBRL(totals.income)}</Text><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>entradas</Text></View>
        <View style={styles.summaryItem}><Text style={{ color: '#ef4444', fontWeight: '700' }}>{formatCurrencyBRL(-totals.expenses)}</Text><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>saídas</Text></View>
        <View style={styles.summaryItem}><Text style={{ color: colors.primaryDark, fontWeight: '700' }}>{formatCurrencyBRL(totals.balance)}</Text><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>saldo</Text></View>
      </View>

      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  summaryBar: { position: 'absolute', left: 12, right: 12, bottom: 84, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 11 },
  fab: { position: 'absolute', right: 22, bottom: 18, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
