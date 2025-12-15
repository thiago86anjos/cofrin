import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import AppHeader from '../components/AppHeader';
import MainLayout from '../components/MainLayout';
import { spacing, borderRadius, getShadow } from '../theme';
import { formatCurrencyBRL } from '../utils/format';
import { useMonthReport, useExpensesByCategory } from '../hooks/useFirebaseTransactions';

// Componente de stat card
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  colors: any;
}

function StatCard({ title, value, icon, iconBg, iconColor, subtitle, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }, getShadow(colors)]}>
      <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statTitle, { color: colors.textMuted }]}>{title}</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

// Componente de barra de progresso simples para gráfico
interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  colors: any;
}

function ProgressBar({ label, value, maxValue, color, colors }: ProgressBarProps) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  
  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.text }]}>
          {formatCurrencyBRL(value)}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View 
          style={[
            styles.progressFill, 
            { backgroundColor: color, width: `${percentage}%` }
          ]} 
        />
      </View>
    </View>
  );
}

export default function Reports() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  // Mês atual
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Dados do relatório
  const { report, loading } = useMonthReport(currentMonth, currentYear);
  const { expenses: categoryExpenses } = useExpensesByCategory(currentMonth, currentYear);

  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Mês anterior
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Calcular evolução
  const savingsEvolution = useMemo(() => {
    if (!report) return { current: 0, previous: 0, difference: 0, improved: false };
    
    const current = report.balance;
    const previous = report.previousMonth.balance;
    const difference = current - previous;
    
    return {
      current,
      previous,
      difference,
      improved: difference > 0
    };
  }, [report]);

  // Máximo para o gráfico de barras
  const maxBalance = Math.max(
    Math.abs(savingsEvolution.current), 
    Math.abs(savingsEvolution.previous),
    1
  );

  // Analisar saúde financeira
  const getHealthStatus = () => {
    if (!report) {
      return {
        status: 'attention' as const,
        emoji: '🟡',
        title: 'Sem dados suficientes',
        subtitle: 'Registre suas movimentações para análise',
        summary: 'Ainda não temos dados suficientes para avaliar sua saúde financeira este mês.',
        highlights: [],
        advice: null
      };
    }

    const monthBalance = report.income - report.expense;
    const hasIncome = report.income > 0;
    const cardPercentage = report.debtPercentage;
    const hasImproved = savingsEvolution.improved;
    const currentBalance = report.balance;

    // Calcular status baseado em múltiplos fatores
    let status: 'good' | 'attention' | 'risk' = 'good';
    let points = 0;

    // Fator 1: Uso do cartão
    if (hasIncome && cardPercentage > 40) points += 3;
    else if (hasIncome && cardPercentage > 30) points += 2;
    else if (hasIncome && cardPercentage <= 30) points -= 1;

    // Fator 2: Saldo do mês
    if (monthBalance < 0) points += 2;
    else if (monthBalance > 0) points -= 1;

    // Fator 3: Saldo total
    if (currentBalance < 0) points += 2;

    // Fator 4: Evolução
    if (!hasImproved && savingsEvolution.difference < -500) points += 1;

    // Definir status
    if (points >= 4) status = 'risk';
    else if (points >= 2) status = 'attention';
    else status = 'good';

    // Construir mensagens personalizadas
    const highlights: Array<{ icon: string; text: string; color?: string }> = [];

    // Highlight 1: Uso do cartão
    if (hasIncome && cardPercentage > 0) {
      const cardZone = cardPercentage <= 30 ? 'saudável' : cardPercentage <= 40 ? 'atenção' : 'risco';
      const cardEmoji = cardPercentage <= 30 ? '🟢' : cardPercentage <= 40 ? '🟡' : '🔴';
      highlights.push({
        icon: 'credit-card',
        text: `Uso do cartão: ${cardPercentage.toFixed(0)}% da renda ${cardEmoji} (zona ${cardZone})`,
        color: cardPercentage <= 30 ? colors.income : cardPercentage <= 40 ? (colors.warning || '#F59E0B') : colors.expense
      });
    }

    // Highlight 2: Saldo do mês
    highlights.push({
      icon: monthBalance >= 0 ? 'check-circle' : 'alert-circle',
      text: `Saldo do mês: ${monthBalance >= 0 ? 'positivo' : 'negativo'} (${formatCurrencyBRL(monthBalance)})`,
      color: monthBalance >= 0 ? colors.income : colors.expense
    });

    // Highlight 3: Evolução
    highlights.push({
      icon: hasImproved ? 'trending-up' : 'trending-down',
      text: `${hasImproved ? 'Melhorou' : 'Diminuiu'} ${formatCurrencyBRL(Math.abs(savingsEvolution.difference))} vs mês anterior`,
      color: hasImproved ? colors.income : colors.expense
    });

    // Mensagens por status
    if (status === 'good') {
      return {
        status,
        emoji: '🟢',
        title: 'Boa',
        subtitle: 'Sua situação financeira está equilibrada',
        summary: monthBalance >= 0 
          ? 'Você terminou o mês com saldo positivo e manteve seus gastos sob controle. Continue assim!'
          : 'Você está mantendo um bom controle financeiro. Pequenos ajustes podem deixar seu saldo ainda mais positivo.',
        highlights,
        advice: 'Manter o uso do cartão abaixo de 30% da renda ajuda a preservar sua saúde financeira.'
      };
    }

    if (status === 'attention') {
      let summary = '';
      
      if (cardPercentage > 30 && monthBalance < 0) {
        summary = 'Você terminou o mês com saldo negativo e o uso do cartão está acima do recomendado. Pequenos ajustes podem melhorar sua situação.';
      } else if (cardPercentage > 30) {
        summary = 'O uso do cartão está acima do recomendado. Considere reduzir um pouco para evitar comprometer demais sua renda.';
      } else if (monthBalance < 0) {
        summary = 'Você gastou mais do que recebeu este mês. Veja onde é possível economizar para equilibrar suas finanças.';
      } else {
        summary = 'Sua situação está estável, mas alguns pontos merecem atenção para manter o equilíbrio financeiro.';
      }

      return {
        status,
        emoji: '🟡',
        title: 'Atenção',
        subtitle: 'Alguns pontos merecem cuidado',
        summary,
        highlights,
        advice: 'Revise seus gastos principais e veja onde é possível reduzir. Até 30% da renda no cartão é o ideal.'
      };
    }

    // status === 'risk'
    let summary = '';
    
    if (cardPercentage > 40 && monthBalance < 0) {
      summary = 'Sua situação precisa de atenção urgente: saldo negativo e uso alto do cartão podem comprometer seu orçamento.';
    } else if (cardPercentage > 40) {
      summary = 'O uso do cartão está muito alto em relação à sua renda. Isso pode gerar dificuldades para pagar as faturas.';
    } else if (currentBalance < 0) {
      summary = 'Você está com saldo negativo. É importante revisar seus gastos e buscar formas de equilibrar as contas.';
    } else {
      summary = 'Alguns sinais indicam risco financeiro. É hora de revisar seu orçamento e fazer ajustes importantes.';
    }

    return {
      status,
      emoji: '🔴',
      title: 'Risco',
      subtitle: 'Situação que precisa de atenção',
      summary,
      highlights,
      advice: 'Priorize reduzir o uso do cartão e cortar gastos não essenciais. Seu futuro financeiro agradece.'
    };
  };

  if (loading) {
    return (
      <MainLayout>
        <ScrollView style={[styles.root, { backgroundColor: colors.bg }]}>
          <AppHeader />
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Carregando relatório...
            </Text>
          </View>
        </ScrollView>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={styles.scrollContent}>
        <AppHeader />
        <View style={styles.content}>
          <View style={styles.maxWidth}>
            <Text style={[styles.title, { color: colors.text }]}>Relatórios</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {monthNames[currentMonth - 1]} de {currentYear}
            </Text>

            {/* Alerta de dívida */}
            {report && report.debtPercentage >= 30 && (
              <View style={[styles.alertCard, { backgroundColor: colors.dangerBg }]}>
                <MaterialCommunityIcons name="alert" size={24} color={colors.expense} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: colors.expense }]}>
                    Atenção com suas dívidas!
                  </Text>
                  <Text style={[styles.alertText, { color: colors.text }]}>
                    Você já atingiu {report.debtPercentage.toFixed(0)}% de dívidas em cartão de crédito sobre o seu salário atual. 
                    O recomendado é manter abaixo de 30%.
                  </Text>
                </View>
              </View>
            )}

            {/* Cards de estatísticas */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Resumo financeiro
            </Text>
            
            <View style={[styles.statsGrid, { flexDirection: isNarrow ? 'column' : 'row' }]}>
              <View style={[styles.statsRow, { flex: isNarrow ? undefined : 1 }]}>
                <StatCard
                  title="Receitas"
                  value={formatCurrencyBRL(report?.income || 0)}
                  icon="arrow-up-circle"
                  iconBg={colors.successBg}
                  iconColor={colors.income}
                  colors={colors}
                />
                <StatCard
                  title="Despesas"
                  value={formatCurrencyBRL(report?.expense || 0)}
                  icon="arrow-down-circle"
                  iconBg={colors.dangerBg}
                  iconColor={colors.expense}
                  colors={colors}
                />
              </View>
              <View style={[styles.statsRow, { flex: isNarrow ? undefined : 1 }]}>
                <StatCard
                  title="Gastos no débito"
                  value={formatCurrencyBRL(report?.debitExpenses || 0)}
                  icon="wallet"
                  iconBg={colors.primaryBg}
                  iconColor={colors.primary}
                  colors={colors}
                />
                <StatCard
                  title="Gastos no crédito"
                  value={formatCurrencyBRL(report?.creditExpenses || 0)}
                  icon="credit-card"
                  iconBg={colors.warningBg || '#FEF3C7'}
                  iconColor={colors.warning || '#F59E0B'}
                  colors={colors}
                />
              </View>
            </View>

            {/* Balanço do mês */}
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons name="scale-balance" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Balanço do mês</Text>
              </View>
              
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
                  Receitas - Despesas
                </Text>
                <Text style={[
                  styles.balanceValue, 
                  { color: (report?.balance || 0) >= 0 ? colors.income : colors.expense }
                ]}>
                  {formatCurrencyBRL(report?.balance || 0)}
                </Text>
              </View>
            </View>

            {/* Compromisso futuro */}
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.warningBg || '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.warning || '#F59E0B'} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Compromissos de cartão</Text>
              </View>
              
              <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
                Tudo que você registrar de receita na categoria Renda será usado para medir quanto da sua renda mensal está comprometida com o cartão de crédito.
              </Text>

              <View style={styles.futureRow}>
                <View style={styles.futureItem}>
                  <Text style={[styles.futureLabel, { color: colors.textMuted }]}>
                    Fatura atual
                  </Text>
                  <Text style={[styles.futureValue, { color: colors.expense }]}>
                    {formatCurrencyBRL(report?.totalCreditCardUsage || 0)}
                  </Text>
                </View>
                
                {report?.currentSalary ? (
                  <View style={styles.futureItem}>
                    <Text style={[styles.futureLabel, { color: colors.textMuted }]}>
                      % da renda
                    </Text>
                    <Text style={[
                      styles.futureValue, 
                      { 
                        color: report.debtPercentage <= 30 
                          ? colors.income 
                          : report.debtPercentage <= 40 
                          ? colors.warning 
                          : colors.expense 
                      }
                    ]}>
                      {report.debtPercentage <= 30 ? '🟢' : report.debtPercentage <= 40 ? '🟡' : '🔴'} {report.debtPercentage.toFixed(1)}%
                    </Text>
                  </View>
                ) : null}
              </View>

              {report?.currentSalary ? (
                <View style={[styles.healthZone, { backgroundColor: colors.grayLight }]}>
                  <View style={styles.healthZoneHeader}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color={colors.textMuted} />
                    <Text style={[styles.salaryText, { color: colors.textMuted }]}>
                      Renda mensal: {formatCurrencyBRL(report.currentSalary)}
                    </Text>
                  </View>
                  <View style={styles.healthZoneInfo}>
                    <Text style={[styles.healthZoneText, { color: colors.textMuted }]}>
                      🟢 <Text style={{ fontWeight: '600' }}>Até 30%</Text> = Zona saudável (recomendado){"\n"}
                      🟡 <Text style={{ fontWeight: '600' }}>30-40%</Text> = Zona de atenção{"\n"}
                      🔴 <Text style={{ fontWeight: '600' }}>Acima de 40%</Text> = Zona de risco
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.salaryInfo, { backgroundColor: colors.grayLight }]}>
                  <MaterialCommunityIcons name="information" size={16} color={colors.textMuted} />
                  <Text style={[styles.salaryText, { color: colors.textMuted }]}>
                    Cadastre uma receita com categoria "Renda" para ver o percentual comprometido e acompanhar a saúde financeira
                  </Text>
                </View>
              )}
            </View>

            {/* Saúde financeira do mês */}
            <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { 
                  backgroundColor: getHealthStatus().status === 'good' 
                    ? colors.successBg 
                    : getHealthStatus().status === 'attention' 
                    ? colors.warningBg || '#FEF3C7'
                    : colors.dangerBg 
                }]}>
                  <MaterialCommunityIcons 
                    name={
                      getHealthStatus().status === 'good' 
                        ? 'heart-pulse' 
                        : getHealthStatus().status === 'attention'
                        ? 'alert-circle'
                        : 'alert'
                    }
                    size={24} 
                    color={
                      getHealthStatus().status === 'good' 
                        ? colors.income 
                        : getHealthStatus().status === 'attention'
                        ? colors.warning || '#F59E0B'
                        : colors.expense
                    }
                  />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Saúde financeira do mês</Text>
              </View>
              
              {/* Status principal */}
              <View style={[styles.healthStatusCard, { 
                backgroundColor: getHealthStatus().status === 'good' 
                  ? colors.successBg 
                  : getHealthStatus().status === 'attention' 
                  ? colors.warningBg || '#FEF3C7'
                  : colors.dangerBg 
              }]}>
                <Text style={[styles.healthStatusEmoji]}>
                  {getHealthStatus().emoji}
                </Text>
                <View style={styles.healthStatusTextContainer}>
                  <Text style={[styles.healthStatusTitle, { 
                    color: getHealthStatus().status === 'good' 
                      ? colors.income 
                      : getHealthStatus().status === 'attention'
                      ? colors.warning || '#F59E0B'
                      : colors.expense
                  }]}>
                    {getHealthStatus().title}
                  </Text>
                  <Text style={[styles.healthStatusSubtitle, { color: colors.textMuted }]}>
                    {getHealthStatus().subtitle}
                  </Text>
                </View>
              </View>

              {/* Resumo em texto */}
              <Text style={[styles.healthSummary, { color: colors.text }]}>
                {getHealthStatus().summary}
              </Text>

              {/* Destaques rápidos */}
              <View style={styles.healthHighlights}>
                {getHealthStatus().highlights.map((highlight, index) => (
                  <View key={index} style={styles.healthHighlightItem}>
                    <MaterialCommunityIcons 
                      name={highlight.icon} 
                      size={16} 
                      color={highlight.color || colors.textMuted} 
                    />
                    <Text style={[styles.healthHighlightText, { color: colors.text }]}>
                      {highlight.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Mensagem orientativa */}
              {getHealthStatus().advice && (
                <View style={[styles.healthAdvice, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons name="lightbulb-on" size={16} color={colors.primary} />
                  <Text style={[styles.healthAdviceText, { color: colors.primary }]}>
                    {getHealthStatus().advice}
                  </Text>
                </View>
              )}
            </View>

            {/* Top categorias de gastos */}
            {categoryExpenses.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
                    <MaterialCommunityIcons name="chart-pie" size={24} color={colors.expense} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Gastos por categoria</Text>
                </View>

                <View style={styles.categoryList}>
                  {categoryExpenses.slice(0, 5).map((cat, index) => {
                    const percentage = report?.expense 
                      ? ((cat.total / report.expense) * 100).toFixed(0) 
                      : '0';
                    
                    return (
                      <View key={cat.categoryId} style={styles.categoryItem}>
                        <View style={styles.categoryLeft}>
                          <View style={[styles.categoryRank, { backgroundColor: colors.primaryBg }]}>
                            <Text style={[styles.categoryRankText, { color: colors.primary }]}>
                              {index + 1}
                            </Text>
                          </View>
                          <MaterialCommunityIcons 
                            name={cat.categoryIcon as any} 
                            size={20} 
                            color={colors.text} 
                          />
                          <Text style={[styles.categoryName, { color: colors.text }]}>
                            {cat.categoryName}
                          </Text>
                        </View>
                        <View style={styles.categoryRight}>
                          <Text style={[styles.categoryValue, { color: colors.expense }]}>
                            {formatCurrencyBRL(cat.total)}
                          </Text>
                          <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>
                            {percentage}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 980,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  futureRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  futureItem: {
    flex: 1,
  },
  futureLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  futureValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  salaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  salaryText: {
    fontSize: 12,
    flex: 1,
  },
  healthZone: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  healthZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  healthZoneInfo: {
    paddingLeft: spacing.sm,
  },
  healthZoneText: {
    fontSize: 11,
    lineHeight: 16,
  },
  evolutionChart: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressItem: {
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 4,
  },
  evolutionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  evolutionText: {
    fontSize: 13,
    flex: 1,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryName: {
    fontSize: 14,
    flex: 1,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPercent: {
    fontSize: 11,
  },
  healthStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  healthStatusEmoji: {
    fontSize: 32,
  },
  healthStatusTextContainer: {
    flex: 1,
  },
  healthStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  healthStatusSubtitle: {
    fontSize: 13,
  },
  healthSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  healthHighlights: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  healthHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthHighlightText: {
    fontSize: 13,
    flex: 1,
  },
  healthAdvice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  healthAdviceText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
});
