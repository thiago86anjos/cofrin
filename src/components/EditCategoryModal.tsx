import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';
import { Category, CATEGORY_ICONS } from '../types/firebase';

interface EditCategoryModalProps {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (categoryId: string, name: string, icon: string) => Promise<void>;
  onDelete: (categoryId: string, categoryName: string) => void;
}

export default function EditCategoryModal({ 
  visible, 
  category, 
  onClose, 
  onSave, 
  onDelete 
}: EditCategoryModalProps) {
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSelectedIcon(category.icon);
    }
  }, [category]);

  const handleSave = async () => {
    if (!category || !name.trim()) return;

    setSaving(true);
    try {
      await onSave(category.id, name.trim(), selectedIcon);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (category) {
      onDelete(category.id, category.name);
    }
  };

  if (!category) return null;

  const icons = CATEGORY_ICONS[category.type];
  const typeColor = category.type === 'expense' ? colors.expense : colors.income;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Editar Categoria</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Nome */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nome da categoria</Text>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome da categoria"
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
                        borderColor: selectedIcon === icon ? typeColor : colors.border,
                        backgroundColor: selectedIcon === icon ? typeColor + '15' : 'transparent',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name={icon as any} 
                      size={22} 
                      color={selectedIcon === icon ? typeColor : colors.textMuted} 
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
                  { backgroundColor: typeColor + '20' }
                ]}>
                  <MaterialCommunityIcons 
                    name={selectedIcon as any} 
                    size={16} 
                    color={typeColor} 
                  />
                </View>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {name || 'Categoria'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botões */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                { borderColor: colors.expense },
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.expense} />
              <Text style={[styles.deleteButtonText, { color: colors.expense }]}>
                Excluir
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: typeColor },
                pressed && { opacity: 0.9 },
                (saving || !name.trim()) && { opacity: 0.6 },
              ]}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    gap: spacing.xs,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
