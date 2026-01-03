import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { useCategories } from '../hooks/useCategories';
import { spacing, borderRadius } from '../theme';
import { CATEGORY_ICONS, CategoryType, Category } from '../types/firebase';

// Cores predefinidas para categorias
const PRESET_COLORS = [
  '#333333', '#6366f1', '#22c55e', '#f97316', '#f59e0b', '#94a3b8',
  '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#3b82f6', '#84cc16',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: (id: string) => void;
  initialType?: CategoryType;
  /** Categoria para editar (se fornecida, modal entra em modo edição) */
  editCategory?: Category | null;
}

export default function CreateCategoryModal({ visible, onClose, onSave, onDelete, initialType = 'expense', editCategory }: Props) {
  const { colors } = useAppTheme();
  const { createCategory, updateCategory } = useCategories();

  const isEditMode = !!editCategory;

  // Form state
  const [categoryType, setCategoryType] = useState<CategoryType>(initialType);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('food');
  const [color, setColor] = useState('#333333');
  const [saving, setSaving] = useState(false);
  const [showAllIcons, setShowAllIcons] = useState(false);

  // Reset form when modal opens or editCategory changes
  useEffect(() => {
    if (visible) {
      if (editCategory) {
        // Modo edição: preencher com dados da categoria
        setName(editCategory.name);
        setIcon(editCategory.icon || 'food');
        setColor(editCategory.color || '#333333');
        setCategoryType(editCategory.type);
      } else {
        // Modo criação: resetar
        setName('');
        setIcon('food');
        setColor('#333333');
        setCategoryType(initialType);
      }
      setShowAllIcons(false);
    }
  }, [visible, editCategory, initialType]);

  const canConfirm = name.trim().length > 0;

  // Ícones baseados no tipo selecionado
  const allIcons = CATEGORY_ICONS[categoryType] || CATEGORY_ICONS.expense;
  const inlineIcons = allIcons.slice(0, 5); // Primeiros 5 ícones

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      if (isEditMode && editCategory) {
        // Atualizar categoria existente
        await updateCategory(editCategory.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        // Criar nova categoria
        await createCategory({
          name: name.trim(),
          icon,
          color,
          type: categoryType,
        });
      }
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    } finally {
      setSaving(false);
    }
  }, [name, icon, color, categoryType, createCategory, updateCategory, onSave, onClose, isEditMode, editCategory]);

  const handleDelete = useCallback(async () => {
    if (!editCategory || !onDelete) return;
    
    // Fechar o modal primeiro, depois chamar onDelete (que pode mostrar confirmação)
    onClose();
    onDelete(editCategory.id);
  }, [editCategory, onDelete, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          {/* Header com tipo */}
          <View style={styles.header}>
            {!isEditMode ? (
              <View style={styles.typeSelector}>
                <Pressable
                  onPress={() => setCategoryType('expense')}
                  style={[
                    styles.typeButton,
                    { borderColor: categoryType === 'expense' ? colors.expense : colors.border },
                    categoryType === 'expense' && { backgroundColor: colors.expense + '15' },
                  ]}
                >
                  <MaterialCommunityIcons 
                    name="arrow-down" 
                    size={14} 
                    color={categoryType === 'expense' ? colors.expense : colors.textMuted} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    { color: categoryType === 'expense' ? colors.expense : colors.textMuted },
                  ]}>
                    Despesa
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setCategoryType('income')}
                  style={[
                    styles.typeButton,
                    { borderColor: categoryType === 'income' ? colors.income : colors.border },
                    categoryType === 'income' && { backgroundColor: colors.income + '15' },
                  ]}
                >
                  <MaterialCommunityIcons 
                    name="arrow-up" 
                    size={14} 
                    color={categoryType === 'income' ? colors.income : colors.textMuted} 
                  />
                  <Text style={[
                    styles.typeButtonText,
                    { color: categoryType === 'income' ? colors.income : colors.textMuted },
                  ]}>
                    Receita
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.editHeader}>
                <Text style={[styles.editHeaderText, { color: colors.text }]}>Editar Categoria</Text>
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.formScroll} 
            contentContainerStyle={{ paddingBottom: spacing.md }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Nome */}
            <View style={styles.formRow}>
              <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons 
                  name={icon as any} 
                  size={20} 
                  color={color} 
                />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nome da categoria"
                placeholderTextColor={colors.textMuted}
                autoFocus={!isEditMode}
                style={[
                  styles.nameInput,
                  { color: colors.text, borderBottomColor: colors.border },
                  Platform.select({ web: { outlineStyle: 'none' } as any }),
                ]}
              />
            </View>

            {/* Ícones */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Ícone</Text>
              <View style={styles.iconGrid}>
                {(showAllIcons ? allIcons : inlineIcons).map((iconName) => (
                  <Pressable
                    key={iconName}
                    onPress={() => setIcon(iconName)}
                    style={[
                      styles.iconOption,
                      { borderColor: icon === iconName ? colors.primary : colors.border },
                      icon === iconName && { backgroundColor: colors.primaryBg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={22}
                      color={icon === iconName ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
              {!showAllIcons && allIcons.length > 5 && (
                <Pressable 
                  onPress={() => setShowAllIcons(true)}
                  style={[styles.showMoreButton, { borderColor: colors.border }]}
                >
                  <MaterialCommunityIcons name="dots-grid" size={16} color={colors.textMuted} />
                  <Text style={[styles.showMoreText, { color: colors.textMuted }]}>Ver mais ícones</Text>
                </Pressable>
              )}
            </View>

            {/* Cores */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Cor</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((presetColor) => (
                  <Pressable
                    key={presetColor}
                    onPress={() => setColor(presetColor)}
                    style={[
                      styles.colorOption,
                      { backgroundColor: presetColor },
                      color === presetColor && styles.colorOptionSelected,
                    ]}
                  >
                    {color === presetColor && (
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Botões */}
          <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
            {isEditMode && onDelete && editCategory && (
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
                { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income },
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
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editHeader: {
    paddingVertical: spacing.xs,
  },
  editHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formScroll: {
    maxHeight: 400,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
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
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  showMoreText: {
    fontSize: 13,
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
