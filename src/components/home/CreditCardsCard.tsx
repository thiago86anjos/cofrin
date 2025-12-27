import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo, memo, useEffect } from 'react';
import { formatCurrencyBRL } from '../../utils/format';
import { CreditCard } from '../../types/firebase';
import { getCreditCardTransactionsByMonth, calculateBillTotal, isBillPaid } from '../../services/creditCardBillService';
import { useAuth } from '../../contexts/authContext';
import { useTransactionRefresh } from '../../contexts/transactionRefreshContext';
import { DS_COLORS, DS_TYPOGRAPHY, DS_ICONS, DS_CARD, DS_BADGE, DS_SPACING } from '../../theme/designSystem';

interface Props {
  cards?: CreditCard[];
  totalBills?: number;
  totalIncome?: number; // Receita do mês para calcular porcentagem
  onCardPress?: (card: CreditCard) => void;
  onAddPress?: () => void;
}



// Status de uso do cartão baseado na porcentagem de gastos vs receitas
type CardUsageStatus = {
  level: 'controlled' | 'warning' | 'alert' | 'no-income';
  message: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const getCardUsageStatus = (totalUsed: number, totalIncome: number): CardUsageStatus => {
  if (totalIncome === 0) {
    return {
      level: 'no-income',
      message: 'Sem receitas registradas neste mês',
      color: DS_COLORS.textMuted,
      icon: 'information-outline',
    };
  }

  const percentage = (totalUsed / totalIncome) * 100;

  if (percentage <= 30) {
    return {
      level: 'controlled',
      message: 'Gastos controlados',
      color: DS_COLORS.success,
      icon: 'check-circle-outline',
    };
  } else if (percentage <= 50) {
    return {
      level: 'warning',
      message: 'Cuidado, você está se aproximando do limite recomendado',
      color: DS_COLORS.warning,
      icon: 'alert-circle-outline',
    };
  } else {
    return {
      level: 'alert',
      message: 'Atenção, gastos elevados no cartão',
      color: DS_COLORS.error,
      icon: 'alert-octagon-outline',
    };
  }
};

type OpenBillSummary = {
  amount: number;
  billMonth: number;
  billYear: number;
  dueDate: Date;
};

function getMonthShortPtBr(month: number) {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return months[month - 1] || '';
}

function buildDueDate(year: number, month: number, dueDay: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(dueDay, 1), lastDay);
  return new Date(year, month - 1, safeDay);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default memo(function CreditCardsCard({ cards = [], totalBills = 0, totalIncome = 0, onCardPress, onAddPress }: Props) {
  const { user } = useAuth();
  const { refreshKey } = useTransactionRefresh();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [openBills, setOpenBills] = useState<Record<string, OpenBillSummary>>({});
  const [currentMonthBills, setCurrentMonthBills] = useState<Record<string, number>>({});

  // Mês atual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Buscar faturas do mês atual para cada cartão
  useEffect(() => {
    const fetchOpenBills = async () => {
      if (!user?.uid || cards.length === 0) return;
      
      const billsMap: Record<string, OpenBillSummary> = {};

      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      
      for (const card of cards) {
        try {
          const candidates: Array<{ month: number; year: number }> = [
            { month: currentMonth, year: currentYear },
            { month: nextMonth, year: nextYear },
          ];

          let chosen: OpenBillSummary | undefined;
          for (const candidate of candidates) {
            const transactions = await getCreditCardTransactionsByMonth(
              user.uid,
              card.id,
              candidate.month,
              candidate.year
            );

            const totalAmount = calculateBillTotal(transactions);
            if (totalAmount <= 0) continue;

            const paid = await isBillPaid(user.uid, card.id, candidate.month, candidate.year);
            if (paid) continue;

            chosen = {
              amount: totalAmount,
              billMonth: candidate.month,
              billYear: candidate.year,
              dueDate: buildDueDate(candidate.year, candidate.month, card.dueDay),
            };
            break;
          }

          if (chosen) {
            billsMap[card.id] = chosen;
          }
        } catch (error) {
          console.error(`Erro ao buscar fatura do cartão ${card.id}:`, error);
        }
      }
      
      setOpenBills(billsMap);
    };
    
    fetchOpenBills();
  }, [cards, user?.uid, currentMonth, currentYear, refreshKey]);

  // Buscar totais de gastos do mês atual (independente de fatura paga/pendente/vencida)
  useEffect(() => {
    const fetchCurrentMonthBills = async () => {
      if (!user?.uid || cards.length === 0) return;

      const billsMap: Record<string, number> = {};
      for (const card of cards) {
        try {
          const transactions = await getCreditCardTransactionsByMonth(user.uid, card.id, currentMonth, currentYear);
          billsMap[card.id] = calculateBillTotal(transactions);
        } catch (error) {
          console.error(`Erro ao buscar gastos do mês do cartão ${card.id}:`, error);
          billsMap[card.id] = 0;
        }
      }

      setCurrentMonthBills(billsMap);
    };

    fetchCurrentMonthBills();
  }, [cards, user?.uid, currentMonth, currentYear, refreshKey]);

  // Total de gastos em cartões no mês atual (base da modal)
  const monthTotalUsed = useMemo(() => {
    return Object.values(currentMonthBills).reduce((sum, amount) => sum + amount, 0);
  }, [currentMonthBills]);

  // Status do uso dos cartões
  const usageStatus = useMemo(() => {
    return getCardUsageStatus(monthTotalUsed, totalIncome);
  }, [monthTotalUsed, totalIncome]);

  // Porcentagem de uso
  const usagePercentage = useMemo(() => {
    if (totalIncome === 0) return 0;
    return (monthTotalUsed / totalIncome) * 100;
  }, [monthTotalUsed, totalIncome]);

  // Filtrar apenas cartões com fatura pendente no mês atual
  const cardsWithPendingBills = useMemo(() => {
    return cards.filter(card => {
      return !!openBills[card.id] && openBills[card.id].amount > 0;
    });
  }, [cards, openBills]);

  // Componente de item do cartão (layout minimalista)
  const CardItem = ({ card, index }: { card: CreditCard; index: number }) => {
    const bill = openBills[card.id];
    const billAmount = bill?.amount || 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateStart = bill ? new Date(bill.dueDate.getFullYear(), bill.dueDate.getMonth(), bill.dueDate.getDate()) : null;

    const isOverdue = !!dueDateStart && dueDateStart.getTime() < todayStart.getTime();
    const isDueToday = !!dueDateStart && isSameDay(dueDateStart, todayStart);
    const isPending = !!dueDateStart && dueDateStart.getTime() > todayStart.getTime();
    
    const getStatusText = () => {
      if (isOverdue) return 'Vencida';
      if (isDueToday) return 'Vence hoje';
      if (isPending) return 'Pendente';
      return null;
    };

    const getStatusBadgeColors = () => {
      if (isOverdue) return DS_BADGE.variants.error;
      if (isDueToday) return DS_BADGE.variants.warning;
      return DS_BADGE.variants.neutral;
    };
    
    const getBillValueColor = () => {
      if (isOverdue) return DS_COLORS.error;
      if (isDueToday) return DS_COLORS.warning;
      return DS_COLORS.textMuted;
    };
    
    const statusText = getStatusText();
    
    const badgeColors = getStatusBadgeColors();
    
    return (
      <>
        {index > 0 && (
          <View style={[styles.divider, { borderColor: DS_COLORS.divider }]} />
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
              size={DS_ICONS.size.default}
              color={DS_ICONS.color}
            />
            <Text style={[styles.cardName, { color: DS_COLORS.textBody }]} numberOfLines={1}>
              {card.name}
            </Text>
            {statusText && (
              <View style={[styles.statusBadge, { backgroundColor: badgeColors.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: badgeColors.color }]}>
                  {statusText}
                </Text>
              </View>
            )}
          </View>

          {/* Segunda linha: vencimento + valor na mesma linha */}
          <View style={styles.cardInfo}>
            <Text style={[styles.infoLabel, { color: DS_COLORS.textMuted }]}>
              {bill ? `Vencimento ${bill.dueDate.getDate()} ${getMonthShortPtBr(bill.dueDate.getMonth() + 1)}` : `Vencimento ${card.dueDay}`}
            </Text>
            <Text style={[styles.billValue, { color: getBillValueColor() }]}>
              {formatCurrencyBRL(billAmount)}
            </Text>
          </View>
        </Pressable>
      </>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: DS_COLORS.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, DS_TYPOGRAPHY.styles.sectionTitle, { color: DS_COLORS.primary }]}>
              Meus cartões
            </Text>
            {monthTotalUsed > 0 && (
              <Pressable 
                onPress={() => setShowStatusModal(true)}
                style={({ pressed }) => [
                  styles.statusIconButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <MaterialCommunityIcons 
                  name="information" 
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
          <MaterialCommunityIcons name="credit-card-check" size={48} color={DS_COLORS.textMuted} />
          <Text style={[styles.emptyText, { color: DS_COLORS.textMuted }]}>
            Nenhuma fatura em aberto
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
          <View style={[styles.modalCard, { backgroundColor: DS_COLORS.card }]}>
            {/* Ícone e status principal */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: `${usageStatus.color}15` }]}>
                <MaterialCommunityIcons 
                  name={usageStatus.icon} 
                  size={32} 
                  color={usageStatus.color} 
                />
              </View>
              <Text style={[styles.modalTitle, { color: DS_COLORS.textTitle }]}>
                {usageStatus.message}
              </Text>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: DS_COLORS.divider }]} />

            {/* Resumo dos compromissos */}
            <View style={styles.modalDetails}>
              <Text style={[styles.modalSubtitle, { color: DS_COLORS.textMuted }]}>
                Resumo do mês atual
              </Text>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: DS_COLORS.textMuted }]}>Gastos no cartão (mês):</Text>
                <Text style={[styles.modalValue, { color: DS_COLORS.error }]}>
                  {formatCurrencyBRL(monthTotalUsed)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: DS_COLORS.textMuted }]}>Receitas do mês:</Text>
                <Text style={[styles.modalValue, { color: DS_COLORS.success }]}>
                  {formatCurrencyBRL(totalIncome)}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: DS_COLORS.textMuted }]}>Comprometimento:</Text>
                <Text style={[styles.modalValue, { color: usageStatus.color }]}>
                  {usagePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={[styles.modalDivider, { backgroundColor: DS_COLORS.divider }]} />

            {/* Detalhes por cartão - apenas mês atual */}
            <View style={styles.modalCardsList}>
              <Text style={[styles.modalSectionTitle, { color: DS_COLORS.textBody }]}>
                Por cartão (mês atual)
              </Text>
              {cards.filter(c => (currentMonthBills[c.id] || 0) > 0).map((card) => (
                <View key={card.id} style={styles.modalCardItem}>
                  <View style={styles.modalCardInfo}>
                    <View style={[styles.modalCardIcon, { backgroundColor: DS_COLORS.primaryLight }]}>
                      <MaterialCommunityIcons 
                        name={(card.icon as any) || 'credit-card'} 
                        size={16} 
                        color={DS_ICONS.color} 
                      />
                    </View>
                    <Text style={[styles.modalCardName, { color: DS_COLORS.textBody }]} numberOfLines={1}>
                      {card.name}
                    </Text>
                  </View>
                  <Text style={[styles.modalCardValue, { color: DS_COLORS.error }]}>
                    {formatCurrencyBRL(currentMonthBills[card.id] || 0)}
                  </Text>
                </View>
              ))}
              {cards.filter(c => (currentMonthBills[c.id] || 0) > 0).length === 0 && (
                <Text style={[styles.modalEmptyText, { color: DS_COLORS.textMuted }]}>
                  Nenhum gasto no cartão neste mês
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
                <Text style={[styles.modalTipText, { color: DS_COLORS.textBody }]}>
                  {usageStatus.level === 'controlled' 
                    ? 'Continue assim! Manter os gastos no cartão abaixo de 30% das receitas é ideal.'
                    : usageStatus.level === 'warning'
                    ? 'Considere revisar seus gastos. O ideal é manter abaixo de 30% das receitas.'
                    : 'Revise seus gastos no cartão para evitar comprometer seu orçamento.'}
                </Text>
              </View>
            ) : (
              <View style={[styles.modalTip, { backgroundColor: DS_COLORS.primaryLight }]}>
                <MaterialCommunityIcons 
                  name="information-outline" 
                  size={16} 
                  color={DS_ICONS.color} 
                />
                <Text style={[styles.modalTipText, { color: DS_COLORS.textBody }]}>
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
    ...DS_CARD,
    ...DS_CARD.shadow,
  },
  header: {
    marginBottom: DS_SPACING.lg,
  },
  titleSection: {
    gap: DS_SPACING.xs,
  },
  title: {
    ...DS_TYPOGRAPHY.styles.sectionTitle,
  },
  subtitle: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  cardsList: {
    gap: 0,
  },
  cardItem: {
    paddingVertical: DS_SPACING.lg,
  },
  divider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS_SPACING.sm,
    marginBottom: DS_SPACING.sm,
  },
  cardName: {
    flex: 1,
    ...DS_TYPOGRAPHY.styles.valueSecondary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    ...DS_BADGE,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  billValue: {
    ...DS_TYPOGRAPHY.styles.valueSecondary,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: DS_SPACING.md,
  },
  emptyText: {
    ...DS_TYPOGRAPHY.styles.body,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: DS_SPACING.lg,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyButtonText: {
    ...DS_TYPOGRAPHY.styles.body,
    color: DS_COLORS.textInverse,
    fontWeight: '600',
  },
  // Estilos do ícone de status
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS_SPACING.sm,
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
    padding: DS_SPACING.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: DS_CARD.borderRadius,
    padding: DS_SPACING.xxl,
    ...DS_CARD.shadow,
  },
  modalHeader: {
    alignItems: 'center',
    gap: DS_SPACING.md,
    marginBottom: DS_SPACING.lg,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...DS_TYPOGRAPHY.styles.valueSecondary,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    marginVertical: DS_SPACING.lg,
  },
  modalDetails: {
    gap: DS_SPACING.md,
  },
  modalSubtitle: {
    ...DS_TYPOGRAPHY.styles.label,
    textAlign: 'center',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    ...DS_TYPOGRAPHY.styles.body,
  },
  modalValue: {
    ...DS_TYPOGRAPHY.styles.valueSecondary,
  },
  modalCardsList: {
    gap: 10,
  },
  modalSectionTitle: {
    ...DS_TYPOGRAPHY.styles.body,
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
    ...DS_TYPOGRAPHY.styles.body,
    flex: 1,
  },
  modalCardValue: {
    ...DS_TYPOGRAPHY.styles.body,
    fontWeight: '600',
  },
  modalEmptyText: {
    ...DS_TYPOGRAPHY.styles.body,
    fontStyle: 'italic',
  },
  modalTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS_SPACING.sm,
    padding: DS_SPACING.md,
    borderRadius: DS_SPACING.md,
    marginTop: DS_SPACING.lg,
  },
  modalTipText: {
    ...DS_TYPOGRAPHY.styles.label,
    flex: 1,
    lineHeight: 18,
  },
});
