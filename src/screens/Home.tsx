import { View, StyleSheet, ScrollView, useWindowDimensions, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/authContext";
import { useAppTheme } from "../contexts/themeContext";
import { useHomeData } from "../hooks/useHomeData";
import { useMonthlyGoals } from "../hooks/useMonthlyGoals";
import { useAllGoals } from "../hooks/useAllGoals";
import React, { useCallback, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainLayout from "../components/MainLayout";
import {
    UpcomingFlowsCardShimmer,
    AccountsCardShimmer,
    CreditCardsCardShimmer
} from "../components/home/HomeShimmer";
import BalanceOverviewCard from "../components/home/BalanceOverviewCard";
import { UpcomingFlowsCard } from "../components/home";
import CreditCardsCard from "../components/home/CreditCardsCard";
import NotificationModal from "../components/home/NotificationModal";
import { DS_COLORS } from "../theme/designSystem";

export default function Home() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { goals: monthlyGoals, loading: loadingMonthlyGoals, hasAlert: hasMonthlyAlert, refresh: refreshMonthlyGoals } = useMonthlyGoals();
  const { goals: longTermGoals, refresh: refreshLongTermGoals } = useAllGoals();
  const isNarrow = width < 700;
  const userName = user?.displayName || user?.email?.split("@")?.[0] || "Usuário";
  const canAccessAtivosBeta = (user?.email ?? '').toLowerCase() === 'thiago.w3c@gmail.com';
  
  // Estado do modal de notificações
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [emergencyFundDismissed, setEmergencyFundDismissed] = useState(false);

  // Carregar estado de dismissed ao montar
  useEffect(() => {
    const loadDismissedState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('@emergency_fund_tip_dismissed');
        setEmergencyFundDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error loading dismissed state:', error);
      }
    };
    loadDismissedState();
  }, []);

  // Combinar todas as metas para verificação de alertas
  const allGoals = React.useMemo(() => {
    return [...monthlyGoals, ...longTermGoals];
  }, [monthlyGoals, longTermGoals]);

  // IDs das contas visíveis (para filtrar transações pendentes)
  const visibleAccountIds = React.useMemo(() => {
    if (!accounts) return new Set<string>();
    return new Set(
      accounts
        .filter(acc => acc.includeInTotal !== false)
        .map(acc => acc.id)
    );
  }, [accounts]);

  // Verificar tipo de alerta
  const alertType = React.useMemo(() => {
    // Prioridade 1: Meta de receita completa (sucesso)
    const hasSuccessAlert = monthlyGoals.some(goal => {
      if (goal.alertAcknowledged) return false;
      if (goal.isMonthlyGoal && goal.goalType === 'income') {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        return percentage >= 100;
      }
      return false;
    });

    if (hasSuccessAlert) return 'success';

    // Prioridade 2: Meta de despesa ultrapassada (warning)
    const hasWarningAlert = monthlyGoals.some(goal => {
      if (goal.alertAcknowledged) return false;
      if (goal.isMonthlyGoal && goal.goalType === 'expense') {
        return goal.currentAmount > goal.targetAmount;
      }
      return false;
    });

    if (hasWarningAlert) return 'warning';

    // Prioridade 3: Dica de reserva de emergência (info) - apenas segundas (ou todos os dias para teste)
    const hasEmergencyFund = allGoals.some(g => g.name === 'Reserva de emergência');
    if (!hasEmergencyFund && !emergencyFundDismissed) {
      const today = new Date();
      const isMonday = today.getDay() === 1;
      const isTestUser = (user?.email ?? '').toLowerCase() === 'thiago.w3c@gmail.com';
      
      if (isMonday || isTestUser) return 'info';
    }

    return null;
  }, [monthlyGoals, allGoals, emergencyFundDismissed, user?.email]);

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { 
      text: 'Bom dia', 
      icon: 'white-balance-sunny' as const,
      iconColor: '#F59E0B' // Amarelo/laranja vibrante
    };
    if (hour >= 12 && hour < 18) return { 
      text: 'Boa tarde', 
      icon: 'weather-sunset' as const,
      iconColor: '#F97316' // Laranja pôr do sol
    };
    return { 
      text: 'Boa noite', 
      icon: 'moon-waning-crescent' as const,
      iconColor: '#6366F1' // Azul/roxo noturno
    };
  };

  // Mês atual para buscar transações
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Hook consolidado - reduz ~14 queries para ~6 queries Firebase
  const {
    // Transações
    pendingIncomes,
    pendingExpenses,
    totalIncome,
    totalExpense,
    
    // Contas
    accounts,
    totalAccountsBalance,
    
    // Cartões
    activeCards,
    
    // Loading states
    loadingPending,
    loadingAccounts,
    loadingCards,
    
    // Refresh functions
    refresh,
    refreshAccounts,
    refreshCards: refreshCreditCards,
  } = useHomeData(currentMonth, currentYear);

  // Retry automático para novos usuários (dados iniciais podem estar sendo criados)
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    // Se terminou de carregar, contas estão vazias e ainda não tentamos retry
    if (!loadingAccounts && accounts.length === 0 && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retry ${retryCount + 1}/3: Recarregando dados...`);
        refreshAccounts();
        refresh();
        refreshCreditCards();
        setRetryCount(prev => prev + 1);
      }, 1000); // Espera 1 segundo antes de tentar novamente
      return () => clearTimeout(timer);
    }
  }, [loadingAccounts, accounts.length, retryCount]);

  // Navegar para lançamentos com filtro de conta
  const handleAccountPress = useCallback((account: { id?: string; name: string }) => {
    if (account.id) {
      navigation.navigate('Lançamentos', { 
        accountId: account.id, 
        accountName: account.name 
      });
    }
  }, [navigation]);

  // Navegar para fatura do cartão de crédito
  const handleCreditCardPress = useCallback((card: any) => {
    navigation.navigate('CreditCardBillDetails', {
      creditCardId: card.id,
      creditCardName: card.name,
      month: currentMonth,
      year: currentYear,
    });
  }, [navigation, currentMonth, currentYear]);

  const handleAddCreditCard = useCallback(() => {
    navigation.navigate('CreditCards', { openCreate: true });
  }, [navigation]);

  // Callbacks memoizados para evitar re-renders dos componentes filhos
  const navigateToConfigureAccounts = useCallback(() => navigation.navigate('ConfigureAccounts'), [navigation]);

  // Refresh quando a tela ganhar foco (ex: voltar de Lançamentos)
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshAccounts();
      refreshCreditCards();
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      <MainLayout>
        <ScrollView
          style={{ backgroundColor: colors.bg }}
          contentContainerStyle={{
            paddingTop: insets.top || 16,
          }}
        >
        <View style={styles.centeredContainer}>
          <View style={styles.content}>
            {/* Saudação simples com sininho de notificações */}
            <View style={styles.greetingSection}>
              <View style={styles.greetingRow}>
                <View style={styles.greetingLeft}>
                  <MaterialCommunityIcons 
                    name={getGreeting().icon} 
                    size={24} 
                    color={getGreeting().iconColor} 
                    style={styles.greetingIcon}
                  />
                  <Text style={[styles.greeting, { color: DS_COLORS.primary }]}>
                    {getGreeting().text}, {userName}
                  </Text>
                </View>
                {!loadingMonthlyGoals && (
                  <Pressable 
                    onPress={() => setNotificationModalVisible(true)}
                    style={styles.bellButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <MaterialCommunityIcons 
                      name={alertType ? "bell-alert" : "bell-outline"} 
                      size={24} 
                      color={
                        alertType === 'success' ? DS_COLORS.success : 
                        alertType === 'warning' ? DS_COLORS.warning : 
                        alertType === 'info' ? DS_COLORS.info : 
                        DS_COLORS.primary
                      } 
                    />
                    {alertType && (
                      <View style={[
                        styles.bellDot, 
                        { 
                          backgroundColor: 
                            alertType === 'success' ? DS_COLORS.success : 
                            alertType === 'warning' ? DS_COLORS.warning :
                            alertType === 'info' ? DS_COLORS.info :
                            DS_COLORS.warning
                        }
                      ]} />
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            <View style={{ height: 16 }} />

            {/* Card de contas a receber/pagar - carrega independente */}
            {loadingPending && (pendingIncomes.length === 0 && pendingExpenses.length === 0) ? (
              <UpcomingFlowsCardShimmer />
            ) : (
              <UpcomingFlowsCard
                incomeTransactions={pendingIncomes}
                expenseTransactions={pendingExpenses}
                loading={loadingPending}
                visibleAccountIds={visibleAccountIds}
              />
            )}

            <View style={{ height: 24 }} />

            {/* 1. Onde está meu dinheiro - carrega independente */}
            {loadingAccounts ? (
              <AccountsCardShimmer />
            ) : (
              <BalanceOverviewCard 
                accounts={accounts}
                totalBalance={totalAccountsBalance}
                username={userName}
                onAccountPress={handleAccountPress}
                onAddPress={navigateToConfigureAccounts}
                showGreeting={false}
              />
            )}

            <View style={{ height: 24 }} />

            {/* 2. Meus cartões de crédito - carrega independente */}
            {loadingCards ? (
              <CreditCardsCardShimmer />
            ) : (
              <CreditCardsCard 
                cards={activeCards}
                totalIncome={totalIncome}
                onCardPress={handleCreditCardPress}
                onAddPress={handleAddCreditCard}
              />
            )}

            <View style={{ height: 24 }} />

            {/* <View style={{ height: 24 }} /> */}

            {/* Beta - último atalho na Home (restrito por e-mail) 
            {canAccessAtivosBeta ? (
              <Pressable
                onPress={() => navigation.navigate('Minhas ações')}
                style={({ pressed }) => [
                  styles.betaCard,
                  { backgroundColor: colors.card },
                  getShadow(colors),
                  pressed && styles.betaCardPressed,
                ]}
                accessibilityLabel="Minhas ações (beta)"
              >
                <View style={styles.betaRow}>
                  <View style={[styles.betaIconCircle, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons name="chart-line" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.betaTextCol}>
                    <Text style={[styles.betaTitle, { color: colors.text }]}>Minhas ações</Text>
                    <Text style={[styles.betaSubtitle, { color: colors.textMuted }]}>Beta • Importar Excel e ver posições</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
                </View>
              </Pressable>
            ) : null}
            */}
          </View>
        </View>
      </ScrollView>
      
      {/* Modal de Notificações */}
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        allGoals={allGoals}
        onRefreshGoals={() => {
          refreshMonthlyGoals();
          refreshLongTermGoals();
        }}
        onNavigateToCreateEmergencyFund={() => {
          navigation.navigate('Metas do ano', { 
            createEmergencyFund: true 
          });
        }}
        userEmail={user?.email || undefined}
        onDismissEmergencyFund={() => setEmergencyFundDismissed(true)}
      />
    </MainLayout>
  </View>
);
}

const styles = StyleSheet.create({
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    padding: 24,
  },
  greetingSection: {
    paddingHorizontal: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingIcon: {
    marginRight: 0,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS_COLORS.error,
  },
  betaCard: {
    borderRadius: 16,
    padding: 16,
  },
  betaCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  betaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  betaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  betaTextCol: {
    flex: 1,
  },
  betaTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  betaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
});
