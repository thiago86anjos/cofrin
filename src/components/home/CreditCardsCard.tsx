import { View, StyleSheet, Pressable, Modal, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { formatCurrencyBRL } from '../../utils/format';
import { CreditCard } from '../../types/firebase';
import {
  getCreditCardTransactionsByMonth,
  calculateBillTotal,
  getAllBillsStatusMap,
} from '../../services/creditCardBillService';
import { useAuth } from '../../contexts/authContext';
import { useTransactionRefresh } from '../../contexts/transactionRefreshContext';
import { DS_COLORS, DS_TYPOGRAPHY, DS_ICONS, DS_CARD, DS_SPACING } from '../../theme/designSystem';

// UX: seções colapsáveis (não persistido por enquanto)

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
  onSettingsPress?: () => void;
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

export default memo(function CreditCardsCard({ cards = [], totalBills = 0, totalIncome = 0, onCardPress, onAddPress, onSettingsPress }: Props) {
  const { user } = useAuth();
  const { refreshKey } = useTransactionRefresh();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [openBills, setOpenBills] = useState<Record<string, OpenBillSummary>>({});
  const [currentMonthBills, setCurrentMonthBills] = useState<Record<string, number>>({});
  const [currentMonthPaidBills, setCurrentMonthPaidBills] = useState<Record<string, boolean>>({});
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [hasFutureBillsAvailable, setHasFutureBillsAvailable] = useState<boolean>(false);

  const [showPaidBills, setShowPaidBills] = useState(true);
  const [showFutureBills, setShowFutureBills] = useState(false);
  const didToggleSectionsRef = useRef(false);

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

  // Seções: por default (se usuário não interagiu): pagas abertas, futuras fechadas

  const currentMonthCardsToShow = useMemo(() => {
    return cards.filter(card => (currentMonthBills[card.id] || 0) > 0);
  }, [cards, currentMonthBills]);

  // Só permitir mostrar faturas futuras quando TODAS as faturas do mês atual estiverem pagas
  // (sem pendentes e sem vencidas) para evitar poluir a tela.
  const allCurrentBillsPaid = useMemo(() => {
    for (const card of currentMonthCardsToShow) {
      const billAmount = currentMonthBills[card.id] || 0;
      if (billAmount <= 0) continue;

      const isPaid = !!currentMonthPaidBills[card.id];
      if (!isPaid) return false;
    }

    return true;
  }, [currentMonthCardsToShow, currentMonthBills, currentMonthPaidBills]);

  // ==========================================
  // CARREGAMENTO OTIMIZADO - Uma única função com Promise.all
  // ==========================================
  useEffect(() => {
    const fetchAllBillsData = async () => {
      if (!user?.uid || cards.length === 0) {
        setOpenBills({});
        setCurrentMonthBills({});
        setCurrentMonthPaidBills({});
        setHasFutureBillsAvailable(false);
        setIsLoadingBills(false);
        return;
      }

      setIsLoadingBills(true);

      try {
        // 1) Buscar status de TODAS as faturas em uma única query
        const billsStatusMap = await getAllBillsStatusMap(user.uid);

        // 2) Buscar transações de todos os cartões para mês atual e próximo em paralelo
        const transactionPromises: Promise<{ cardId: string; month: number; year: number; transactions: any[] }>[] = [];
        
        for (const card of cards) {
          // Mês atual
          transactionPromises.push(
            getCreditCardTransactionsByMonth(user.uid, card.id, currentMonth, currentYear)
              .then(transactions => ({ cardId: card.id, month: currentMonth, year: currentYear, transactions }))
          );
          // Próximo mês
          transactionPromises.push(
            getCreditCardTransactionsByMonth(user.uid, card.id, nextMonth, nextYear)
              .then(transactions => ({ cardId: card.id, month: nextMonth, year: nextYear, transactions }))
          );
        }

        const allTransactionResults = await Promise.all(transactionPromises);

        // Organizar resultados por cardId e mês
        const txByCardMonth = new Map<string, { transactions: any[]; total: number }>();
        for (const result of allTransactionResults) {
          const key = `${result.cardId}-${result.month}-${result.year}`;
          txByCardMonth.set(key, {
            transactions: result.transactions,
            total: calculateBillTotal(result.transactions),
          });
        }

        // 3) Processar dados para cada cartão
        const newCurrentMonthBills: Record<string, number> = {};
        const newCurrentMonthPaidBills: Record<string, boolean> = {};
        const newOpenBills: Record<string, OpenBillSummary> = {};
        let foundFutureBills = false;

        for (const card of cards) {
          // Mês atual
          const currentKey = `${card.id}-${currentMonth}-${currentYear}`;
          const currentData = txByCardMonth.get(currentKey);
          const currentTotal = currentData?.total || 0;
          const currentIsPaid = billsStatusMap.get(currentKey)?.isPaid ?? false;

          newCurrentMonthBills[card.id] = currentTotal;
          newCurrentMonthPaidBills[card.id] = currentIsPaid;

          // Próximo mês
          const nextKey = `${card.id}-${nextMonth}-${nextYear}`;
          const nextData = txByCardMonth.get(nextKey);
          const nextTotal = nextData?.total || 0;
          const nextIsPaid = billsStatusMap.get(nextKey)?.isPaid ?? false;

          // Determinar fatura aberta (para openBills)
          // Prioriza mês atual se não pago, senão próximo mês
          if (currentTotal > 0 && !currentIsPaid) {
            newOpenBills[card.id] = {
              amount: currentTotal,
              billMonth: currentMonth,
              billYear: currentYear,
              dueDate: buildDueDate(currentYear, currentMonth, card.dueDay),
            };
          } else if (nextTotal > 0 && !nextIsPaid) {
            newOpenBills[card.id] = {
              amount: nextTotal,
              billMonth: nextMonth,
              billYear: nextYear,
              dueDate: buildDueDate(nextYear, nextMonth, card.dueDay),
            };
            foundFutureBills = true;
          }

          // Detectar faturas futuras pendentes (separado de openBills)
          if (nextTotal > 0 && !nextIsPaid) {
            foundFutureBills = true;
          }
        }

        setCurrentMonthBills(newCurrentMonthBills);
        setCurrentMonthPaidBills(newCurrentMonthPaidBills);
        setOpenBills(newOpenBills);
        setHasFutureBillsAvailable(foundFutureBills);
      } catch (error) {
        console.error('[CreditCardsCard] Erro ao carregar dados de faturas:', error);
      } finally {
        setIsLoadingBills(false);
      }
    };

    fetchAllBillsData();
  }, [cards, user?.uid, currentMonth, currentYear, nextMonth, nextYear, refreshKey]);

  // Total de gastos em cartões no mês atual (base da modal)
  const monthTotalUsed = useMemo(() => {
    return Object.values(currentMonthBills).reduce((sum, amount) => sum + amount, 0);
  }, [currentMonthBills]);

  // Soma das faturas já pagas no mês atual ("Pago até hoje")
  const paidToDateTotal = useMemo(() => {
    if (cards.length === 0) return 0;
    return cards.reduce((sum, card) => {
      if (!currentMonthPaidBills[card.id]) return sum;
      return sum + (currentMonthBills[card.id] || 0);
    }, 0);
  }, [cards, currentMonthBills, currentMonthPaidBills]);

  // Status do uso dos cartões
  const usageStatus = useMemo(() => {
    return getCardUsageStatus(monthTotalUsed, totalIncome);
  }, [monthTotalUsed, totalIncome]);

  const mainValueColor = useMemo(() => {
    if (cards.length === 0) return DS_COLORS.textMuted;
    if (monthTotalUsed <= 0) return DS_COLORS.textMuted;

    if (usageStatus.level === 'warning') return DS_COLORS.warning;
    if (usageStatus.level === 'alert') return DS_COLORS.error;

    // controlled / no-income: usar cor padrão de valor (textTitle)
    return DS_COLORS.textTitle;
  }, [cards.length, monthTotalUsed, usageStatus.level]);

  // Porcentagem de uso
  const usagePercentage = useMemo(() => {
    if (totalIncome === 0) return 0;
    return (monthTotalUsed / totalIncome) * 100;
  }, [monthTotalUsed, totalIncome]);

  const canShowFutureBillsSection = hasFutureBillsAvailable && allCurrentBillsPaid;

  const futurePendingCards = useMemo(() => {
    return cards.filter(card => {
      const bill = openBills[card.id];
      return !!bill && bill.amount > 0 && bill.billMonth === nextMonth && bill.billYear === nextYear;
    });
  }, [cards, openBills, nextMonth, nextYear]);

  const futureTotalBills = useMemo(() => {
    return futurePendingCards.reduce((sum, card) => sum + (openBills[card.id]?.amount || 0), 0);
  }, [futurePendingCards, openBills]);

  const hasFutureBills = canShowFutureBillsSection && futurePendingCards.length > 0;
  const hasAnyBillsToShow = currentMonthCardsToShow.length > 0 || hasFutureBills;

  const isLoadingFutureBills = canShowFutureBillsSection && isLoadingBills;

  const canCollapseSections = allCurrentBillsPaid && hasFutureBills;

  useEffect(() => {
    if (!canCollapseSections) return;
    if (didToggleSectionsRef.current) return;
    setShowPaidBills(true);
    setShowFutureBills(false);
  }, [canCollapseSections]);

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

  const currentMonthViewModels = currentMonthCardsToShow.map((card) => ({
    card,
    bill: buildCurrentMonthBill(card),
  }));

  const currentMonthPaidViewModels = currentMonthViewModels.filter((vm) => !!vm.bill.isPaid);
  const currentMonthOpenViewModels = currentMonthViewModels.filter((vm) => !vm.bill.isPaid);

  // Componente de item do cartão (layout igual à imagem)
  const CardItem = ({ card, bill }: { card: CreditCard; bill: CardBillViewModel }) => {
    const billAmount = bill.amount || 0;

    // Usar cor personalizada ou fallback
    const cardColor = card.color || DS_COLORS.primary;

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

    if (isPaid) {
      return (
        <View
          style={[
            styles.cardItemContainer,
            {
              backgroundColor: DS_COLORS.card,
              borderColor: DS_COLORS.border,
            },
          ]}
        >
          <Pressable
            onPress={() => onCardPress?.(card)}
            style={({ pressed }) => [
              styles.cardItemContentPaid,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.paidRow}>
              <View style={[styles.cardIconCirclePaid, { backgroundColor: cardColor + '15' }]}>
                <MaterialCommunityIcons
                  name={(card.icon as any) || 'credit-card'}
                  size={18}
                  color={cardColor}
                />
              </View>
              <Text style={[styles.cardItemName, { color: DS_COLORS.textTitle }]} numberOfLines={1}>
                {card.name}
              </Text>
              <View style={styles.paidRight}>
                <Text style={[styles.paidAmount, { color: DS_COLORS.textMuted }]}>
                  {formatCurrencyBRL(billAmount)}
                </Text>
                <View style={[styles.paidCheckCircle, { backgroundColor: DS_COLORS.successLight }]}>
                  <MaterialCommunityIcons name="check" size={12} color={DS_COLORS.success} />
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      );
    }
    
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
          {cards.length > 0 && onSettingsPress && (
            <Pressable
              onPress={onSettingsPress}
              hitSlop={12}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Editar cartões de crédito"
            >
              <View style={[styles.headerIconCircle, { backgroundColor: DS_COLORS.grayLight }]}>
                <MaterialCommunityIcons
                  name="cog"
                  size={DS_ICONS.size.small}
                  color={DS_COLORS.textMuted}
                />
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.mainValueSection}>
          <View style={styles.mainValueRow}>
            <Text style={[styles.mainValue, { color: mainValueColor }]}>
              {cards.length === 0 ? '—' : formatCurrencyBRL(monthTotalUsed)}
            </Text>

            {monthTotalUsed > 0 && (
              <Pressable
                onPress={() => setShowStatusModal(true)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.valueInfoButton,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ver detalhes de comprometimento"
              >
                <MaterialCommunityIcons
                  name="information"
                  size={16}
                  color={usageStatus.color}
                />
              </Pressable>
            )}
          </View>
          {monthTotalUsed > 0 && paidToDateTotal > 0 && (
            <Text style={[styles.paidToDateLabel, { color: DS_COLORS.textMuted }]}>
              {`Pago até hoje: ${formatCurrencyBRL(paidToDateTotal)}`}
            </Text>
          )}

          {monthTotalUsed > 0 && (
            <Text style={[styles.billsMonthLabel, { color: DS_COLORS.textMuted }]}>
              {currentMonthBillsLabel}
            </Text>
          )}
        </View>
      </View>

      {/* Lista de cartões */}
      {currentMonthOpenViewModels.length > 0 && (
        <View style={styles.cardsGrid}>
          {currentMonthOpenViewModels.map(({ card, bill }) => (
            <CardItem key={card.id} card={card} bill={bill} />
          ))}
        </View>
      )}

      {currentMonthPaidViewModels.length > 0 && (
        <View style={styles.paidSection}>
          <Pressable
            onPress={() => {
              if (!canCollapseSections) return;
              didToggleSectionsRef.current = true;
              setShowPaidBills((v) => !v);
            }}
            style={({ pressed }) => [
              styles.sectionHeaderRow,
              pressed && canCollapseSections && { opacity: 0.8 },
            ]}
            accessibilityRole={canCollapseSections ? 'button' : undefined}
            accessibilityLabel={canCollapseSections ? (showPaidBills ? 'Minimizar faturas pagas' : 'Expandir faturas pagas') : undefined}
          >
            <View style={styles.sectionHeaderContent}>
              <Text style={[styles.sectionDividerText, { color: DS_COLORS.textMuted }]}>
                ----- faturas pagas ------
              </Text>
              {canCollapseSections && (
                <MaterialCommunityIcons
                  name={showPaidBills ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={DS_COLORS.textMuted}
                />
              )}
            </View>
          </Pressable>

          {showPaidBills && (
            <View style={styles.paidCardsList}>
              {currentMonthPaidViewModels.map(({ card, bill }) => (
                <CardItem key={card.id} card={card} bill={bill} />
              ))}
            </View>
          )}
        </View>
      )}

      {canShowFutureBillsSection && (
        <View style={styles.futureSection}>
          <Pressable
            onPress={() => {
              if (!hasFutureBills) return;
              didToggleSectionsRef.current = true;
              setShowFutureBills((v) => !v);
            }}
            style={({ pressed }) => [
              styles.sectionHeaderRow,
              pressed && hasFutureBills && { opacity: 0.8 },
            ]}
            accessibilityRole={hasFutureBills ? 'button' : undefined}
            accessibilityLabel={hasFutureBills ? (showFutureBills ? 'Minimizar faturas futuras' : 'Expandir faturas futuras') : undefined}
          >
            <View style={styles.sectionHeaderContent}>
              <Text style={[styles.sectionDividerText, { color: DS_COLORS.textMuted }]}>
                ----- faturas futuras ------
              </Text>
              {hasFutureBills && (
                <MaterialCommunityIcons
                  name={showFutureBills ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={DS_COLORS.textMuted}
                />
              )}
            </View>
          </Pressable>

          {isLoadingFutureBills && showFutureBills && (
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
          )}

          {!isLoadingFutureBills && hasFutureBills && showFutureBills && (
            <View style={styles.cardsGrid}>
              {futurePendingCards.map((card) => (
                <CardItem key={card.id} card={card} bill={{ ...openBills[card.id], isPaid: false }} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Mensagem vazia */}
      {!hasAnyBillsToShow && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name={cards.length === 0 ? 'credit-card-plus-outline' : 'credit-card-check'}
            size={64}
            color={DS_COLORS.textMuted}
          />
          <Text style={[styles.emptyStateText, { color: DS_COLORS.textMuted }]}>
            {cards.length === 0 ? 'Nenhum cartão cadastrado' : 'Nenhuma fatura em aberto'}
          </Text>

          {cards.length === 0 && onAddPress && (
            <Pressable
              onPress={onAddPress}
              style={({ pressed }) => [
                styles.emptyCta,
                { borderColor: DS_COLORS.border, backgroundColor: DS_COLORS.primaryLight },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Criar novo cartão de crédito"
            >
              <MaterialCommunityIcons name="plus" size={18} color={DS_COLORS.primary} />
              <Text style={[styles.emptyCtaText, { color: DS_COLORS.primary }]}>Criar novo cartão</Text>
            </Pressable>
          )}
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
                    : 'Revise seus gastos no cartão.'}
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
  mainValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mainValue: {
    fontSize: DS_TYPOGRAPHY.size.valueMain,
    fontWeight: DS_TYPOGRAPHY.weight.bold,
    lineHeight: 32,
  },
  billsMonthLabel: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  paidToDateLabel: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  headerIconButton: {
    marginLeft: DS_SPACING.sm,
  },
  headerIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInfoButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsGrid: {
    gap: 12,
  },
  paidSection: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionDividerText: {
    ...DS_TYPOGRAPHY.styles.label,
  },
  paidCardsList: {
    gap: 12,
  },
  cardIconCirclePaid: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  futureSection: {
    marginTop: 16,
  },
  dottedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: DS_COLORS.divider,
    marginBottom: 10,
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
  cardItemContentPaid: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paidRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidAmount: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  paidCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
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
