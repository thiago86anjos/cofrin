import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../theme';
import { Goal, GOAL_TIMEFRAME_LABELS, GOAL_TIMEFRAME_DESCRIPTIONS } from '../types/firebase';
import { formatCurrencyBRL } from '../utils/format';

interface Props {
  goal: Goal | null;
  progressPercentage: number;
  monthBalance?: number; // Saldo do mês (receitas - despesas)
  onCreatePress?: () => void;
  onGoalPress?: () => void;
}

export default function GoalProgressCard({ 
  goal, 
  progressPercentage, 
  monthBalance = 0,
  onCreatePress, 
  onGoalPress 
}: Props) {
  const { colors } = useAppTheme();

  // Card quando NÃO há meta
  if (!goal) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sua meta financeira</Text>
        </View>

        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Ter uma meta financeira ajuda a dar sentido aos seus hábitos e decisões.
        </Text>

        <Pressable
          onPress={onCreatePress}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 }
          ]}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Criar meta</Text>
        </Pressable>
      </View>
    );
  }

  // Card quando há meta ativa
  const timeframeLabel = GOAL_TIMEFRAME_LABELS[goal.timeframe];
  const timeframeDescription = GOAL_TIMEFRAME_DESCRIPTIONS[goal.timeframe];
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <Pressable
      onPress={onGoalPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        getShadow(colors),
        pressed && { opacity: 0.95 }
      ]}
    >
      {/* Header com ícone e nome da meta */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
          <MaterialCommunityIcons 
            name={(goal.icon as any) || 'piggy-bank'} 
            size={24} 
            color={colors.primary} 
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.goalName, { color: colors.text }]}>
            {goal.name}
          </Text>
          <Text style={[styles.goalTimeframe, { color: colors.textMuted }]}>
            {timeframeLabel}
          </Text>
        </View>
      </View>

      {/* Progresso visual */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          Progresso {formatCurrencyBRL(goal.currentAmount)} de {formatCurrencyBRL(goal.targetAmount)}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.grayLight }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(progressPercentage, 100)}%`,
                backgroundColor: colors.primary
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressStatus, { color: colors.textMuted }]}>
          {Math.round(progressPercentage)}% concluído
        </Text>
      </View>

      {/* Informações detalhadas */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>
            Faltam: {timeframeDescription}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>
            Aporte necessário: {formatCurrencyBRL(remaining > 0 ? remaining / (goal.monthsRemaining || 1) : 0)} por mês
          </Text>
        </View>
      </View>

      {/* Botão de adicionar progresso */}
      <Pressable
        onPress={onGoalPress}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.success + '15', borderColor: colors.success },
          pressed && { opacity: 0.7 }
        ]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.success} />
        <Text style={[styles.addButtonText, { color: colors.success }]}>
          Adicionar progresso
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  goalTimeframe: {
    fontSize: 13,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: spacing.lg,
    gap: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailsRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
