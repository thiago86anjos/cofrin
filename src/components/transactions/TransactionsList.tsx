import { View, Text, StyleSheet } from 'react-native';
import TransactionItem from './TransactionItem';
import type { Transaction } from '../../state/transactionsState';

interface Props { items: Transaction[] }

export default function TransactionsList({ items = [] }: Props) {
  // group by date (simple grouping: same date string -> header)
  const groups: Record<string, Transaction[]> = {};
  items.forEach((t) => {
    const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
  });

  const dates = Object.keys(groups);

  return (
    <View>
      {dates.map((d) => (
        <View key={d} style={{ marginBottom: 14 }}>
          <Text style={styles.dateHeader}>{d}</Text>
          {groups[d].map((tx) => (
            <TransactionItem key={tx.id} title={tx.title} account={tx.account} amount={tx.amount} type={tx.type} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dateHeader: { color: '#94a3b8', marginVertical: 8, fontWeight: '700' },
});
