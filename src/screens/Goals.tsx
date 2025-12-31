import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import MainLayout from '../components/MainLayout';
import SimpleHeader from '../components/SimpleHeader';
import ChooseGoalTypeModal from '../components/goals/ChooseGoalTypeModal';
import CreateMonthlyGoalModal from '../components/goals/CreateMonthlyGoalModal';
import CreateGoalModal from '../components/CreateGoalModal';
import AddToGoalModal from '../components/AddToGoalModal';
import { useAppTheme } from '../contexts/themeContext';
import { useAuth } from '../contexts/authContext';
import { useTransactionRefresh } from '../contexts/transactionRefreshContext';
import { useCategories } from '../hooks/useCategories';
import { useMonthlyGoals } from '../hooks/useMonthlyGoals';
import { useAllGoals } from '../hooks/useAllGoals';
import { useSnackbar } from '../hooks/useSnackbar';
import Snackbar from '../components/Snackbar';
import { spacing, borderRadius, getShadow } from '../theme';
import { DS_COLORS } from '../theme/designSystem';
import { formatCurrencyBRL } from '../utils/format';
import * as goalService from '../services/goalService';
import * as transactionService from '../services/transactionService';

type TabType = 'longTerm' | 'monthly';

type GoalsRouteParams = {
  'Metas do ano': {
    activeTab?: TabType;
  };
};

export default function Goals() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { refreshKey } = useTransactionRefresh();
  const { goals: monthlyGoals, loading, create, update, remove, refresh } = useMonthlyGoals();
  

  const { goals: allGoals, refresh: refreshLongTermGoals } = useAllGoals();
  // Filtrar apenas metas de longo prazo (goalType não definido ou vazio)
  const allLongTermGoals = allGoals.filter(goal => !goal.goalType || goal.goalType === '');
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const route = useRoute<RouteProp<GoalsRouteParams, 'Metas do ano'>>();

  const [activeTab, setActiveTab] = useState<TabType>('longTerm');
  const [showChooseTypeModal, setShowChooseTypeModal] = useState(false);
  const [showMonthlyGoalModal, setShowMonthlyGoalModal] = useState(false);
  const [showLongTermGoalModal, setShowLongTermGoalModal] = useState(false);
  const [showAddToGoalModal, setShowAddToGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [selectedMonthlyGoal, setSelectedMonthlyGoal] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isCreatingEmergencyFund, setIsCreatingEmergencyFund] = useState(false);

  // Se receber activeTab via navegação, aplicar
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
    }
  }, [route.params?.activeTab]);

  // Atualizar metas quando houver nova transação
  useEffect(() => {
    refresh();
    refreshLongTermGoals();
  }, [refreshKey]);

  const handleCreateGoal = () => {
    setShowChooseTypeModal(true);
  };

  const handleSelectLongTerm = () => {
    setShowChooseTypeModal(false);
    setShowLongTermGoalModal(true);
  };

  const handleSelectMonthly = () => {
    setShowChooseTypeModal(false);
    setShowMonthlyGoalModal(true);
  };

  const handleSelectEmergencyFund = () => {
    setShowChooseTypeModal(false);
    setIsCreatingEmergencyFund(true);
    setShowLongTermGoalModal(true);
  };

  const handleCreateMonthlyGoal = async (data: {
    type: 'expense' | 'income';
    categoryId: string;
    targetAmount: number;
  }) => {

    const category = categories.find(c => c.id === data.categoryId);
    if (!category) return { success: false, error: 'Categoria não encontrada' };

    let result;
    
    // Se tem selectedMonthlyGoal, é edição. Senão, é criação
    if (selectedMonthlyGoal) {

      result = await update(selectedMonthlyGoal.id, data.targetAmount);

      if (result.success) {
        setShowMonthlyGoalModal(false);
        setSelectedMonthlyGoal(null);
        showSnackbar('Meta atualizada com sucesso!');
      }
      return result;
    } else {

      result = await create(data.categoryId, data.type, data.targetAmount, category.name);
      if (result.success) {
        setShowMonthlyGoalModal(false);
        showSnackbar('Meta mensal criada com sucesso!');
        setActiveTab('monthly'); // Mudar para aba de metas mensais
      }
      return result;
    }
  };

  const handleEditMonthlyGoal = (goal: any) => {
    setSelectedMonthlyGoal(goal);
    setShowMonthlyGoalModal(true);
  };

  const handleDeleteMonthlyGoal = async (goalId: string) => {
    const success = await remove(goalId);
    if (success) {
      setShowMonthlyGoalModal(false);
      setSelectedMonthlyGoal(null);
      showSnackbar('Meta excluída com sucesso!');
    } else {
      showSnackbar('Erro ao excluir meta');
    }
  };

  const handleDeleteLongTermGoal = async (confirmed: boolean) => {
    if (!confirmed || !selectedGoal || !user?.uid) return;
    
    try {
      await goalService.deleteGoal(selectedGoal.id, user.uid);
      setShowLongTermGoalModal(false);
      setSelectedGoal(null);
      refreshLongTermGoals();
      showSnackbar('Meta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      showSnackbar('Erro ao excluir meta');
    }
  };

  const handleSaveLongTermGoal = async (data: {
    name: string;
    targetAmount: number;
    targetDate: Date;
    icon: string;
  }) => {
    if (!user) return;

    const monthsDiff = Math.ceil((data.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
    const timeframe: 'short' | 'medium' | 'long' = 
      monthsDiff <= 12 ? 'short' : monthsDiff <= 60 ? 'medium' : 'long';
    
    await goalService.createGoal(user.uid, {
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: Timestamp.fromDate(data.targetDate),
      timeframe,
      icon: data.icon,
      isActive: true,
    }, true);

    await refreshLongTermGoals();
    showSnackbar('Meta de longo prazo criada com sucesso!');
    setShowLongTermGoalModal(false);
    setIsCreatingEmergencyFund(false);
  };

  const handleEditLongTermGoal = (goal: any) => {
    setSelectedGoal(goal);
    setShowLongTermGoalModal(true);
  };

  const handleAddToGoal = async (goal: any) => {
    setSelectedGoal(goal);
    // Carregar contas
    if (user) {
      const { getAllAccounts } = await import('../services/accountService');
      const userAccounts = await getAllAccounts(user.uid);
      setAccounts(userAccounts.filter((acc: any) => !acc.isArchived));
    }
    setShowAddToGoalModal(true);
  };

  const handleSaveAddToGoal = async (amount: number, accountId: string) => {
    if (!selectedGoal || !user) return;
    
    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      const { getOrCreateMetaCategory } = await import('../services/categoryService');
      const metaCategoryId = await getOrCreateMetaCategory(user.uid);

      await transactionService.createTransaction(user.uid, {
        type: 'expense',
        amount: amount,
        description: `Meta: ${selectedGoal.name}`,
        date: Timestamp.now(),
        accountId: accountId,
        categoryId: metaCategoryId,
        recurrence: 'none',
        status: 'completed',
        goalId: selectedGoal.id,
        goalName: selectedGoal.name,
      });
      
      await goalService.addToGoalProgress(selectedGoal.id, amount);
      await refreshLongTermGoals();
      
      showSnackbar('Progresso adicionado com sucesso!');
      setShowAddToGoalModal(false);
    } catch (error) {
      console.error('Erro ao adicionar progresso:', error);
      showSnackbar('Erro ao adicionar progresso');
    }
  };

  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <MainLayout>
      <SimpleHeader title="Metas" />
      
      <View style={styles.container}>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'longTerm' && styles.tabActive,
              activeTab === 'longTerm' && { borderBottomColor: colors.primary }
            ]}
            onPress={() => setActiveTab('longTerm')}
          >
            <MaterialCommunityIcons 
              name="target" 
              size={20} 
              color={activeTab === 'longTerm' ? colors.primary : colors.textMuted} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'longTerm' ? colors.primary : colors.textMuted }
            ]}>
              Longo prazo
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'monthly' && styles.tabActive,
              activeTab === 'monthly' && { borderBottomColor: colors.primary }
            ]}
            onPress={() => setActiveTab('monthly')}
          >
            <MaterialCommunityIcons 
              name="calendar-month" 
              size={20} 
              color={activeTab === 'monthly' ? colors.primary : colors.textMuted} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'monthly' ? colors.primary : colors.textMuted }
            ]}>
              Mensais
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'longTerm' ? (
            <LongTermGoalsContent 
              goals={allLongTermGoals}
              colors={colors}
              onEdit={handleEditLongTermGoal}
              onAddProgress={handleAddToGoal}
            />
          ) : (
            <MonthlyGoalsContent 
              goals={monthlyGoals}
              categories={categories}
              loading={loading}
              colors={colors}
              getPercentage={getPercentage}
              onEdit={handleEditMonthlyGoal}
            />
          )}
        </ScrollView>

        {/* Botão Criar Meta */}
        <View style={styles.createButtonContainer}>
          <Button
            mode="contained"
            onPress={handleCreateGoal}
            buttonColor={DS_COLORS.primary}
            textColor="#FFFFFF"
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
            icon="plus-circle"
          >
            Criar Meta
          </Button>
        </View>
      </View>

      <ChooseGoalTypeModal
        visible={showChooseTypeModal}
        onClose={() => setShowChooseTypeModal(false)}
        onSelectLongTerm={handleSelectLongTerm}
        onSelectMonthly={handleSelectMonthly}
        onSelectEmergencyFund={handleSelectEmergencyFund}
        existingGoals={allLongTermGoals}
      />

      <CreateMonthlyGoalModal
        visible={showMonthlyGoalModal}
        onClose={() => {
          setShowMonthlyGoalModal(false);
          setSelectedMonthlyGoal(null);
        }}
        onSave={handleCreateMonthlyGoal}
        existingGoal={selectedMonthlyGoal}
        onDelete={selectedMonthlyGoal ? handleDeleteMonthlyGoal : undefined}
      />

      <CreateGoalModal
        visible={showLongTermGoalModal}
        onClose={() => {
          setShowLongTermGoalModal(false);
          setIsCreatingEmergencyFund(false);
        }}
        onSave={handleSaveLongTermGoal}
        onDelete={selectedGoal ? handleDeleteLongTermGoal : undefined}
        existingGoals={allLongTermGoals}
        existingGoal={selectedGoal}
        lockedName={isCreatingEmergencyFund ? 'Reserva de emergência' : undefined}
      />

      {selectedGoal && (
        <AddToGoalModal
          visible={showAddToGoalModal}
          onClose={() => setShowAddToGoalModal(false)}
          onSave={handleSaveAddToGoal}
          goal={selectedGoal}
          progressPercentage={goalService.calculateGoalProgress(selectedGoal.currentAmount, selectedGoal.targetAmount)}
          accounts={accounts}
        />
      )}

      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
    </MainLayout>
  );
}

// Componente de conteúdo de metas de longo prazo
interface LongTermGoalsContentProps {
  goals: any[];
  colors: any;
  onEdit: (goal: any) => void;
  onAddProgress: (goal: any) => void;
}

function LongTermGoalsContent({ goals, colors, onEdit, onAddProgress }: LongTermGoalsContentProps) {
  if (goals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="target" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Nenhuma meta de longo prazo criada
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          Toque no + para criar sua primeira meta
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.goalsContainer}>
      {goals.map((goal) => {
        const progressPercentage = goalService.calculateGoalProgress(goal.currentAmount, goal.targetAmount);
        const isCompleted = !!goal.completedAt;
        const timeRemaining = goalService.calculateTimeRemaining(goal.targetDate);
        const monthlyContribution = goalService.calculateMonthlyContribution(
          goal.currentAmount,
          goal.targetAmount,
          goal.targetDate
        );

        return (
          <Pressable key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card }, getShadow(colors)]} onPress={() => onEdit(goal)}>
            {/* Header */}
            <View style={styles.goalHeader}>
              <View style={styles.goalHeaderLeft}>
                <View style={[styles.categoryIcon, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons 
                    name={(goal.icon as any) || 'target'} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalCategoryName, { color: colors.text }]}>
                    {goal.name}
                  </Text>
                </View>
              </View>
            </View>

              {/* Progresso */}
              <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                    Progresso
                  </Text>
                  <Text style={[styles.progressValue, { color: isCompleted ? colors.income : colors.text }]}>
                    {formatCurrencyBRL(goal.currentAmount)} de {formatCurrencyBRL(goal.targetAmount)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min(progressPercentage, 100)}%`, 
                        backgroundColor: isCompleted ? colors.income : colors.primary 
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: colors.textMuted }]}>
                  {Math.round(progressPercentage)}% concluído
                </Text>
              </View>
              
              {/* Informações de tempo e aporte */}
              {!isCompleted && timeRemaining && (
                <View style={styles.timeInfoSection}>
                  <View style={styles.timeInfoRow}>
                    <View style={styles.timeInfoItem}>
                      <MaterialCommunityIcons 
                        name="calendar-clock" 
                        size={16} 
                        color={timeRemaining.isOverdue ? colors.expense : colors.textMuted} 
                      />
                      <Text style={[
                        styles.timeInfoLabel, 
                        { color: timeRemaining.isOverdue ? colors.expense : colors.textMuted }
                      ]}>
                        {timeRemaining.isOverdue ? 'Prazo:' : 'Faltam:'}
                      </Text>
                      <Text style={[
                        styles.timeInfoValue, 
                        { color: timeRemaining.isOverdue ? colors.expense : colors.text }
                      ]}>
                        {timeRemaining.formattedText}
                      </Text>
                    </View>
                  </View>
                  
                  {monthlyContribution && !timeRemaining.isOverdue && (
                    <View style={styles.timeInfoRow}>
                      <View style={styles.timeInfoItem}>
                        <MaterialCommunityIcons 
                          name="cash-multiple" 
                          size={16} 
                          color={colors.textMuted} 
                        />
                        <Text style={[styles.timeInfoLabel, { color: colors.textMuted }]}>
                          Aporte necessário:
                        </Text>
                        <Text style={[styles.timeInfoValue, { color: colors.primary, fontWeight: '600' }]}>
                          {formatCurrencyBRL(monthlyContribution.monthlyAmount)} {monthlyContribution.formattedText}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Ações */}
              {!isCompleted && (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => onAddProgress(goal)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: colors.primaryBg },
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Adicionar progresso</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

// Componente de conteúdo de metas mensais
interface MonthlyGoalsContentProps {
  goals: any[];
  categories: any[];
  loading: boolean;
  colors: any;
  getPercentage: (current: number, target: number) => number;
  onEdit: (goal: any) => void;
}

function MonthlyGoalsContent({ goals, categories, loading, colors, getPercentage, onEdit }: MonthlyGoalsContentProps) {

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Carregando...</Text>
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="calendar-month" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Nenhuma meta mensal criada
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          Toque no + para criar sua primeira meta
        </Text>
      </View>
    );
  }

  // Separar metas por tipo
  const expenseGoals = goals.filter(g => g.goalType === 'expense');
  const incomeGoals = goals.filter(g => g.goalType === 'income');

  return (
    <View style={styles.goalsContainer}>
      {/* Despesas */}
      {expenseGoals.length > 0 && (
        <>
          <View style={styles.typeSeparator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textMuted }]}>Despesas</Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>
          {expenseGoals.map((goal) => {
            const category = categories.find(c => c.id === goal.categoryId);
            if (!category) return null;

            const percentage = getPercentage(goal.currentAmount, goal.targetAmount);
            const showWarning = percentage >= 85;
            const progressColor = DS_COLORS.error;

            return (
              <Pressable key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card }, getShadow(colors)]} onPress={() => onEdit(goal)}>
                {/* Header */}
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                      <MaterialCommunityIcons 
                        name={category.icon as any} 
                        size={24} 
                        color={category.color} 
                      />
                    </View>
                    <View>
                      <Text style={[styles.goalCategoryName, { color: colors.text }]}>
                        {category.name}
                      </Text>
                      <Text style={[styles.goalType, { color: colors.textMuted }]}>Meta de despesa</Text>
                    </View>
                  </View>
                  
                  {showWarning && (
                    <View style={styles.warningBadge}>
                      <MaterialCommunityIcons name="alert" size={16} color={DS_COLORS.warning} />
                    </View>
                  )}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: progressColor 
                        }
                      ]} 
                    />
                  </View>
                  
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressAmount, { color: colors.text }]}>
                      R$ {goal.currentAmount.toFixed(2).replace('.', ',')}
                    </Text>
                    <Text style={[styles.progressTarget, { color: colors.textMuted }]}>
                      de R$ {goal.targetAmount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  <View style={[styles.percentageBadge, { backgroundColor: progressColor + '15' }]}>
                    <Text style={[styles.percentageText, { color: progressColor }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      {/* Receitas */}
      {incomeGoals.length > 0 && (
        <>
          <View style={styles.typeSeparator}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textMuted }]}>Receitas</Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>
          {incomeGoals.map((goal) => {
            const category = categories.find(c => c.id === goal.categoryId);
            if (!category) return null;

            const percentage = getPercentage(goal.currentAmount, goal.targetAmount);
            const progressColor = DS_COLORS.success;

            return (
              <Pressable key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card }, getShadow(colors)]} onPress={() => onEdit(goal)}>
                {/* Header */}
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                      <MaterialCommunityIcons 
                        name={category.icon as any} 
                        size={24} 
                        color={category.color} 
                      />
                    </View>
                    <View>
                      <Text style={[styles.goalCategoryName, { color: colors.text }]}>
                        {category.name}
                      </Text>
                      <Text style={[styles.goalType, { color: colors.textMuted }]}>Meta de receita</Text>
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressSection}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${percentage}%`,
                          backgroundColor: progressColor 
                        }
                      ]} 
                    />
                  </View>
                  
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressAmount, { color: colors.text }]}>
                      R$ {goal.currentAmount.toFixed(2).replace('.', ',')}
                    </Text>
                    <Text style={[styles.progressTarget, { color: colors.textMuted }]}>
                      de R$ {goal.targetAmount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  <View style={[styles.percentageBadge, { backgroundColor: progressColor + '15' }]}>
                    <Text style={[styles.percentageText, { color: progressColor }]}>
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    // borderBottomColor aplicado dinamicamente
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  createButtonContainer: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  createButton: {
    borderRadius: borderRadius.md,
    elevation: 0,
  },
  createButtonContent: {
    height: 48,
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  goalsContainer: {
    gap: spacing.md,
  },
  goalCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCategoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalType: {
    fontSize: 12,
    marginTop: 2,
  },
  warningBadge: {
    marginRight: spacing.sm,
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTarget: {
    fontSize: 14,
  },
  percentageBadge: {
    position: 'absolute',
    right: 0,
    top: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 12,
    marginTop: 4,
  },
  timeInfoSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  timeInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeInfoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
