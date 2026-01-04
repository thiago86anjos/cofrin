import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { useCategories } from '../hooks/useCategories';
import { useCustomAlert } from '../hooks/useCustomAlert';
import { spacing, borderRadius } from '../theme';
import { CATEGORY_ICONS, CategoryType, Category } from '../types/firebase';
import CustomAlert from './CustomAlert';

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
  const { createCategory, updateCategory, createSubcategory, updateSubcategory, expenseCategories, incomeCategories } = useCategories();
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  const isEditMode = !!editCategory;

  // Form state
  const [categoryType, setCategoryType] = useState<CategoryType>(initialType);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('food');
  const [color, setColor] = useState('#333333');
  const [parentId, setParentId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showParentOptions, setShowParentOptions] = useState(false);
  const [iconsModalVisible, setIconsModalVisible] = useState(false);

  // Subcategorias (somente para categoria raiz)
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [pendingSubcategoryNames, setPendingSubcategoryNames] = useState<string[]>([]);

  const categoriesOfType = useMemo(() => {
    return categoryType === 'expense' ? expenseCategories : incomeCategories;
  }, [categoryType, expenseCategories, incomeCategories]);

  const rootCategories = useMemo(() => {
    return categoriesOfType
      .filter((cat) => !cat.parentId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesOfType]);

  const selectedParent = useMemo(() => {
    if (!parentId) return null;
    return rootCategories.find((c) => c.id === parentId) || null;
  }, [parentId, rootCategories]);

  const subcategories = useMemo(() => {
    if (!visible) return [];
    if (!isEditMode) return [];
    if (!editCategory) return [];
    if (editCategory.parentId) return [];
    return categoriesOfType
      .filter((c) => (c.parentId || '') === editCategory.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visible, isEditMode, editCategory, categoriesOfType]);

  const isEditingSubcategory = isEditMode && !!editCategory?.parentId;
  const isEditingRootCategory = isEditMode && !editCategory?.parentId;
  const isCreatingSubcategory = !isEditMode && parentId.trim().length > 0;
  const isSubcategoryMode = isCreatingSubcategory || isEditingSubcategory;
  const typeAccent = categoryType === 'expense' ? colors.expense : colors.income;

  // Reset form when modal opens or editCategory changes
  useEffect(() => {
    if (visible) {
      if (editCategory) {
        // Modo edição: preencher com dados da categoria
        setName(editCategory.name);
        setIcon(editCategory.icon || 'food');
        setColor(editCategory.color || '#333333');
        setCategoryType(editCategory.type);
        // Regra: categoria pai (raiz) não pode virar subcategoria via esta modal
        setParentId(editCategory.parentId ? String(editCategory.parentId) : '');
      } else {
        // Modo criação: resetar
        setName('');
        setIcon('food');
        setColor('#333333');
        setCategoryType(initialType);
        setParentId('');
      }
      setShowParentOptions(false);
      setIconsModalVisible(false);
      setShowAddSubcategory(false);
      setNewSubcategoryName('');
      setPendingSubcategoryNames([]);
    }
  }, [visible, editCategory, initialType]);

  // Se o tipo mudar em modo criação, limpar seleção de pai (evita mismatch)
  useEffect(() => {
    if (!visible) return;
    if (isEditMode) return;
    setParentId('');
    setShowParentOptions(false);
  }, [categoryType, isEditMode, visible]);

  // Ao selecionar categoria pai, aplicar regras de subcategoria (ícone/cor)
  useEffect(() => {
    if (!visible) return;
    if (!parentId) return;

    const parent = rootCategories.find((c) => c.id === parentId);
    const parentColor = parent?.color || typeAccent;
    setIcon('circle');
    setColor(parentColor);
  }, [parentId, rootCategories, typeAccent, visible]);

  const canConfirm = name.trim().length > 0;

  // Ícones baseados no tipo selecionado
  const allIcons = CATEGORY_ICONS[categoryType] || CATEGORY_ICONS.expense;

  function addPendingSubcategory() {
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();
    const existsInCurrent = subcategories.some((s) => s.name.toLowerCase() === normalized);
    const existsInPending = pendingSubcategoryNames.some((n) => n.toLowerCase() === normalized);
    if (existsInCurrent || existsInPending) {
      showAlert('Nome duplicado', 'Já existe uma subcategoria com esse nome.');
      return;
    }

    setPendingSubcategoryNames((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    setNewSubcategoryName('');
    setShowAddSubcategory(true);
  }

  function removePendingSubcategory(value: string) {
    setPendingSubcategoryNames((prev) => prev.filter((n) => n !== value));
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    const inlineSubName = newSubcategoryName.trim();
    const pendingInline = inlineSubName ? [inlineSubName] : [];
    const pendingAll = Array.from(new Set([...pendingSubcategoryNames, ...pendingInline]));

    // Se o usuário digitou mas não clicou no +, ainda assim validamos duplicidade antes de salvar
    if (inlineSubName) {
      const normalizedInline = inlineSubName.toLowerCase();
      const existsInCurrentSubs = subcategories.some((s) => s.name.toLowerCase() === normalizedInline);
      const existsInPending = pendingSubcategoryNames.some((n) => n.toLowerCase() === normalizedInline);
      if (existsInCurrentSubs || existsInPending) {
        showAlert('Nome duplicado', 'Já existe uma subcategoria com esse nome.');
        return;
      }
    }

    const normalizedName = name.trim().toLowerCase();
    const sameLevelParent = parentId || '';

    const nameExists = categoriesOfType.some((cat) => {
      if (isEditMode && editCategory && cat.id === editCategory.id) return false;
      const catParent = (cat.parentId || '') as string;
      const sameLevel = catParent === sameLevelParent;
      return sameLevel && cat.name.toLowerCase() === normalizedName;
    });

    if (nameExists) {
      showAlert(
        'Nome duplicado',
        parentId
          ? 'Já existe uma subcategoria com esse nome nessa categoria.'
          : `Já existe uma categoria de ${categoryType === 'expense' ? 'despesa' : 'receita'} com esse nome.`
      );
      return;
    }

    // Regra antiga: subcategoria sempre pertence a uma categoria pai
    if (isEditMode && editCategory?.parentId && !parentId) {
      showAlert('Categoria pai', 'Selecione uma categoria pai para a subcategoria.');
      return;
    }
    
    setSaving(true);
    try {
      const finalName = name.trim();

      if (isEditMode && editCategory) {
        const wasSubcategory = !!editCategory.parentId;

        if (wasSubcategory) {
          const parentColor = selectedParent?.color || typeAccent;
          await updateSubcategory(editCategory.id, {
            name: finalName,
            parentId: parentId,
            icon: 'circle',
            color: parentColor,
          });
        } else {
          // Atualizar categoria raiz
          await updateCategory(editCategory.id, {
            name: finalName,
            icon,
            color,
          });

          // Criar subcategorias pendentes (se houver)
          if (pendingAll.length > 0) {
            const parentColor = color || editCategory.color || typeAccent;
            for (const subName of pendingAll) {
              await createSubcategory(editCategory.id, {
                name: subName,
                icon: 'circle',
                color: parentColor,
                type: categoryType,
              });
            }
          }

          // Se a cor do pai mudou, sincronizar cor das subcategorias existentes
          const parentColorChanged = (color || '') !== (editCategory.color || '');
          if (parentColorChanged && subcategories.length > 0) {
            const parentColor = color || editCategory.color || typeAccent;
            await Promise.all(
              subcategories.map((sub) => updateSubcategory(sub.id, { color: parentColor, icon: 'circle' }))
            );
          }
        }
      } else {
        if (parentId.trim().length > 0) {
          const parentColor = selectedParent?.color || typeAccent;
          await createSubcategory(parentId, {
            name: name.trim(),
            icon: 'circle',
            color: parentColor,
            type: categoryType,
          });
        } else {
          const created = await createCategory({
            name: name.trim(),
            icon,
            color,
            type: categoryType,
          });

          if (created && pendingAll.length > 0) {
            const parentColor = color || typeAccent;
            for (const subName of pendingAll) {
              await createSubcategory(created.id, {
                name: subName,
                icon: 'circle',
                color: parentColor,
                type: categoryType,
              });
            }
          }
        }
      }
      onSave?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro ao salvar a categoria.';
      showAlert('Erro', message);
    } finally {
      setSaving(false);
    }
  }, [
    name,
    icon,
    color,
    categoryType,
    createCategory,
    updateCategory,
    createSubcategory,
    updateSubcategory,
    onSave,
    onClose,
    isEditMode,
    editCategory,
    categoriesOfType,
    parentId,
    showAlert,
    selectedParent,
    typeAccent,
    pendingSubcategoryNames,
    subcategories,
    newSubcategoryName,
  ]);

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
                <Text style={[styles.editHeaderText, { color: colors.text }]}>
                  {editCategory?.parentId ? 'Editar Subcategoria' : 'Editar Categoria'}
                </Text>
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
              <Pressable
                onPress={() => {
                  if (isSubcategoryMode) return;
                  setIconsModalVisible(true);
                }}
                disabled={isSubcategoryMode}
                style={[styles.iconCircle, { backgroundColor: color + '20', opacity: isSubcategoryMode ? 0.6 : 1 }]}
              >
                <MaterialCommunityIcons name={icon as any} size={20} color={color} />
              </Pressable>
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

            {/* Subcategoria: somente ao criar subcategoria ou editar subcategoria */}
            {(!isEditingRootCategory) && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {isSubcategoryMode ? 'Categoria pai' : 'Subcategoria'}
                </Text>
                <Pressable
                  onPress={() => setShowParentOptions((prev) => !prev)}
                  style={[styles.parentSelector, { borderColor: colors.border, backgroundColor: colors.bg }]}
                >
                  <Text style={[styles.parentSelectorText, { color: colors.text }]} numberOfLines={1}>
                    {selectedParent ? selectedParent.name : (isSubcategoryMode ? 'Selecione a categoria pai' : 'Nenhuma (categoria raiz)')}
                  </Text>
                  <MaterialCommunityIcons name={showParentOptions ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>

                {showParentOptions && (
                  <View style={[styles.parentOptions, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    {/* Ao criar, permite criar categoria raiz */}
                    {!isEditMode && (
                      <Pressable
                        onPress={() => {
                          setParentId('');
                          setShowParentOptions(false);
                        }}
                        style={styles.parentOptionRow}
                      >
                        <Text style={[styles.parentOptionText, { color: colors.text }]}>Nenhuma (categoria raiz)</Text>
                        {!parentId && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </Pressable>
                    )}

                    {rootCategories
                      .filter((c) => !editCategory || c.id !== editCategory.id)
                      .map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setParentId(c.id);
                            setShowParentOptions(false);
                          }}
                          style={styles.parentOptionRow}
                        >
                          <Text style={[styles.parentOptionText, { color: colors.text }]} numberOfLines={1}>
                            {c.name}
                          </Text>
                          {parentId === c.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                        </Pressable>
                      ))}

                    {rootCategories.length === 0 && (
                      <View style={styles.parentOptionRow}>
                        <Text style={[styles.parentOptionText, { color: colors.textMuted }]}>Nenhuma categoria pai disponível</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Cores */}
            {!isSubcategoryMode && (
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
            )}

            {/* Subcategorias (categoria raiz - criar/editar) */}
            {!isSubcategoryMode && (
              <View style={styles.section}>
                <View style={styles.subHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>Subcategorias</Text>
                  <Pressable
                    onPress={() => setShowAddSubcategory((v) => !v)}
                    style={[styles.subHeaderAction, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  >
                    <MaterialCommunityIcons name={showAddSubcategory ? 'minus' : 'plus'} size={18} color={colors.textMuted} />
                  </Pressable>
                </View>

                {showAddSubcategory && (
                  <View style={[styles.addSubcategoryRow, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    <TextInput
                      value={newSubcategoryName}
                      onChangeText={setNewSubcategoryName}
                      placeholder="Nome da subcategoria"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.addSubcategoryInput, { color: colors.text }]}
                    />
                    <Pressable
                      onPress={addPendingSubcategory}
                      disabled={saving || !newSubcategoryName.trim()}
                      style={({ pressed }) => [
                        styles.addSubcategoryButton,
                        { opacity: (saving || !newSubcategoryName.trim()) ? 0.5 : (pressed ? 0.85 : 1) },
                      ]}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color={typeAccent} />
                    </Pressable>
                  </View>
                )}

                {pendingSubcategoryNames.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs }}>
                      {isEditMode ? 'Serão criadas ao salvar' : 'Serão criadas ao criar'}
                    </Text>
                    <View style={[styles.subcategoryList, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                      {pendingSubcategoryNames.map((n, idx) => (
                        <View
                          key={n}
                          style={[
                            styles.subcategoryRow,
                            { borderBottomColor: colors.border },
                            idx === pendingSubcategoryNames.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.subcategoryRowLeft}>
                            <View style={[styles.subcategoryDot, { backgroundColor: color || typeAccent }]} />
                            <Text style={[styles.subcategoryName, { color: colors.text }]} numberOfLines={1}>
                              {n}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => removePendingSubcategory(n)}
                            style={({ pressed }) => [styles.subcategoryAction, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {isEditMode && (
                  <View style={[styles.subcategoryList, { borderColor: colors.border, backgroundColor: colors.bg, marginTop: spacing.sm }]}>
                    {subcategories.length === 0 ? (
                      <View style={[styles.subcategoryRow, { borderBottomWidth: 0 }]}>
                        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Nenhuma subcategoria cadastrada.</Text>
                      </View>
                    ) : (
                      subcategories.map((sub, idx) => (
                        <View
                          key={sub.id}
                          style={[
                            styles.subcategoryRow,
                            { borderBottomColor: colors.border },
                            idx === subcategories.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.subcategoryRowLeft}>
                            <View style={[styles.subcategoryDot, { backgroundColor: color || typeAccent }]} />
                            <Text style={[styles.subcategoryName, { color: colors.text }]} numberOfLines={1}>
                              {sub.name}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
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

      {/* Modal de ícones (minimalista) */}
      <Modal
        visible={iconsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIconsModalVisible(false)}
      >
        <Pressable style={styles.iconsOverlay} onPress={() => setIconsModalVisible(false)}>
          <Pressable
            style={[styles.iconsCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.iconsHeader}>
              <Text style={[styles.iconsTitle, { color: colors.text }]}>Ícones</Text>
              <Pressable onPress={() => setIconsModalVisible(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.iconsGrid} showsVerticalScrollIndicator={false}>
              {allIcons.map((iconName) => {
                const selected = iconName === icon;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => {
                      setIcon(iconName);
                      setIconsModalVisible(false);
                    }}
                    style={[
                      styles.iconOption,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: colors.primaryBg },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={22}
                      color={selected ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomAlert {...alertState} onClose={hideAlert} />
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
  parentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  parentSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  parentOptions: {
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  parentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  parentOptionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeaderAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubcategoryRow: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  addSubcategoryInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  addSubcategoryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  subcategoryList: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  subcategoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  subcategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  subcategoryAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconsCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  iconsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  iconsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconsGrid: {
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
