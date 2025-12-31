import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { Text, Checkbox, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../../types/firebase';
import { DS_COLORS } from '../../theme/designSystem';
import { spacing, borderRadius } from '../../theme';
import * as goalService from '../../services/goalService';

type Props = {
  visible: boolean;
  onClose: () => void;
  allGoals: Goal[]; // Todas as metas (longo prazo + mensais)
  onRefreshGoals: () => void;
  onNavigateToCreateEmergencyFund?: () => void;
  userEmail?: string;
  onDismissEmergencyFund?: () => void;
};

type AlertType = 'goal_exceeded' | 'goal_completed' | 'emergency_fund_tip' | 'none';

export default function NotificationModal({ visible, onClose, allGoals, onRefreshGoals, onNavigateToCreateEmergencyFund, userEmail, onDismissEmergencyFund }: Props) {
  const [alertType, setAlertType] = useState<AlertType>('none');
  const [exceededGoal, setExceededGoal] = useState<Goal | null>(null);
  const [completedGoal, setCompletedGoal] = useState<Goal | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      checkAlerts();
      setAcknowledged(false);
    }
  }, [visible, allGoals]);

  const checkAlerts = async () => {
    // Priority 1: Income Goal Completed (100%)
    const completed = allGoals.find(g => {
      // Skip if already acknowledged
      if (g.alertAcknowledged) return false;
      
      // Only monthly income goals that reached 100%
      if (g.isMonthlyGoal && g.goalType === 'income') {
        const percentage = (g.currentAmount / g.targetAmount) * 100;
        return percentage >= 100;
      }
      
      return false;
    });

    if (completed) {
      setCompletedGoal(completed);
      setAlertType('goal_completed');
      return;
    }

    // Priority 2: Goal Exceeded (only monthly expense goals)
    const exceeded = allGoals.find(g => {
      // Skip if already acknowledged
      if (g.alertAcknowledged) return false;
      
      // Only monthly expense goals (spending limits, not long-term savings)
      if (g.isMonthlyGoal && g.goalType === 'expense') {
        return g.currentAmount > g.targetAmount;
      }
      
      return false;
    });

    if (exceeded) {
      setExceededGoal(exceeded);
      setAlertType('goal_exceeded');
      return;
    }

    // Priority 3: Emergency Fund Tip (only on Mondays, once per week)
    const hasEmergencyFund = allGoals.some(g => g.name === 'Reserva de emergência');
    
    if (!hasEmergencyFund) {
      try {
        // Verificar se usuário já clicou em "Criar depois"
        const dismissed = await AsyncStorage.getItem('@emergency_fund_tip_dismissed');
        if (dismissed === 'true') {
          // Não mostrar mais a notificação
          setAlertType('none');
          setExceededGoal(null);
          setCompletedGoal(null);
          return;
        }
        
        const today = new Date();
        const isMonday = today.getDay() === 1; // 0 = domingo, 1 = segunda
        const isTestUser = (userEmail ?? '').toLowerCase() === 'thiago.w3c@gmail.com';
        
        // Para teste: mostrar todos os dias se for thiago.w3c@gmail.com
        // Para outros: apenas segundas-feiras
        if (isMonday || isTestUser) {
          setAlertType('emergency_fund_tip');
          return;
        }
      } catch (error) {
        console.error('Error checking emergency fund tip:', error);
      }
    }

    // No alerts
    setAlertType('none');
    setExceededGoal(null);
    setCompletedGoal(null);
  };

  const handleAcknowledge = async () => {
    const goalToAck = exceededGoal || completedGoal;
    if (!goalToAck || !acknowledged) return;
    
    setLoading(true);
    try {
      await goalService.updateGoal(goalToAck.id, { alertAcknowledged: true });
      onRefreshGoals();
      onClose();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissEmergencyFundTip = async () => {
    try {
      // Marcar como permanentemente dismissed
      await AsyncStorage.setItem('@emergency_fund_tip_dismissed', 'true');
      if (onDismissEmergencyFund) {
        onDismissEmergencyFund();
      }
      onClose();
    } catch (error) {
      console.error('Error dismissing emergency fund tip:', error);
    }
  };

  // No alerts - show friendly message
  if (alertType === 'none') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="bell-check-outline" size={40} color={DS_COLORS.success} />
            </View>
            <Text style={styles.noAlertTitle}>Tudo certo por aqui!</Text>
            <Text style={styles.noAlertSubtext}>Você não tem novos alertas.</Text>
            <Button 
              mode="text" 
              onPress={onClose} 
              textColor={DS_COLORS.primary}
              style={styles.closeButton}
            >
              Fechar
            </Button>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Emergency Fund Tip
  if (alertType === 'emergency_fund_tip') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: DS_COLORS.infoLight }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={40} color={DS_COLORS.info} />
            </View>
            
            <Text style={styles.tipTitle}>Dica financeira</Text>
            
            <Text style={styles.alertMessage}>
              Você ainda não criou sua Reserva de emergência. Ter um fundo de segurança é essencial para imprevistos e tranquilidade financeira.
            </Text>
            
            <Button 
              mode="contained" 
              onPress={() => {
                onClose();
                if (onNavigateToCreateEmergencyFund) {
                  onNavigateToCreateEmergencyFund();
                }
              }}
              style={styles.confirmButton}
              buttonColor={DS_COLORS.info}
            >
              Criar agora
            </Button>

            <Button 
              mode="text" 
              onPress={handleDismissEmergencyFundTip} 
              textColor={DS_COLORS.textMuted}
              style={styles.closeButton}
            >
              Criar depois
            </Button>
          </View>
        </View>
      </Modal>
    );
  }

  // Goal completed (income) - congratulations!
  if (alertType === 'goal_completed') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: DS_COLORS.successLight }]}>
              <MaterialCommunityIcons name="trophy" size={40} color={DS_COLORS.success} />
            </View>
            
            <Text style={styles.congratsTitle}>Parabéns!</Text>
            
            <Text style={styles.alertMessage}>
              Você concluiu sua meta "{completedGoal?.name}"! Continue assim e alcance seus objetivos financeiros.
            </Text>
            
            <Pressable 
              style={styles.checkboxRow} 
              onPress={() => setAcknowledged(!acknowledged)}
            >
              <Checkbox.Android 
                status={acknowledged ? 'checked' : 'unchecked'} 
                onPress={() => setAcknowledged(!acknowledged)} 
                color={DS_COLORS.primary} 
              />
              <Text style={styles.checkboxLabel}>Ok, entendi</Text>
            </Pressable>

            <Button 
              mode="contained" 
              onPress={handleAcknowledge} 
              disabled={!acknowledged || loading}
              loading={loading}
              style={styles.confirmButton}
              buttonColor={DS_COLORS.success}
            >
              Confirmar
            </Button>
          </View>
        </View>
      </Modal>
    );
  }

  // Goal exceeded alert
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: DS_COLORS.errorLight }]}>
            <MaterialCommunityIcons name="alert-circle" size={40} color={DS_COLORS.error} />
          </View>
          
          <Text style={styles.alertTitle}>Meta ultrapassada</Text>
          
          <Text style={styles.alertMessage}>
            Sua meta "{exceededGoal?.name}" ultrapassou o limite definido. Reveja seus gastos para manter seu planejamento financeiro em dia.
          </Text>
          
          <Pressable 
            style={styles.checkboxRow} 
            onPress={() => setAcknowledged(!acknowledged)}
          >
            <Checkbox.Android 
              status={acknowledged ? 'checked' : 'unchecked'} 
              onPress={() => setAcknowledged(!acknowledged)} 
              color={DS_COLORS.primary} 
            />
            <Text style={styles.checkboxLabel}>Ok, entendi</Text>
          </Pressable>

          <Button 
            mode="contained" 
            onPress={handleAcknowledge} 
            disabled={!acknowledged || loading}
            loading={loading}
            style={styles.confirmButton}
            buttonColor={DS_COLORS.primary}
          >
            Confirmar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: DS_COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  noAlertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DS_COLORS.textTitle,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  noAlertSubtext: {
    fontSize: 15,
    color: DS_COLORS.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  closeButton: {
    marginTop: spacing.sm,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DS_COLORS.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  congratsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DS_COLORS.success,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DS_COLORS.info,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  alertMessage: {
    fontSize: 15,
    color: DS_COLORS.textBody,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  checkboxLabel: {
    fontSize: 16,
    color: DS_COLORS.textTitle,
    marginLeft: spacing.xs,
  },
  confirmButton: {
    width: '100%',
    borderRadius: borderRadius.md,
  },
});
