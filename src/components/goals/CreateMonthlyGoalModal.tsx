import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/themeContext';
import { useCategories } from '../../hooks/useCategories';
import { spacing, borderRadius } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { type: 'expense' | 'income'; categoryId: string; targetAmount: number }) => Promise<{ success: boolean; error?: string }>;
  existingGoal?: any;
  onDelete?: (goalId: string) => void;
}

export default function CreateMonthlyGoalModal({ visible, onClose, onSave, existingGoal, onDelete }: Props) {
  const { colors } = useAppTheme();
  const { categories } = useCategories();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtrar categorias por tipo
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const selectedCategory = categories.find(c => c.id === categoryId);

  useEffect(() => {
    if (!visible) {
      setType('expense');
      setCategoryId('');
      setAmount('');
      setError('');
      setFocusedField(null);
      setDeleting(false);
    } else if (existingGoal) {
      // Modo de edição: preencher com dados existentes
      setType(existingGoal.goalType || 'expense');
      setCategoryId(existingGoal.categoryId || '');
      // Converter targetAmount para centavos (o campo amount trabalha com centavos)
      const amountInCents = Math.round(existingGoal.targetAmount * 100);
      setAmount(amountInCents.toString());
      setError('');
    }
  }, [visible, existingGoal]);

  const formatNumberToCurrency = (num: number): string => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '');
    setAmount(cleaned);
  };

  const handleSave = async () => {
    if (!categoryId) {
      setError('Selecione uma categoria');
      return;
    }
    
    // O campo amount está em centavos (ex: "100" = R$ 1,00)
    const amountInCents = parseInt(amount);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      setError('Digite um valor válido para a meta');
      return;
    }
    
    // Converter centavos para reais
    const numAmount = amountInCents / 100;
    
    const result = await onSave({ type, categoryId, targetAmount: numAmount });
    
    if (result.success) {
      // Sucesso: o parent já fecha o modal
      // Não precisamos fazer nada aqui
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleDelete = async () => {
    if (!existingGoal || !onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete(existingGoal.id);
    } catch (error) {
      setError('Erro ao excluir meta');
      setDeleting(false);
    }
  };

  const formattedAmount = amount 
    ? formatNumberToCurrency(parseInt(amount) / 100)
    : '0,00';

  const canSave = categoryId && amount && parseInt(amount) > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View 
          style={[
            styles.modalHeader, 
            { 
              backgroundColor: colors.card,
              paddingTop: Math.max(insets.top, spacing.md),
            }
          ]}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {existingGoal ? 'Editar Meta Mensal' : 'Nova Meta Mensal'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.modalContent}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) }}
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Tipo da Meta */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tipo da meta</Text>
            <View style={styles.typeToggle}>
              <Pressable
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: type === 'expense' ? colors.expense : colors.card,
                    borderColor: type === 'expense' ? colors.expense : colors.border,
                    opacity: existingGoal ? 0.5 : 1,
                  }
                ]}
                onPress={() => {
                  if (!existingGoal) {
                    setType('expense');
                    setCategoryId('');
                  }
                }}
                disabled={!!existingGoal}
              >
                <MaterialCommunityIcons 
                  name="trending-down" 
                  size={20} 
                  color={type === 'expense' ? '#fff' : colors.text} 
                />
                <Text style={[
                  styles.typeText,
                  { color: type === 'expense' ? '#fff' : colors.text }
                ]}>
                  Despesa
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: type === 'income' ? colors.income : colors.card,
                    borderColor: type === 'income' ? colors.income : colors.border,
                    opacity: existingGoal ? 0.5 : 1,
                  }
                ]}
                onPress={() => {
                  if (!existingGoal) {
                    setType('income');
                    setCategoryId('');
                  }
                }}
                disabled={!!existingGoal}
              >
                <MaterialCommunityIcons 
                  name="trending-up" 
                  size={20} 
                  color={type === 'income' ? '#fff' : colors.text} 
                />
                <Text style={[
                  styles.typeText,
                  { color: type === 'income' ? '#fff' : colors.text }
                ]}>
                  Receita
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Categoria */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Categoria</Text>
            {selectedCategory ? (
              <Pressable
                style={[styles.selectedCategoryCard, { backgroundColor: colors.card, opacity: existingGoal ? 0.5 : 1 }]}
                onPress={() => {
                  if (!existingGoal) {
                    setCategoryId('');
                  }
                }}
                disabled={!!existingGoal}
              >
                <View style={[styles.categoryIconContainer, { backgroundColor: selectedCategory.color + '15' }]}>
                  <MaterialCommunityIcons 
                    name={selectedCategory.icon as any} 
                    size={24} 
                    color={selectedCategory.color} 
                  />
                </View>
                <Text style={[styles.selectedCategoryName, { color: colors.text }]}>
                  {selectedCategory.name}
                </Text>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.categoryGrid}>
                {filteredCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      { 
                        backgroundColor: colors.card,
                        borderColor: categoryId === category.id ? colors.primary : colors.border,
                        opacity: existingGoal ? 0.5 : 1,
                      }
                    ]}
                    onPress={() => {
                      if (!existingGoal) {
                        setCategoryId(category.id);
                      }
                    }}
                    disabled={!!existingGoal}
                  >
                    <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '15' }]}>
                      <MaterialCommunityIcons 
                        name={category.icon as any} 
                        size={18} 
                        color={category.color} 
                      />
                    </View>
                    <Text 
                      style={[styles.categoryName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Valor */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Valor da meta</Text>
            <View style={[
              styles.amountInputContainer,
              {
                backgroundColor: colors.card,
                borderColor: focusedField === 'amount' ? colors.primary : colors.border,
              }
            ]}>
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>R$</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={formattedAmount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocusedField('amount')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Limite para {type === 'expense' ? 'gastar' : 'receber'} neste mês
            </Text>
          </View>

          {/* Botão Excluir (só aparece ao editar) */}
          {existingGoal && onDelete && (
            <View style={styles.section}>
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteButton,
                  { borderColor: colors.danger },
                  deleting && { opacity: 0.6 }
                ]}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                  {deleting ? 'Excluindo...' : 'Excluir meta'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Botão Criar/Salvar Meta */}
          <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={[
                styles.createButton,
                { backgroundColor: colors.primary },
                !canSave && { opacity: 0.6 }
              ]}
            >
              <Text style={styles.createButtonText}>
                {existingGoal ? 'Salvar Alterações' : 'Criar Meta'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedCategoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: spacing.md,
  },
  helperText: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomButtonContainer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  createButton: {
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

