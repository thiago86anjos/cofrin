import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { useAuth } from "../contexts/authContext";
import { spacing, borderRadius, getShadow } from "../theme";
import { useCategories } from "../hooks/useCategories";
import { useCustomAlert, useSnackbar } from "../hooks";
import { CategoryType, CATEGORY_ICONS, Category } from "../types/firebase";
import CustomAlert from "../components/CustomAlert";
import Snackbar from "../components/Snackbar";
import MainLayout from "../components/MainLayout";
import SimpleHeader from "../components/SimpleHeader";

export default function Categories({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [saving, setSaving] = useState(false);
  
  // Modal unificado para criar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Estados unificados do formulário
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState<string>('food');
  const [categoryColor, setCategoryColor] = useState<string>('');
  const [categoryParentId, setCategoryParentId] = useState<string>('');
  
  // Estado para controle de foco dos inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Estado para subcategorias no modal
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryIcon, setNewSubcategoryIcon] = useState<string>('food');
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [parentSelectOpen, setParentSelectOpen] = useState(false);
  const [pendingSubcategoryNames, setPendingSubcategoryNames] = useState<string[]>([]);
  
  // Modal de transferência de lançamentos
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferSourceName, setTransferSourceName] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferTargetCategories, setTransferTargetCategories] = useState<Category[]>([]);
  const [transferCount, setTransferCount] = useState(0);
  const [transferSelectOpen, setTransferSelectOpen] = useState(false);
  
  // Estado para edição de subcategorias
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState('');
  const [editingSubcategoryIcon, setEditingSubcategoryIcon] = useState<string>('food');
  const [editingSubcategoryParentId, setEditingSubcategoryParentId] = useState<string>('');

  // Hook de categorias do Firebase
  const { 
    expenseCategories, 
    incomeCategories, 
    loading, 
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    getSubcategories,
    deleteCategoryWithSubs,
    updateSubcategory,
    refresh,
  } = useCategories();

  // Resetar estados do modal
  function resetModalState() {
    setCategoryName('');
    setCategoryIcon(categoryType === 'expense' ? 'food' : 'briefcase');
    setCategoryColor('');
    setCategoryParentId('');
    setEditingCategory(null);
    setFocusedField(null);
    setSubcategories([]);
    setNewSubcategoryName('');
    setNewSubcategoryIcon('food');
    setShowAddSubcategory(false);
    setParentSelectOpen(false);
    setPendingSubcategoryNames([]);
    setTransferModalVisible(false);
    setTransferSourceId('');
    setTransferSourceName('');
    setTransferTargetId('');
    setTransferTargetCategories([]);
    setTransferCount(0);
    setTransferSelectOpen(false);
    setEditingSubcategoryId(null);
    setEditingSubcategoryName('');
    setEditingSubcategoryIcon('food');
    setEditingSubcategoryParentId('');
  }

  // Abrir modal para criar categoria raiz
  function openCreateModal() {
    resetModalState();
    setIsCreateMode(true);
    setModalVisible(true);
  }


  // Abrir modal para editar categoria
  async function openEditModal(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryColor(category.color || '');
    setCategoryParentId(category.parentId || '');
    setIsCreateMode(false);
    setModalVisible(true);
    setShowAddSubcategory(false);
    setParentSelectOpen(false);
    setNewSubcategoryName('');
    setPendingSubcategoryNames([]);
    
    // Carregar subcategorias desta categoria
    if (user?.uid && !category.parentId) {
      setLoadingSubcategories(true);
      try {
        const subs = await getSubcategories(category.id);
        setSubcategories(subs);
      } catch (error) {
        console.error('Erro ao carregar subcategorias:', error);
      } finally {
        setLoadingSubcategories(false);
      }
    }
  }

  // Verificar se houve alterações nos dados da categoria
  function hasChanges(): boolean {
    if (!editingCategory) return false;
    return (
      categoryName.trim() !== editingCategory.name ||
      categoryIcon !== editingCategory.icon ||
      (categoryColor || '') !== (editingCategory.color || '') ||
      (categoryParentId || '') !== (editingCategory.parentId || '')
    );
  }

  function hasPendingSubcategories(): boolean {
    return pendingSubcategoryNames.length > 0;
  }

  function addPendingSubcategory() {
    const name = newSubcategoryName.trim();
    if (!name) return;

    const normalized = name.toLowerCase();
    const existsInCurrent = subcategories.some((s) => s.name.toLowerCase() === normalized);
    const existsInPending = pendingSubcategoryNames.some((n) => n.toLowerCase() === normalized);

    if (existsInCurrent || existsInPending) {
      showAlert('Nome duplicado', 'Já existe uma subcategoria com esse nome.');
      return;
    }

    setPendingSubcategoryNames((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
    setNewSubcategoryName('');
    setShowAddSubcategory(true);
  }

  function removePendingSubcategory(name: string) {
    setPendingSubcategoryNames((prev) => prev.filter((n) => n !== name));
  }

  async function persistPendingSubcategories(parentId: string, parentColor: string) {
    if (!user?.uid) return;
    if (pendingSubcategoryNames.length === 0) return;

    setLoadingSubcategories(true);
    try {
      const { createSubcategory: createSubcategoryService } = await import('../services/categoryService');
      for (const name of pendingSubcategoryNames) {
        await createSubcategoryService(user.uid, parentId, {
          name,
          icon: 'circle',
          type: categoryType,
          color: parentColor,
        });
      }
      setPendingSubcategoryNames([]);
      await refresh();
      const subs = await getSubcategories(parentId);
      setSubcategories(subs);
    } finally {
      setLoadingSubcategories(false);
    }
  }

  async function handleCreate() {
    if (!categoryName.trim()) return;

    const allCategoriesOfType = categoryType === 'expense' ? expenseCategories : incomeCategories;
    const normalizedName = categoryName.trim().toLowerCase();
    const parentId = categoryParentId || '';
    
    // Verificar se já existe uma categoria/subcategoria com o mesmo nome no mesmo nível
    const nameExists = allCategoriesOfType.some((cat) => {
      const sameLevel = (cat.parentId || '') === parentId;
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
    
    setSaving(true);
    try {
      const payload = {
        name: categoryName.trim(),
        icon: categoryIcon,
        type: categoryType,
        color: categoryColor || undefined,
      };

      const isCreatingRootCategory = !categoryParentId;

      const result = categoryParentId
        ? await createSubcategory(categoryParentId, payload)
        : await createCategory(payload);

      if (result && isCreatingRootCategory) {
        const parentColor = (categoryColor || defaultAccent);
        await persistPendingSubcategories(result.id, parentColor);
      }

      if (result) {
        resetModalState();
        setModalVisible(false);
        showSnackbar('Categoria criada com sucesso!');
      } else {
        showAlert('Erro', 'Não foi possível criar a categoria');
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao criar a categoria');
    } finally {
      setSaving(false);
    }
  }

  // Iniciar edição de subcategoria
  function startEditSubcategory(subcategory: Category) {
    setEditingSubcategoryId(subcategory.id);
    setEditingSubcategoryName(subcategory.name);
    setEditingSubcategoryIcon(subcategory.icon);
    setEditingSubcategoryParentId(subcategory.parentId || '');
  }

  // Cancelar edição de subcategoria
  function cancelEditSubcategory() {
    setEditingSubcategoryId(null);
    setEditingSubcategoryName('');
    setEditingSubcategoryIcon('food');
    setEditingSubcategoryParentId('');
  }

  // Salvar edição de subcategoria
  async function handleUpdateSubcategory() {
    if (!editingSubcategoryId || !editingSubcategoryName.trim()) return;
    
    // Verificar se já existe subcategoria com esse nome (exceto a própria)
    const nameExists = subcategories.some(
      sub => sub.id !== editingSubcategoryId && 
             sub.name.toLowerCase() === editingSubcategoryName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', 'Já existe uma subcategoria com esse nome.');
      return;
    }
    
    setLoadingSubcategories(true);
    try {
      const updateData: { name: string; icon: string; parentId?: string } = {
        name: editingSubcategoryName.trim(),
        icon: editingSubcategoryIcon,
      };
      
      // Se mudou a categoria pai, incluir no update
      if (editingSubcategoryParentId && editingSubcategoryParentId !== editingCategory?.id) {
        updateData.parentId = editingSubcategoryParentId;
      }
      
      const result = await updateSubcategory(editingSubcategoryId, updateData);
      
      if (result) {
        // Se mudou de pai, remover da lista atual
        if (editingSubcategoryParentId && editingSubcategoryParentId !== editingCategory?.id) {
          setSubcategories(prev => prev.filter(s => s.id !== editingSubcategoryId));
          showSnackbar('Subcategoria movida para outra categoria!');
        } else {
          // Atualizar na lista local
          setSubcategories(prev => 
            prev.map(s => 
              s.id === editingSubcategoryId 
                ? { ...s, name: editingSubcategoryName.trim(), icon: editingSubcategoryIcon }
                : s
            ).sort((a, b) => a.name.localeCompare(b.name))
          );
          showSnackbar('Subcategoria atualizada!');
        }
        cancelEditSubcategory();
      } else {
        showAlert('Erro', 'Não foi possível atualizar a subcategoria');
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao atualizar a subcategoria');
    } finally {
      setLoadingSubcategories(false);
    }
  }

  // Deletar subcategoria
  async function handleDeleteSubcategory(subcategoryId: string, subcategoryName: string) {
    if (!editingCategory) return;
    
    // Verificar se há transações associadas
    try {
      const { getTransactionCountByCategory } = await import('../services/transactionService');
      
      if (!user?.uid) return;
      
      const transactionCount = await getTransactionCountByCategory(user.uid, subcategoryId);
      
      if (transactionCount > 0) {
        // Tem transações: transferir para categoria pai automaticamente
        const parentCategoryId = editingCategory.id;
        const parentCategoryName = editingCategory.name;
        
        showAlert(
          'Transferir lançamentos',
          `Esta subcategoria possui ${transactionCount} lançamento(s). Os lançamentos serão transferidos para a categoria pai "${parentCategoryName}". Deseja continuar?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Excluir', 
              style: 'destructive',
              onPress: async () => {
                await confirmDeleteSubcategoryWithTransfer(subcategoryId, subcategoryName, parentCategoryId, parentCategoryName);
              }
            },
          ]
        );
      } else {
        // Sem transações: confirmar exclusão direta
        showAlert(
          'Excluir subcategoria',
          `Deseja realmente excluir a subcategoria "${subcategoryName}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Excluir', 
              style: 'destructive',
              onPress: async () => {
                try {
                  const result = await deleteCategory(subcategoryId);
                  if (result) {
                    setSubcategories(prev => prev.filter(s => s.id !== subcategoryId));
                    showSnackbar('Subcategoria excluída!');
                  } else {
                    showAlert('Erro', 'Não foi possível excluir a subcategoria');
                  }
                } catch (error: any) {
                  showAlert('Erro', error.message || 'Erro ao excluir subcategoria');
                }
              }
            },
          ]
        );
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao verificar lançamentos da subcategoria');
    }
  }
  
  async function confirmDeleteSubcategoryWithTransfer(
    fromSubcategoryId: string,
    fromSubcategoryName: string,
    toTargetId: string,
    toTargetName: string
  ) {
    try {
      const { transferTransactionsToCategory } = await import('../services/categoryService');
      
      if (!user?.uid) {
        showAlert('Erro', 'Usuário não autenticado');
        return;
      }
      
      // Transferir transações
      const count = await transferTransactionsToCategory(user.uid, fromSubcategoryId, toTargetId);
      
      // Excluir subcategoria
      const result = await deleteCategory(fromSubcategoryId);
      
      if (result) {
        setSubcategories(prev => prev.filter(s => s.id !== fromSubcategoryId));
        showSnackbar(`${count} lançamento(s) transferidos e subcategoria excluída`);
      } else {
        showAlert('Erro', 'Não foi possível excluir a subcategoria');
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao excluir subcategoria');
    }
  }

  async function handleSaveEdit() {
    if (!editingCategory || !categoryName.trim()) return;

    const allCategoriesOfType = categoryType === 'expense' ? expenseCategories : incomeCategories;
    const normalizedName = categoryName.trim().toLowerCase();
    const parentId = categoryParentId || '';
    
    // Verificar se já existe outra categoria/subcategoria com o mesmo nome no mesmo nível
    const nameExists = allCategoriesOfType.some((cat) => {
      if (cat.id === editingCategory.id) return false;
      const sameLevel = (cat.parentId || '') === parentId;
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
    
    setSaving(true);
    try {
      const isSubcategoryEdit = !!editingCategory.parentId;

      if (isSubcategoryEdit) {
        if (!categoryParentId) {
          showAlert('Categoria pai', 'Selecione uma categoria pai para a subcategoria.');
          return;
        }

        const newParent = rootCategories.find((c) => c.id === categoryParentId);
        const syncedSubColor = (newParent?.color || defaultAccent);

        const result = await updateSubcategory(editingCategory.id, {
          name: categoryName.trim(),
          parentId: categoryParentId,
          icon: 'circle',
          color: syncedSubColor,
        });

        if (result) {
          resetModalState();
          setModalVisible(false);
          showSnackbar('Subcategoria atualizada!');
        } else {
          showAlert('Erro', 'Não foi possível atualizar a subcategoria');
        }
        return;
      }

      const shouldUpdateCategory = hasChanges();
      const parentColor = (categoryColor || editingCategory.color || defaultAccent);

      if (shouldUpdateCategory) {
        const result = await updateCategory(editingCategory.id, {
          name: categoryName.trim(),
          icon: categoryIcon,
          color: categoryColor || undefined,
        });

        if (!result) {
          showAlert('Erro', 'Não foi possível atualizar a categoria');
          return;
        }
      }

      // Criar subcategorias pendentes (se houver)
      await persistPendingSubcategories(editingCategory.id, parentColor);

      // Sincronizar cor das subcategorias existentes apenas quando a cor do pai mudou
      const parentColorChanged = (categoryColor || '') !== (editingCategory.color || '');
      if (parentColorChanged && subcategories.length > 0) {
        await Promise.all(
          subcategories.map((sub) => updateSubcategory(sub.id, { color: parentColor, icon: 'circle' }))
        );
      }

      resetModalState();
      setModalVisible(false);
      showSnackbar('Categoria atualizada!');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingCategory) return;
    
    const categoryId = editingCategory.id;
    const catName = editingCategory.name;
    
    // Fechar a modal primeiro
    setModalVisible(false);
    resetModalState();
    
    // Verificar se é uma categoria protegida
    const allCategoriesOfType = categoryType === 'expense' ? expenseCategories : incomeCategories;
    const category = allCategoriesOfType.find(c => c.id === categoryId);
    if (!category) return;
    
    if (category.name === 'Renda' && category.type === 'income') {
      showAlert('Ação não permitida', 'A categoria Renda não pode ser removida pois é essencial para o sistema.');
      return;
    }
    
    if (category.name === 'Outros') {
      showAlert('Ação não permitida', 'A categoria Outros não pode ser removida pois é essencial para o sistema.');
      return;
    }
    
    if (category.isMetaCategory || category.name === 'Meta') {
      showAlert('Ação não permitida', 'A categoria Meta não pode ser removida pois é usada para lançamentos de objetivos.');
      return;
    }
    
    // Verificar se há transações associadas
    try {
      const { getTransactionCountByCategory } = await import('../services/transactionService');
      
      if (!user?.uid) return;
      
      const transactionCount = await getTransactionCountByCategory(user.uid, categoryId);
      
      if (transactionCount > 0) {
        // Tem transações: converter categoria em subcategoria
        const allCategoriesOfType = categoryType === 'expense' ? expenseCategories : incomeCategories;
        const otherCategories = allCategoriesOfType.filter(c => c.id !== categoryId && c.name !== catName && !c.parentId);
        
        if (otherCategories.length === 0) {
          showAlert('Erro', 'Não é possível converter esta categoria pois não há outra categoria pai disponível.');
          return;
        }
        
        setTransferSourceId(categoryId);
        setTransferSourceName(catName);
        setTransferTargetCategories(otherCategories);
        setTransferCount(transactionCount);
        setTransferTargetId(otherCategories[0]?.id || '');
        setTransferModalVisible(true);
      } else {
        // Sem transações: confirmar exclusão direta
        showAlert(
          'Excluir categoria',
          `Deseja realmente excluir a categoria "${catName}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Excluir', 
              style: 'destructive',
              onPress: async () => {
                const result = await deleteCategory(categoryId);
                if (result) {
                  showSnackbar('Categoria excluída!');
                } else {
                  showAlert('Erro', 'Não foi possível excluir a categoria');
                }
              }
            },
          ]
        );
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao verificar lançamentos da categoria');
    }
  }
  
  async function confirmDeleteWithTransfer(
    fromCategoryId: string,
    fromCategoryName: string,
    toCategoryId: string,
    toCategoryName: string
  ) {
    try {
      if (!user?.uid) {
        showAlert('Erro', 'Usuário não autenticado');
        return;
      }
      
      // Buscar categoria destino para pegar cor
      const targetCategory = rootCategories.find(c => c.id === toCategoryId);
      if (!targetCategory) {
        showAlert('Erro', 'Categoria destino não encontrada');
        return;
      }
      
      // Converter categoria em subcategoria
      const result = await updateCategory(fromCategoryId, {
        parentId: toCategoryId,
        icon: 'circle',
        color: targetCategory.color || defaultAccent,
      });
      
      if (result) {
        await refresh();
        showSnackbar(`Categoria "${fromCategoryName}" convertida em subcategoria de "${toCategoryName}"`);
      } else {
        showAlert('Erro', 'Não foi possível converter a categoria');
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao converter categoria');
    }
  }

  const icons = CATEGORY_ICONS[categoryType];
  const allCategoriesOfType = categoryType === 'expense' ? expenseCategories : incomeCategories;
  const rootCategories = allCategoriesOfType.filter(cat => !cat.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const childrenByParentId = allCategoriesOfType.reduce<Record<string, Category[]>>((acc, cat) => {
    if (cat.parentId) {
      acc[cat.parentId] = acc[cat.parentId] || [];
      acc[cat.parentId].push(cat);
    }
    return acc;
  }, {});
  Object.values(childrenByParentId).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

  const defaultAccent = categoryType === 'expense' ? colors.expense : colors.income;
  const accentPalette = Array.from(
    new Set([
      colors.primary,
      colors.primaryLight,
      colors.success,
      colors.expense,
      colors.warning,
      colors.gray,
    ])
  );

  const effectiveAccent = categoryColor || defaultAccent;

  const isSubcategoryModal = !isCreateMode && !!editingCategory?.parentId;
  const isParentEditModal = !isCreateMode && !!editingCategory && !editingCategory.parentId;
  const isParentCreateModal = isCreateMode && !categoryParentId;

  const selectedParentCategory = isSubcategoryModal
    ? rootCategories.find((c) => c.id === categoryParentId)
    : undefined;

  return (
    <MainLayout>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header simples */}
      <SimpleHeader title="Categorias" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centeredContainer}>
          <View style={styles.content}>
            {/* Tipo de categoria */}
            <View style={styles.typeSelector}>
          <Pressable
            onPress={() => {
              setCategoryType('expense');
              setCategoryIcon('food');
            }}
            style={[
              styles.typeButton,
              { 
                backgroundColor: categoryType === 'expense' ? colors.expense : 'transparent',
                borderColor: colors.expense,
              },
            ]}
          >
            <MaterialCommunityIcons 
              name="arrow-down-circle" 
              size={18} 
              color={categoryType === 'expense' ? '#fff' : colors.expense} 
            />
            <Text style={[
              styles.typeButtonText,
              { color: categoryType === 'expense' ? '#fff' : colors.expense },
            ]}>
              Despesas
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCategoryType('income');
              setCategoryIcon('briefcase');
            }}
            style={[
              styles.typeButton,
              { 
                backgroundColor: categoryType === 'income' ? colors.income : 'transparent',
                borderColor: colors.income,
              },
            ]}
          >
            <MaterialCommunityIcons 
              name="arrow-up-circle" 
              size={18} 
              color={categoryType === 'income' ? '#fff' : colors.income} 
            />
            <Text style={[
              styles.typeButtonText,
              { color: categoryType === 'income' ? '#fff' : colors.income },
            ]}>
              Receitas
            </Text>
          </Pressable>
            </View>

            {/* Categorias existentes */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando categorias...</Text>
              </View>
            ) : rootCategories.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  Toque para editar
                </Text>
                <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={styles.treeList}>
                    {rootCategories.map((parent, parentIndex) => {
                      const subs = childrenByParentId[parent.id] || [];
                      const parentAccent = parent.color || defaultAccent;
                      const hasNextGroup = parentIndex < rootCategories.length - 1;
                      return (
                        <View
                          key={parent.id}
                          style={[
                            styles.treeGroup,
                            hasNextGroup && { borderBottomWidth: 1, borderBottomColor: colors.border },
                          ]}
                        >
                          <Pressable
                            onPress={() => openEditModal(parent)}
                            style={({ pressed }) => [styles.treeRow, pressed && { opacity: 0.85 }]}
                          >
                            <View style={[styles.treeIconCircle, { backgroundColor: parentAccent }]}>
                              <MaterialCommunityIcons name={parent.icon as any} size={18} color={colors.textInverse} />
                            </View>
                            <Text style={[styles.treeName, { color: colors.text }]}>{parent.name}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                          </Pressable>

                          {subs.map((sub) => {
                            return (
                              <Pressable
                                key={sub.id}
                                onPress={() => openEditModal(sub)}
                                style={({ pressed }) => [
                                  styles.subRow,
                                  { borderTopColor: colors.border },
                                  pressed && { opacity: 0.85 },
                                ]}
                              >
                                <View style={styles.subIndent} />
                                <View style={[styles.subIconCircle, { backgroundColor: parentAccent }]} />
                                <Text style={[styles.subName, { color: colors.textSecondary }]}>{sub.name}</Text>
                                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                              </Pressable>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={[styles.emptyCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <MaterialCommunityIcons name="tag-off-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Nenhuma categoria de {categoryType === 'expense' ? 'despesa' : 'receita'} cadastrada
                  </Text>
                </View>
              </View>
            )}

            {/* Botão para criar nova categoria */}
            <Pressable
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.actionRow,
                { backgroundColor: colors.card },
                getShadow(colors),
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryBg }]}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.primary }]}>Criar nova categoria</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modal Fullscreen de Criar/Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={[styles.fullscreenModal, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
          {/* Header moderno */}
          <View style={[styles.fullscreenHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isCreateMode ? 'Nova Categoria' : (isSubcategoryModal ? 'Editar Subcategoria' : 'Editar Categoria')}
            </Text>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.bg === '#FFFFFF' ? '#f0f0f0' : 'rgba(255,255,255,0.1)' },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            {/* Nome */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                {isSubcategoryModal ? 'Nome da subcategoria' : 'Nome da categoria'}
              </Text>
              <View style={[
                styles.inputContainer, 
                { 
                  borderColor: focusedField === 'name' ? (categoryType === 'expense' ? colors.expense : colors.income) : colors.border,
                  borderWidth: focusedField === 'name' ? 2 : 1,
                }
              ]}>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ex: Restaurantes, Academia..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input, 
                    { color: colors.text },
                    Platform.select({ web: { outlineStyle: 'none' } as any }),
                  ]}
                />
              </View>
            </View>

            {/* Ícone (apenas categoria raiz) */}
            {!isSubcategoryModal && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Ícone</Text>
                <View style={styles.iconGrid}>
                  {icons.map((icon) => (
                    <Pressable
                      key={icon}
                      onPress={() => setCategoryIcon(icon)}
                      style={[
                        styles.iconOption,
                        { 
                          borderColor: categoryIcon === icon 
                            ? (categoryType === 'expense' ? colors.expense : colors.income) 
                            : colors.border,
                        },
                        categoryIcon === icon && { 
                          backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '15' 
                        },
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={icon as any} 
                        size={22} 
                        color={categoryIcon === icon 
                          ? (categoryType === 'expense' ? colors.expense : colors.income) 
                          : colors.textMuted
                        } 
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Categoria pai (apenas ao editar subcategoria) */}
            {isSubcategoryModal && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Categoria pai</Text>
                <Pressable
                  onPress={() => setParentSelectOpen((v) => !v)}
                  style={({ pressed }) => [
                    styles.selectTrigger,
                    {
                      borderColor: parentSelectOpen
                        ? (selectedParentCategory?.color || defaultAccent)
                        : colors.border,
                      backgroundColor: colors.card,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                >
                  <View style={styles.selectTriggerLeft}>
                    <View
                      style={[
                        styles.selectDot,
                        { backgroundColor: selectedParentCategory?.color || defaultAccent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.selectTriggerText,
                        { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedParentCategory?.name || 'Selecione uma categoria'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={parentSelectOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>

                {parentSelectOpen && (
                  <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                      {rootCategories
                        .filter((cat) => cat.id !== editingCategory?.id)
                        .map((cat, idx, arr) => {
                          const selected = categoryParentId === cat.id;
                          const catAccent = cat.color || defaultAccent;
                          const isLast = idx === arr.length - 1;
                          return (
                            <Pressable
                              key={cat.id}
                              onPress={() => {
                                setCategoryParentId(cat.id);
                                setParentSelectOpen(false);
                              }}
                              style={({ pressed }) => [
                                styles.selectOption,
                                {
                                  backgroundColor: selected
                                    ? catAccent + '15'
                                    : 'transparent',
                                  opacity: pressed ? 0.9 : 1,
                                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                  borderBottomColor: colors.border,
                                },
                              ]}
                            >
                              <View style={[styles.selectDot, { backgroundColor: catAccent }]} />
                              <Text
                                style={[
                                  styles.selectOptionText,
                                  { color: selected ? colors.text : colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {cat.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Cor do ícone (apenas categoria raiz) */}
            {!isSubcategoryModal && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Cor</Text>
                <View style={styles.colorRow}>
                  {accentPalette.map((c, idx) => {
                    const selected = (categoryColor || defaultAccent) === c;
                    return (
                      <Pressable
                        key={`color-${idx}-${c}`}
                        onPress={() => setCategoryColor(c)}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: c,
                            borderColor: selected ? colors.text : 'transparent',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            {/* Subcategorias (criar/editar categoria pai) */}
            {(isParentEditModal || isParentCreateModal) && (
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Adicionar subcategoria</Text>
                  <Pressable
                    onPress={() => setShowAddSubcategory((v) => !v)}
                    style={({ pressed }) => [
                      styles.closeButton,
                      { width: 36, height: 36, borderRadius: 18, backgroundColor: effectiveAccent + '15' },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <MaterialCommunityIcons name={showAddSubcategory ? 'minus' : 'plus'} size={20} color={effectiveAccent} />
                  </Pressable>
                </View>

                {showAddSubcategory && (
                  <View style={styles.addSubcategoryForm}>
                    <View style={[
                      styles.inputContainer,
                      {
                        borderColor: focusedField === 'newSub' ? effectiveAccent : colors.border,
                        borderWidth: focusedField === 'newSub' ? 2 : 1,
                      },
                    ]}>
                      <TextInput
                        value={newSubcategoryName}
                        onChangeText={setNewSubcategoryName}
                        onFocus={() => setFocusedField('newSub')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Nome da subcategoria"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.input,
                          { color: colors.text },
                          Platform.select({ web: { outlineStyle: 'none' } as any }),
                        ]}
                      />
                      <Pressable
                        onPress={addPendingSubcategory}
                        disabled={loadingSubcategories || !newSubcategoryName.trim()}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 10,
                            opacity: (loadingSubcategories || !newSubcategoryName.trim()) ? 0.5 : 1,
                          },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <MaterialCommunityIcons name="plus" size={20} color={effectiveAccent} />
                      </Pressable>
                    </View>
                  </View>
                )}

                {pendingSubcategoryNames.length > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs }}>
                      Serão criadas ao salvar
                    </Text>
                    <View style={[styles.subcategoryList, { borderColor: colors.border }]}
                    >
                      {pendingSubcategoryNames.map((name, index) => (
                        <View
                          key={name}
                          style={[
                            styles.subcategoryItem,
                            { borderBottomColor: colors.border },
                            index === pendingSubcategoryNames.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.subcategoryContent}>
                            <View style={[styles.subcategoryDot, { backgroundColor: effectiveAccent }]} />
                            <Text style={[styles.subcategoryName, { color: colors.text }]}>{name}</Text>
                          </View>
                          <Pressable
                            onPress={() => removePendingSubcategory(name)}
                            style={({ pressed }) => [styles.subcategoryActionButton, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {isParentEditModal && loadingSubcategories ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Carregando subcategorias...</Text>
                ) : isParentEditModal && subcategories.length > 0 ? (
                  <View style={[styles.subcategoryList, { borderColor: colors.border, marginTop: spacing.sm }]}>
                    {subcategories.map((sub, index) => (
                      <Pressable
                        key={sub.id}
                        onPress={() => openEditModal(sub)}
                        style={({ pressed }) => [
                          styles.subcategoryItem,
                          { borderBottomColor: colors.border, opacity: pressed ? 0.85 : 1 },
                          index === subcategories.length - 1 && { borderBottomWidth: 0 },
                        ]}
                      >
                        <View style={styles.subcategoryContent}>
                          <View style={[styles.subcategoryDot, { backgroundColor: effectiveAccent }]} />
                          <Text style={[styles.subcategoryName, { color: colors.text }]}>{sub.name}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  isParentEditModal ? (
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Nenhuma subcategoria cadastrada.</Text>
                  ) : null
                )}
              </View>
            )}

            {/* Botões de ação */}
            <View style={styles.modalActionsColumn}>
              {/* Modo edição: Excluir e Salvar */}
              {!isCreateMode && (
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.deleteButton,
                      { borderColor: colors.expense },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={20} color={colors.expense} />
                    <Text style={[styles.actionButtonText, { color: colors.expense }]}>Excluir</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSaveEdit}
                    disabled={saving || !categoryName.trim() || (!hasChanges() && !hasPendingSubcategories())}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income, borderColor: categoryType === 'expense' ? colors.expense : colors.income },
                      pressed && { opacity: 0.9 },
                      (saving || !categoryName.trim() || (!hasChanges() && !hasPendingSubcategories())) && { opacity: 0.6 },
                    ]}
                  >
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                      {saving ? 'Salvando...' : 'Salvar'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Modo criação: Criar */}
              {isCreateMode && (
                <Pressable
                  onPress={handleCreate}
                  disabled={saving || !categoryName.trim()}
                  style={({ pressed }) => [
                    styles.createButton,
                    { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income },
                    pressed && { opacity: 0.9 },
                    (saving || !categoryName.trim()) && { opacity: 0.6 },
                  ]}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>
                    {saving ? 'Criando...' : 'Criar categoria'}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Transferência de Lançamentos */}
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setTransferModalVisible(false)}
        statusBarTranslucent
      >
        <View style={[styles.fullscreenModal, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
          <View style={[styles.fullscreenHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Transferir lançamentos
            </Text>
            <Pressable
              onPress={() => {
                setTransferModalVisible(false);
                setTransferSelectOpen(false);
              }}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.bg === '#FFFFFF' ? '#f0f0f0' : 'rgba(255,255,255,0.1)' },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalBody} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textMuted, fontSize: 14, fontWeight: '400' }]}>
                Esta categoria possui {transferCount} lançamento(s). Escolha uma categoria pai para converter esta categoria em subcategoria:
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Transferir para</Text>
              <Pressable
                onPress={() => setTransferSelectOpen((v) => !v)}
                style={({ pressed }) => [
                  styles.selectTrigger,
                  {
                    borderColor: transferSelectOpen ? colors.primary : colors.border,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.95 : 1,
                  },
                ]}
              >
                <View style={styles.selectTriggerLeft}>
                  <View
                    style={[
                      styles.selectDot,
                      { backgroundColor: transferTargetCategories.find(c => c.id === transferTargetId)?.color || defaultAccent },
                    ]}
                  />
                  <Text
                    style={[
                      styles.selectTriggerText,
                      { color: colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {transferTargetCategories.find(c => c.id === transferTargetId)?.name || 'Selecione uma categoria'}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={transferSelectOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>

              {transferSelectOpen && (
                <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                    {transferTargetCategories.map((cat, idx, arr) => {
                      const selected = transferTargetId === cat.id;
                      const catAccent = cat.color || defaultAccent;
                      const isLast = idx === arr.length - 1;
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => {
                            setTransferTargetId(cat.id);
                            setTransferSelectOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.selectOption,
                            {
                              backgroundColor: selected ? catAccent + '15' : 'transparent',
                              opacity: pressed ? 0.9 : 1,
                              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <View style={[styles.selectDot, { backgroundColor: catAccent }]} />
                          <Text
                            style={[
                              styles.selectOptionText,
                              { color: selected ? colors.text : colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.modalActionsColumn}>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setTransferModalVisible(false);
                    setTransferSelectOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    if (!transferTargetId) return;
                    const targetCat = transferTargetCategories.find(c => c.id === transferTargetId);
                    if (!targetCat) return;
                    
                    setTransferModalVisible(false);
                    setTransferSelectOpen(false);
                    
                    await confirmDeleteWithTransfer(transferSourceId, transferSourceName, targetCat.id, targetCat.name);
                  }}
                  disabled={!transferTargetId}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: colors.expense, borderColor: colors.expense },
                    pressed && { opacity: 0.9 },
                    !transferTargetId && { opacity: 0.6 },
                  ]}
                >
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <CustomAlert {...alertState} onClose={hideAlert} />
      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    padding: spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  sectionHint: {
    fontSize: 11,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
  treeList: {
    gap: spacing.xs,
  },
  treeGroup: {
    paddingVertical: spacing.xs,
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  treeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  treeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
  },
  subIndent: {
    width: 18,
  },
  subIconCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginRight: spacing.md,
  },
  subName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    width: 48,
    height: 48,
  },
  parentRow: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  parentOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  parentOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  // Ação estilo "Metas financeiras"
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal fullscreen
  fullscreenModal: {
    flex: 1,
    overflow: 'hidden',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    paddingTop: spacing.md,
  },
  modalActionsColumn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para gerenciamento de subcategorias no modal
  subcategoryList: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  subcategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  subcategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  selectTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  selectList: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  selectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subcategoryDeleteButton: {
    padding: 4,
  },
  subcategoryActionButton: {
    padding: 4,
  },
  addSubcategoryForm: {
    gap: spacing.sm,
  },
  miniIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  miniIconOption: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    width: 36,
    height: 36,
  },
  addSubcategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1.5,
  },
  addSubcategoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Estilos para edição de subcategorias
  editSubcategoryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editSubcategoryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSubcategoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  parentCategorySelector: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  parentCategorySelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  parentCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginRight: spacing.xs,
  },
  parentCategoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Removidos estilos antigos de hierarquia na lista
});
