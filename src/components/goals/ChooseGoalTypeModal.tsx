import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLongTerm: () => void;
  onSelectMonthly: () => void;
}

export default function ChooseGoalTypeModal({ visible, onClose, onSelectLongTerm, onSelectMonthly }: Props) {
  const { colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable 
          style={[styles.container, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Qual tipo de meta deseja criar?
          </Text>

          <Pressable
            style={[styles.option, { borderColor: colors.border }]}
            onPress={onSelectLongTerm}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
              <MaterialCommunityIcons name="target" size={32} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Metas de Investimentos 
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                Para objetivos futuros, com aportes e prazos
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.option, { borderColor: colors.border }]}
            onPress={onSelectMonthly}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.successBg }]}>
              <MaterialCommunityIcons name="calendar-month" size={32} color={colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Meta mensal de gastos
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                Controle de gastos ou receitas do mês atual
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>
              Cancelar
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
