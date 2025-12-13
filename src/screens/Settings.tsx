import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Card from "../components/Card";
import { palette } from "../theme";

export default function Settings({ navigation }: any) {
  const items = [
    { id: "edit_profile", label: "Editar perfil" },
    { id: "accounts", label: "Configurar contas" },
    { id: "cards", label: "Cartões de crédito" },
    { id: "categories", label: "Categorias" },
  ];

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Configurações</Text>

        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              // For now this is static. In the future will navigate to specific screens.
              console.log("Pressed:", item.id);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowText}>{item.label}</Text>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: palette.bg },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16, color: palette.text },
  row: {
    backgroundColor: palette.bg,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  rowPressed: { opacity: 0.8 },
  rowText: { fontSize: 16, color: palette.text },
});
