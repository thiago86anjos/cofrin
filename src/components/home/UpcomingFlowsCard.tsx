import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../contexts/themeContext';
import { formatCurrencyBRL } from '../../utils/format';
import type { Transaction } from '../../types/firebase';
import { DS_COLORS, DS_TYPOGRAPHY, DS_CARD, DS_SPACING } from '../../theme/designSystem';

interface Props {
  incomeTransactions: Transaction[];
  expenseTransactions: Transaction[];
  loading?: boolean;
  /** IDs das contas visíveis (includeInTotal !== false). Se fornecido, filtra transações de contas ocultas */
  visibleAccountIds?: Set<string>;
}

interface AccountGroup {
  accountId: string;
  accountName: string;
  total: number;
  count: number;
}

export default memo(function UpcomingFlowsCard({
  incomeTransactions,
  expenseTransactions,
  loading = false,
  visibleAccountIds,
}: Props) {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Verificar se transação está pendente e vence nos próximos 3 dias
  const isPendingInNext3Days = (tx: Transaction) => {
    if (tx.status !== 'pending') return false;
    
    const txDate = tx.date?.toDate?.();
    if (!txDate) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    
    const txDateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
    
    // Transação deve estar entre hoje e daqui 3 dias (inclusive)
    return txDateOnly >= today && txDateOnly <= in3Days;
  };

  // Agrupar transações por conta (ignorando contas ocultas)
  const groupByAccount = (transactions: Transaction[]): AccountGroup[] => {
    const pending = transactions.filter(tx => {
      if (!isPendingInNext3Days(tx)) return false;
      // Se temos lista de contas visíveis (com ao menos 1 conta), ignorar transações de contas ocultas
      if (visibleAccountIds && visibleAccountIds.size > 0 && tx.accountId && !visibleAccountIds.has(tx.accountId)) {
        return false;
      }
      return true;
    });
    const grouped = new Map<string, AccountGroup>();

    pending.forEach(tx => {
      const accountId = tx.accountId || 'sem-conta';
      const accountName = tx.accountName || 'Sem conta';
      
      if (grouped.has(accountId)) {
        const existing = grouped.get(accountId)!;
        existing.total += Math.abs(tx.amount);
        existing.count += 1;
      } else {
        grouped.set(accountId, {
          accountId,
          accountName,
          total: Math.abs(tx.amount),
          count: 1,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  };

  const incomeByAccount = useMemo(() => groupByAccount(incomeTransactions), [incomeTransactions, visibleAccountIds]);
  const expenseByAccount = useMemo(() => groupByAccount(expenseTransactions), [expenseTransactions, visibleAccountIds]);

  const totalIncome = useMemo(() => incomeByAccount.reduce((sum, g) => sum + g.total, 0), [incomeByAccount]);
  const totalExpense = useMemo(() => expenseByAccount.reduce((sum, g) => sum + g.total, 0), [expenseByAccount]);

  // Determinar quais slides mostrar
  const slides: Array<{ type: 'income' | 'expense'; total: number; accounts: AccountGroup[] }> = [];
  if (totalIncome > 0) {
    slides.push({ type: 'income', total: totalIncome, accounts: incomeByAccount });
  }
  if (totalExpense > 0) {
    slides.push({ type: 'expense', total: totalExpense, accounts: expenseByAccount });
  }

  // Se não há nenhum fluxo pendente, não renderizar o card
  if (slides.length === 0 || loading) {
    return null;
  }

  const currentData = slides[currentSlide];
  const hasMultipleSlides = slides.length > 1;
  const hasMultipleAccounts = currentData.accounts.length > 1;

  const handlePrevious = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
    setExpanded(false);
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    setExpanded(false);
  };

  const navigateToAccount = (accountId: string, accountName: string) => {
    if (accountId === 'sem-conta') return;
    navigation.navigate('Lançamentos', {
      accountId,
      accountName,
    });
  };

  const handleCardPress = () => {
    if (hasMultipleAccounts) {
      setExpanded(!expanded);
    } else if (currentData.accounts.length === 1) {
      const acc = currentData.accounts[0];
      navigateToAccount(acc.accountId, acc.accountName);
    }
  };

  const getMessage = () => {
    if (currentData.type === 'income') {
      return (
        <Text style={[styles.message, { color: DS_COLORS.textBody }]}>
          Opa, vi que você tem{' '}
          <Text style={[styles.highlight, { color: DS_COLORS.success }]}>
            contas a receber
          </Text>
          {' '}no total de{' '}
          <Text style={[styles.amount, { color: DS_COLORS.success }]}>
            {formatCurrencyBRL(currentData.total)}
          </Text>
        </Text>
      );
    }
    return (
      <Text style={[styles.message, { color: DS_COLORS.textBody }]}>
        Você também tem{' '}
        <Text style={[styles.highlight, { color: DS_COLORS.error }]}>
          contas a pagar
        </Text>
        {' '}no valor total de{' '}
        <Text style={[styles.amount, { color: DS_COLORS.error }]}>
          {formatCurrencyBRL(currentData.total)}
        </Text>
      </Text>
    );
  };

  // Mostrar seta esquerda apenas no slide 2+ e seta direita apenas antes do ultimo
  const showLeftArrow = hasMultipleSlides && currentSlide > 0;
  const showRightArrow = hasMultipleSlides && currentSlide < slides.length - 1;

  const accentColor = currentData.type === 'income' ? DS_COLORS.success : DS_COLORS.error;

  return (
    <View style={[styles.card, { backgroundColor: DS_COLORS.card }]}>
      <Pressable
        onPress={handleCardPress}
        style={({ pressed }) => [
          styles.content,
          pressed && { opacity: 0.9 },
        ]}
      >
        {/* Seta esquerda - apenas no segundo slide */}
        {showLeftArrow && (
          <Pressable 
            onPress={(e) => { e.stopPropagation(); handlePrevious(); }}
            style={styles.arrowButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={DS_COLORS.textMuted} />
          </Pressable>
        )}

        {/* Conteúdo central */}
        <View style={styles.centerContent}>
          {getMessage()}
          {hasMultipleAccounts && (
            <View style={styles.expandHint}>
              <Text style={[styles.expandHintText, { color: accentColor }]}>
                {expanded ? 'Ocultar detalhes' : `Ver ${currentData.accounts.length} contas`}
              </Text>
              <MaterialCommunityIcons 
                name={expanded ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={accentColor} 
              />
            </View>
          )}
        </View>

        {/* Seta direita - apenas no primeiro slide */}
        {showRightArrow && (
          <Pressable 
            onPress={(e) => { e.stopPropagation(); handleNext(); }}
            style={styles.arrowButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-right" size={20} color={DS_COLORS.textMuted} />
          </Pressable>
        )}
      </Pressable>

      {/* Mini-lista de contas (apenas se múltiplas e expandido) */}
      {hasMultipleAccounts && expanded && (
        <View style={styles.accountsList}>
          {currentData.accounts.map((acc) => (
            <Pressable
              key={acc.accountId}
              onPress={() => navigateToAccount(acc.accountId, acc.accountName)}
              style={({ pressed }) => [
                styles.accountRow,
                pressed && { backgroundColor: DS_COLORS.primaryLight },
              ]}
            >
              <View style={styles.accountInfo}>
                <MaterialCommunityIcons 
                  name="bank" 
                  size={16} 
                  color={accentColor} 
                  style={styles.accountIcon}
                />
                <Text style={[styles.accountName, { color: DS_COLORS.textBody }]}>
                  {acc.accountName}
                </Text>
                <Text style={[styles.accountCount, { color: DS_COLORS.textMuted }]}>
                  ({acc.count} {acc.count === 1 ? 'lançamento' : 'lançamentos'})
                </Text>
              </View>
              <View style={styles.accountRight}>
                <Text style={[styles.accountAmount, { color: accentColor }]}>
                  {formatCurrencyBRL(acc.total)}
                </Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={18} 
                  color={DS_COLORS.textMuted} 
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    ...DS_CARD,
    ...DS_CARD.shadow,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowButton: {
    paddingHorizontal: DS_SPACING.xs,
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: DS_SPACING.sm,
  },
  message: {
    ...DS_TYPOGRAPHY.styles.body,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '600',
  },
  amount: {
    fontWeight: '700',
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DS_SPACING.xs,
  },
  expandHintText: {
    ...DS_TYPOGRAPHY.styles.label,
    fontWeight: '600',
    marginRight: 2,
  },
  accountsList: {
    marginTop: DS_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: DS_COLORS.border,
    paddingTop: DS_SPACING.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS_SPACING.xs,
    paddingHorizontal: DS_SPACING.xs,
    borderRadius: 8,
    marginBottom: 4,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    marginRight: DS_SPACING.xs,
  },
  accountName: {
    ...DS_TYPOGRAPHY.styles.body,
    fontWeight: '500',
  },
  accountCount: {
    ...DS_TYPOGRAPHY.styles.label,
    marginLeft: DS_SPACING.xs,
  },
  accountRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountAmount: {
    ...DS_TYPOGRAPHY.styles.body,
    fontWeight: '600',
    marginRight: 4,
  },
});
