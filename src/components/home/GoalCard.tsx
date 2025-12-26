import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';

// Cores do design system - Roxo
const primaryDark = '#4A2FA8';   // roxo escuro (títulos h1)
const primary = '#5B3CC4';       // roxo principal (botões, ícones)
const primaryBg = '#EDE9FF';     // fundo roxo suave (backgrounds de ícones)

interface Props {
  onPress: () => void;
}

export default memo(function GoalCard({ onPress }: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: '#fff' },
        getShadow(colors),
        pressed && { opacity: 0.95 }
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: primaryBg }]}>
        <MaterialCommunityIcons name="target" size={20} color={primary} />
      </View>
      <Text style={[styles.title, { color: primaryDark }]}>Minhas metas financeiras</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
