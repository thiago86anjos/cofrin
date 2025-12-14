import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/themeContext";
import { spacing, borderRadius } from "../theme";

export default function Settings({ navigation }: any) {
  const { colors } = useAppTheme();

  const items = [
    { id: "edit_profile", label: "Editar perfil", icon: "account-edit" },
    { id: "accounts", label: "Configurar contas", icon: "bank" },
    { id: "cards", label: "Cartões de crédito", icon: "credit-card" },
    { id: "categories", label: "Categorias", icon: "tag-multiple" },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      {/* Header com ícone */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="piggy-bank" size={48} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Configurações</Text>
        <Text style={styles.headerSubtitle}>Personalize seu Cofrin</Text>
      </View>

      <View style={styles.cardContainer}>
        <Card style={{ backgroundColor: colors.card }}>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <View key={item.id}>
                <Pressable
                  onPress={() => console.log("Pressed:", item.id)}
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
          })}
        </Card>
      </View>
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
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  cardContainer: {
    marginTop: -20,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
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
    marginLeft: 52,
  },
});
