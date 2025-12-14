import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MainLayout from '../components/MainLayout';
import AppHeader from '../components/AppHeader';
import { useAppTheme } from '../contexts/themeContext';

export default function Goals() {
  const { colors } = useAppTheme();

  return (
    <MainLayout>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader />
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>Metas do ano</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Em breve você verá suas metas aqui.</Text>
          </View>
        </ScrollView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  body: { paddingTop: 12, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 15 },
});
