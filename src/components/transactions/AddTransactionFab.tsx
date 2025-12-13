import { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import AddTransactionModal from './AddTransactionModal';
import { palette } from '../../theme';
import { useTransactionsState } from '../../state/useTransactions';
import type { Transaction } from '../../state/transactionsState';

interface Props {
  style?: any;
  initialType?: 'despesa' | 'receita' | 'transfer';
}

export default function AddTransactionFab({ style, initialType = 'despesa' }: Props) {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useTransactionsState();

  function handleSave(payload: any) {
    // payload { type, amount, description, account, date, recurrence, toAccount }
    if (!payload) return;
    if (payload.type === 'transfer') {
      // Create two transactions: debit (from) and credit (to)
      const debit: Transaction = {
        id: String(Date.now()) + '_from',
        date: payload.date.toISOString ? payload.date.toISOString() : new Date().toISOString(),
        title: payload.description || 'Transferência',
        account: payload.account || 'Conta',
        amount: -Math.abs(payload.amount),
        type: 'transfer',
      };
      const credit: Transaction = {
        id: String(Date.now()) + '_to',
        date: payload.date.toISOString ? payload.date.toISOString() : new Date().toISOString(),
        title: payload.description || 'Transferência',
        account: payload.toAccount || 'Conta',
        amount: Math.abs(payload.amount),
        type: 'transfer',
      };
      setItems((s) => [credit, debit, ...s]);
    } else {
      const t: Transaction = {
        id: String(Date.now()),
        date: payload.date.toISOString ? payload.date.toISOString() : new Date().toISOString(),
        title: payload.description || (payload.type === 'despesa' ? 'Despesa' : 'Receita'),
        account: payload.account || 'Conta',
        amount: payload.amount,
        type: payload.type === 'despesa' ? 'paid' : 'received',
      };
      setItems((s) => [t, ...s]);
    }
  }

  return (
    <View style={[styles.container, style]}>
      <Pressable style={styles.fab} onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel="Adicionar lançamento">
        <Text style={styles.plus}>+</Text>
      </Pressable>

      <AddTransactionModal visible={visible} onClose={() => setVisible(false)} onSave={(p) => { handleSave(p); setVisible(false); }} initialType={initialType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  fab: { backgroundColor: palette.blue, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#fff', fontWeight: '700', fontSize: 26 },
});
