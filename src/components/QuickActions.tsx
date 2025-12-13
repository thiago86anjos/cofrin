import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { palette } from "../theme";

export default function QuickActions({ actions = [] }: any) {
  return (
    <View style={styles.container}>
      {actions.map((a: any) => (
        <Pressable key={a.key} onPress={a.onPress} style={styles.btn}>
          <Text style={styles.btnText}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 8 },
  btn: {
    backgroundColor: palette.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  btnText: { color: palette.text, fontWeight: "700" },
});
