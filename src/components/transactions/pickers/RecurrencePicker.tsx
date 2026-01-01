/**
 * RecurrencePicker - Componente para seleção de opções de recorrência
 * Extraído do AddTransactionModal para melhor organização
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';
import { RecurrenceType } from '../../../types/firebase';

interface RecurrenceOption {
  label: string;
  value: RecurrenceType;
}

interface RecurrencePickerProps {
  options: RecurrenceOption[];
  selectedValue: RecurrenceType;
  onSelect: (value: RecurrenceType) => void;
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

export default function RecurrencePicker({
  options,
  selectedValue,
  onSelect,
  onClose,
  colors,
  insets,
}: RecurrencePickerProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Repetir Lançamento</Text>
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
              <Text
                style={[
                  styles.optionText,
                  { color: colors.text },
                  isSelected && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                {option.label}
              </Text>
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
});
