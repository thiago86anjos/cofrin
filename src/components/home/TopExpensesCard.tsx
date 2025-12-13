import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../../components/Card';
import { palette, spacing } from '../../theme';

interface Props { title?: string }

export default function TopExpensesCard({ title = 'Maiores gastos do mês atual' }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={{ height: 12 }} />
      <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: palette.muted }}>[Gráfico de pizza placeholder]</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  title: { fontWeight: '700', marginBottom: 6 },
});
