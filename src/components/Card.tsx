import React from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard, useTheme } from 'react-native-paper';
import { spacing } from '../theme';

export default function Card({ children, style, mode = 'elevated' }: any) {
  const theme = useTheme();
  return (
    <PaperCard mode={mode} style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      {children}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
