import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { palette } from "../theme";

export default function AccountItem({ name, type, balance }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}><Text style={styles.iconText}>{name?.charAt(0)?.toUpperCase()}</Text></View>
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.type}>{type}</Text>
      </View>
      <View style={{ marginLeft: "auto" }}>
        <Text style={styles.balance}>{balance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontWeight: '700', color: palette.text },
  name: { fontWeight: "600" },
  type: { color: palette.muted, fontSize: 12 },
  balance: { fontWeight: "700" },
});
