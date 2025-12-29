import { View, StyleSheet, ScrollView, useWindowDimensions, Pressable, TouchableOpacity, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/authContext";
import { useAppTheme } from "../contexts/themeContext";
import { useHomeData } from "../hooks/useHomeData";
import { useMonthlyGoals } from "../hooks/useMonthlyGoals";
import React, { useCallback, useState, useEffect, useDeferredValue } from "react";
import MainLayout from "../components/MainLayout";
import {
  UpcomingFlowsCardShimmer,
  AccountsCardShimmer,
  CreditCardsCardShimmer, CategoryCardShimmer
} from "../components/home/HomeShimmer";
import AccountsCard from "../components/home/AccountsCard";
import { UpcomingFlowsCard } from "../components/home";
import TopCategoriesCard from "../components/TopCategoriesCard";
import CreditCardsCard from "../components/home/CreditCardsCard";
import GoalCard from "../components/home/GoalCard";
import { DS_COLORS } from "../theme/designSystem";
import { checkRateLimit } from "../services/julius";

// Avatar do Julius
const JULIUS_AVATAR = require('../../assets/julius_avatar.jpg');

export default function Home() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { hasAlert } = useMonthlyGoals();
  const isNarrow = width < 700;
  const userName = user?.displayName || user?.email?.split("@")?.[0] || "Usuário";
  const canAccessAtivosBeta = (user?.email ?? '').toLowerCase() === 'thiago.w3c@gmail.com';
  const [juliusRemaining, setJuliusRemaining] = useState<number | null>(null);

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Bom dia', icon: 'weather-sunny' as const };
    if (hour >= 12 && hour < 18) return { text: 'Boa tarde', icon: 'weather-partly-cloudy' as const };
    return { text: 'Boa noite', icon: 'weather-night' as const };
  };

  // Mês atual para buscar transações
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Verificar mensagens disponíveis do Julius (liberado para todos, com limite de 20/dia)
  useEffect(() => {
    if (user?.uid) {
      checkRateLimit(user.uid, user.email).then((result) => {
        setJuliusRemaining(result.remaining);
      });
    }
  }, [user?.uid, user?.email]);

  // Hook consolidado - reduz ~14 queries para ~6 queries Firebase
  const {
    // Transações
    pendingIncomes,
    pendingExpenses,
    totalIncome,
    totalExpense,
    
    // Categorias
    expensesByCategory: categoryExpenses,
    incomesByCategory: categoryIncomes,
    
    // Contas
    accounts,
    totalAccountsBalance,
    
    // Cartões
    activeCards,
    
    // Loading states
    loadingPending,
    loadingAccounts,
    loadingCards,
    loadingCategories,
    
    // Refresh functions
    refresh,
    refreshAccounts,
    refreshCards: refreshCreditCards,
  } = useHomeData(currentMonth, currentYear);

  // Usar useDeferredValue para dados não críticos (evita bloquear UI)
  const deferredCategoryExpenses = useDeferredValue(categoryExpenses);
  const deferredCategoryIncomes = useDeferredValue(categoryIncomes);

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
  const navigateToGoals = useCallback(() => navigation.navigate('Metas do ano'), [navigation]);
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
            {/* Saudação - integrada com Julius quando disponível */}
            <View style={styles.greetingSection}>
              {juliusRemaining !== null && juliusRemaining > 0 ? (
                /* Saudação com Julius integrado */
                <TouchableOpacity 
                  style={styles.greetingWithJulius}
                  onPress={() => navigation.navigate('JuliusChat')}
                  activeOpacity={0.85}
                >
                  <View style={styles.greetingJuliusLeft}>
                    <View style={styles.greetingTitleRow}>
                      <Text style={[styles.greeting, { color: DS_COLORS.primary }]}>
                        {getGreeting().text}, {userName}!
                      </Text>
                      {hasAlert && (
                        <MaterialCommunityIcons 
                          name="bell-alert" 
                          size={22} 
                          color={DS_COLORS.warning}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </View>
                    <Text style={styles.juliusInviteText}>
                      {hasAlert 
                        ? 'Eita! Já passou das metas do mês hein... quer uma ajuda? 🤔'
                        : 'Precisa de ajuda hoje? Só me chamar! 💪'
                      }
                    </Text>
                  </View>
                  <Image source={JULIUS_AVATAR} style={styles.greetingJuliusAvatar} />
                </TouchableOpacity>
              ) : (
                /* Saudação normal (sem Julius ou sem mensagens) */
                <View style={styles.greetingRow}>
                  <Text style={[styles.greeting, { color: DS_COLORS.primary }]}>
                    {getGreeting().text}, {userName}
                  </Text>
                  <View style={styles.greetingIcons}>
                    <MaterialCommunityIcons 
                      name={getGreeting().icon} 
                      size={28} 
                      color={DS_COLORS.primary} 
                      style={styles.greetingIcon}
                    />
                    {hasAlert && (
                      <Pressable 
                        onPress={() => navigation.navigate('Metas do ano', { activeTab: 'monthly' })}
                        style={styles.alertButton}
                      >
                        <MaterialCommunityIcons 
                          name="bell-alert" 
                          size={24} 
                          color={DS_COLORS.warning} 
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
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
              />
            )}

            <View style={{ height: 24 }} />

            {/* 1. Onde está meu dinheiro - carrega independente */}
            {loadingAccounts ? (
              <AccountsCardShimmer />
            ) : (
              <AccountsCard 
                accounts={accounts}
                totalBalance={totalAccountsBalance}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                pendingTransactions={[...pendingIncomes, ...pendingExpenses]}
                creditCards={activeCards}
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

            {/* 3. Meta Financeira - card fixo de navegação */}
            <GoalCard onPress={navigateToGoals} />

            <View style={{ height: 24 }} />

            {/* 4. Resumo por Categoria - carrega independente */}
            {loadingCategories ? (
              <CategoryCardShimmer />
            ) : (
              <TopCategoriesCard
                expenses={deferredCategoryExpenses}
                incomes={deferredCategoryIncomes}
                totalExpenses={totalExpense}
                totalIncomes={totalIncome}
              />
            )}

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
  greetingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetingIcon: {
    marginLeft: 8,
  },
  alertButton: {
    padding: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
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
  // Saudação integrada com Julius
  greetingWithJulius: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingJuliusLeft: {
    flex: 1,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  juliusInviteText: {
    fontSize: 14,
    color: DS_COLORS.textMuted,
    marginTop: 4,
  },
  greetingJuliusAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginLeft: 12,
  },
});
