/**
 * Componente de campo para valor monetário (CurrencyField)
 * Formatação automática de valores em Reais
 */

import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface CurrencyFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    typeBg: string;
    type: string;
  };
  autoFocus?: boolean;
}

export default function CurrencyField({
  label,
  value,
  onChangeText,
  placeholder = 'R$ 0,00',
  colors,
  autoFocus = false,
}: CurrencyFieldProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    }
  }, [autoFocus]);

  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.card }]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.typeBg }]}>
        <MaterialCommunityIcons
          name="currency-brl"
          size={20}
          color={colors.type}
        />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.valueInput, { color: colors.type }]}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          maxLength={20}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueInput: {
    fontSize: 22,
    fontWeight: '700',
    padding: 0,
    margin: 0,
    letterSpacing: 0.5,
    outlineStyle: 'none',
  } as any,
});
