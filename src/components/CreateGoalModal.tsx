import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';
import { Goal, GoalTimeframe, GOAL_TIMEFRAME_LABELS, GOAL_TIMEFRAME_DESCRIPTIONS, GOAL_ICONS } from '../types/firebase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    targetAmount: number;
    timeframe: GoalTimeframe;
    icon: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  existingGoal?: Goal | null;
}

export default function CreateGoalModal({ visible, onClose, onSave, onDelete, existingGoal }: Props) {
  const { colors } = useAppTheme();
  
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('medium');
  const [icon, setIcon] = useState('flag-checkered');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Preencher com dados existentes se estiver editando
  useEffect(() => {
    if (existingGoal) {
      setName(existingGoal.name);
      setTargetAmount(existingGoal.targetAmount.toString());
      setTimeframe(existingGoal.timeframe);
      setIcon(existingGoal.icon || 'flag-checkered');
    } else {
      // Reset para nova meta
      setName('');
      setTargetAmount('');
      setTimeframe('medium');
      setIcon('flag-checkered');
    }
    setError('');
  }, [existingGoal, visible]);

  const handleSave = async () => {
    // Validações
    if (!name.trim()) {
      setError('Digite o nome da sua meta');
      return;
    }

    const amount = parseFloat(targetAmount.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setError('Digite um valor válido para a meta');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        name: name.trim(),
        targetAmount: amount,
        timeframe,
        icon,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setDeleting(true);
      setError('');
      await onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir meta');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e formata
    const amount = parseInt(numbers, 10) / 100;
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (value: string) => {
    setTargetAmount(formatCurrency(value));
  };

  const timeframes: GoalTimeframe[] = ['short', 'medium', 'long'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {existingGoal ? 'Editar meta' : 'Criar meta'}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Texto motivacional */}
            <View style={[styles.motivationalBox, { backgroundColor: colors.primaryBg }]}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color={colors.primary} />
              <Text style={[styles.motivationalText, { color: colors.primary }]}>
                Uma meta clara transforma sonhos em planos concretos.
              </Text>
            </View>

            {/* Nome da meta */}
            <Text style={[styles.label, { color: colors.text }]}>Qual é sua meta?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: Comprar um carro, Viagem, Reserva..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />

            {/* Valor da meta */}
            <Text style={[styles.label, { color: colors.text }]}>Quanto você precisa?</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>R$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={targetAmount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
              />
            </View>

            {/* Prazo */}
            <Text style={[styles.label, { color: colors.text }]}>Em quanto tempo?</Text>
            <View style={styles.timeframeOptions}>
              {timeframes.map((tf) => {
                const isSelected = timeframe === tf;
                return (
                  <Pressable
                    key={tf}
                    onPress={() => setTimeframe(tf)}
                    style={[
                      styles.timeframeOption,
                      { 
                        backgroundColor: isSelected ? colors.primary : colors.bg,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.timeframeLabel,
                      { color: isSelected ? '#fff' : colors.text }
                    ]}>
                      {GOAL_TIMEFRAME_LABELS[tf]}
                    </Text>
                    <Text style={[
                      styles.timeframeDesc,
                      { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textMuted }
                    ]}>
                      {GOAL_TIMEFRAME_DESCRIPTIONS[tf]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Ícone */}
            <Text style={[styles.label, { color: colors.text }]}>Escolha um ícone</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((iconName) => {
                const isSelected = icon === iconName;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => setIcon(iconName)}
                    style={[
                      styles.iconOption,
                      { 
                        backgroundColor: isSelected ? colors.primary : colors.bg,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name={iconName as any} 
                      size={24} 
                      color={isSelected ? '#fff' : colors.text} 
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* Erro */}
            {error ? (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            ) : null}

            {/* Botão de excluir (só aparece ao editar) */}
            {existingGoal && onDelete && (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteButton,
                  { borderColor: colors.expense },
                  deleting && { opacity: 0.6 }
                ]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.expense} />
                <Text style={[styles.deleteButtonText, { color: colors.expense }]}>
                  {deleting ? 'Excluindo...' : 'Excluir meta'}
                </Text>
              </Pressable>
            )}

            {/* Botões */}
            <View style={styles.buttons}>
              <Pressable
                onPress={onClose}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
              </Pressable>
              
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[
                  styles.saveButton, 
                  { backgroundColor: colors.primary },
                  saving && { opacity: 0.6 }
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Salvando...' : existingGoal ? 'Salvar' : 'Criar meta'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  motivationalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  motivationalText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  timeframeOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeframeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  timeframeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeframeDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    marginTop: spacing.lg,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
