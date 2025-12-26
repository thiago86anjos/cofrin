import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo, memo, useEffect } from 'react';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';
import { formatCurrencyBRL } from '../../utils/format';
import { CreditCard } from '../../types/firebase';
import { getCreditCardTransactionsByMonth, calculateBillTotal } from '../../services/creditCardBillService';
import { useAuth } from '../../contexts/authContext';

interface Props {
  cards?: CreditCard[];
  totalBills?: number;
  totalIncome?: number; // Receita do mês para calcular porcentagem
  onCardPress?: (card: CreditCard) => void;
  onAddPress?: () => void;
}

// Cores para os cartões baseado no nome (paleta harmônica com roxo)
const getCardColor = (name: string, customColor?: string): string => {
  // Lista de cores azuis que devem ser substituídas por roxo
  const blueColors = ['#3B82F6', '#3b82f6', '#06b6d4', '#0ea5e9', '#2563eb', '#1d4ed8'];
  
  // Se a cor customizada for azul, usar roxo principal
  if (customColor && blueColors.includes(customColor.toLowerCase())) {
    return '#5B3CC4'; // roxo principal
  }
  
  if (customColor) return customColor;
  const colors = ['#5B3CC4', '#7B5CD6', '#2FAF8E', '#E07A3F', '#ec4899', '#C4572D'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Cor roxa escura para títulos principais
const primaryDark = '#4A2FA8';
// Fundo mais claro para visual moderno
const lightBg = '#FAFAFA';

// Status de uso do cartão baseado na porcentagem de gastos vs receitas
type CardUsageStatus = {
  level: 'controlled' | 'warning' | 'alert' | 'no-income';
  message: string;
  icon: 'check-circle' | 'alert-circle' | 'alert' | 'information-outline';
  color: string;
};

const getCardUsageStatus = (totalUsed: number, totalIncome: number, colors: any): CardUsageStatus => {
  if (totalIncome === 0) {
    return {
      level: 'no-income',
      message: 'Sem receitas registradas neste mês',
      icon: 'information-outline',
      color: colors.textMuted,
    };
  }

  const percentage = (totalUsed / totalIncome) * 100;

  if (percentage <= 30) {
    return {
      level: 'controlled',
      message: 'Gastos controlados',
      icon: 'check-circle',
      color: '#22C55E', // verde
    };
  } else if (percentage <= 50) {
    return {
      level: 'warning',
      message: 'Cuidado, você está se aproximando do limite recomendado',
      icon: 'alert-circle',
      color: '#F59E0B', // amarelo/laranja
    };
  } else {
    return {
      level: 'alert',
      message: 'Atenção, gastos elevados no cartão',
      icon: 'alert',
      color: '#EF4444', // vermelho
    };
  }
};

export default memo(function CreditCardsCard({ cards = [], totalBills = 0, totalIncome = 0, onCardPress, onAddPress }: Props) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentBills, setCurrentBills] = useState<Record<string, number>>({});

  // Mês atual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Buscar faturas do mês atual para cada cartão
  useEffect(() => {
    const fetchCurrentBills = async () => {
      if (!user?.uid || cards.length === 0) return;
      
      const billsMap: Record<string, number> = {};
      
      for (const card of cards) {
        try {
          // Buscar transações do cartão no mês atual
          const transactions = await getCreditCardTransactionsByMonth(
            user.uid, 
            card.id, 
            currentMonth, 
            currentYear
          );
          
          // Calcular total da fatura
          const totalAmount = calculateBillTotal(transactions);
          
          billsMap[card.id] = totalAmount;
        } catch (error) {
          console.error(`Erro ao buscar fatura do cartão ${card.id}:`, error);
          billsMap[card.id] = 0;
        }
      }
      

      setCurrentBills(billsMap);
    };
    
    fetchCurrentBills();
  }, [cards, user?.uid, currentMonth, currentYear]);

  // Calcular total usado apenas nas faturas do mês atual
  const totalUsed = useMemo(() => {
    return Object.values(currentBills).reduce((sum, amount) => sum + amount, 0);
  }, [currentBills]);

  // Status do uso dos cartões
  const usageStatus = useMemo(() => {
    return getCardUsageStatus(totalUsed, totalIncome, colors);
  }, [totalUsed, totalIncome, colors]);

  // Porcentagem de uso
  const usagePercentage = useMemo(() => {
    if (totalIncome === 0) return 0;
    return (totalUsed / totalIncome) * 100;
  }, [totalUsed, totalIncome]);

  // Filtrar apenas cartões com fatura pendente no mês atual
  const cardsWithPendingBills = useMemo(() => {
    return cards.filter(card => {
      const billAmount = currentBills[card.id] || 0;
      return billAmount > 0;
    });
  }, [cards, currentBills]);

  // Componente de item do cartão (layout minimalista)
  const CardItem = ({ card, index }: { card: CreditCard; index: number }) => {
    const cardColor = getCardColor(card.name, card.color);
    const billAmount = currentBills[card.id] || 0;
    
    // Determinar status da fatura
    const today = new Date().getDate();
    const isPaid = billAmount === 0;
    const isPending = !isPaid && today <= card.dueDay;
    const isOverdue = !isPaid && today > card.dueDay;
    
    const getStatusText = () => {
      if (isPaid) return null;
      if (isOverdue) return 'Vencida';
      if (isPending) return 'Pendente';
      return null;
    };

    const getStatusBadgeColors = () => {
      if (isOverdue) {
        return { bg: colors.danger, border: colors.danger };
      }
      // Pendente - cor laranja mais clara
      return { bg: '#FFA726', border: '#FFA726' };
    };
    
    const statusText = getStatusText();
    
    return (
      <>
        {index > 0 && (
          <View style={[styles.divider, { borderColor: colors.border }]} />
        )}
        <Pressable
          onPress={() => onCardPress?.(card)}
          style={({ pressed }) => [
            styles.cardItem,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          {/* Primeira linha: ícone + nome + badge */}
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name={(card.icon as any) || 'credit-card'}
              size={20}
              color={cardColor}
            />
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {card.name}
            </Text>
            {statusText && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColors().bg, borderColor: getStatusBadgeColors().border }]}>
                <Text style={[styles.statusBadgeText, { color: colors.textInverse }]}>
                  {statusText}
                </Text>
              </View>
            )}
          </View>

          {/* Segunda linha: vencimento (esquerda) + valor (direita) */}
          <View style={styles.cardInfo}>
            <View style={styles.infoItemLeft}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Vencimento</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                Dia {card.dueDay}
              </Text>
            </View>
            <View style={styles.infoItemRight}>
              <Text style={[styles.billValue, { color: billAmount > 0 ? colors.expense : colors.text }]}>
                {formatCurrencyBRL(billAmount)}
              </Text>
            </View>
          </View>
        </Pressable>
      </>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: '#fff' }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: primaryDark }]}>
              Meus cartões
            </Text>
            {cardsWithPendingBills.length > 0 && totalUsed > 0 && (
              <Pressable 
                onPress={() => setShowStatusModal(true)}
                style={({ pressed }) => [
                  styles.statusIconButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <MaterialCommunityIcons 
                  name={usageStatus.icon} 
                  size={22} 
                  color={usageStatus.color} 
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Lista de cartões */}
      <View style={styles.cardsList}>
        {cardsWithPendingBills.map((card, index) => (
          <CardItem key={card.id} card={card} index={index} />
        ))}
      </View>

      {/* Mensagem vazia */}
      {cardsWithPendingBills.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="credit-card-check" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma fatura pendente neste mês
          </Text>
        </View>
      )}

      {/* Modal de Status de Uso dos Cartões */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {/* Ícone e status principal */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: `${usageStatus.color}15` }]}>
                <MaterialCommunityIcons 
                  name={usageStatus.icon} 
                  size={32} 
                  color={usageStatus.color} 
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {usageStatus.message}
              </Text>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {/* Resumo dos compromissos */}
            <View style={styles.modalDetails}>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Total em faturas:</Text>
                <Text style={[styles.modalValue, { color: colors.expense }]}>
                  {formatCurrencyBRL(totalUsed)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Receitas do mês:</Text>
                <Text style={[styles.modalValue, { color: colors.income }]}>
                  {formatCurrencyBRL(totalIncome)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Comprometimento:</Text>
                <Text style={[styles.modalValue, { color: usageStatus.color }]}>
                  {usagePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {/* Detalhes por cartão - apenas mês atual */}
            <View style={styles.modalCardsList}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                Por cartão (mês atual)
              </Text>
              {cards.filter(c => (currentBills[c.id] || 0) > 0).map((card) => (
                <View key={card.id} style={styles.modalCardItem}>
                  <View style={styles.modalCardInfo}>
                    <View style={[styles.modalCardIcon, { backgroundColor: `${getCardColor(card.name, card.color)}15` }]}>
                      <MaterialCommunityIcons 
                        name={(card.icon as any) || 'credit-card'} 
                        size={16} 
                        color={getCardColor(card.name, card.color)} 
                      />
                    </View>
                    <Text style={[styles.modalCardName, { color: colors.text }]} numberOfLines={1}>
                      {card.name}
                    </Text>
                  </View>
                  <Text style={[styles.modalCardValue, { color: colors.expense }]}>
                    {formatCurrencyBRL(currentBills[card.id] || 0)}
                  </Text>
                </View>
              ))}
              {cards.filter(c => (currentBills[c.id] || 0) > 0).length === 0 && (
                <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>
                  Nenhuma fatura em aberto no mês atual
                </Text>
              )}
            </View>

            {/* Dica - só mostra se tiver receitas para comparar */}
            {usageStatus.level !== 'no-income' ? (
              <View style={[styles.modalTip, { backgroundColor: `${usageStatus.color}10` }]}>
                <MaterialCommunityIcons 
                  name="lightbulb-outline" 
                  size={16} 
                  color={usageStatus.color} 
                />
                <Text style={[styles.modalTipText, { color: colors.textMuted }]}>
                  {usageStatus.level === 'controlled' 
                    ? 'Continue assim! Manter os gastos no cartão abaixo de 30% das receitas é ideal.'
                    : usageStatus.level === 'warning'
                    ? 'Considere revisar seus gastos. O ideal é manter abaixo de 30% das receitas.'
                    : 'Revise seus gastos no cartão para evitar comprometer seu orçamento.'}
                </Text>
              </View>
            ) : (
              <View style={[styles.modalTip, { backgroundColor: `${colors.primary}10` }]}>
                <MaterialCommunityIcons 
                  name="information-outline" 
                  size={16} 
                  color={colors.primary} 
                />
                <Text style={[styles.modalTipText, { color: colors.textMuted }]}>
                  Cadastre suas receitas para acompanhar o comprometimento do seu orçamento com cartões de crédito.
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

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
    gap: 0,
  },
  cardItem: {
    paddingVertical: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 0,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoItemLeft: {
    gap: 2,
  },
  infoItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 14,
  },
  billValue: {
    fontSize: 16,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos do ícone de status
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconButton: {
    padding: 4,
  },
  // Estilos da modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    marginVertical: 16,
  },
  modalDetails: {
    gap: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalCardsList: {
    gap: 10,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCardName: {
    fontSize: 14,
    flex: 1,
  },
  modalCardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalEmptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  modalTipText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
