import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    ScrollView,
    Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatePickerCrossPlatform from './DatePickerCrossPlatform';
import CustomAlert from './CustomAlert';

import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';
import { Goal, GOAL_ICONS, GOAL_ICON_LABELS } from '../types/firebase';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    targetAmount: number;
    targetDate: Date;
    icon: string;
    initialBalance?: number;
  }) => Promise<void>;
  onDelete?: (confirmed: boolean) => Promise<void>;
  existingGoal?: Goal | null;
  existingGoals?: Goal[]; // Lista de metas para validar duplicatas
  progressPercentage?: number;
  showSetPrimaryOption?: boolean; // Mostrar opção para definir como principal
  onSaveAsPrimary?: (data: {
    name: string;
    targetAmount: number;
    targetDate: Date;
    icon: string;
  }) => Promise<void>; // Callback para salvar como principal
  lockedName?: string; // Nome pré-preenchido e bloqueado (ex: Reserva de emergência)
}

export default function CreateGoalModal({ 
  visible, 
  onClose, 
  onSave, 
  onDelete, 
  existingGoal,
  existingGoals = [],
  progressPercentage = 0,
  showSetPrimaryOption = false,
  onSaveAsPrimary,
  lockedName
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [icon, setIcon] = useState('piggy-bank');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Valores originais para comparação (modo edição)
  const [originalName, setOriginalName] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [originalDate, setOriginalDate] = useState(new Date());
  const [originalIcon, setOriginalIcon] = useState('piggy-bank');

  // Função para formatar número para moeda brasileira
  const formatNumberToCurrency = (num: number): string => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Preencher com dados existentes se estiver editando
  useEffect(() => {
    if (existingGoal) {
      const formattedAmount = formatNumberToCurrency(existingGoal.targetAmount);
      let goalDate: Date;
      
      if (existingGoal.targetDate) {
        goalDate = existingGoal.targetDate.toDate();
      } else {
        // Fallback: adicionar meses baseado no timeframe
        const now = new Date();
        const months = existingGoal.timeframe === 'short' ? 12 : existingGoal.timeframe === 'medium' ? 36 : 60;
        now.setMonth(now.getMonth() + months);
        goalDate = now;
      }
      
      setName(existingGoal.name);
      setTargetAmount(formattedAmount);
      setTargetDate(goalDate);
      setIcon(existingGoal.icon || 'piggy-bank');
      
      // Guardar valores originais
      setOriginalName(existingGoal.name);
      setOriginalAmount(formattedAmount);
      setOriginalDate(goalDate);
      setOriginalIcon(existingGoal.icon || 'piggy-bank');
    } else {
      // Reset para nova meta
      const defaultDate = new Date(); // Data de hoje
      
      setName(lockedName || '');
      setTargetAmount('');
      setInitialBalance('0,00');
      setTargetDate(defaultDate);
      setIcon(lockedName === 'Reserva de emergência' ? 'piggy-bank' : 'home-variant');
      
      // Limpar originais
      setOriginalName(lockedName || '');
      setOriginalAmount('');
      setOriginalDate(defaultDate);
      setOriginalIcon(lockedName === 'Reserva de emergência' ? 'piggy-bank' : 'home-variant');
    }
    setError('');
    setFocusedField(null);
  }, [existingGoal, visible, lockedName]);
  
  // Verificar se houve alterações (modo edição)
  const hasChanges = (): boolean => {
    if (!existingGoal) return true; // Modo criação sempre permite salvar
    
    return (
      name.trim() !== originalName ||
      targetAmount !== originalAmount ||
      targetDate.getTime() !== originalDate.getTime() ||
      icon !== originalIcon
    );
  };

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

    // Validar data no futuro
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(targetDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      setError('A data da meta deve ser no futuro');
      return;
    }
    
    // Validar nome duplicado
    const nameExists = existingGoals.some(
      goal => goal.id !== existingGoal?.id && 
              goal.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists) {
      setError('Já existe uma meta com esse nome');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      // Extrair saldo inicial se for reserva de emergência
      const initial = lockedName === 'Reserva de emergência' && !existingGoal
        ? parseFloat(initialBalance.replace(/[^\d,]/g, '').replace(',', '.'))
        : 0;
      
      await onSave({
        name: name.trim(),
        targetAmount: amount,
        targetDate,
        icon,
        initialBalance: initial,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar meta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !existingGoal) return;
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!onDelete || !existingGoal) return;
    
    try {
      setDeleting(true);
      setError('');
      setShowDeleteAlert(false);
      await onDelete(true);
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

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* Título */}
          <Text style={[styles.title, { color: colors.text }]}>
            {existingGoal ? 'Editar meta' : (lockedName || 'Criar nova meta')}
          </Text>

          {/* Nome da meta - esconder se for Reserva de emergência (criando ou editando) */}
          {lockedName !== 'Reserva de emergência' && existingGoal?.name !== 'Reserva de emergência' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Qual é sua meta?</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: colors.bg, 
                    color: colors.text, 
                    borderColor: focusedField === 'name' ? colors.primary : colors.border,
                  },
                  Platform.select({ web: { outlineStyle: 'none' as const } }),
                ]}
                placeholder="Ex: Comprar um carro, Viagem, Reserva..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                maxLength={50}
              />
            </>
          )}

          {/* Valor da meta */}
          <Text style={[styles.label, { color: colors.text }]}>Quanto você precisa?</Text>
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: colors.bg, 
              borderColor: focusedField === 'amount' ? colors.primary : colors.border,
            }
          ]}>
            <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>R$</Text>
            <TextInput
              style={[
                styles.amountInput, 
                { color: colors.text },
                Platform.select({ web: { outlineStyle: 'none' as const } }),
              ]}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              value={targetAmount}
              onChangeText={handleAmountChange}
              onFocus={() => setFocusedField('amount')}
              onBlur={() => setFocusedField(null)}
              keyboardType="numeric"
            />
          </View>

          {/* Data de finalização */}
          <DatePickerCrossPlatform
            label="Quando você quer atingir?"
            value={targetDate}
            onChange={setTargetDate}
            minimumDate={new Date()}
          />

          {/* Saldo inicial (apenas para Reserva de emergência na criação) */}
          {lockedName === 'Reserva de emergência' && !existingGoal && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Saldo inicial da reserva</Text>
              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: colors.bg, 
                  borderColor: focusedField === 'initialBalance' ? colors.primary : colors.border,
                }
              ]}>
                <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>R$</Text>
                <TextInput
                  style={[
                    styles.amountInput, 
                    { color: colors.text },
                    Platform.select({ web: { outlineStyle: 'none' as const } }),
                  ]}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  value={initialBalance}
                  onChangeText={(text) => setInitialBalance(formatCurrency(text))}
                  onFocus={() => setFocusedField('initialBalance')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                />
              </View>
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Valor que você já possui na reserva
              </Text>
            </>
          )}

          {/* Ícone - esconder se for Reserva de emergência (criando ou editando) */}
          {lockedName !== 'Reserva de emergência' && existingGoal?.name !== 'Reserva de emergência' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Escolha uma categoria</Text>
              <View style={styles.chipGrid}>
                {GOAL_ICONS
                  .filter((iconName) => iconName !== 'piggy-bank')
                  .map((iconName) => {
                  const isSelected = icon === iconName;
                  const label = GOAL_ICON_LABELS[iconName] || iconName;
                  return (
                    <Pressable
                      key={iconName}
                      onPress={() => setIcon(iconName)}
                      style={[
                        styles.chip,
                        { 
                          backgroundColor: isSelected ? colors.primary : colors.bg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: isSelected ? '#fff' : colors.text }
                      ]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Erro */}
          {error ? (
            <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
          ) : null}

          {/* Botões */}
          <View style={styles.buttonContainer}>
            {/* Botão Excluir (só aparece ao editar) - à esquerda */}
            {existingGoal && onDelete && (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteButton,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                  deleting && { opacity: 0.6 }
                ]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.text} />
                <Text style={[styles.deleteButtonText, { color: colors.text }]}>
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </Text>
              </Pressable>
            )}

            {/* Botão Cancelar - no meio */}
            <Pressable
              onPress={onClose}
              style={[
                styles.cancelButton,
                { borderColor: colors.border, backgroundColor: colors.bg }
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </Pressable>

            {/* Botão Salvar - à direita (principal) */}
            <Pressable
              onPress={handleSave}
              disabled={saving || (existingGoal && !hasChanges())}
              style={[
                styles.saveButton, 
                { backgroundColor: colors.primary },
                (saving || (existingGoal && !hasChanges())) && { opacity: 0.6 }
              ]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvando...' : existingGoal ? 'Salvar' : 'Criar'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        </Pressable>
      </Pressable>

      {/* Alert de confirmação de exclusão */}
      <CustomAlert
        visible={showDeleteAlert}
        title="Excluir meta"
        message={
          existingGoal && progressPercentage > 0
            ? `Tem certeza que quer excluir sua meta?\n\nVocê já tem ${Math.round(progressPercentage)}% de progresso (R$ ${existingGoal.currentAmount.toFixed(2)} de R$ ${existingGoal.targetAmount.toFixed(2)}).`
            : 'Tem certeza que quer excluir sua meta?\n\nEsta ação não pode ser desfeita.'
        }
        buttons={[
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
        ]}
        onClose={() => setShowDeleteAlert(false)}
      />
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
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
  },
  cardContent: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
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
    outlineStyle: 'none',
  } as any,
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
    outlineStyle: 'none',
  } as any,
  helperText: {
    fontSize: 13,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
