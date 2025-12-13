import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

type Action = { key?: string | number; label: string; onPress: () => void; icon?: string };

export default function QuickActions({ actions = [] }: { actions?: Action[] }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {actions.map((a, idx) => (
        <Chip
          key={a.key ?? idx}
          onPress={a.onPress}
          icon={a.icon}
          style={[styles.chip, { backgroundColor: theme.colors.surface }]}
          accessibilityLabel={a.label}
        >
          {a.label}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  chip: { marginRight: 8 },
});
