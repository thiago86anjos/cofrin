import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../contexts/authContext";
import Card from "../components/Card";
import QuickActions from "../components/QuickActions";
import AccountItem from "../components/AccountItem";
import { palette } from "../theme";

export default function Home() {
  const { user } = useAuth();
  const emailPrefix =
    user?.email?.split("@")?.[0] || user?.displayName || "Usuário";
  const initial = emailPrefix?.charAt(0)?.toUpperCase() || "U";

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={{ alignItems: "center", paddingVertical: 12 }}>
      <View style={{ width: "100%", maxWidth: 980, paddingHorizontal: 12 }}>
        <Card>
          <Text style={styles.title}>Olá, {emailPrefix}</Text>
          <View style={{ height: 8 }} />
          <QuickActions actions={[{ key: 'despesa', label: 'DESPESA' }, { key: 'receita', label: 'RECEITA' }, { key: 'transf', label: 'TRANSF.' }]} />
          <Text style={styles.subTitle}>Visão geral</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <View>
              <Text style={{ color: palette.muted }}>Receitas no mês</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: palette.blue }}>R$ 20.358,44</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: palette.muted }}>Despesas no mês</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: palette.danger }}>R$ 11.820,15</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 12 }} />

          <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ fontWeight: "700", marginBottom: 12 }}>Saldo geral</Text>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>R$ 2.637,47</Text>
              <View style={{ height: 20 }} />
              <Text style={{ fontWeight: "700", marginBottom: 8 }}>Minhas contas</Text>
              <View style={{ marginBottom: 8 }}>
                <AccountItem name="CARTEIRA FÍSICA" type="Conta manual" balance="R$ 30,00" />
                <AccountItem name="Nuconta" type="Conta manual" balance="R$ 2.607,47" />
              </View>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card>
              <Text style={{ fontWeight: "700", marginBottom: 12 }}>Maiores gastos do mês atual</Text>
              <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: palette.muted }}>[Gráfico de pizza placeholder]</Text>
              </View>
            </Card>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, marginBottom: 12 },
  avatarContainer: { alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarName: { fontSize: 16 },
  subTitle: { fontSize: 14, color: palette.muted },
});
