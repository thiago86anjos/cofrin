import { View, Text, StyleSheet } from 'react-native';
import TransactionItem from './TransactionItem';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing } from '../../theme';

export interface TransactionListItem {
  id: string;
  date: string;
  title: string;
  account: string;
  amount: number;
  type: 'paid' | 'received' | 'transfer';
  category?: string;
  categoryIcon?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  goalName?: string; // Se for aporte em meta
}

interface Props { 
  items: TransactionListItem[];
  onEditItem?: (item: TransactionListItem) => void;
  onStatusPress?: (item: TransactionListItem) => void;
}

export default function TransactionsList({ items = [], onEditItem, onStatusPress }: Props) {
  const { colors } = useAppTheme();
  
  // group by date (simple grouping: same date string -> header)
  const groups: Record<string, TransactionListItem[]> = {};
  items.forEach((t) => {
    const date = new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
  });

  const dates = Object.keys(groups);

  return (
    <View>
      {dates.map((d) => (
        <View key={d} style={styles.group}>
          <Text style={[styles.dateHeader, { color: colors.textMuted }]}>{d}</Text>
          {groups[d].map((tx, index) => (
            <TransactionItem 
              key={tx.id}
              title={tx.title} 
              account={tx.account} 
              amount={tx.amount} 
              type={tx.type}
              category={tx.category}
              categoryIcon={tx.categoryIcon}
              status={tx.status}
              goalName={tx.goalName}
              isLastInGroup={index === groups[d].length - 1}
              onEdit={() => onEditItem?.(tx)}
              onStatusPress={() => onStatusPress?.(tx)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.sm,
  },
  dateHeader: { 
    marginBottom: spacing.xs + 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
