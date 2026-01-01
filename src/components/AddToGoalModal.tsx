import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    Platform,
    ScrollView,
} from 'react-native';
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
  const [showDropdown, setShowDropdown] = useState(false);
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
    setShowDropdown(false);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Título */}
            <Text style={[styles.title, { color: colors.text }]}>Adicionar à meta</Text>

            {/* Seleção de conta */}
            <Text style={[styles.label, { color: colors.text }]}>Conta de origem</Text>
            {availableAccounts.length === 0 ? (
              <View style={[styles.noAccountsBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.noAccountsText, { color: colors.textMuted }]}>
                  Nenhuma conta com saldo disponível
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowDropdown(!showDropdown)}
                  style={[
                    styles.selectBox,
                    { 
                      backgroundColor: colors.bg,
                      borderColor: showDropdown ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <View style={styles.selectContent}>
                    <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.textMuted} />
                    <Text style={[styles.selectText, { color: selectedAccount ? colors.text : colors.textMuted }]}>
                      {selectedAccount ? `${selectedAccount.name} • ${formatCurrencyBRL(selectedAccount.balance)}` : 'Selecione uma conta'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={showDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.textMuted} 
                  />
                </Pressable>
              </>
            )}
            
            {/* Lista de contas (dropdown) - só aparece quando showDropdown é true */}
            {showDropdown && availableAccounts.length > 0 && (
              <ScrollView 
                style={styles.accountsDropdown}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {availableAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setSelectedAccountId(account.id);
                        setShowDropdown(false);
                      }}
                      style={[
                        styles.accountOption,
                        { 
                          backgroundColor: isSelected ? colors.primaryBg : 'transparent',
                          borderLeftColor: isSelected ? colors.primary : 'transparent',
                        }
                      ]}
                    >
                      <View style={styles.accountOptionContent}>
                        <Text style={[
                          styles.accountOptionName,
                          { color: colors.text, fontWeight: isSelected ? '600' : '400' }
                        ]}>
                          {account.name}
                        </Text>
                        <Text style={[styles.accountOptionBalance, { color: colors.textMuted }]}>
                          {formatCurrencyBRL(account.balance)}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Input de valor - esconder se meta completa */}
            {!isGoalComplete && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Valor do aporte</Text>
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
            <View style={styles.buttonContainer}>
              {/* Botão Cancelar */}
              <Pressable
                onPress={handleClose}
                style={[
                  styles.cancelButton,
                  { borderColor: colors.border, backgroundColor: colors.bg }
                ]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  {isGoalComplete ? 'Fechar' : 'Cancelar'}
                </Text>
              </Pressable>
              
              {/* Botão Adicionar - só aparece se meta não completa */}
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
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Salvando...' : 'Adicionar'}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
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
    maxWidth: 500,
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
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  noAccountsText: {
    fontSize: 14,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  selectText: {
    fontSize: 15,
    flex: 1,
  },
  accountsDropdown: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    maxHeight: 240,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  accountOptionContent: {
    flex: 1,
  },
  accountOptionName: {
    fontSize: 15,
    marginBottom: 2,
  },
  accountOptionBalance: {
    fontSize: 13,
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
    outlineStyle: 'none',
  } as any,
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
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
