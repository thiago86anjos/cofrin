/**
 * RepetitionsPicker - Componente para seleção de número de repetições
 * Extraído do AddTransactionModal para melhor organização
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../../theme';

interface RepetitionsPickerProps {
  value: number;
  min?: number;
  max?: number;
  quickOptions?: number[];
  onChange: (value: number) => void;
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

export default function RepetitionsPicker({
  value,
  min = 1,
  max = 72,
  quickOptions = [3, 6, 12, 24],
  onChange,
  onClose,
  colors,
  insets,
}: RepetitionsPickerProps) {
  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleQuickNumber = (num: number) => {
    onChange(num);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Quantas vezes repetir?</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <View
        style={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl),
          gap: spacing.lg,
        }}
      >
        {/* Input numérico com botões +/- */}
        <View style={styles.numericInputRow}>
          <Pressable
            onPress={handleDecrement}
            disabled={value <= min}
            style={[
              styles.numericButton,
              { borderColor: value <= min ? colors.border : colors.primary },
            ]}
          >
            <MaterialCommunityIcons
              name="minus"
              size={28}
              color={value <= min ? colors.textMuted : colors.primary}
            />
          </Pressable>

          <Text style={[styles.numericValue, { color: colors.text }]}>{value}x</Text>

          <Pressable
            onPress={handleIncrement}
            disabled={value >= max}
            style={[
              styles.numericButton,
              { borderColor: value >= max ? colors.border : colors.primary },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={value >= max ? colors.textMuted : colors.primary}
            />
          </Pressable>
        </View>

        {/* Botões rápidos */}
        <View style={{ gap: spacing.sm }}>
          <Text
            style={[styles.quickLabel, { color: colors.textMuted, fontSize: 14, marginBottom: 0 }]}
          >
            Valores comuns:
          </Text>
          <View style={styles.quickButtonsRow}>
            {quickOptions.map((num) => (
              <Pressable
                key={num}
                onPress={() => handleQuickNumber(num)}
                style={({ pressed }) => [
                  styles.quickButton,
                  {
                    backgroundColor: value === num ? colors.primaryBg : colors.grayLight,
                    borderColor: value === num ? colors.primary : 'transparent',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickButtonText,
                    {
                      color: value === num ? colors.primary : colors.text,
                      fontWeight: value === num ? '700' : '500',
                    },
                  ]}
                >
                  {num}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Botão de confirmar */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.confirmButtonText}>Confirmar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  numericInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  numericButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numericValue: {
    fontSize: 48,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickButtonText: {
    fontSize: 16,
  },
  confirmButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
