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

// Nome dos meses em português
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Cores para os cartões baseado no nome
const getCardColor = (name: string, customColor?: string): string => {
  if (customColor) return customColor;
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function CreditCardsCard({ cards = [], totalBills = 0, onCardPress, onAddPress }: Props) {
  const { colors } = useAppTheme();
  const currentMonth = MONTHS[new Date().getMonth()];

  // Calcular totais
  const totalLimit = cards.reduce((sum, card) => sum + card.limit, 0);
  const totalUsed = cards.reduce((sum, card) => sum + (card.currentUsed || 0), 0);
  const availableLimit = totalLimit - totalUsed;

  // Componente de item do cartão
  const CardRow = ({ card }: { card: CreditCard }) => {
    const cardColor = getCardColor(card.name, card.color);
    const used = card.currentUsed || 0;
    const usagePercent = card.limit > 0 ? (used / card.limit) * 100 : 0;
    
    return (
      <Pressable
        onPress={() => onCardPress?.(card)}
        style={({ pressed }) => [
          styles.cardRow,
          { backgroundColor: pressed ? colors.grayLight : 'transparent' }
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: `${cardColor}15` }]}>
          <MaterialCommunityIcons
            name={(card.icon as any) || 'credit-card'}
            size={20}
            color={cardColor}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {card.name}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardDue, { color: colors.textMuted }]}>
              Fecha {card.closingDay} • Vence {card.dueDay}
            </Text>
          </View>
        </View>

        <View style={styles.cardBill}>
          <Text style={[
            styles.billValue, 
            { color: used > 0 ? colors.expense : colors.income }
          ]}>
            {formatCurrencyBRL(used)}
          </Text>
          <View style={styles.usageBar}>
            <View 
              style={[
                styles.usageFill, 
                { 
                  width: `${Math.min(usagePercent, 100)}%`,
                  backgroundColor: usagePercent > 80 ? colors.expense : usagePercent > 50 ? colors.warning : colors.income,
                }
              ]} 
            />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>
            Cartões de Crédito
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {cards.length > 0 ? `${cards.length} cartão${cards.length > 1 ? 'ões' : ''}` : 'Nenhum cartão'}
          </Text>
        </View>

        <Pressable 
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.iconContainer, 
            { backgroundColor: colors.primaryBg },
            pressed && { opacity: 0.7 }
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* Resumo de limite */}
      {cards.length > 0 && (
        <View style={[styles.summaryRow, { borderColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Limite total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatCurrencyBRL(totalLimit)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Disponível</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              {formatCurrencyBRL(availableLimit)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Utilizado</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              {formatCurrencyBRL(totalUsed)}
            </Text>
          </View>
        </View>
      )}

      {/* Lista de cartões */}
      {cards.length > 0 ? (
        <View style={styles.cardsList}>
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </View>
      ) : (
        <Pressable 
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.emptyContainer, 
            { backgroundColor: colors.grayLight },
            pressed && { opacity: 0.7 }
          ]}
        >
          <MaterialCommunityIcons
            name="credit-card-plus-outline"
            size={40}
            color={colors.primary}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Adicionar cartão de crédito
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  cardsList: {
    gap: spacing.xs,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardDue: {
    fontSize: 11,
  },
  cardBill: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageBar: {
    width: 60,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  emptyText: {
    marginTop: spacing.xs,
    fontSize: 13,
  },
});
