/**
 * CategoryPicker - Componente para seleção e criação de categorias
 * Extraído do AddTransactionModal para melhor organização
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';
import { Category, CreateCategoryInput, CATEGORY_ICONS } from '../../../types/firebase';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: string;
  transactionType: 'despesa' | 'receita';
  onSelect: (categoryId: string, categoryName: string) => void;
  onClose: () => void;
  onCreateCategory: (data: CreateCategoryInput) => Promise<Category | null>;
  onShowSnackbar: (message: string) => void;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryBg: string;
    grayLight: string;
    expense: string;
    income: string;
  };
  insets: { bottom: number };
}

export default function CategoryPicker({
  categories,
  selectedCategoryId,
  transactionType,
  onSelect,
  onClose,
  onCreateCategory,
  onShowSnackbar,
  colors,
  insets,
}: CategoryPickerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const categoryType = transactionType === 'despesa' ? 'expense' : 'income';
  const typeColor = transactionType === 'despesa' ? colors.expense : colors.income;
  const availableIcons = CATEGORY_ICONS[categoryType];

  // Filtrar e organizar categorias hierarquicamente
  const filteredCategories = React.useMemo(() => {
    const allCategories = categories.filter(
      (c) => c.type === categoryType && !c.isMetaCategory && c.name !== 'Meta'
    );

    const rootCategories = allCategories.filter((c) => !c.parentId);
    const subcategories = allCategories.filter((c) => c.parentId);

    const organized: Array<{ category: Category; isSubcategory: boolean }> = [];
    rootCategories.forEach((parent) => {
      organized.push({ category: parent, isSubcategory: false });
      const children = subcategories.filter((sub) => sub.parentId === parent.id);
      children.forEach((child) => {
        organized.push({ category: child, isSubcategory: true });
      });
    });

    return organized;
  }, [categories, categoryType]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      onShowSnackbar('Digite um nome para a categoria');
      return;
    }
    if (!newCategoryIcon) {
      onShowSnackbar('Selecione um ícone para a categoria');
      return;
    }

    setSavingCategory(true);
    try {
      const categoryColor = typeColor || (transactionType === 'despesa' ? '#FF6B6B' : '#51CF66');

      const categoryData: CreateCategoryInput = {
        name: newCategoryName.trim(),
        type: categoryType,
        icon: newCategoryIcon,
      };

      if (categoryColor && typeof categoryColor === 'string') {
        categoryData.color = categoryColor;
      }

      const newCategory = await onCreateCategory(categoryData);

      if (newCategory) {
        onSelect(newCategory.id, newCategory.name);
        onShowSnackbar(`Categoria "${newCategory.name}" criada!`);
        setIsCreating(false);
        setNewCategoryName('');
        setNewCategoryIcon('');
        onClose();
      }
    } catch (error) {
      onShowSnackbar('Erro ao criar categoria');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleBack = () => {
    setIsCreating(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  // Modo de criação de categoria
  if (isCreating) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textMuted} />
            <Text style={[styles.title, { color: colors.text }]}>Nova Categoria</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Campo de nome */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Nome da categoria</Text>
            <View style={[styles.formInput, { borderColor: colors.border }]}>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder={
                  transactionType === 'despesa'
                    ? 'Ex: Streaming, Academia...'
                    : 'Ex: Freelance, Bônus...'
                }
                placeholderTextColor={colors.textMuted}
                style={[styles.formInputText, { color: colors.text }]}
                autoFocus
                maxLength={30}
              />
            </View>
          </View>

          {/* Seleção de ícone */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Escolha um ícone</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setNewCategoryIcon(icon)}
                  style={[
                    styles.iconOption,
                    {
                      borderColor: newCategoryIcon === icon ? typeColor : colors.border,
                      backgroundColor: newCategoryIcon === icon ? typeColor + '15' : 'transparent',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={22}
                    color={newCategoryIcon === icon ? typeColor : colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Preview */}
          {newCategoryName.trim() && newCategoryIcon && (
            <View style={[styles.preview, { borderColor: colors.border }]}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Preview:</Text>
              <View style={styles.previewChip}>
                <View style={[styles.previewIcon, { backgroundColor: typeColor + '20' }]}>
                  <MaterialCommunityIcons name={newCategoryIcon as any} size={16} color={typeColor} />
                </View>
                <Text style={[styles.previewName, { color: colors.text }]}>
                  {newCategoryName.trim()}
                </Text>
              </View>
            </View>
          )}

          {/* Botão de criar */}
          <Pressable
            onPress={handleCreateCategory}
            disabled={savingCategory || !newCategoryName.trim() || !newCategoryIcon}
            style={({ pressed }) => [
              styles.createButton,
              { backgroundColor: typeColor },
              (savingCategory || !newCategoryName.trim() || !newCategoryIcon) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            {savingCategory ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={styles.createButtonText}>Criar categoria</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Lista de categorias
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Selecionar Categoria</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Botão de criar nova categoria */}
        <Pressable
          onPress={() => setIsCreating(true)}
          style={({ pressed }) => [
            styles.createOption,
            { backgroundColor: pressed ? colors.primaryBg : 'transparent', borderColor: colors.primary },
          ]}
        >
          <View style={[styles.createIconCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.createOptionText, { color: colors.primary }]}>
            Nova categoria de {transactionType === 'despesa' ? 'despesa' : 'receita'}
          </Text>
        </Pressable>

        {/* Divisor */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Lista de categorias existentes */}
        {filteredCategories.map((item) => {
          const cat = item.category;
          const isSubcategory = item.isSubcategory;
          const categoryColor = cat.color || typeColor;

          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                onSelect(cat.id, cat.name);
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                selectedCategoryId === cat.id && { backgroundColor: colors.primaryBg },
                isSubcategory && { paddingLeft: spacing.xl + spacing.lg },
              ]}
            >
              <View style={styles.optionContent}>
                {isSubcategory ? (
                  <>
                    <MaterialCommunityIcons
                      name="subdirectory-arrow-right"
                      size={16}
                      color={colors.textMuted}
                      style={{ marginRight: spacing.xs }}
                    />
                    <View style={[styles.colorDot, { backgroundColor: categoryColor }]} />
                  </>
                ) : (
                  <View style={[styles.colorCircle, { backgroundColor: categoryColor }]}>
                    <MaterialCommunityIcons name={(cat.icon || 'tag') as any} size={18} color="#FFFFFF" />
                  </View>
                )}
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text, marginLeft: spacing.sm },
                    selectedCategoryId === cat.id && { color: colors.primary, fontWeight: '600' },
                    isSubcategory && { fontSize: 14 },
                  ]}
                >
                  {cat.name}
                </Text>
              </View>
              {selectedCategoryId === cat.id && (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 500,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formInputText: {
    fontSize: 15,
    outlineStyle: 'none',
  } as any,
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: 12,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  createIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
