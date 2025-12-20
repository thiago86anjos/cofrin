import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';
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
    const available = card.limit - used;
    
    // Determinar status da fatura
    const today = new Date().getDate();
    const isPaid = used === 0;
    const isPending = !isPaid && today <= card.dueDay;
    const isOverdue = !isPaid && today > card.dueDay;
    
    const getStatusBadge = () => {
      if (isOverdue) return { text: 'Vencida', color: '#EF4444' };
      if (isPending) return { text: 'Pendente', color: '#9CA3AF' };
      return null;
    };
    
    const statusBadge = getStatusBadge();
    
    return (
      <Pressable
        onPress={() => onCardPress?.(card)}
        style={({ pressed }) => [
          styles.cardItem,
          { 
            backgroundColor: '#F9FAFB',
            borderColor: '#E5E7EB',
            opacity: pressed ? 0.7 : 1,
          }
        ]}
      >
        <View style={styles.cardContent}>
          {/* Ícone + Nome do cartão + Status */}
          <View style={styles.topRow}>
            <View style={[styles.cardIconSmall, { backgroundColor: `${cardColor}15` }]}>
              <MaterialCommunityIcons
                name={(card.icon as any) || 'credit-card'}
                size={24}
                color={cardColor}
              />
            </View>
            <Text style={[styles.cardNameCompact, { color: '#1F2937' }]} numberOfLines={1}>
              {card.name}
            </Text>
            {statusBadge && (
              <View style={[styles.statusBadgeCompact, { backgroundColor: `${statusBadge.color}15` }]}>
                <Text style={[styles.statusTextCompact, { color: statusBadge.color }]}>
                  {statusBadge.text}
                </Text>
              </View>
            )}
          </View>

          {/* Vencimento + Valor da fatura */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#9CA3AF' }]}>Vencimento</Text>
              <Text style={[styles.infoValue, { color: '#1F2937' }]}>
                Dia {card.dueDay}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: '#9CA3AF' }]}>Valor da fatura</Text>
              <Text style={[styles.infoValue, { color: '#1F2937' }]}>
                {formatCurrencyBRL(used)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: '#fff' }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: '#1F2937' }]}>
            Meus cartões
          </Text>
          {cards.length > 0 && (
            <Text style={[styles.subtitle, { color: '#9CA3AF' }]}>
              {cards.length} cartão{cards.length > 1 ? 'es' : ''} cadastrado{cards.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
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
          <MaterialCommunityIcons name="credit-card-plus" size={48} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: '#9CA3AF' }]}>
            Nenhum cartão cadastrado
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  cardsList: {
    gap: 12,
  },
  cardItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNameCompact: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
