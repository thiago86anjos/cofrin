/**
 * Componente de switch inline (SwitchField)
 * Usado para opções de liga/desliga
 */

import React from 'react';
import { View, StyleSheet, Text, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface SwitchFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon: string;
  description?: string;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primaryBg: string;
    primary: string;
    success: string;
    grayLight: string;
  };
  disabled?: boolean;
}

export default function SwitchField({
  label,
  value,
  onValueChange,
  icon,
  description,
  colors,
  disabled = false,
}: SwitchFieldProps) {
  return (
    <View style={[styles.fieldRow, { backgroundColor: colors.card, opacity: disabled ? 0.6 : 1 }]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.fieldDescription, { color: colors.textMuted }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.grayLight, true: colors.success + '50' }}
        thumbColor={value ? colors.success : '#fff'}
        disabled={disabled}
      />
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
    fontSize: 15,
    fontWeight: '500',
  },
  fieldDescription: {
    fontSize: 12,
  },
});
