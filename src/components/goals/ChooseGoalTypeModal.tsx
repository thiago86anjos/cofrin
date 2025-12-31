import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DS_COLORS } from '../../theme/designSystem';
import { spacing, borderRadius } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLongTerm: () => void;
  onSelectMonthly: () => void;
}

export default function ChooseGoalTypeModal({ visible, onClose, onSelectLongTerm, onSelectMonthly }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: DS_COLORS.primaryLight }]}>
            <MaterialCommunityIcons name="flag-checkered" size={40} color={DS_COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Criar nova meta</Text>
          <Text style={styles.subtitle}>
            Escolha o tipo de meta que deseja criar
          </Text>

          <Pressable
            style={styles.optionCard}
            onPress={onSelectLongTerm}
          >
            <View style={[styles.optionIcon, { backgroundColor: DS_COLORS.primaryLight }]}>
              <MaterialCommunityIcons name="piggy-bank" size={28} color={DS_COLORS.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Meta de Investimento
              </Text>
              <Text style={styles.optionDescription}>
                Para objetivos futuros, com aportes e prazos
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={DS_COLORS.textMuted} />
          </Pressable>

          <Pressable
            style={styles.optionCard}
            onPress={onSelectMonthly}
          >
            <View style={[styles.optionIcon, { backgroundColor: DS_COLORS.warningLight }]}>
              <MaterialCommunityIcons name="calendar-month" size={28} color={DS_COLORS.warning} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                Meta Mensal de Gastos
              </Text>
              <Text style={styles.optionDescription}>
                Controle de gastos ou receitas do mês atual
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={DS_COLORS.textMuted} />
          </Pressable>

          <Button 
            mode="text" 
            onPress={onClose} 
            textColor={DS_COLORS.textMuted}
            style={styles.closeButton}
          >
            Cancelar
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
    maxWidth: 380,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DS_COLORS.textTitle,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: DS_COLORS.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: DS_COLORS.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: DS_COLORS.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS_COLORS.textTitle,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: DS_COLORS.textMuted,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: spacing.sm,
  },
});
