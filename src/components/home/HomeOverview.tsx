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
  const isNarrow = width < 700;

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

  // Action button component - mais compacto
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
        { backgroundColor: color, opacity: pressed ? 0.9 : 1 }
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color="#fff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );

  // Stat component - horizontal compacto
  const StatItem = ({ 
    label, 
    value, 
    color 
  }: { 
    label: string; 
    value: string; 
    color: string; 
  }) => (
    <View style={styles.statItem}>
      <Text variant="labelSmall" style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text variant="headlineSmall" style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  // Layout responsivo: mobile (vertical) vs desktop (horizontal)
  if (isNarrow) {
    // Mobile: Layout vertical tradicional
    return (
      <>
        <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
          <Text variant="headlineSmall" style={[styles.greeting, { color: colors.text }]}>
            Bom dia, {username}
          </Text>

          <View style={styles.statsVertical}>
            <StatItem label="Receitas do mês" value={formatCurrencyBRL(revenue)} color={colors.income} />
            <StatItem label="Despesas do mês" value={formatCurrencyBRL(expenses)} color={colors.expense} />
          </View>

          <Text variant="labelMedium" style={[styles.sectionTitle, { color: colors.textMuted }]}>Ações rápidas</Text>
          <View style={styles.actionsHorizontal}>
            <ActionButton icon="minus" color={colors.expense} label="Despesa" onPress={() => openModal('despesa')} />
            <ActionButton icon="plus" color={colors.income} label="Receita" onPress={() => openModal('receita')} />
            <ActionButton icon="swap-horizontal" color={colors.gray} label="Transferir" onPress={() => openModal('transfer')} />
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

  // Desktop: Layout horizontal compacto
  return (
    <>
      <View style={styles.horizontalContainer}>
        {/* Card 1: Saudação + Resumo */}
        <View style={[styles.cardCompact, { backgroundColor: colors.card, flex: 1 }, getShadow(colors)]}>
          <Text variant="titleLarge" style={[styles.greetingCompact, { color: colors.text }]}>
            Bom dia, {username}
          </Text>
          <View style={styles.statsGrid}>
            <StatItem label="Receitas do mês" value={formatCurrencyBRL(revenue)} color={colors.income} />
            <StatItem label="Despesas do mês" value={formatCurrencyBRL(expenses)} color={colors.expense} />
          </View>
        </View>

        {/* Card 2: Ações rápidas */}
        <View style={[styles.cardCompact, { backgroundColor: colors.card }, getShadow(colors)]}>
          <Text variant="labelMedium" style={[styles.sectionTitleCompact, { color: colors.textMuted }]}>Ações rápidas</Text>
          <View style={styles.actionsVertical}>
            <ActionButton icon="minus" color={colors.expense} label="Despesa" onPress={() => openModal('despesa')} />
            <ActionButton icon="plus" color={colors.income} label="Receita" onPress={() => openModal('receita')} />
            <ActionButton icon="swap-horizontal" color={colors.gray} label="Transferir" onPress={() => openModal('transfer')} />
          </View>
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
  // Mobile: Card vertical
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  greeting: {
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  statsVertical: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Desktop: Layout horizontal compacto
  horizontalContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  cardCompact: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  greetingCompact: {
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  sectionTitleCompact: {
    marginBottom: spacing.md,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  actionsVertical: {
    gap: spacing.sm,
  },

  // Shared: Botões de ação compactos
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 110,
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Shared: Stats
  statItem: {
    flex: 1,
  },
  statLabel: {
    marginBottom: spacing.xs,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 24,
  },
});
