import { useState } from 'react';
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
  const isDesktop = width >= 900;

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

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', emoji: '🌅' };
    if (hour < 18) return { text: 'Boa tarde', emoji: '☀️' };
    return { text: 'Boa noite', emoji: '🌙' };
  };

  const greeting = getGreeting();

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
      <View style={[styles.actionCircle, { backgroundColor: color, borderColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
      </View>
      <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
        {/* Card Principal - Saudação e Stats */}
        <View style={[styles.mainCard, { backgroundColor: colors.card }, getShadow(colors)]}>
          {/* Saudação */}
          <View style={styles.greetingContainer}>
            <Text style={[styles.greeting, { color: colors.text }]}>
              {greeting.text}, {username}
            </Text>
            <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
          </View>

          {/* Stats lado a lado */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxLeft]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Receitas no mês atual
              </Text>
              <Text style={[styles.statValue, { color: colors.income }]}>
                {formatCurrencyBRL(revenue)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={[styles.statBox, styles.statBoxRight]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Despesas no mês atual
              </Text>
              <Text style={[styles.statValue, { color: colors.expense }]}>
                {formatCurrencyBRL(expenses)}
              </Text>
            </View>

            {/* Ícone de gráfico */}
            <View style={styles.chartIcon}>
              <MaterialCommunityIcons name="chart-line-variant" size={32} color={colors.textMuted} />
            </View>
          </View>
        </View>

        {/* Card Ações Rápidas */}
        <View style={[styles.actionsCard, { backgroundColor: colors.card }, getShadow(colors)]}>
          <Text style={[styles.actionsTitle, { color: colors.text }]}>
            Acesso rápido
          </Text>
          <View style={styles.actionsGrid}>
            <ActionButton 
              icon="minus-circle" 
              color={colors.expense} 
              label="DESPESA" 
              onPress={() => openModal('despesa')} 
            />
            <ActionButton 
              icon="plus-circle" 
              color={colors.income} 
              label="RECEITA" 
              onPress={() => openModal('receita')} 
            />
            <ActionButton 
              icon="swap-horizontal-circle" 
              color="#8B9DC3" 
              label="TRANSF." 
              onPress={() => openModal('transfer')} 
            />
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
  // Wrapper principal
  wrapper: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  wrapperDesktop: {
    flexDirection: 'row',
    gap: spacing.lg,
  },

  // Card principal - saudação e stats
  mainCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    flex: 1,
  },

  // Saudação
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
  },
  greetingEmoji: {
    fontSize: 28,
  },

  // Stats em linha
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statBox: {
    flex: 1,
  },
  statBoxLeft: {
    alignItems: 'flex-start',
  },
  statBoxRight: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  chartIcon: {
    marginLeft: spacing.sm,
    opacity: 0.5,
  },

  // Card de ações rápidas
  actionsCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    minWidth: 280,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-around',
  },

  // Botão de ação
  actionButton: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 90,
  },
  actionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
