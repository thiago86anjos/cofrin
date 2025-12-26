import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../contexts/themeContext';

// Cores do design system - Roxo
const primaryDark = '#4A2FA8';   // roxo escuro (títulos)
const primary = '#5B3CC4';       // roxo principal
const primaryBg = '#EDE9FF';     // fundo roxo suave

interface CategoryData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  total: number;
}

interface Props {
  expenses?: CategoryData[];
  incomes?: CategoryData[];
  totalExpenses?: number;
  totalIncomes?: number;
}

export default memo(function TopCategoriesCard({
  expenses = [],
  incomes = [],
  totalExpenses = 0,
  totalIncomes = 0,
}: Props) {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();

  const handlePressDetails = () => {
    navigation.navigate('CategoryDetails');
  };

  return (
    <Pressable
      onPress={handlePressDetails}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: '#fff' },
        pressed && { opacity: 0.95 }
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: primaryBg }]}>
        <MaterialCommunityIcons name="chart-donut" size={20} color={primary} />
      </View>
      <Text style={[styles.title, { color: primaryDark }]}>Entenda seu dinheiro</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
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

