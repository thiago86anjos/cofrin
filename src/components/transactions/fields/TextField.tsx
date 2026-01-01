/**
 * Componente de campo de texto com ícone (TextField)
 * Usado para campos de entrada de texto simples
 */

import React from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon: string;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primaryBg: string;
    primary: string;
    grayLight: string;
  };
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  maxLength?: number;
}

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  colors,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  maxLength,
}: TextFieldProps) {
  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.card }]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.fieldInput,
            { color: colors.text },
            multiline && styles.fieldInputMultiline,
          ]}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
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
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    outlineStyle: 'none',
  } as any,
  fieldInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
