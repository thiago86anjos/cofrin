import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  label: string;
  value: string;
  color?: string;
  align?: 'left' | 'right';
};

export default function OverviewStat({ label, value, color, align = 'left' }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, align === 'right' && styles.right]}>
      <Text style={[styles.label, { color: theme.colors.disabled }]}>{label}</Text>
      <Text style={[styles.value, { color: color || theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  right: { alignItems: 'flex-end' },
  label: { fontSize: 12, marginBottom: 6 },
  value: { fontSize: 18, fontWeight: '700' },
});
