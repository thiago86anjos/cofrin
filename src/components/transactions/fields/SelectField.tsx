/**
 * Componente de campo selecionável (SelectField)
 * Usado para exibir campos clicáveis que abrem pickers
 */

import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface SelectFieldProps {
  label: string;
  value: string;
  icon: string;
  onPress?: () => void;
  disabled?: boolean;
  subtitle?: string;
  subtitleColor?: string;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primaryBg: string;
    primary: string;
    grayLight: string;
    gray: string;
    border: string;
  };
}

export default function SelectField({
  label,
  value,
  icon,
  onPress,
  disabled = false,
  subtitle,
  subtitleColor,
  colors,
}: SelectFieldProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.fieldRow,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : (disabled ? 0.6 : 1) },
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: disabled ? colors.grayLight : colors.primaryBg }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={disabled ? colors.textMuted : colors.primary}
        />
      </View>
      <View style={styles.fieldContent}>
        <View style={styles.labelRow}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
          {subtitle && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}> | </Text>
              <Text style={[styles.fieldSubtitle, { color: subtitleColor || colors.textMuted }]}>
                {subtitle}
              </Text>
            </>
          )}
        </View>
        <Text style={[styles.fieldValue, { color: disabled ? colors.textMuted : colors.text }]}>
          {value}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={disabled ? colors.border : colors.gray}
      />
    </Pressable>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
  },
});
