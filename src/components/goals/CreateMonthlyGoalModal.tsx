import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/themeContext';
import { useCategories } from '../../hooks/useCategories';
import { spacing, borderRadius, palette } from '../../theme';

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
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Filtrar categorias por tipo e organizar pais/subcategorias
  const organizedCategories = useMemo(() => {
    const filtered = categories.filter(c => c.type === type);
    const parents = filtered.filter(c => !c.parentId);
    const result: any[] = [];
    
    parents.forEach(parent => {
      result.push(parent);
      const children = filtered.filter(c => c.parentId === parent.id);
      result.push(...children);
    });
    
    return result;
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {existingGoal ? 'Editar Meta Mensal' : 'Nova Meta Mensal'}
          </Text>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Tipo da Meta - ocultar quando editando */}
          {!existingGoal && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Tipo da meta</Text>
              <View style={styles.typeToggle}>
              <Pressable
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: type === 'expense' ? colors.expense : colors.card,
                    borderColor: type === 'expense' ? colors.expense : colors.border,
                  }
                ]}
                onPress={() => {
                  setType('expense');
                  setCategoryId('');
                }}
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
                  }
                ]}
                onPress={() => {
                  setType('income');
                  setCategoryId('');
                }}
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
          )}

          {/* Categoria */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Categoria</Text>
            
            {/* Botão que abre/fecha o picker */}
            <Pressable
              onPress={() => {
                if (!existingGoal) {
                  setShowCategoryPicker(!showCategoryPicker);
                }
              }}
              disabled={!!existingGoal}
              style={[
                styles.categorySelectButton,
                { 
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: existingGoal ? 0.5 : 1,
                }
              ]}
            >
              {selectedCategory ? (
                <>
                  <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={[styles.categorySelectText, { color: colors.text }]}>
                    {selectedCategory.name}
                  </Text>
                </>
              ) : (
                <Text style={[styles.categorySelectText, { color: colors.textMuted }]}>
                  Selecione uma categoria
                </Text>
              )}
              <MaterialCommunityIcons 
                name={showCategoryPicker ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textMuted}
              />
            </Pressable>

            {/* Dropdown de categorias */}
            {showCategoryPicker && (
              <ScrollView 
                style={[styles.categoryScroll, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {organizedCategories.map((category) => {
                  const isSelected = categoryId === category.id;
                  const isSubcategory = !!category.parentId;
                  
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => {
                        if (!existingGoal) {
                          setCategoryId(category.id);
                          setShowCategoryPicker(false);
                        }
                      }}
                      disabled={!!existingGoal}
                      style={[
                        styles.categoryOption,
                        { 
                          backgroundColor: isSelected ? colors.primaryBg : 'transparent',
                          opacity: existingGoal ? 0.5 : 1,
                          paddingLeft: isSubcategory ? spacing.xl + spacing.md : spacing.md,
                        }
                      ]}
                    >
                      {isSubcategory && (
                        <MaterialCommunityIcons 
                          name="subdirectory-arrow-right" 
                          size={16} 
                          color={colors.textMuted}
                          style={{ marginRight: spacing.xs }}
                        />
                      )}
                      <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          { color: colors.text },
                          isSelected && { fontWeight: '600', color: colors.primary },
                        ]}
                      >
                        {category.name}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons 
                          name="check" 
                          size={18} 
                          color={colors.primary}
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
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

          {/* Botões */}
          <View style={styles.buttonContainer}>
            {/* Botão Excluir (só aparece ao editar) - à esquerda */}
            {existingGoal && onDelete && (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={[
                  styles.deleteButton,
                  { borderColor: colors.border, backgroundColor: colors.card },
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
                { borderColor: colors.border, backgroundColor: colors.card }
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </Pressable>

            {/* Botão Criar/Salvar - à direita (principal) */}
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
                {existingGoal ? 'Salvar' : 'Criar'}
              </Text>
            </Pressable>
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  categorySelectText: {
    fontSize: 15,
    flex: 1,
  },
  categoryScroll: {
    maxHeight: 280,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  categoryOptionText: {
    fontSize: 15,
    flex: 1,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  createButton: {
    flex: 1,
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

