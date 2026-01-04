import { View, StyleSheet, Pressable, Modal, Animated } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo, memo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCurrencyBRL } from '../../utils/format';
import { CreditCard } from '../../types/firebase';
import { getCreditCardTransactionsByMonth, calculateBillTotal, isBillPaid } from '../../services/creditCardBillService';
import { useAuth } from '../../contexts/authContext';
import { useTransactionRefresh } from '../../contexts/transactionRefreshContext';
import { DS_COLORS, DS_TYPOGRAPHY, DS_ICONS, DS_CARD, DS_SPACING } from '../../theme/designSystem';

const SHOW_FUTURE_BILLS_STORAGE_KEY = '@cofrin:home_show_future_bills';

function ShimmerBlock({
  width,
  height,
  borderRadius = 12,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: DS_COLORS.grayLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

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

type CardBillViewModel = OpenBillSummary & {
  isPaid?: boolean;
};

function getMonthShortPtBr(month: number) {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return months[month - 1] || '';
}

function getMonthNamePtBrLower(month: number) {
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
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
  const [currentMonthPaidBills, setCurrentMonthPaidBills] = useState<Record<string, boolean>>({});
  const [showFutureBills, setShowFutureBills] = useState(false);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [hasFutureBillsAvailable, setHasFutureBillsAvailable] = useState<boolean>(false);

  // Mês atual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const creditCardsLabel = useMemo(() => {
    return cards.length > 1 ? 'Cartões de crédito' : 'Seu cartão de crédito';
  }, [cards.length]);

  const currentMonthBillsLabel = useMemo(() => {
    return `Faturas de ${getMonthNamePtBrLower(currentMonth)}`;
  }, [currentMonth]);

  // Carregar preferência (cache) do usuário para ver faturas futuras
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(SHOW_FUTURE_BILLS_STORAGE_KEY);
        if (saved === 'true') setShowFutureBills(true);
        if (saved === 'false') setShowFutureBills(false);
      } catch {
        // Sem persistência disponível (não bloqueia UI)
      }
    };

    loadPreference();
  }, []);

  // Persistir preferência ao alternar
  useEffect(() => {
    AsyncStorage.setItem(SHOW_FUTURE_BILLS_STORAGE_KEY, showFutureBills ? 'true' : 'false').catch(() => {
      // Ignorar falhas de persistência
    });
  }, [showFutureBills]);

  // Buscar faturas do mês atual para cada cartão
  useEffect(() => {
    const fetchOpenBills = async () => {
      if (!user?.uid || cards.length === 0) {
        setOpenBills({});
        return;
      }

      setIsLoadingBills(true);
      
      const billsMap: Record<string, OpenBillSummary> = {};

      try {
        for (const card of cards) {
          try {
            // Regra antiga: tenta mês atual; se não houver fatura pendente, tenta mês seguinte.
            const candidates: Array<{ month: number; year: number }> = showFutureBills
              ? [
                  { month: currentMonth, year: currentYear },
                  { month: nextMonth, year: nextYear },
                ]
              : [{ month: currentMonth, year: currentYear }];

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
      } finally {
        setIsLoadingBills(false);
      }
    };
    
    fetchOpenBills();
  }, [cards, user?.uid, currentMonth, currentYear, nextMonth, nextYear, refreshKey, showFutureBills]);

  // Detectar se existem faturas futuras (para só então mostrar o toggle)
  useEffect(() => {
    const checkFutureBills = async () => {
      if (!user?.uid || cards.length === 0) {
        setHasFutureBillsAvailable(false);
        // Se não há cartões/usuário, resetar showFutureBills
        if (showFutureBills) setShowFutureBills(false);
        return;
      }

      try {
        let foundFutureBills = false;
        
        for (const card of cards) {
          const transactions = await getCreditCardTransactionsByMonth(user.uid, card.id, nextMonth, nextYear);
          const totalAmount = calculateBillTotal(transactions);
          
          if (totalAmount <= 0) continue;

          const paid = await isBillPaid(user.uid, card.id, nextMonth, nextYear);
          
          if (paid) continue;

          foundFutureBills = true;
          break;
        }

        setHasFutureBillsAvailable(foundFutureBills);
        
        // Se o usuário estava vendo futuras mas não há mais, resetar
        if (!foundFutureBills && showFutureBills) {
          setShowFutureBills(false);
        }
      } catch (error) {
        console.error('[CreditCardsCard] Error checking future bills:', error);
        setHasFutureBillsAvailable(false);
        if (showFutureBills) setShowFutureBills(false);
      }
    };

    checkFutureBills();
  }, [cards, user?.uid, nextMonth, nextYear, refreshKey]);

  // Buscar totais de gastos do mês atual (independente de fatura paga/pendente/vencida)
  useEffect(() => {
    const fetchCurrentMonthBills = async () => {
      if (!user?.uid || cards.length === 0) {
        setCurrentMonthBills({});
        setCurrentMonthPaidBills({});
        return;
      }

      const billsMap: Record<string, number> = {};
      const paidMap: Record<string, boolean> = {};
      for (const card of cards) {
        try {
          const transactions = await getCreditCardTransactionsByMonth(user.uid, card.id, currentMonth, currentYear);
          billsMap[card.id] = calculateBillTotal(transactions);
          paidMap[card.id] = await isBillPaid(user.uid, card.id, currentMonth, currentYear);
        } catch (error) {
          console.error(`Erro ao buscar gastos do mês do cartão ${card.id}:`, error);
          billsMap[card.id] = 0;
          paidMap[card.id] = false;
        }
      }

      setCurrentMonthBills(billsMap);
      setCurrentMonthPaidBills(paidMap);
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

  const mainValueColor = useMemo(() => {
    if (monthTotalUsed <= 0) return DS_COLORS.textMuted;

    if (usageStatus.level === 'warning') return DS_COLORS.warning;
    if (usageStatus.level === 'alert') return DS_COLORS.error;

    // controlled / no-income: usar cor padrão de valor (textTitle)
    return DS_COLORS.textTitle;
  }, [monthTotalUsed, usageStatus.level]);

  // Porcentagem de uso
  const usagePercentage = useMemo(() => {
    if (totalIncome === 0) return 0;
    return (monthTotalUsed / totalIncome) * 100;
  }, [monthTotalUsed, totalIncome]);

  const currentMonthCardsToShow = useMemo(() => {
    return cards.filter(card => (currentMonthBills[card.id] || 0) > 0);
  }, [cards, currentMonthBills]);

  // Verificar se todas as faturas do mês atual estão resolvidas (pagas ou atrasadas)
  // Só mostrar botão de faturas futuras se o usuário não tiver pendências abertas do mês atual
  const allCurrentBillsResolved = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (const card of currentMonthCardsToShow) {
      const billAmount = currentMonthBills[card.id] || 0;
      if (billAmount <= 0) continue;
      
      const isPaid = !!currentMonthPaidBills[card.id];
      if (isPaid) continue;
      
      // Verificar se está atrasada (vencimento < hoje)
      const dueDate = buildDueDate(currentYear, currentMonth, card.dueDay);
      const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const isOverdue = dueDateStart.getTime() < todayStart.getTime();
      
      // Se não está paga E não está atrasada, ainda é pendente do mês atual
      if (!isOverdue) {
        return false;
      }
    }
    
    return true;
  }, [currentMonthCardsToShow, currentMonthBills, currentMonthPaidBills, currentMonth, currentYear]);

  // Só mostrar toggle de faturas futuras se houver faturas futuras E as do mês atual estiverem resolvidas
  const canShowFutureBillsToggle = hasFutureBillsAvailable && allCurrentBillsResolved;

  const futurePendingCards = useMemo(() => {
    return cards.filter(card => {
      const bill = openBills[card.id];
      return !!bill && bill.amount > 0 && bill.billMonth === nextMonth && bill.billYear === nextYear;
    });
  }, [cards, openBills, nextMonth, nextYear]);

  const futureTotalBills = useMemo(() => {
    return futurePendingCards.reduce((sum, card) => sum + (openBills[card.id]?.amount || 0), 0);
  }, [futurePendingCards, openBills]);

  const hasFutureBills = showFutureBills && futurePendingCards.length > 0;
  const hasAnyBillsToShow = currentMonthCardsToShow.length > 0 || hasFutureBills;

  const isLoadingFutureBills = showFutureBills && isLoadingBills;

  const buildCurrentMonthBill = (card: CreditCard): CardBillViewModel => {
    const pendingBill = openBills[card.id];
    const isPendingCurrent =
      !!pendingBill && pendingBill.billMonth === currentMonth && pendingBill.billYear === currentYear;

    const amount = isPendingCurrent ? pendingBill.amount : (currentMonthBills[card.id] || 0);
    return {
      amount,
      billMonth: currentMonth,
      billYear: currentYear,
      dueDate: isPendingCurrent ? pendingBill.dueDate : buildDueDate(currentYear, currentMonth, card.dueDay),
      isPaid: isPendingCurrent ? false : !!currentMonthPaidBills[card.id],
    };
  };

  // Componente de item do cartão (layout igual à imagem)
  const CardItem = ({ card, bill }: { card: CreditCard; bill: CardBillViewModel }) => {
    const billAmount = bill.amount || 0;

    // Usar cor personalizada ou fallback
    const cardColor = card.color || '#6366F1';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateStart = new Date(bill.dueDate.getFullYear(), bill.dueDate.getMonth(), bill.dueDate.getDate());

    const isPaid = !!bill.isPaid;
    const isOverdue = !isPaid && dueDateStart.getTime() < todayStart.getTime();
    const isDueToday = !isPaid && isSameDay(dueDateStart, todayStart);
    const isPending = !isPaid && dueDateStart.getTime() > todayStart.getTime();
    
    const getStatusText = () => {
      if (isPaid) return 'Paga';
      if (isOverdue) return 'Vencida';
      if (isDueToday) return 'Vence hoje';
      if (isPending) return 'Pendente';
      return 'Pendente';
    };
    const badgeBgColor = isPaid
      ? DS_COLORS.successLight
      : isOverdue
        ? DS_COLORS.errorLight
        : isDueToday
          ? DS_COLORS.warningLight
          : DS_COLORS.textMuted + '15';

    const badgeTextColor = isPaid
      ? DS_COLORS.success
      : isOverdue
        ? DS_COLORS.error
        : isDueToday
          ? DS_COLORS.warning
          : DS_COLORS.textMuted;
    
    const statusText = getStatusText();
    
    return (
      <View
        style={[
          styles.cardItemContainer,
          { 
            backgroundColor: DS_COLORS.card,
            borderColor: DS_COLORS.border,
          }
        ]}
      >
        <Pressable
          onPress={() => onCardPress?.(card)}
          style={({ pressed }) => [
            styles.cardItemContent,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          {/* Header: ícone + nome + badge */}
          <View style={styles.cardItemHeader}>
            <View style={[styles.cardIconCircle, { backgroundColor: cardColor + '15' }]}>
              <MaterialCommunityIcons
                name={(card.icon as any) || 'credit-card'}
                size={22}
                color={cardColor}
              />
            </View>
            <Text style={[styles.cardItemName, { color: DS_COLORS.textTitle }]} numberOfLines={1}>
              {card.name}
            </Text>
            <View style={[styles.statusBadgeNew, { backgroundColor: badgeBgColor }]}>
              <Text style={[styles.statusBadgeTextNew, { color: badgeTextColor }]}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Linha inferior: valor + vencimento */}
          <View style={styles.cardItemBottomRow}>
            <Text style={[styles.cardItemAmount, { color: DS_COLORS.textTitle }]}>
              {formatCurrencyBRL(billAmount)}
            </Text>
            <Text style={[styles.cardItemDueDate, { color: DS_COLORS.textMuted }]}>
              {`Venc: ${bill.dueDate.getDate()} ${getMonthShortPtBr(bill.dueDate.getMonth() + 1)}`}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.mainCard, { backgroundColor: DS_COLORS.card }]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardLabel, { color: DS_COLORS.textMuted }]} numberOfLines={1}>
            {creditCardsLabel}
          </Text>
          {monthTotalUsed > 0 && (
            <Pressable 
              onPress={() => setShowStatusModal(true)}
              hitSlop={12}
              style={({ pressed }) => [
                styles.statusIconButton,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: `${usageStatus.color}15` }]}>
                <MaterialCommunityIcons 
                  name="information" 
                  size={DS_ICONS.size.small} 
                  color={usageStatus.color} 
                />
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.mainValueSection}>
          <Text style={[styles.mainValue, { color: mainValueColor }]}>
            {formatCurrencyBRL(monthTotalUsed)}
          </Text>
          {monthTotalUsed > 0 && (
            <Text style={[styles.billsMonthLabel, { color: DS_COLORS.textMuted }]}>
              {currentMonthBillsLabel}
            </Text>
          )}

          {canShowFutureBillsToggle && (
            <Pressable
              onPress={() => {
                if (isLoadingBills) return;
                setShowFutureBills((prev) => !prev);
              }}
              style={({ pressed }) => [
                styles.futureToggleRow,
                pressed && !isLoadingBills && styles.futureTogglePressed,
                isLoadingBills && styles.futureToggleDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={showFutureBills ? 'Ocultar faturas futuras' : 'Ver faturas futuras'}
            >
              <Text style={[styles.futureToggleText, { color: DS_COLORS.textMuted }]}>
                {showFutureBills ? 'Ocultar faturas futuras' : 'Ver faturas futuras'}
              </Text>
              {isLoadingFutureBills ? (
                <ActivityIndicator size={14} color={DS_COLORS.textMuted} />
              ) : (
                <MaterialCommunityIcons
                  name={showFutureBills ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={DS_COLORS.textMuted}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Lista de cartões */}
      {currentMonthCardsToShow.length > 0 && (
        <View style={styles.cardsGrid}>
          {currentMonthCardsToShow.map((card) => (
            <CardItem key={card.id} card={card} bill={buildCurrentMonthBill(card)} />
          ))}
        </View>
      )}

      {isLoadingFutureBills && (
        <View style={styles.futureSection}>
          <View style={styles.dottedDivider} />
          <View style={styles.futureHeaderRow}>
            <Text style={[styles.futureTitle, { color: DS_COLORS.textMuted }]}>Faturas futuras</Text>
            <ShimmerBlock width={90} height={16} borderRadius={8} />
          </View>

          <View style={styles.cardsGrid}>
            {[1, 2].map((i) => (
              <View key={i} style={[styles.skeletonCard, { borderColor: DS_COLORS.border }]}>
                <View style={styles.skeletonRow}>
                  <ShimmerBlock width={40} height={40} borderRadius={12} />
                  <View style={styles.skeletonCol}>
                    <ShimmerBlock width={140} height={14} borderRadius={8} />
                    <ShimmerBlock width={110} height={12} borderRadius={8} />
                  </View>
                  <ShimmerBlock width={70} height={20} borderRadius={10} />
                </View>
                <View style={styles.skeletonBottom}>
                  <ShimmerBlock width={90} height={12} borderRadius={8} />
                  <ShimmerBlock width={120} height={18} borderRadius={8} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {!isLoadingFutureBills && hasFutureBills && (
        <View style={styles.futureSection}>
          <View style={styles.dottedDivider} />
          <View style={styles.futureHeaderRow}>
            <Text style={[styles.futureTitle, { color: DS_COLORS.textMuted }]}>Faturas futuras</Text>
            <Text style={[styles.futureValue, { color: DS_COLORS.textMuted }]}>
              {formatCurrencyBRL(futureTotalBills)}
            </Text>
          </View>
          <View style={styles.cardsGrid}>
            {futurePendingCards.map((card) => (
              <CardItem key={card.id} card={card} bill={{ ...openBills[card.id], isPaid: false }} />
            ))}
          </View>
        </View>
      )}

      {/* Mensagem vazia */}
      {!hasAnyBillsToShow && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="credit-card-check" size={64} color={DS_COLORS.textMuted} />
          <Text style={[styles.emptyStateText, { color: DS_COLORS.textMuted }]}>
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
  mainCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerSection: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    ...DS_TYPOGRAPHY.styles.body,
    flex: 1,
    flexShrink: 1,
  },
  mainValueSection: {
    marginTop: 8,
    gap: 4,
  },
  mainValue: {
    fontSize: DS_TYPOGRAPHY.size.valueMain,
    fontWeight: DS_TYPOGRAPHY.weight.bold,
    lineHeight: 32,
  },
  billsMonthLabel: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  statusIconButton: {
    marginLeft: DS_SPACING.sm,
  },
  infoIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsGrid: {
    gap: 12,
  },
  futureToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingTop: 2,
  },
  futureTogglePressed: {
    opacity: 0.85,
  },
  futureToggleDisabled: {
    opacity: 0.6,
  },
  futureToggleText: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  futureSection: {
    marginTop: 12,
  },
  dottedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: DS_COLORS.divider,
    marginBottom: 10,
  },
  futureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  futureTitle: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  futureValue: {
    fontSize: DS_TYPOGRAPHY.size.valueSecondary,
    fontWeight: DS_TYPOGRAPHY.weight.semibold,
    lineHeight: 20,
  },
  cardItemContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardItemContent: {
    padding: 14,
    gap: 10,
  },
  cardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  statusBadgeNew: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeTextNew: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardItemDueDate: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  cardItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  cardProgressSection: {
    marginTop: 4,
  },
  cardProgressBg: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  skeletonCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
    backgroundColor: DS_COLORS.card,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCol: {
    flex: 1,
    gap: 8,
  },
  skeletonBottom: {
    gap: 8,
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
