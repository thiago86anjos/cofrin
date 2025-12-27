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
  
  // Estado para controle de foco dos inputs
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Estado para subcategorias no modal
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryIcon, setNewSubcategoryIcon] = useState<string>('food');
  
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
  } = useCategories();

  // Resetar estados do modal
  function resetModalState() {
    setCategoryName('');
    setCategoryIcon(categoryType === 'expense' ? 'food' : 'briefcase');
    setEditingCategory(null);
    setFocusedField(null);
    setSubcategories([]);
    setNewSubcategoryName('');
    setNewSubcategoryIcon('food');
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
    setIsCreateMode(false);
    setModalVisible(true);
    
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
      categoryIcon !== editingCategory.icon
    );
  }

  async function handleCreate() {
    if (!categoryName.trim()) return;
    
    // Verificar se já existe uma categoria com o mesmo nome
    const nameExists = currentCategories.some(
      cat => !cat.parentId && cat.name.toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', `Já existe uma categoria de ${categoryType === 'expense' ? 'despesa' : 'receita'} com esse nome.`);
      return;
    }
    
    setSaving(true);
    try {
      const result = await createCategory({
        name: categoryName.trim(),
        icon: categoryIcon,
        type: categoryType,
      });

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

  // Criar subcategoria dentro do modal de edição
  async function handleCreateSubcategory() {
    if (!editingCategory || !newSubcategoryName.trim()) return;
    
    // Verificar se já existe subcategoria com esse nome
    const nameExists = subcategories.some(
      sub => sub.name.toLowerCase() === newSubcategoryName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', 'Já existe uma subcategoria com esse nome.');
      return;
    }
    
    setLoadingSubcategories(true);
    try {
      const result = await createSubcategory(editingCategory.id, {
        name: newSubcategoryName.trim(),
        icon: newSubcategoryIcon,
        type: categoryType,
      });

      if (result) {
        setSubcategories(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
        setNewSubcategoryName('');
        setNewSubcategoryIcon(categoryType === 'expense' ? 'food' : 'briefcase');
        showSnackbar('Subcategoria criada!');
      } else {
        showAlert('Erro', 'Não foi possível criar a subcategoria');
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao criar a subcategoria');
    } finally {
      setLoadingSubcategories(false);
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
    // Verificar se há transações associadas
    try {
      const { getTransactionCountByCategory } = await import('../services/transactionService');
      
      if (!user?.uid) return;
      
      const transactionCount = await getTransactionCountByCategory(user.uid, subcategoryId);
      
      if (transactionCount > 0) {
        // Tem transações: mostrar opção de transferir
        // Buscar todas as categorias/subcategorias disponíveis (exceto a que será deletada)
        const allCategories = currentCategories.filter(c => c.id !== subcategoryId);
        const allSubcategories = subcategories.filter(s => s.id !== subcategoryId);
        const availableTargets = [...allCategories, ...allSubcategories];
        
        if (availableTargets.length === 0) {
          showAlert('Erro', 'Não é possível excluir esta subcategoria pois ela possui lançamentos e não há outra categoria disponível para transferi-los.');
          return;
        }
        
        // Mostrar modal de seleção de categoria
        showAlert(
          'Transferir lançamentos',
          `Esta subcategoria possui ${transactionCount} lançamento(s). Escolha uma categoria ou subcategoria para transferir esses lançamentos:`,
          [
            { text: 'Cancelar', style: 'cancel' },
            ...availableTargets.slice(0, 3).map(target => ({
              text: target.name,
              onPress: async () => {
                await confirmDeleteSubcategoryWithTransfer(subcategoryId, subcategoryName, target.id, target.name);
              }
            }))
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
    
    // Verificar se já existe outra categoria com o mesmo nome
    const nameExists = currentCategories.some(
      cat => cat.id !== editingCategory.id && 
             cat.name.toLowerCase() === categoryName.trim().toLowerCase()
    );
    if (nameExists) {
      showAlert('Nome duplicado', `Já existe uma categoria de ${categoryType === 'expense' ? 'despesa' : 'receita'} com esse nome.`);
      return;
    }
    
    setSaving(true);
    try {
      const result = await updateCategory(editingCategory.id, { 
        name: categoryName.trim(), 
        icon: categoryIcon 
      });
      if (result) {
        resetModalState();
        setModalVisible(false);
        showSnackbar('Categoria atualizada!');
      } else {
        showAlert('Erro', 'Não foi possível atualizar a categoria');
      }
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
    const category = currentCategories.find(c => c.id === categoryId);
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
        // Tem transações: mostrar opção de transferir
        const otherCategories = currentCategories.filter(c => c.id !== categoryId && c.name !== catName);
        
        if (otherCategories.length === 0) {
          showAlert('Erro', 'Não é possível excluir esta categoria pois ela possui lançamentos e não há outra categoria disponível para transferi-los.');
          return;
        }
        
        // Mostrar modal de seleção de categoria
        showAlert(
          'Transferir lançamentos',
          `Esta categoria possui ${transactionCount} lançamento(s). Escolha uma categoria para transferir esses lançamentos:`,
          [
            { text: 'Cancelar', style: 'cancel' },
            ...otherCategories.slice(0, 3).map(cat => ({
              text: cat.name,
              onPress: async () => {
                await confirmDeleteWithTransfer(categoryId, catName, cat.id, cat.name);
              }
            }))
          ]
        );
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
      const { transferTransactionsToCategory } = await import('../services/categoryService');
      
      if (!user?.uid) {
        showAlert('Erro', 'Usuário não autenticado');
        return;
      }
      
      // Transferir transações
      const count = await transferTransactionsToCategory(user.uid, fromCategoryId, toCategoryId);
      
      // Excluir categoria
      const result = await deleteCategory(fromCategoryId);
      
      if (result) {
        showSnackbar(`${count} lançamento(s) transferidos e categoria excluída`);
      } else {
        showAlert('Erro', 'Não foi possível excluir a categoria');
      }
    } catch (error: any) {
      showAlert('Erro', error.message || 'Erro ao excluir categoria');
    }
  }

  const icons = CATEGORY_ICONS[categoryType];
  // Mostrar apenas categorias raiz (sem parentId) na lista principal
  const currentCategories = (categoryType === 'expense' ? expenseCategories : incomeCategories).filter(cat => !cat.parentId);

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
            ) : currentCategories.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {categoryType === 'expense' ? 'CATEGORIAS DE DESPESA' : 'CATEGORIAS DE RECEITA'}
                </Text>
                <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                  Toque para editar
                </Text>
                <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={styles.categoriesGrid}>
                    {currentCategories.map((cat) => (
                      <Pressable 
                        key={cat.id} 
                        style={styles.categoryChip}
                        onPress={() => openEditModal(cat)}
                      >
                        <View style={[
                          styles.categoryIcon, 
                          { backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '20' }
                        ]}>
                          <MaterialCommunityIcons 
                            name={cat.icon as any} 
                            size={16} 
                            color={categoryType === 'expense' ? colors.expense : colors.income} 
                          />
                        </View>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                      </Pressable>
                    ))}
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
              {isCreateMode ? 'Nova Categoria' : 'Editar Categoria'}
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
              <Text style={[styles.label, { color: colors.text }]}>Nome da categoria</Text>
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

            {/* Ícone */}
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

            {/* Subcategorias - apenas no modo de edição e para categorias raiz */}
            {!isCreateMode && editingCategory && !editingCategory.parentId && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>Subcategorias</Text>
                
                {loadingSubcategories ? (
                  <View style={{ paddingVertical: spacing.md }}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>Carregando...</Text>
                  </View>
                ) : (
                  <>
                    {/* Lista de subcategorias existentes */}
                    {subcategories.length > 0 && (
                      <View style={[styles.subcategoryList, { borderColor: colors.border }]}>
                        {subcategories.map((sub) => (
                          <View key={sub.id} style={[styles.subcategoryItem, { borderBottomColor: colors.border }]}>
                            {editingSubcategoryId === sub.id ? (
                              // Modo edição
                              <View style={{ flex: 1 }}>
                                <View style={[styles.inputContainer, { borderColor: colors.border, marginBottom: spacing.sm }]}>
                                  <TextInput
                                    value={editingSubcategoryName}
                                    onChangeText={setEditingSubcategoryName}
                                    placeholder="Nome da subcategoria"
                                    placeholderTextColor={colors.textMuted}
                                    style={[styles.input, { color: colors.text }]}
                                  />
                                </View>
                                
                                {/* Mini grid de ícones */}
                                <View style={[styles.miniIconGrid, { marginBottom: spacing.sm }]}>
                                  {icons.slice(0, 8).map((icon) => (
                                    <Pressable
                                      key={icon}
                                      onPress={() => setEditingSubcategoryIcon(icon)}
                                      style={[
                                        styles.miniIconOption,
                                        { 
                                          borderColor: editingSubcategoryIcon === icon 
                                            ? (categoryType === 'expense' ? colors.expense : colors.income) 
                                            : colors.border,
                                        },
                                        editingSubcategoryIcon === icon && { 
                                          backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '15' 
                                        },
                                      ]}
                                    >
                                      <MaterialCommunityIcons 
                                        name={icon as any} 
                                        size={16} 
                                        color={editingSubcategoryIcon === icon 
                                          ? (categoryType === 'expense' ? colors.expense : colors.income) 
                                          : colors.textMuted
                                        } 
                                      />
                                    </Pressable>
                                  ))}
                                </View>
                                
                                {/* Seletor de categoria pai */}
                                <View style={[styles.parentCategorySelector, { borderColor: colors.border, backgroundColor: colors.card, marginBottom: spacing.sm }]}>
                                  <Text style={[styles.parentCategorySelectorLabel, { color: colors.textSecondary }]}>Categoria pai:</Text>
                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                    {currentCategories.map((cat) => (
                                      <Pressable
                                        key={cat.id}
                                        onPress={() => setEditingSubcategoryParentId(cat.id)}
                                        style={[
                                          styles.parentCategoryOption,
                                          { 
                                            borderColor: editingSubcategoryParentId === cat.id
                                              ? (categoryType === 'expense' ? colors.expense : colors.income)
                                              : colors.border,
                                            backgroundColor: editingSubcategoryParentId === cat.id
                                              ? (categoryType === 'expense' ? colors.expense : colors.income) + '15'
                                              : 'transparent',
                                          },
                                        ]}
                                      >
                                        <MaterialCommunityIcons 
                                          name={cat.icon as any} 
                                          size={14} 
                                          color={editingSubcategoryParentId === cat.id
                                            ? (categoryType === 'expense' ? colors.expense : colors.income)
                                            : colors.textMuted
                                          } 
                                        />
                                        <Text style={[
                                          styles.parentCategoryOptionText,
                                          { color: editingSubcategoryParentId === cat.id ? colors.text : colors.textMuted }
                                        ]}>
                                          {cat.name}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </View>
                                
                                <View style={styles.editSubcategoryActions}>
                                  <Pressable
                                    onPress={cancelEditSubcategory}
                                    style={[styles.editSubcategoryButton, { backgroundColor: colors.bg }]}
                                  >
                                    <Text style={[styles.editSubcategoryButtonText, { color: colors.textMuted }]}>Cancelar</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={handleUpdateSubcategory}
                                    disabled={!editingSubcategoryName.trim() || loadingSubcategories}
                                    style={[
                                      styles.editSubcategoryButton,
                                      { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income },
                                      (!editingSubcategoryName.trim() || loadingSubcategories) && { opacity: 0.5 },
                                    ]}
                                  >
                                    <Text style={[styles.editSubcategoryButtonText, { color: '#fff' }]}>Salvar</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              // Modo visualização
                              <>
                                <View style={styles.subcategoryContent}>
                                  <View style={[
                                    styles.categoryIcon, 
                                    { backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '20' }
                                  ]}>
                                    <MaterialCommunityIcons 
                                      name={sub.icon as any} 
                                      size={14} 
                                      color={categoryType === 'expense' ? colors.expense : colors.income} 
                                    />
                                  </View>
                                  <Text style={[styles.subcategoryName, { color: colors.text }]}>{sub.name}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                                  <Pressable
                                    onPress={() => startEditSubcategory(sub)}
                                    style={styles.subcategoryActionButton}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <MaterialCommunityIcons name="pencil" size={18} color={colors.textMuted} />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDeleteSubcategory(sub.id, sub.name)}
                                    style={styles.subcategoryActionButton}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
                                  </Pressable>
                                </View>
                              </>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Formulário para adicionar nova subcategoria */}
                    <View style={styles.addSubcategoryForm}>
                      <View style={[
                        styles.inputContainer, 
                        { 
                          borderColor: focusedField === 'subcategory' ? (categoryType === 'expense' ? colors.expense : colors.income) : colors.border,
                          borderWidth: focusedField === 'subcategory' ? 2 : 1,
                        }
                      ]}>
                        <TextInput
                          value={newSubcategoryName}
                          onChangeText={setNewSubcategoryName}
                          onFocus={() => setFocusedField('subcategory')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Nome da subcategoria"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, { color: colors.text }]}
                        />
                      </View>

                      {/* Seleção de ícone da subcategoria (mini grid) */}
                      <View style={styles.miniIconGrid}>
                        {icons.slice(0, 8).map((icon) => (
                          <Pressable
                            key={icon}
                            onPress={() => setNewSubcategoryIcon(icon)}
                            style={[
                              styles.miniIconOption,
                              { 
                                borderColor: newSubcategoryIcon === icon 
                                  ? (categoryType === 'expense' ? colors.expense : colors.income) 
                                  : colors.border,
                              },
                              newSubcategoryIcon === icon && { 
                                backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '15' 
                              },
                            ]}
                          >
                            <MaterialCommunityIcons 
                              name={icon as any} 
                              size={16} 
                              color={newSubcategoryIcon === icon 
                                ? (categoryType === 'expense' ? colors.expense : colors.income) 
                                : colors.textMuted
                              } 
                            />
                          </Pressable>
                        ))}
                      </View>

                      <Pressable
                        onPress={handleCreateSubcategory}
                        disabled={!newSubcategoryName.trim() || loadingSubcategories}
                        style={({ pressed }) => [
                          styles.addSubcategoryButton,
                          { 
                            backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '15',
                            borderColor: categoryType === 'expense' ? colors.expense : colors.income,
                          },
                          pressed && { opacity: 0.8 },
                          (!newSubcategoryName.trim() || loadingSubcategories) && { opacity: 0.5 },
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name="plus" 
                          size={16} 
                          color={categoryType === 'expense' ? colors.expense : colors.income} 
                        />
                        <Text style={[styles.addSubcategoryButtonText, { 
                          color: categoryType === 'expense' ? colors.expense : colors.income 
                        }]}>
                          Adicionar subcategoria
                        </Text>
                      </Pressable>
                    </View>
                  </>
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
                    disabled={saving || !categoryName.trim() || !hasChanges()}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income, borderColor: categoryType === 'expense' ? colors.expense : colors.income },
                      pressed && { opacity: 0.9 },
                      (saving || !categoryName.trim() || !hasChanges()) && { opacity: 0.6 },
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
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
