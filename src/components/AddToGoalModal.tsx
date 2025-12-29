import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';
import { Goal, Account } from '../types/firebase';
import { formatCurrencyBRL } from '../utils/format';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (amount: number, accountId: string) => Promise<void>;
  goal: Goal;
  progressPercentage: number;
  accounts: Account[];
}

export default function AddToGoalModal({ visible, onClose, onSave, goal, progressPercentage, accounts }: Props) {
  const { colors } = useAppTheme();
  
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const remaining = goal.targetAmount - goal.currentAmount;

  // Filtrar apenas contas com saldo positivo
  const availableAccounts = accounts.filter(acc => !acc.isArchived && acc.balance > 0);

  // Selecionar primeira conta com saldo ao abrir
  useEffect(() => {
    if (visible && availableAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(availableAccounts[0].id);
    }
  }, [visible, availableAccounts]);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  const handleClose = () => {
    setAmount('');
    setSelectedAccountId(null);
    setError('');
    onClose();
  };

  const handleSave = async () => {
    const value = parseFloat(amount.replace(/[^\d,]/g, '').replace(',', '.'));
    
    if (isNaN(value) || value <= 0) {
      setError('Digite um valor válido');
      return;
    }

    if (!selectedAccountId) {
      setError('Selecione uma conta');
      return;
    }

    // Verificar se o valor excede o restante da meta
    if (value > remaining) {
      setError(`Valor máximo permitido: ${formatCurrencyBRL(remaining)}`);
      return;
    }

    if (selectedAccount && value > selectedAccount.balance) {
      setError(`Saldo insuficiente. Disponível: ${formatCurrencyBRL(selectedAccount.balance)}`);
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave(value, selectedAccountId);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar valor');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    const numValue = parseInt(numbers, 10) / 100;
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (value: string) => {
    setAmount(formatCurrency(value));
  };

  // Sugestões rápidas de valores - filtrar apenas valores até o restante
  const suggestions = [50, 100, 200, 500].filter(v => v <= remaining);

  // Verificar se meta está completa
  const isGoalComplete = goal.currentAmount >= goal.targetAmount;

  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.fullscreenModal, { backgroundColor: colors.bg, paddingTop: insets.top, paddingHorizontal: Platform.OS === 'web' ? 12 : 0 }]}>
          {/* Header */}
          <View style={[styles.fullscreenHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fullscreenTitle, { color: colors.text }]}>Adicionar à meta</Text>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView 
            contentContainerStyle={[styles.modalBody, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info da meta - compacta */}
            <View style={[styles.goalInfo, { backgroundColor: colors.card }]}>
              <View style={styles.goalHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
                  <MaterialCommunityIcons 
                    name={(goal.icon as any) || 'flag-checkered'} 
                    size={20} 
                    color={colors.primary}
                  />
                </View>
                <View style={styles.goalDetails}>
                  <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>{goal.name}</Text>
                  <Text style={[styles.goalSubtitle, { color: colors.textMuted }]}>
                    {formatCurrencyBRL(goal.currentAmount)} de {formatCurrencyBRL(goal.targetAmount)}
                  </Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.grayLight }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(progressPercentage, 100)}%`, backgroundColor: colors.primary }
                  ]} 
                />
              </View>
              <Text style={[styles.remainingText, { color: isGoalComplete ? colors.success : colors.textMuted }]}>
                {isGoalComplete 
                  ? '✓ Meta concluída!' 
                  : `Faltam ${formatCurrencyBRL(remaining > 0 ? remaining : 0)}`
                }
              </Text>
            </View>

            {/* Seleção de conta */}
            <Text style={[styles.label, { color: colors.text }]}>De qual conta vai sair?</Text>
            {availableAccounts.length === 0 ? (
              <View style={[styles.noAccountsBox, { backgroundColor: colors.bg }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.noAccountsText, { color: colors.textMuted }]}>
                  Nenhuma conta com saldo disponível
                </Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.accountsScroll}
                contentContainerStyle={styles.accountsList}
              >
                {availableAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => setSelectedAccountId(account.id)}
                      style={[
                        styles.accountCard,
                        { 
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.card,
                        }
                      ]}
                    >
                      <Text style={[
                        styles.accountName,
                        { color: isSelected ? '#fff' : colors.text }
                      ]} numberOfLines={1}>
                        {account.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Input de valor - esconder se meta completa */}
            {!isGoalComplete && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Quanto você quer adicionar?</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>R$</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0,00"
                    placeholderTextColor={colors.textMuted}
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                      autoFocus={Platform.OS !== 'web'}
                  />
                </View>
              </>
            )}

            {/* Sugestões rápidas removidas por solicitação */}

            {/* Erro */}
            {error ? (
              <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
            ) : null}

            {/* Botões */}
            <View style={styles.buttons}>
              <Pressable
                onPress={handleClose}
                style={[styles.cancelButton, { borderColor: colors.border }, isGoalComplete && { flex: 1 }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  {isGoalComplete ? 'Fechar' : 'Cancelar'}
                </Text>
              </Pressable>
              
              {!isGoalComplete && (
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[
                    styles.saveButton, 
                    { backgroundColor: colors.primary },
                    saving && { opacity: 0.6 }
                  ]}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : 'Adicionar'}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenModal: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  goalInfo: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDetails: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  goalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noAccountsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  noAccountsText: {
    fontSize: 14,
  },
  accountsScroll: {
    marginBottom: 20,
    marginHorizontal: 0,
  },
  accountsList: {
    paddingHorizontal: 0,
    gap: 8,
  },
  accountCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 110,
    marginRight: 8,
    position: 'relative',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
