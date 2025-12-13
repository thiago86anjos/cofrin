import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../components/Card';
import { palette } from '../theme';

export default function Launches() {
  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 12 }}>
      <View style={{ width: '100%', maxWidth: 980, paddingHorizontal: 12 }}>
        <Card>
          <Text style={styles.title}>Lançamentos</Text>
          <View style={{ height: 8 }} />
          <Text style={{ color: palette.muted }}>Aqui você poderá cadastrar receitas e despesas do mês.</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 20, fontWeight: '700' } });
