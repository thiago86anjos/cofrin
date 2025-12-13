import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import AccountItem from '../../components/AccountItem';
import { formatCurrencyBRL } from '../../utils/format';
import { spacing } from '../../theme';

interface Account { name: string; type: string; balance: number }
interface Props { balance?: number; accounts?: Account[] }

export default function BalanceCard({ balance = 0, accounts = [] }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Saldo geral</Text>
      <Text style={styles.amount}>{formatCurrencyBRL(balance)}</Text>

      <View style={{ height: 16 }} />
      <Text style={styles.titleSmall}>Minhas contas</Text>
      <View style={{ marginTop: 8 }}>
        {accounts.map((a, i) => (
          <AccountItem key={i} name={a.name} type={a.type} balance={a.balance} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  title: { fontWeight: '700', marginBottom: 12 },
  amount: { fontSize: 18, fontWeight: '700' },
  titleSmall: { fontWeight: '700' },
});
