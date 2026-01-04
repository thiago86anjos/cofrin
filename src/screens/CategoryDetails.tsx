import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { useAuth } from '../contexts/authContext';
import { useAppTheme } from '../contexts/themeContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { spacing, borderRadius, getShadow } from '../theme';
import { formatCurrencyBRL } from '../utils/format';
import * as transactionService from '../services/transactionService';
import MainLayout from '../components/MainLayout';
import SimpleHeader from '../components/SimpleHeader';
import { useNavigation } from '@react-navigation/native';
import { DS_COLORS } from '../theme/designSystem';
import { useCategories } from '../hooks/useCategories';
import type { Category } from '../types/firebase';

type TransactionTypeFilter = 'expense' | 'income';

interface CategoryData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor?: string;
  total: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CategoryDetails() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const { refreshKey } = useTransactionRefresh();
  const { expenseCategories, incomeCategories } = useCategories();
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('expense');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Período selecionado
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Dados
  const [expenseData, setExpenseData] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any>(null);
  
  // Estado para carregamento progressivo
  const [historicalLoaded, setHistoricalLoaded] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Carregar dados do mês/ano selecionado (otimizado - 1 query ao invés de 4)
  const loadCurrentPeriodData = useCallback(async () => {
    if (!user) return;

    try {
      // Buscar despesas E receitas de uma vez (1 query de transações + 1 de pending bills)
      const { expenses: expenseCategories, incomes: incomeCategories } = 
        await transactionService.getCategoriesDataForMonth(user.uid, selectedMonth, selectedYear);

      // Estrutura compatível com o formato anterior
      const expenseMonthData = {
        month: selectedMonth,
        year: selectedYear,
        categories: expenseCategories,
      };
      
      const incomeMonthData = {
        month: selectedMonth,
        year: selectedYear,
        categories: incomeCategories,
      };

      // Merge com dados existentes ou criar novo
      setExpenseData((prev: any) => {
        if (!prev) {
          return { monthlyData: [expenseMonthData], yearlyData: [] };
        }
        // Atualizar/adicionar mês atual
        const existing = prev.monthlyData.filter(
          (m: any) => !(m.month === selectedMonth && m.year === selectedYear)
        );
        return { ...prev, monthlyData: [...existing, expenseMonthData] };
      });

      setIncomeData((prev: any) => {
        if (!prev) {
          return { monthlyData: [incomeMonthData], yearlyData: [] };
        }
        const existing = prev.monthlyData.filter(
          (m: any) => !(m.month === selectedMonth && m.year === selectedYear)
        );
        return { ...prev, monthlyData: [...existing, incomeMonthData] };
      });
    } catch (error) {
      console.error('Erro ao carregar dados do período:', error);
    }
  }, [user, selectedMonth, selectedYear]);

  // Carregar dados históricos para insights (background)
  const loadHistoricalData = useCallback(async () => {
    if (!user || historicalLoaded || loadingHistorical) return;

    setLoadingHistorical(true);
    try {
      const currentYear = new Date().getFullYear();
      
      const [expenses, incomes] = await Promise.all([
        transactionService.getCategoryDataOverTime(user.uid, currentYear - 3, currentYear, 'expense'),
        transactionService.getCategoryDataOverTime(user.uid, currentYear - 3, currentYear, 'income'),
      ]);

      setExpenseData(expenses);
      setIncomeData(incomes);
      setHistoricalLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar dados históricos:', error);
    } finally {
      setLoadingHistorical(false);
    }
  }, [user, historicalLoaded, loadingHistorical]);

  // Carregamento inicial - período atual primeiro (rápido)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadCurrentPeriodData();
      setLoading(false);
      // Carregar histórico em background após mostrar dados atuais
      loadHistoricalData();
    };
    init();
  }, [user]);

  // Recarregar quando mudar mês/ano
  useEffect(() => {
    if (!loading) {
      loadCurrentPeriodData();
    }
  }, [selectedMonth, selectedYear]);

  const loadData = async (isRefreshing = false) => {
    if (!user) return;

    if (!isRefreshing) {
      setLoading(true);
    }
    
    try {
      // Reset histórico para forçar recarga
      setHistoricalLoaded(false);
      await loadCurrentPeriodData();
      // Carregar histórico em background
      const currentYear = new Date().getFullYear();
      const [expenses, incomes] = await Promise.all([
        transactionService.getCategoryDataOverTime(user.uid, currentYear - 3, currentYear, 'expense'),
        transactionService.getCategoryDataOverTime(user.uid, currentYear - 3, currentYear, 'income'),
      ]);
      setExpenseData(expenses);
      setIncomeData(incomes);
      setHistoricalLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar dados de categorias:', error);
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Refresh quando refreshKey mudar (após salvar transação)
  useEffect(() => {
    if (refreshKey > 0) {
      // Apenas recarregar período atual - não precisa de todo o histórico
      loadCurrentPeriodData();
    }
  }, [refreshKey, loadCurrentPeriodData]);

  // Refresh quando a tela ganhar foco - apenas período atual
  useFocusEffect(
    useCallback(() => {
      loadCurrentPeriodData();
    }, [loadCurrentPeriodData])
  );

  // Pull to refresh - recarrega tudo incluindo histórico
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [user]);

  // Navegação de mês
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1) {
      return;
    }

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());
  };

  const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  // Selecionar dados baseado no tipo de transação
  const allData = transactionType === 'expense' ? expenseData : incomeData;

  // Dados do período atual
  const currentPeriodData = useMemo(() => {
    if (!allData) return null;

    const monthData = allData.monthlyData.find(
      (m: any) => m.month === selectedMonth && m.year === selectedYear
    );
    if (!monthData) return null;

    const categoriesArray = Array.from(monthData.categories.values()).sort(
      (a: any, b: any) => b.total - a.total
    );
    const total = categoriesArray.reduce((sum: number, cat: any) => sum + cat.total, 0);

    return { categories: categoriesArray, total };
  }, [allData, selectedMonth, selectedYear, transactionType]);

  // Gerar insights
  const insights = useMemo(() => {
    if (!allData || !currentPeriodData) return [];

    const messages: string[] = [];
    const isExpense = transactionType === 'expense';
    const verbGasto = isExpense ? 'gastava' : 'recebia';
    const nomeGasto = isExpense ? 'gastos' : 'receitas';

    // Comparar com mês anterior
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    const prevMonthData = allData.monthlyData.find(
      (m: any) => m.month === prevMonth && m.year === prevYear
    );

    if (prevMonthData && currentPeriodData.categories.length > 0) {
      const currentTop = currentPeriodData.categories[0];
      const prevCategories = Array.from(prevMonthData.categories.values());
      const prevTop = prevCategories.sort((a: any, b: any) => b.total - a.total)[0];

      if (prevTop && currentTop.categoryId !== prevTop.categoryId) {
        messages.push(`No passado, você ${verbGasto} mais com ${prevTop.categoryName}.`);
      }

      // Verificar categoria com maior redução
      const prevCategoryMap = new Map(
        prevCategories.map((c: any) => [c.categoryId, c.total])
      );

      let maxReduction = 0;
      let reducedCategory = null;

      for (const cat of currentPeriodData.categories) {
        const prevTotal = prevCategoryMap.get(cat.categoryId) || 0;
        if (prevTotal > 0) {
          const reduction = ((prevTotal - cat.total) / prevTotal) * 100;
          if (reduction > maxReduction && reduction > 10) {
            maxReduction = reduction;
            reducedCategory = cat;
          }
        }
      }

      if (reducedCategory) {
        messages.push(`Neste mês, suas ${nomeGasto} com ${reducedCategory.categoryName} diminuíram.`);
      }
    }

    return messages.slice(0, 3);
  }, [allData, currentPeriodData, selectedMonth, selectedYear, transactionType]);

  // Cores baseadas no tipo de transação
  const valueColor = transactionType === 'expense' ? colors.expense : colors.income;
  const iconBgColor = transactionType === 'expense' ? colors.dangerBg : (colors.successBg || '#DCFCE7');

  // Cores padrão para gráfico - sempre usar estas cores para garantir contraste
  const CHART_COLORS = [
    '#6366F1', // Roxo
    '#10B981', // Verde esmeralda
    '#F59E0B', // Amarelo/Laranja
    '#EC4899', // Rosa
    '#3B82F6', // Azul
    '#8B5CF6', // Violeta
    '#EF4444', // Vermelho
    '#14B8A6', // Teal
    '#F97316', // Laranja
    '#6366F1', // Roxo claro
    '#84CC16', // Lima
    '#06B6D4', // Ciano
  ];

  // Gerar dados do gráfico de pizza (top 8 categorias)
  const pieChartData = useMemo(() => {
    if (!currentPeriodData || currentPeriodData.categories.length === 0) return [];
    
    const top8 = currentPeriodData.categories.slice(0, 8);
    const totalTop8 = top8.reduce((sum: number, cat: any) => sum + cat.total, 0);
    
    return top8.map((cat: any, index: number) => {
      const percentage = totalTop8 > 0 ? (cat.total / totalTop8) * 100 : 0;
      // Sempre usar cores da paleta para garantir contraste
      const color = CHART_COLORS[index % CHART_COLORS.length];
      
      return {
        name: cat.categoryName,
        value: cat.total,
        percentage,
        color,
        icon: cat.categoryIcon,
      };
    });
  }, [currentPeriodData, CHART_COLORS]);

  const categoriesOfType: Category[] = transactionType === 'expense' ? expenseCategories : incomeCategories;

  const buildCategoryIdsForFilter = useCallback((categoryId: string): string[] => {
    const selected = categoriesOfType.find((c) => c.id === categoryId);
    if (!selected) return [categoryId];

    // Se clicar numa categoria pai, incluir subcategorias
    if (!selected.parentId) {
      const childIds = categoriesOfType
        .filter((c) => c.parentId === categoryId)
        .map((c) => c.id);
      return [categoryId, ...childIds];
    }

    // Se clicar numa subcategoria, filtrar apenas ela
    return [categoryId];
  }, [categoriesOfType]);

  const handleOpenLaunchesFiltered = useCallback((category: any) => {
    const filterCategoryIds = buildCategoryIdsForFilter(category.categoryId);

    navigation.navigate('Lançamentos', {
      context: 'category',
      month: selectedMonth,
      year: selectedYear,
      filterType: transactionType,
      filterStatus: 'completed',
      filterCategoryIds,
      filterCategoryName: category.categoryName,
      filterCategoryTotal: category.total,
    });
  }, [navigation, transactionType, buildCategoryIdsForFilter, selectedMonth, selectedYear]);

  const renderCategoryCard = (category: any, index: number) => {
    if (!currentPeriodData) return null;

    const percentage = currentPeriodData.total > 0 
      ? (category.total / currentPeriodData.total) * 100 
      : 0;
    
    // Usar mesma cor do gráfico de pizza
    const categoryColor = CHART_COLORS[index % CHART_COLORS.length];

    return (
      <Pressable
        key={category.categoryId}
        onPress={() => handleOpenLaunchesFiltered(category)}
        style={({ pressed }) => [
          styles.categoryCard,
          { backgroundColor: colors.card },
          getShadow(colors),
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '15' }]}>
            <MaterialCommunityIcons name={category.categoryIcon as any} size={24} color={categoryColor} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: colors.text }]}>{category.categoryName}</Text>
            <Text style={[styles.categoryPercentage, { color: colors.textMuted }]}>
              {percentage.toFixed(0)}% do total
            </Text>
          </View>
          <Text style={[styles.categoryValue, { color: categoryColor }]}>
            {formatCurrencyBRL(category.total)}
          </Text>
        </View>
        
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: categoryColor
              }
            ]} 
          />
        </View>
      </Pressable>
    );
  };

  return (
    <MainLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SimpleHeader title="Categorias" />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.centeredContainer}>
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.card }, getShadow(colors)]}>
            {/* Navegação de mês */}
            <View style={styles.monthNav}>
              <Pressable 
                onPress={goToPreviousMonth}
                style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
              </Pressable>
              
              <Pressable 
                onPress={goToToday}
                style={({ pressed }) => [styles.monthDisplay, pressed && { opacity: 0.8 }]}
              >
                <Text style={[styles.monthText, { color: colors.text }]}>
                  {MONTH_NAMES[selectedMonth - 1]}
                </Text>
                <Text style={[styles.yearText, { color: colors.textMuted }]}>
                  {selectedYear}
                </Text>
              </Pressable>
              
              <Pressable 
                onPress={goToNextMonth}
                style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}
                disabled={isCurrentMonth}
              >
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={28} 
                  color={isCurrentMonth ? colors.grayLight : colors.primary} 
                />
              </Pressable>
            </View>

            {/* Abas Premium: Despesas / Receitas */}
            <View style={styles.transactionTypeTabs}>
              <Pressable
                onPress={() => setTransactionType('expense')}
                style={[
                  styles.tab,
                  transactionType === 'expense' && [styles.activeTab, { borderBottomColor: colors.expense }]
                ]}
              >
                <MaterialCommunityIcons 
                  name="arrow-down-circle" 
                  size={18} 
                  color={transactionType === 'expense' ? colors.expense : colors.textMuted} 
                />
                <Text style={[
                  styles.tabText,
                  { color: transactionType === 'expense' ? colors.expense : colors.textMuted }
                ]}>
                  Despesas
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setTransactionType('income')}
                style={[
                  styles.tab,
                  transactionType === 'income' && [styles.activeTab, { borderBottomColor: colors.income }]
                ]}
              >
                <MaterialCommunityIcons 
                  name="arrow-up-circle" 
                  size={18} 
                  color={transactionType === 'income' ? colors.income : colors.textMuted} 
                />
                <Text style={[
                  styles.tabText,
                  { color: transactionType === 'income' ? colors.income : colors.textMuted }
                ]}>
                  Receitas
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Gráfico de Pizza - Top 8 Categorias */}
          {!loading && currentPeriodData && pieChartData.length > 0 && (
            <View style={[styles.pieChartCard, { backgroundColor: colors.card }, getShadow(colors)]}>
              <Text style={[styles.pieChartTitle, { color: colors.text }]}>
                Distribuição por Categoria
              </Text>
              
              <View style={styles.pieChartContainer}>
                {/* Gráfico de Pizza SVG */}
                <View style={styles.pieChartCircle}>
                  <Svg width="140" height="140" viewBox="0 0 140 140">
                    <G rotation="-90" origin="70, 70">
                      {(() => {
                        const size = 140;
                        const center = size / 2;
                        const strokeWidth = 24;
                        const radius = (size - strokeWidth) / 2;
                        const circumference = 2 * Math.PI * radius;

                        const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
                        let cumulative = 0;

                        return pieChartData.map((item, index) => {
                          const fraction = total > 0 ? item.value / total : 0;
                          const length = fraction * circumference;
                          const dasharray = `${length} ${circumference}`;
                          const dashoffset = -cumulative * circumference;
                          cumulative += fraction;

                          return (
                            <Circle
                              key={index}
                              cx={center}
                              cy={center}
                              r={radius}
                              stroke={item.color}
                              strokeWidth={strokeWidth}
                              strokeLinecap="butt"
                              fill="none"
                              strokeDasharray={dasharray}
                              strokeDashoffset={dashoffset}
                            />
                          );
                        });
                      })()}
                    </G>
                  </Svg>
                  
                  {/* Centro com total */}
                  <View style={[styles.totalCircleOverlay, { backgroundColor: colors.card }]}>
                    <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: valueColor }]}>
                      {formatCurrencyBRL(currentPeriodData.total)}
                    </Text>
                  </View>
                </View>

                {/* Legenda com barras */}
                <View style={styles.pieLegend}>
                  {pieChartData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.legendPercent, { color: colors.textMuted }]}>
                        {item.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : !currentPeriodData || currentPeriodData.categories.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.grayLight }]}>
              <MaterialCommunityIcons name="information" size={24} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {transactionType === 'expense' 
                  ? 'Nenhum gasto registrado neste período'
                  : 'Nenhuma receita registrada neste período'}
              </Text>
            </View>
          ) : (
            <>
              {/* Categorias */}
              {currentPeriodData.categories.map((category: any, index: number) => 
                renderCategoryCard(category, index)
              )}

              {/* Insights */}
              {insights.length > 0 && (
                <View style={[styles.insightsCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={styles.insightsHeader}>
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color={DS_COLORS.warning} />
                    <Text style={[styles.insightsTitle, { color: colors.text }]}>Insights</Text>
                  </View>

                  {insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <MaterialCommunityIcons 
                        name={
                          insight.includes('diminuíram') ? 'trending-down' :
                          insight.includes('maior gasto') ? 'brain' :
                          'chart-line'
                        }
                        size={18} 
                        color={colors.primary} 
                      />
                      <Text style={[styles.insightText, { color: colors.text }]}>{insight}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          </View>
        </ScrollView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  headerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    marginTop: 2,
  },
  transactionTypeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  pieChartCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: spacing.md,
  },
  pieChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  pieChartCircle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  totalCircleOverlay: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    top: 30,
    left: 30,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  pieLegend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 13,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
