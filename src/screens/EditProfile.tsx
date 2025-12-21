import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { useAuth } from "../contexts/authContext";
import { spacing, borderRadius } from "../theme";
import { updateUserProfile } from "../services/auth";
import CustomAlert from "../components/CustomAlert";
import Snackbar from "../components/Snackbar";
import { useCustomAlert, useSnackbar } from "../hooks";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MainLayout from "../components/MainLayout";
import SimpleHeader from "../components/SimpleHeader";
import { FOOTER_HEIGHT } from "../components/AppFooter";

export default function EditProfile({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const { alertState, showAlert, hideAlert } = useCustomAlert();
  const { snackbarState, showSnackbar, hideSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();

  const bottomPad = useMemo(
    () => FOOTER_HEIGHT + 6 + Math.max(insets.bottom, 8) + spacing.lg,
    [insets.bottom]
  );
  
  const currentName = user?.displayName || user?.email?.split('@')[0] || '';
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await updateUserProfile(name.trim());
      await refreshUser(); // Atualizar o usuário no contexto
      showSnackbar('Perfil atualizado!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showAlert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
    >
      {/* Header simples */}
      <SimpleHeader title="Editar Perfil" />

      <View style={styles.centeredContainer}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="account" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Nome de exibição</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={loading || !name.trim()}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
              (loading || !name.trim()) && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </Pressable>
        </View>
      </View>

      <CustomAlert {...alertState} onClose={hideAlert} />
      <Snackbar
        visible={snackbarState.visible}
        message={snackbarState.message}
        type={snackbarState.type}
        duration={snackbarState.duration}
        onDismiss={hideSnackbar}
      />
    </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centeredContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  email: {
    fontSize: 14,
  },
  form: {
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: spacing.sm,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
