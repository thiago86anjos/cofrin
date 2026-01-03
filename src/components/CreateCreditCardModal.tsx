import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { useCreditCards } from '../hooks/useCreditCards';
import { useAccounts } from '../hooks/useAccounts';
import { spacing, borderRadius } from '../theme';
import { CreditCard } from '../types/firebase';
import DayPicker from './DayPicker';

// Cores predefinidas para cartões
const CARD_COLORS = [
  { color: '#6366F1', label: 'Roxo' },
  { color: '#2FAF8E', label: 'Verde' },
  { color: '#E07A3F', label: 'Laranja' },
  { color: '#3B82F6', label: 'Azul' },
  { color: '#F59E0B', label: 'Amarelo' },
  { color: '#8B5CF6', label: 'Violeta' },
  { color: '#EF4444', label: 'Vermelho' },
  { color: '#6B7280', label: 'Cinza' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: (id: string) => void;
  /** Cartão para editar (se fornecido, modal entra em modo edição) */
  editCard?: CreditCard | null;
}

export default function CreateCreditCardModal({ 
  visible, 
  onClose, 
  onSave, 
  onDelete,
  editCard,
}: Props) {
  const { colors } = useAppTheme();
  const { activeCards, createCreditCard, updateCreditCard } = useCreditCards();
  const { activeAccounts } = useAccounts();

  const activeAccountIds = activeAccounts.map(a => a.id).join('|');

  const isEditMode = !!editCard;

  // Form state
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [cardColor, setCardColor] = useState('#6366F1');
  const [saving, setSaving] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Reset form when modal opens or editCard changes
  useEffect(() => {
    if (visible) {
      setError('');
      if (editCard) {
        // Modo edição: preencher com dados do cartão
        const account = activeAccounts.find(a => a.id === editCard.paymentAccountId);
        setName(editCard.name);
        setLimit(editCard.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setClosingDay(editCard.closingDay.toString());
        setDueDay(editCard.dueDay.toString());
        setAccountId(editCard.paymentAccountId || '');
        setAccountName(account?.name || '');
        setCardColor(editCard.color || '#6366F1');
      } else {
        // Modo criação: resetar e definir conta padrão
        setName('');
        setLimit('');
        setClosingDay('');
        setDueDay('');
        setCardColor('#6366F1');
        
        // Definir conta padrão se houver apenas uma
        if (activeAccounts.length === 1) {
          setAccountId(activeAccounts[0].id);
          setAccountName(activeAccounts[0].name);
        } else {
          setAccountId('');
          setAccountName('');
        }
      }
      setShowAccountPicker(false);
    }
  }, [visible, editCard?.id, activeAccountIds, activeAccounts.length]);

  const canConfirm = name.trim().length > 0 && parseValue(limit) > 0 && accountId;

  // Formatar valor monetário para exibição
  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    const numValue = parseInt(numbers, 10) / 100;
    return numValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Converter string de valor para número
  function parseValue(value: string): number {
    let cleaned = value.replace(/[^\d,.]/g, '');
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Informe o nome do cartão');
      return;
    }

    if (parseValue(limit) <= 0) {
      setError('Informe o limite do cartão');
      return;
    }

    if (!accountId) {
      setError('Selecione a conta de pagamento');
      return;
    }

    const closingDayNum = parseInt(closingDay) || 1;
    const dueDayNum = parseInt(dueDay) || 10;

    if (closingDayNum < 1 || closingDayNum > 31 || dueDayNum < 1 || dueDayNum > 31) {
      setError('Os dias devem estar entre 1 e 31');
      return;
    }

    // Verificar nome duplicado
    const nameExists = activeCards.some(
      card => (isEditMode ? card.id !== editCard?.id : true) && 
              card.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists) {
      setError('Já existe um cartão com esse nome');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      if (isEditMode && editCard) {
        // Atualizar cartão existente
        await updateCreditCard(editCard.id, {
          name: name.trim(),
          limit: parseValue(limit),
          closingDay: closingDayNum,
          dueDay: dueDayNum,
          color: cardColor,
          paymentAccountId: accountId || undefined,
        });
      } else {
        // Criar novo cartão
        await createCreditCard({
          name: name.trim(),
          icon: 'credit-card',
          color: cardColor,
          limit: parseValue(limit),
          closingDay: closingDayNum,
          dueDay: dueDayNum,
          paymentAccountId: accountId,
          isArchived: false,
        });
      }
      onSave?.();
      onClose();
    } catch (err) {
      setError('Erro ao salvar cartão');
      console.error('Erro ao salvar cartão:', err);
    } finally {
      setSaving(false);
    }
  }, [name, limit, closingDay, dueDay, accountId, cardColor, activeCards, createCreditCard, updateCreditCard, onSave, onClose, isEditMode, editCard]);

  const handleDelete = useCallback(() => {
    if (!editCard || !onDelete) return;
    onClose();
    onDelete(editCard.id);
  }, [editCard, onDelete, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.iconCircle, { backgroundColor: cardColor + '20' }]}>
                <MaterialCommunityIcons name="credit-card" size={20} color={cardColor} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {isEditMode ? 'Editar Cartão' : 'Novo Cartão'}
              </Text>
            </View>
          </View>

          <ScrollView 
            style={styles.formScroll} 
            contentContainerStyle={{ paddingBottom: spacing.md }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Erro */}
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.expense + '15' }]}>
                <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
              </View>
            ) : null}

            {/* Nome */}
            <View style={styles.formRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nome do cartão"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.nameInput,
                  { 
                    color: colors.text, 
                    borderBottomColor: focusedField === 'name' ? colors.primary : colors.border 
                  },
                  Platform.select({ web: { outlineStyle: 'none' } as any }),
                ]}
              />
            </View>

            {/* Limite */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Limite</Text>
              <View style={[
                styles.limitInput,
                { 
                  borderColor: focusedField === 'limit' ? colors.primary : colors.border,
                  backgroundColor: colors.bg,
                }
              ]}>
                <Text style={[styles.currency, { color: colors.textMuted }]}>R$</Text>
                <TextInput
                  value={limit}
                  onChangeText={(v) => setLimit(formatCurrency(v))}
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  onFocus={() => setFocusedField('limit')}
                  onBlur={() => setFocusedField(null)}
                  style={[
                    styles.limitTextInput,
                    { color: colors.text },
                    Platform.select({ web: { outlineStyle: 'none' } as any }),
                  ]}
                />
              </View>
            </View>

            {/* Dias */}
            <View style={styles.section}>
              <View style={styles.daysRow}>
                <View style={styles.dayColumn}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Fechamento</Text>
                  <DayPicker
                    value={closingDay}
                    onChange={setClosingDay}
                    placeholder="Dia"
                    focused={focusedField === 'closingDay'}
                    onFocus={() => setFocusedField('closingDay')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={styles.dayColumn}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Vencimento</Text>
                  <DayPicker
                    value={dueDay}
                    onChange={setDueDay}
                    placeholder="Dia"
                    focused={focusedField === 'dueDay'}
                    onFocus={() => setFocusedField('dueDay')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>

            {/* Conta de pagamento */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Conta de pagamento</Text>
              {!showAccountPicker ? (
                <Pressable 
                  onPress={() => setShowAccountPicker(true)}
                  style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.bg }]}
                >
                  <Text style={[styles.selectText, { color: accountName ? colors.text : colors.textMuted }]}>
                    {accountName || 'Selecione a conta'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                </Pressable>
              ) : (
                <View style={[styles.accountList, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                  {activeAccounts.map((account) => (
                    <Pressable
                      key={account.id}
                      onPress={() => {
                        setAccountId(account.id);
                        setAccountName(account.name);
                        setShowAccountPicker(false);
                      }}
                      style={[
                        styles.accountOption,
                        { borderBottomColor: colors.border },
                        accountId === account.id && { backgroundColor: colors.primaryBg },
                      ]}
                    >
                      <Text style={[styles.accountText, { color: colors.text }]}>{account.name}</Text>
                      {accountId === account.id && (
                        <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Cores */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Cor</Text>
              <View style={styles.colorGrid}>
                {CARD_COLORS.map((item) => (
                  <Pressable
                    key={item.color}
                    onPress={() => setCardColor(item.color)}
                    style={[
                      styles.colorOption,
                      { backgroundColor: item.color },
                      cardColor === item.color && styles.colorOptionSelected,
                    ]}
                  >
                    {cardColor === item.color && (
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Botões */}
          <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
            {isEditMode && onDelete && editCard && (
              <Pressable
                onPress={handleDelete}
                disabled={saving}
                style={[styles.deleteButton, { borderColor: colors.border, backgroundColor: colors.bg }]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.bg }]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || !canConfirm}
              style={[
                styles.saveButton,
                { backgroundColor: cardColor },
                (saving || !canConfirm) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvando...' : isEditMode ? 'Salvar' : 'Criar'}
              </Text>
            </Pressable>
          </View>
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
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  formScroll: {
    maxHeight: 450,
  },
  errorContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  formRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nameInput: {
    fontSize: 16,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  limitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  currency: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  limitTextInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dayColumn: {
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  selectText: {
    fontSize: 14,
  },
  accountList: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  accountText: {
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
