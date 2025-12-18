import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../../theme';
import { formatCurrencyBRL } from '../../utils/format';
import { CreditCard } from '../../types/firebase';

interface Props {
  cards?: CreditCard[];
  totalBills?: number;
  onCardPress?: (card: CreditCard) => void;
  onAddPress?: () => void;
}

// Cores para os cartões baseado no nome
const getCardColor = (name: string, customColor?: string): string => {
  if (customColor) return customColor;
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function CreditCardsCard({ cards = [], totalBills = 0, onCardPress, onAddPress }: Props) {
  const { colors } = useAppTheme();

  // Componente de item do cartão (compacto e moderno)
  const CardItem = ({ card }: { card: CreditCard }) => {
    const cardColor = getCardColor(card.name, card.color);
    const used = card.currentUsed || 0;
    const usagePercent = card.limit > 0 ? (used / card.limit) * 100 : 0;
    const available = card.limit - used;
    
    return (
      <Pressable
        onPress={() => onCardPress?.(card)}
        style={({ pressed }) => [
          styles.cardItem,
          { 
            backgroundColor: colors.bg,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          }
        ]}
      >
        {/* Barra de progresso no topo */}
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(usagePercent, 100)}%`,
                backgroundColor: usagePercent > 80 ? colors.expense : usagePercent > 50 ? colors.warning : colors.primary
              }
            ]} 
          />
        </View>

        <View style={styles.cardContent}>
          {/* Ícone e nome */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconSmall, { backgroundColor: `${cardColor}20` }]}>
              <MaterialCommunityIcons
                name={(card.icon as any) || 'credit-card'}
                size={18}
                color={cardColor}
              />
            </View>
            <View style={styles.cardTitleSection}>
              <Text style={[styles.cardNameCompact, { color: colors.text }]} numberOfLines={1}>
                {card.name}
              </Text>
              <Text style={[styles.cardLimit, { color: colors.textMuted }]}>
                Limite {formatCurrencyBRL(card.limit)}
              </Text>
            </View>
          </View>

          {/* Informações principais */}
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Usado</Text>
              <Text style={[styles.statValue, { color: usagePercent > 80 ? colors.expense : colors.text }]}>
                {formatCurrencyBRL(used)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Disponível</Text>
              <Text style={[styles.statValue, { color: colors.income }]}>
                {formatCurrencyBRL(available)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Vencimento</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                Dia {card.dueDay}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons 
              name="credit-card-multiple" 
              size={20} 
              color={colors.primary} 
            />
            <Text style={[styles.title, { color: colors.text }]}>
              Meus cartões
            </Text>
          </View>
          <Pressable 
            onPress={onAddPress}
            style={({ pressed }) => [{
              opacity: pressed ? 0.5 : 1,
            }]}
          >
            <View style={[styles.addIconButton, { backgroundColor: colors.primaryBg }]}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
            </View>
          </Pressable>
        </View>
        {cards.length > 0 && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {cards.length} cartão{cards.length > 1 ? 'es' : ''} cadastrado{cards.length > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Lista de cartões */}
      <View style={styles.cardsList}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </View>

      {/* Mensagem vazia */}
      {cards.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="credit-card-plus" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Adicione seu primeiro cartão de crédito
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  cardsList: {
    gap: spacing.sm,
  },
  cardItem: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  progressFill: {
    height: '100%',
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIconSmall: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleSection: {
    flex: 1,
  },
  cardNameCompact: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardLimit: {
    fontSize: 11,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
  },
});
