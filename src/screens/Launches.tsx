import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TransactionsList from '../components/transactions/TransactionsList';
import type { Transaction } from '../state/transactionsState';
import { useTransactionsState } from '../state/useTransactions';
import { useAppTheme } from '../contexts/themeContext';
import { formatCurrencyBRL } from '../utils/format';
import AppHeader from '../components/AppHeader';
import MainLayout from '../components/MainLayout';
import { spacing, borderRadius, getShadow } from '../theme';

// Nomes dos meses em português
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Launches() {
  const [items, setItems] = useTransactionsState();
  const { colors } = useAppTheme();
  
  // Estado do mês/ano selecionado
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Bootstrapping dados de demonstração com múltiplos meses
  useEffect(() => {
    let mounted = true;

    if (items.length === 0) {
      const mock: Transaction[] = [
        // Dezembro 2025 (atual)
        { id: 't1', date: '2025-12-01', title: 'CDI', account: 'Nuconta', amount: 2.3, type: 'received' },
        { id: 't2', date: '2025-12-01', title: 'AZZA3', account: 'Nuconta', amount: 4.45, type: 'received' },
        { id: 't3', date: '2025-12-05', title: 'Parcela Celular 4/8', account: 'Nuconta', amount: 100.0, type: 'received' },
        { id: 't4', date: '2025-12-10', title: 'Água', account: 'Nuconta', amount: -152.6, type: 'paid' },
        { id: 't5', date: '2025-12-15', title: 'Escola do Guel', account: 'Nuconta', amount: -803.33, type: 'paid' },
        // Novembro 2025 (passado)
        { id: 't6', date: '2025-11-05', title: 'Salário', account: 'Nuconta', amount: 5500.0, type: 'received' },
        { id: 't7', date: '2025-11-10', title: 'Aluguel', account: 'Nuconta', amount: -1200.0, type: 'paid' },
        { id: 't8', date: '2025-11-15', title: 'Supermercado', account: 'Nuconta', amount: -450.0, type: 'paid' },
        { id: 't9', date: '2025-11-20', title: 'Freelance', account: 'PicPay', amount: 800.0, type: 'received' },
        // Outubro 2025
        { id: 't10', date: '2025-10-05', title: 'Salário', account: 'Nuconta', amount: 5500.0, type: 'received' },
        { id: 't11', date: '2025-10-10', title: 'Aluguel', account: 'Nuconta', amount: -1200.0, type: 'paid' },
        { id: 't12', date: '2025-10-12', title: 'Luz', account: 'Nuconta', amount: -180.0, type: 'paid' },
        // Janeiro 2026 (futuro - parcelas)
        { id: 't13', date: '2026-01-05', title: 'Parcela Celular 5/8', account: 'Nuconta', amount: -100.0, type: 'paid' },
        { id: 't14', date: '2026-01-10', title: 'Escola do Guel', account: 'Nuconta', amount: -803.33, type: 'paid' },
        { id: 't15', date: '2026-01-15', title: 'IPTU 1/10', account: 'Nuconta', amount: -350.0, type: 'paid' },
        // Fevereiro 2026 (futuro)
        { id: 't16', date: '2026-02-05', title: 'Parcela Celular 6/8', account: 'Nuconta', amount: -100.0, type: 'paid' },
        { id: 't17', date: '2026-02-10', title: 'Escola do Guel', account: 'Nuconta', amount: -803.33, type: 'paid' },
        { id: 't18', date: '2026-02-15', title: 'IPTU 2/10', account: 'Nuconta', amount: -350.0, type: 'paid' },
      ];
      if (mounted) setItems(mock);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Filtra itens pelo mês/ano selecionado
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const date = new Date(item.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [items, selectedMonth, selectedYear]);

  // Calcula totais do mês selecionado
  const monthTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    
    filteredItems.forEach((item) => {
      if (item.amount > 0) {
        income += item.amount;
      } else {
        expenses += Math.abs(item.amount);
      }
    });
    
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [filteredItems]);

  // Navegação entre meses
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  // Verifica se é o mês atual
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
  
  // Verifica se é mês futuro
  const isFutureMonth = selectedYear > today.getFullYear() || 
    (selectedYear === today.getFullYear() && selectedMonth > today.getMonth());

  // Cores específicas para o resumo
  const incomeColor = '#10b981';
  const expenseColor = '#dc2626';
  const balanceColor = colors.primary;

  return (
    <MainLayout>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <AppHeader />
          <View style={styles.content}>
            <View style={styles.maxWidth}>
              {/* Seletor de Mês/Ano */}
              <View style={[styles.monthSelector, { backgroundColor: colors.card }, getShadow(colors)]}>
                <Pressable 
                  onPress={goToPreviousMonth}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
                </Pressable>
                
                <Pressable 
                  onPress={goToToday}
                  style={({ pressed }) => [styles.monthDisplay, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.monthText, { color: colors.text }]}>
                    {MONTHS[selectedMonth]}
                  </Text>
                  <Text style={[styles.yearText, { color: colors.textSecondary }]}>
                    {selectedYear}
                  </Text>
                  {isFutureMonth && (
                    <View style={[styles.futureBadge, { backgroundColor: colors.primaryBg }]}>
                      <Text style={[styles.futureBadgeText, { color: colors.primary }]}>Futuro</Text>
                    </View>
                  )}
                </Pressable>
                
                <Pressable 
                  onPress={goToNextMonth}
                  style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
                </Pressable>
              </View>

              {/* Botão Hoje (se não estiver no mês atual) */}
              {!isCurrentMonth && (
                <Pressable 
                  onPress={goToToday}
                  style={({ pressed }) => [
                    styles.todayButton, 
                    { backgroundColor: colors.primaryBg },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />
                  <Text style={[styles.todayButtonText, { color: colors.primary }]}>Ir para hoje</Text>
                </Pressable>
              )}

              {/* Lista de Transações */}
              {filteredItems.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons 
                      name={isFutureMonth ? "calendar-clock" : "calendar-blank"} 
                      size={40} 
                      color={colors.primary} 
                    />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isFutureMonth ? 'Nenhum lançamento futuro' : 'Nenhum lançamento'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {isFutureMonth 
                      ? 'Você ainda não tem despesas programadas para este mês.'
                      : 'Não há lançamentos registrados neste período.'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.listCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>
                      {filteredItems.length} lançamento{filteredItems.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TransactionsList items={filteredItems} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Summary Bar - Fixo acima do footer */}
        <View style={[styles.summaryBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: incomeColor }]}>{formatCurrencyBRL(monthTotals.income)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>entradas</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: expenseColor }]}>{formatCurrencyBRL(monthTotals.expenses)}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>saídas</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: monthTotals.balance >= 0 ? balanceColor : expenseColor }]}>
              {formatCurrencyBRL(monthTotals.balance)}
            </Text>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    marginTop: 2,
  },
  futureBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  futureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  listCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
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
