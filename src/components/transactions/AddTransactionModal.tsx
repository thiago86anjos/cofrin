import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../theme';

interface Props { visible: boolean; onClose: () => void; onSave?: (payload: { type: string; amount: number; description: string; category: string; account?: string; toAccount?: string; date: Date; recurrence: any; }) => void; initialType?: 'despesa'|'receita'|'transfer' }

export default function AddTransactionModal({ visible, onClose, onSave, initialType = 'despesa' }: Props) {
  const [type, setType] = useState<'despesa' | 'receita' | 'transfer'>(initialType);
  const [amount, setAmount] = useState('0,00');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outros');
  const [account, setAccount] = useState('Nuconta');
  const [toAccount, setToAccount] = useState('Nuconta');
  const [date, setDate] = useState(new Date());
  const [recurrence, setRecurrence] = useState<'fixo'|'parcelado'|'none'>('none');

  function parseCurrencyToNumber(input: string) {
    // Accepts "1.234,56" or "1234.56" and returns number 1234.56
    if (!input) return 0;
    let v = input.trim();
    // Remove currency symbols and spaces
    v = v.replace(/[^0-9,.-]/g, '');
    // If contains comma and dot, assume dot is thousands, comma is decimal: '1.234,56'
    if (v.indexOf(',') > -1 && v.indexOf('.') > -1) {
      v = v.replace(/\./g, '').replace(',', '.');
    } else {
      // Replace comma with dot
      v = v.replace(',', '.');
    }
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function handleSave() {
    const parsed = parseCurrencyToNumber(amount);
    const value = type === 'despesa' ? -Math.abs(parsed) : parsed;
    if (onSave) onSave({ type, amount: value, description, category, account, toAccount: type === 'transfer' ? toAccount : undefined, date, recurrence });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay} edges={[ 'bottom' ]}>
        <View style={styles.sheet}>
          <View style={styles.tabRow}>
            <Pressable onPress={() => setType('despesa')} style={[styles.tab, type === 'despesa' && styles.tabActive]}>
              <Text style={[styles.tabText, type === 'despesa' && styles.tabTextActive]}>Despesa</Text>
            </Pressable>
            <Pressable onPress={() => setType('receita')} style={[styles.tab, type === 'receita' && styles.tabActive]}>
              <Text style={[styles.tabText, type === 'receita' && styles.tabTextActive]}>Receita</Text>
            </Pressable>
            <Pressable onPress={() => setType('transfer')} style={[styles.tab, type === 'transfer' && styles.tabActive]}>
              <Text style={[styles.tabText, type === 'transfer' && styles.tabTextActive]}>Transferência</Text>
            </Pressable>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>{amount}</Text>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.rowTitle}>Descrição</Text>
            <TextInput placeholder="Adicione a descrição" value={description} onChangeText={setDescription} style={styles.input} />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.rowTitle}>Categoria</Text>
            <Pressable style={styles.pill} onPress={() => { /* stub to open category picker */ }}><Text> {category} </Text></Pressable>
          </View>

          <View style={styles.formRow}>
            {type !== 'transfer' ? (
              <>
                <Text style={styles.rowTitle}>{type === 'despesa' ? 'Pago com' : 'Recebido em'}</Text>
                <Pressable style={styles.pill} onPress={() => { /* open account picker */ }}><Text>{account}</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={styles.rowTitle}>De (conta de origem)</Text>
                <Pressable style={styles.pill} onPress={() => { /* open account picker */ }}><Text>{account}</Text></Pressable>

                <View style={{ height: 8 }} />
                <Text style={styles.rowTitle}>Para (conta destino)</Text>
                <Pressable style={styles.pill} onPress={() => { /* open account picker */ }}><Text>{toAccount}</Text></Pressable>
              </>
            )}
          </View>

          <View style={styles.rowInline}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Data</Text>
              <Pressable style={styles.pill} onPress={() => { /* open date picker */ }}><Text> Hoje </Text></Pressable>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Repetir lançamento</Text>
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={() => setRecurrence(recurrence === 'fixo' ? 'none' : 'fixo')} style={[styles.smallPill, recurrence === 'fixo' && styles.smallPillActive]}><Text style={{ color: recurrence === 'fixo' ? palette.blue : palette.text }}>Fixo</Text></Pressable>
                <Pressable onPress={() => setRecurrence(recurrence === 'parcelado' ? 'none' : 'parcelado')} style={[styles.smallPill, recurrence === 'parcelado' && styles.smallPillActive]}><Text style={{ color: recurrence === 'parcelado' ? palette.blue : palette.text }}>Parcelado</Text></Pressable>
              </View>
            </View>
          </View>

          <View style={{ height: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Pressable onPress={onClose} style={styles.cancelBtn}><Text>Cancelar</Text></Pressable>
            <View style={{ width: 12 }} />
            <Pressable onPress={handleSave} style={styles.confirmBtn}><Text style={{ color: '#fff' }}>OK</Text></Pressable>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tab: { paddingHorizontal: 6, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  tabText: { color: '#fff' },
  tabTextActive: { color: '#fff' },
  amountRow: { alignItems: 'center', paddingVertical: 8 },
  amount: { color: '#fff', fontSize: 36, fontWeight: '700' },
  formRow: { marginVertical: 6 },
  rowTitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#121212', padding: 10, borderRadius: 8, color: '#fff' },
  pill: { padding: 10, backgroundColor: '#121212', borderRadius: 8 },
  rowInline: { flexDirection: 'row', alignItems: 'flex-start' },
  smallPill: { padding: 8, borderRadius: 8, marginRight: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  smallPillActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelBtn: { padding: 12, borderRadius: 8 },
  confirmBtn: { padding: 12, borderRadius: 40, backgroundColor: '#22c55e', width: 68, alignItems: 'center' },
});
