import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Platform,
    Pressable,
    Modal,
    Dimensions,
    Text,
    TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
type TransactionType = 'despesa' | 'receita' | 'transfer';
type RecurrenceType = 'none' | 'semanal' | 'quinzenal' | 'mensal' | 'anual';
type PickerType = 'none' | 'category' | 'account' | 'toAccount' | 'recurrence' | 'date';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave?: (payload: {
    type: string;
    amount: number;
    description: string;
    category: string;
    account?: string;
    toAccount?: string;
    date: Date;
    recurrence: RecurrenceType;
  }) => void;
  initialType?: TransactionType;
}

// Constants
const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Serviços',
  'Salário',
  'Investimentos',
  'Outros',
];

const ACCOUNTS = [
  'Nubank',
  'Itaú',
  'Bradesco',
  'Santander',
  'Caixa',
  'Banco do Brasil',
  'Inter',
  'C6 Bank',
  'Carteira',
];

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'Não repetir', value: 'none' },
  { label: 'Semanal', value: 'semanal' },
  { label: 'Quinzenal', value: 'quinzenal' },
  { label: 'Mensal', value: 'mensal' },
  { label: 'Anual', value: 'anual' },
];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Helpers
function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, '') || '0';
  const num = parseInt(digits, 10);
  const cents = (num % 100).toString().padStart(2, '0');
  const integer = Math.floor(num / 100);
  const integerStr = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${integerStr},${cents}`;
}

function parseCurrency(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function AddTransactionModal({
  visible,
  onClose,
  onSave,
  initialType = 'despesa',
}: Props) {
  const { colors } = useAppTheme();

  // State
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('R$ 0,00');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outros');
  const [account, setAccount] = useState('Nubank');
  const [toAccount, setToAccount] = useState('Itaú');
  const [date, setDate] = useState(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');

  // Single picker state - evita modais aninhados
  const [activePicker, setActivePicker] = useState<PickerType>('none');
  
  // Date picker state for custom calendar
  const [tempDate, setTempDate] = useState(new Date());

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setType(initialType);
      setAmount('R$ 0,00');
      setDescription('');
      setCategory('Outros');
      setAccount('Nubank');
      setToAccount('Itaú');
      setDate(new Date());
      setRecurrence('none');
      setActivePicker('none');
    }
  }, [visible, initialType]);

  // Sync tempDate when opening date picker
  useEffect(() => {
    if (activePicker === 'date') {
      setTempDate(date);
    }
  }, [activePicker, date]);

  // Colors based on type
  const typeColors = {
    despesa: '#dc2626',
    receita: '#10b981',
    transfer: '#64748b',
  };
  
  const headerColor = typeColors[type];

  const handleAmountChange = useCallback((text: string) => {
    setAmount(formatCurrency(text));
  }, []);

  const handleDateChangeNative = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setActivePicker('none');
      }
      if (event.type === 'set' && selectedDate) {
        setDate(selectedDate);
      }
    },
    []
  );

  const handleSave = useCallback(() => {
    const parsed = parseCurrency(amount);
    const value = type === 'despesa' ? -Math.abs(parsed) : parsed;
    onSave?.({
      type,
      amount: value,
      description,
      category,
      account,
      toAccount: type === 'transfer' ? toAccount : undefined,
      date,
      recurrence,
    });
    onClose();
  }, [type, amount, description, category, account, toAccount, date, recurrence, onSave, onClose]);

  // Componente de campo selecionável
  const SelectField = ({
    label,
    value,
    icon,
    onPress,
  }: {
    label: string;
    value: string;
    icon: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectField,
        { backgroundColor: pressed ? colors.grayLight : 'transparent' },
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.fieldContent}>
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );

  // Custom Date Picker Component (funciona em todas as plataformas)
  const CustomDatePicker = () => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const day = tempDate.getDate();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    // Empty slots for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const goToPrevMonth = () => {
      const newDate = new Date(tempDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setTempDate(newDate);
    };

    const goToNextMonth = () => {
      const newDate = new Date(tempDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setTempDate(newDate);
    };

    const selectDay = (selectedDay: number) => {
      const newDate = new Date(year, month, selectedDay);
      setDate(newDate);
      setActivePicker('none');
    };

    const isToday = (d: number) => {
      const today = new Date();
      return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const isSelected = (d: number) => {
      return d === date.getDate() && month === date.getMonth() && year === date.getFullYear();
    };

    return (
      <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Selecionar Data</Text>
          <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Month/Year Navigation */}
        <View style={styles.calendarHeader}>
          <Pressable onPress={goToPrevMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.calendarTitle, { color: colors.text }]}>
            {MONTHS[month]} {year}
          </Text>
          <Pressable onPress={goToNextMonth} style={styles.calendarNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <Text key={i} style={[styles.weekdayText, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {days.map((d, i) => (
            <View key={i} style={styles.dayCell}>
              {d !== null && (
                <Pressable
                  onPress={() => selectDay(d)}
                  style={[
                    styles.dayButton,
                    isSelected(d) && { backgroundColor: colors.primary },
                    isToday(d) && !isSelected(d) && { backgroundColor: colors.primaryBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      isSelected(d) && { color: '#fff', fontWeight: '600' },
                      isToday(d) && !isSelected(d) && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={[styles.quickDateActions, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              setDate(new Date());
              setActivePicker('none');
            }}
            style={[styles.quickDateButton, { backgroundColor: colors.primaryBg }]}
          >
            <Text style={[styles.quickDateText, { color: colors.primary }]}>Hoje</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Picker Content based on activePicker
  const renderPickerContent = () => {
    if (activePicker === 'none') return null;

    // Para data no iOS/Android nativo
    if (activePicker === 'date' && Platform.OS !== 'web') {
      return (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChangeNative}
        />
      );
    }

    // Para data no Web ou lista de opções
    let title = '';
    let options: string[] = [];
    let selectedValue = '';
    let onSelect: (value: string) => void = () => {};

    switch (activePicker) {
      case 'category':
        title = 'Selecionar Categoria';
        options = CATEGORIES;
        selectedValue = category;
        onSelect = (v) => { setCategory(v); setActivePicker('none'); };
        break;
      case 'account':
        title = type === 'transfer' ? 'Conta de Origem' : 'Selecionar Conta';
        options = ACCOUNTS;
        selectedValue = account;
        onSelect = (v) => { setAccount(v); setActivePicker('none'); };
        break;
      case 'toAccount':
        title = 'Conta de Destino';
        options = ACCOUNTS.filter((a) => a !== account);
        selectedValue = toAccount;
        onSelect = (v) => { setToAccount(v); setActivePicker('none'); };
        break;
      case 'recurrence':
        title = 'Repetir Lançamento';
        options = RECURRENCE_OPTIONS.map((r) => r.label);
        selectedValue = RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label || 'Não repetir';
        onSelect = (label) => {
          const option = RECURRENCE_OPTIONS.find((r) => r.label === label);
          if (option) setRecurrence(option.value);
          setActivePicker('none');
        };
        break;
      case 'date':
        // Custom date picker for web
        return <CustomDatePicker />;
    }

    return (
      <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={() => setActivePicker('none')} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.pickerOption,
                { backgroundColor: pressed ? colors.grayLight : 'transparent' },
                selectedValue === option && { backgroundColor: colors.primaryBg },
              ]}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  { color: colors.text },
                  selectedValue === option && { color: colors.primary, fontWeight: '600' },
                ]}
              >
                {option}
              </Text>
              {selectedValue === option && (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.centeredView}>
        <Pressable style={styles.overlay} onPress={onClose} />
        
        {/* Main Modal or Picker */}
        {activePicker !== 'none' ? (
          // Picker overlay
          <View style={styles.pickerOverlay}>
            <Pressable 
              style={StyleSheet.absoluteFill} 
              onPress={() => setActivePicker('none')} 
            />
            {renderPickerContent()}
          </View>
        ) : (
          // Main form
          <View style={[styles.modalContainer, getShadow(colors, 'lg')]}>
            <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
              {/* Header colorido */}
              <View style={[styles.header, { backgroundColor: headerColor }]}>
                {/* Botão fechar */}
                <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </Pressable>

                {/* Título */}
                <Text style={styles.headerTitle}>
                  {type === 'despesa' ? 'Nova Despesa' : type === 'receita' ? 'Nova Receita' : 'Nova Transferência'}
                </Text>

                {/* Type selector */}
                <View style={styles.typeSelector}>
                  {(['despesa', 'receita', 'transfer'] as TransactionType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={[
                        styles.typeChip,
                        type === t && styles.typeChipActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={t === 'despesa' ? 'arrow-down' : t === 'receita' ? 'arrow-up' : 'swap-horizontal'}
                        size={16}
                        color={type === t ? headerColor : 'rgba(255,255,255,0.7)'}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          type === t && styles.typeChipTextActive,
                        ]}
                      >
                        {t === 'despesa' ? 'Despesa' : t === 'receita' ? 'Receita' : 'Transf.'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Amount input */}
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  style={styles.amountInput}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  selectionColor="#fff"
                />
              </View>

              {/* Form fields */}
              <ScrollView
                style={styles.form}
                contentContainerStyle={styles.formContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Descrição */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card }, getShadow(colors)]}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.primaryBg }]}>
                    <MaterialCommunityIcons name="text" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Descrição</Text>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Ex: Almoço, Salário..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.textInput, { color: colors.text }]}
                    />
                  </View>
                </View>

                {/* Card de campos */}
                <View style={[styles.fieldsCard, { backgroundColor: colors.card }, getShadow(colors)]}>
                  {/* Categoria */}
                  <SelectField
                    label="Categoria"
                    value={category}
                    icon="tag-outline"
                    onPress={() => setActivePicker('category')}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Conta */}
                  {type === 'transfer' ? (
                    <>
                      <SelectField
                        label="De (conta origem)"
                        value={account}
                        icon="bank-transfer-out"
                        onPress={() => setActivePicker('account')}
                      />
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <SelectField
                        label="Para (conta destino)"
                        value={toAccount}
                        icon="bank-transfer-in"
                        onPress={() => setActivePicker('toAccount')}
                      />
                    </>
                  ) : (
                    <SelectField
                      label={type === 'despesa' ? 'Pago com' : 'Recebido em'}
                      value={account}
                      icon="bank-outline"
                      onPress={() => setActivePicker('account')}
                    />
                  )}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Data */}
                  <SelectField
                    label="Data"
                    value={formatDate(date)}
                    icon="calendar"
                    onPress={() => setActivePicker('date')}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Recorrência */}
                  <SelectField
                    label="Repetir"
                    value={RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label || 'Não repetir'}
                    icon="repeat"
                    onPress={() => setActivePicker('recurrence')}
                  />
                </View>

                {/* Botão Salvar */}
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [
                    styles.saveButton,
                    { backgroundColor: headerColor },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Confirmar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '92%',
    maxWidth: 500,
    height: SCREEN_HEIGHT * 0.75,
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  sheet: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: spacing.xs,
  },
  typeChipActive: {
    backgroundColor: '#fff',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  typeChipTextActive: {
    color: '#1f2937',
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  textInput: {
    fontSize: 15,
    paddingVertical: 2,
  },
  fieldsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
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
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Picker styles
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '85%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  pickerScroll: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pickerOptionText: {
    fontSize: 15,
  },
  // Custom Date Picker styles
  datePickerContainer: {
    width: '90%',
    maxWidth: 360,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  calendarNavButton: {
    padding: spacing.sm,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayButton: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  quickDateActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  quickDateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  quickDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
