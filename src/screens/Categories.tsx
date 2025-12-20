import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { spacing, borderRadius, getShadow } from "../theme";
import { useCategories } from "../hooks/useCategories";
import { CategoryType, CATEGORY_ICONS, Category } from "../types/firebase";
import { useCustomAlert } from "../hooks";
import EditCategoryModal from "../components/EditCategoryModal";
import CustomAlert from "../components/CustomAlert";
import SettingsFooter from "../components/SettingsFooter";

export default function Categories({ navigation }: any) {
  const { colors } = useAppTheme();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const insets = useSafeAreaInsets();
  
  const [categoryType, setCategoryType] = useState<CategoryType>('expense');
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('food');
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Hook de categorias do Firebase
  const { 
    expenseCategories, 
    incomeCategories, 
    loading, 
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  async function handleCreate() {
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      const result = await createCategory({
        name: name.trim(),
        icon: selectedIcon,
        type: categoryType,
      });

      if (result) {
        setName('');
        showAlert('Sucesso', 'Categoria criada com sucesso!');
      } else {
        showAlert('Erro', 'Não foi possível criar a categoria');
      }
    } catch (error) {
      showAlert('Erro', 'Ocorreu um erro ao criar a categoria');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(categoryId: string, name: string, icon: string) {
    const result = await updateCategory(categoryId, { name, icon });
    if (result) {
      showAlert('Sucesso', 'Categoria atualizada com sucesso!');
    } else {
      showAlert('Erro', 'Não foi possível atualizar a categoria');
    }
  }

  function handleDelete(categoryId: string, categoryName: string) {
    // Fechar a modal de edição primeiro
    setEditingCategory(null);
    
    // Mostrar alerta de confirmação
    showAlert(
      'Excluir categoria',
      `Deseja realmente excluir a categoria "${categoryName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteCategory(categoryId);
            if (result) {
              showAlert('Sucesso', 'Categoria excluída com sucesso!');
            } else {
              showAlert('Erro', 'Não foi possível excluir a categoria');
            }
          }
        },
      ]
    );
  }

  const icons = CATEGORY_ICONS[categoryType];
  const currentCategories = categoryType === 'expense' ? expenseCategories : incomeCategories;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top || 16 }]}>
        <View style={styles.headerInner}>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Categorias</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

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
              setSelectedIcon('food');
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
              setSelectedIcon('briefcase');
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
                        onPress={() => setEditingCategory(cat)}
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

            {/* Nova categoria */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                CRIAR NOVA CATEGORIA
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
                {/* Nome */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Nome da categoria</Text>
                  <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Ex: Restaurantes, Academia..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { color: colors.text }]}
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
                        onPress={() => setSelectedIcon(icon)}
                        style={[
                          styles.iconOption,
                          { 
                            borderColor: selectedIcon === icon 
                              ? (categoryType === 'expense' ? colors.expense : colors.income) 
                              : colors.border,
                          },
                          selectedIcon === icon && { 
                            backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '15' 
                          },
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={icon as any} 
                          size={22} 
                          color={selectedIcon === icon 
                            ? (categoryType === 'expense' ? colors.expense : colors.income) 
                            : colors.textMuted
                          } 
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Preview */}
                <View style={[styles.previewContainer, { borderColor: colors.border }]}>
                  <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Preview:</Text>
                  <View style={styles.previewChip}>
                    <View style={[
                      styles.categoryIcon, 
                      { backgroundColor: (categoryType === 'expense' ? colors.expense : colors.income) + '20' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={selectedIcon as any} 
                        size={16} 
                        color={categoryType === 'expense' ? colors.expense : colors.income} 
                      />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {name || 'Nova categoria'}
                    </Text>
                  </View>
                </View>

                {/* Botão */}
                <Pressable
                  onPress={handleCreate}
                  disabled={saving || !name.trim()}
                  style={({ pressed }) => [
                    styles.createButton,
                    { backgroundColor: categoryType === 'expense' ? colors.expense : colors.income },
                    pressed && { opacity: 0.9 },
                    (saving || !name.trim()) && { opacity: 0.6 },
                  ]}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>
                    {saving ? 'Criando...' : 'Criar categoria'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <EditCategoryModal
        visible={editingCategory !== null}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <CustomAlert {...alertState} onClose={hideAlert} />
      <SettingsFooter navigation={navigation} />
    </View>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  headerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
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
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  previewLabel: {
    fontSize: 13,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
