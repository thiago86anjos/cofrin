import React, { useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AddTransactionModal from '../../components/transactions/AddTransactionModal';
import { formatCurrencyBRL } from '../../utils/format';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../../theme';

interface Props {
  username?: string;
  revenue?: number;
  expenses?: number;
  onSaveTransaction?: () => void;
}

export default function HomeOverview({ 
  username = 'Usuário', 
  revenue = 0, 
  expenses = 0, 
  onSaveTransaction 
}: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'despesa' | 'receita' | 'transfer'>('despesa');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const openModal = (type: 'despesa' | 'receita' | 'transfer') => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleSave = () => {
    setModalVisible(false);
    onSaveTransaction?.();
    setSnackbarVisible(true);
  };

  // Action button component
  const ActionButton = ({ 
    icon, 
    color, 
    label, 
    onPress 
  }: { 
    icon: string; 
    color: string; 
    label: string; 
    onPress: () => void;
  }) => (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.actionButton,
        { opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }, getShadow(colors)]}>
        <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
      </View>
      <Text variant="labelSmall" style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );

  // Stat component
  const StatItem = ({ 
    label, 
    value, 
    color, 
    align = 'left' 
  }: { 
    label: string; 
    value: string; 
    color: string; 
    align?: 'left' | 'right';
  }) => (
    <View style={[styles.statItem, align === 'right' && styles.statItemRight]}>
      <Text variant="bodySmall" style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text variant="titleMedium" style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
        {/* Greeting */}
        <Text variant="headlineSmall" style={[styles.greeting, { color: colors.text }]}>
          Olá, {username}
        </Text>

        {/* Quick Actions */}
        <View style={[styles.actionsRow, isSmallScreen && styles.actionsRowSmall]}>
          <ActionButton
            icon="minus"
            color={colors.expense}
            label="DESPESA"
            onPress={() => openModal('despesa')}
          />
          <ActionButton
            icon="plus"
            color={colors.income}
            label="RECEITA"
            onPress={() => openModal('receita')}
          />
          <ActionButton
            icon="swap-horizontal"
            color={colors.gray}
            label="TRANSF."
            onPress={() => openModal('transfer')}
          />
        </View>

        {/* Stats Section */}
        <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.textMuted }]}>Visão geral</Text>
        
        <View style={styles.statsRow}>
          <StatItem 
            label="Receitas no mês" 
            value={formatCurrencyBRL(revenue)} 
            color={colors.income} 
          />
          <StatItem 
            label="Despesas no mês" 
            value={formatCurrencyBRL(expenses)} 
            color={colors.expense}
            align="right"
          />
        </View>
      </View>

      <AddTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialType={modalType}
        onSave={handleSave}
      />

      <Snackbar 
        visible={snackbarVisible} 
        onDismiss={() => setSnackbarVisible(false)} 
        duration={2000}
        style={{ backgroundColor: colors.card }}
      >
        Lançamento salvo com sucesso!
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  greeting: {
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  actionsRowSmall: {
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    marginTop: spacing.sm,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 18,
  },
});
