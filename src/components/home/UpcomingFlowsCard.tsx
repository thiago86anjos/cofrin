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
}

export default memo(function UpcomingFlowsCard({
  incomeTransactions,
  expenseTransactions,
  loading = false,
}: Props) {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }, []);

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

  // Calcular totais (apenas próximos 3 dias)
  const totalIncome = useMemo(() => {
    return incomeTransactions
      .filter(isPendingInNext3Days)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [incomeTransactions]);

  const totalExpense = useMemo(() => {
    return expenseTransactions
      .filter(isPendingInNext3Days)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [expenseTransactions]);

  // Determinar quais slides mostrar
  const slides: Array<{ type: 'income' | 'expense'; total: number }> = [];
  if (totalIncome > 0) {
    slides.push({ type: 'income', total: totalIncome });
  }
  if (totalExpense > 0) {
    slides.push({ type: 'expense', total: totalExpense });
  }

  // Se não há nenhum fluxo pendente, não renderizar o card
  if (slides.length === 0 || loading) {
    return null;
  }

  const currentData = slides[currentSlide];
  const hasMultipleSlides = slides.length > 1;

  const handlePrevious = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePress = () => {
    navigation.navigate('Lançamentos', { 
      filterStatus: 'pending',
      filterType: currentData.type,
    });
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

  return (
    <Pressable 
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: DS_COLORS.card, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.content}>
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
      </View>
    </Pressable>
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
    flex: 1,
    ...DS_TYPOGRAPHY.styles.body,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '600',
  },
  amount: {
    fontWeight: '700',
  },
});
