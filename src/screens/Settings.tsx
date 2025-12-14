import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/themeContext";
import { useAuth } from "../contexts/authContext";
import { logout } from "../services/auth";
import { useCustomAlert } from "../hooks/useCustomAlert";
import CustomAlert from "../components/CustomAlert";
import { spacing, borderRadius, getShadow } from "../theme";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  screen?: string;
  danger?: boolean;
}

export default function Settings({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { alertState, showAlert, hideAlert } = useCustomAlert();

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  const menuItems: MenuItem[] = [
    { id: "edit_profile", label: "Editar perfil", icon: "account-edit", screen: "EditProfile" },
    { id: "accounts", label: "Configurar contas", icon: "bank", screen: "ConfigureAccounts" },
    { id: "cards", label: "Cartões de crédito", icon: "credit-card", screen: "CreditCards" },
    { id: "categories", label: "Categorias", icon: "tag-multiple", screen: "Categories" },
  ];

  const secondaryItems: MenuItem[] = [
    { id: "notifications", label: "Notificações", icon: "bell-outline" },
    { id: "help", label: "Ajuda & Suporte", icon: "help-circle-outline" },
    { id: "about", label: "Sobre o app", icon: "information-outline" },
  ];

  function handleLogout() {
    showAlert(
      "Sair da conta",
      "Tem certeza que deseja sair?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Erro ao sair:", error);
            }
          }
        },
      ]
    );
  }

  function handlePress(item: MenuItem) {
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  }

  function renderMenuItem(item: MenuItem, isLast: boolean) {
    return (
      <View key={item.id}>
        <Pressable
          onPress={() => handlePress(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.grayLight : 'transparent' },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name={item.icon as any} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.rowText, { color: colors.text }]}>{item.label}</Text>
          <MaterialCommunityIcons 
            name="chevron-right"
            size={20} 
            color={colors.textMuted} 
          />
        </Pressable>
        {!isLast && (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.bg }]} 
      contentContainerStyle={styles.content}
    >
      {/* Header com perfil */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {/* Botão voltar */}
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>

        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={40} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>
          <Pressable 
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Cards de menu */}
      <View style={styles.menuContainer}>
        {/* Menu principal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CONFIGURAÇÕES
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
            {menuItems.map((item, idx) => renderMenuItem(item, idx === menuItems.length - 1))}
          </View>
        </View>

        {/* Menu secundário */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SUPORTE
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
            {secondaryItems.map((item, idx) => renderMenuItem(item, idx === secondaryItems.length - 1))}
          </View>
        </View>

        {/* Botão de logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: colors.card },
            getShadow(colors),
            pressed && { opacity: 0.9 },
          ]}
        >
          <MaterialCommunityIcons name="logout" size={20} color={colors.expense} />
          <Text style={[styles.logoutText, { color: colors.expense }]}>Sair da conta</Text>
        </Pressable>

        {/* Versão */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Cofrin v1.0.0
        </Text>
      </View>
      <CustomAlert {...alertState} onClose={hideAlert} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowText: { 
    fontSize: 16, 
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
