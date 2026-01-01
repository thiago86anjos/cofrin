/**
 * RecurrenceTypePicker - Componente para seleção de tipo de recorrência (parcelada ou fixa)
 * Extraído do AddTransactionModal para melhor organização
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface RecurrenceTypeOption {
  label: string;
  value: 'installment' | 'fixed';
  description: string;
}

interface RecurrenceTypePickerProps {
  options: RecurrenceTypeOption[];
  selectedValue: 'installment' | 'fixed';
  onSelect: (value: 'installment' | 'fixed') => void;
  onClose: () => void;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryBg: string;
    grayLight: string;
  };
  insets: { bottom: number };
}

export default function RecurrenceTypePicker({
  options,
  selectedValue,
  onSelect,
  onClose,
  colors,
  insets,
}: RecurrenceTypePickerProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Tipo de Recorrência</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) }}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                isSelected && { backgroundColor: colors.primaryBg },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    isSelected && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                  {option.description}
                </Text>
              </View>
              {isSelected && (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
