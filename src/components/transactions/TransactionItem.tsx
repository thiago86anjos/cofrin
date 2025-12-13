import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { List, Avatar, useTheme, Text as PaperText } from 'react-native-paper';
import { formatCurrencyBRL } from '../../utils/format';

interface Props {
  icon?: string; // letter or emoji
  title: string;
  account?: string;
  amount: number; // numeric value; positive = income, negative = expense
  type?: 'received' | 'paid' | 'transfer';
  onPress?: () => void;
}

function TransactionItemComponent({ icon = '◻', title, account, amount, type, onPress }: Props) {
  const theme = useTheme();
  const isReceived = amount >= 0 || type === 'received';
  const color = isReceived ? theme.colors.primary : (theme as any).colors?.error || '#B00020';

  return (
    <List.Item
      onPress={onPress}
      title={title}
      description={account}
      left={(props) => (
        <Avatar.Text size={40} label={String(icon).slice(0, 2)} style={styles.avatar} labelStyle={styles.avatarLabel} />
      )}
      right={() => (
        <PaperText style={[styles.amount, { color }]}>{formatCurrencyBRL(amount)}</PaperText>
      )}
      style={styles.row}
    />
  );
}

export default memo(TransactionItemComponent);

const styles = StyleSheet.create({
  row: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  avatar: { backgroundColor: '#e6eefc', alignItems: 'center', justifyContent: 'center' },
  avatarLabel: { fontWeight: '700' },
  amount: { fontWeight: '700', marginRight: 8, alignSelf: 'center' },
});
