import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, IconButton, useTheme } from 'react-native-paper';
import QuickActions from '../../components/QuickActions';
import OverviewStat from '../../components/OverviewStat';
import { spacing } from '../../theme';

interface Props {
  username?: string;
  revenue?: number | string;
  expenses?: number | string;
  actions?: Array<any>;
}

import { formatCurrencyBRL } from '../../utils/format';

export default function HomeOverview({ username = 'Usuário', revenue = 0, expenses = 0, actions = [] }: Props) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="elevated">
      <View style={styles.headerRow}>
        <Title style={styles.title}>Olá, {username}</Title>
        <IconButton icon="bell-outline" size={20} onPress={() => {}} accessibilityLabel="Notificações" />
      </View>

      <QuickActions actions={actions} />

      <Title style={styles.subTitle}>Visão geral</Title>

      <View style={styles.row}>
        <OverviewStat label="Receitas no mês" value={formatCurrencyBRL(revenue)} color={theme.colors.primary} />
        <OverviewStat label="Despesas no mês" value={formatCurrencyBRL(expenses)} color={(theme as any).colors?.error || '#B00020'} align="right" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, marginBottom: 8 },
  subTitle: { fontSize: 14, marginTop: 10, color: '#6b6b6b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
});
