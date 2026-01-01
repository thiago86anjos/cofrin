import { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, Platform, ScrollView, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, palette } from '../theme';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
}

// Nomes dos meses em português
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Componente de calendário customizado para web
function WebCalendar({ 
  value, 
  onChange, 
  onClose,
  minimumDate,
  maximumDate,
  colors 
}: { 
  value: Date; 
  onChange: (date: Date) => void; 
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  colors: any;
}) {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  // Gerar dias do mês
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

    // Dias do mês anterior
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(currentYear, currentMonth, day),
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para completar a grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, day),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === value.getDate() &&
           date.getMonth() === value.getMonth() &&
           date.getFullYear() === value.getFullYear();
  };

  const isDisabled = (date: Date) => {
    if (minimumDate && date < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())) {
      return true;
    }
    if (maximumDate && date > new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate())) {
      return true;
    }
    return false;
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (!isDisabled(date)) {
      onChange(date);
      onClose();
    }
  };

  const handleSelectMonth = (month: number) => {
    setViewDate(new Date(currentYear, month, 1));
    setShowMonthPicker(false);
  };

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
    setShowYearPicker(false);
  };

  // Anos disponíveis (10 anos antes e depois)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    const startYear = minimumDate ? minimumDate.getFullYear() : currentYear - 10;
    const endYear = maximumDate ? maximumDate.getFullYear() : currentYear + 10;
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear, minimumDate, maximumDate]);

  return (
    <Pressable style={styles.calendarOverlay} onPress={onClose}>
      <Pressable style={[styles.calendarContainer, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
        {/* Header com mês e ano */}
        <View style={styles.calendarHeader}>
          <Pressable onPress={handlePrevMonth} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
          </Pressable>
          
          <View style={styles.monthYearContainer}>
            <Pressable 
              onPress={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
              style={[styles.monthYearButton, showMonthPicker && { backgroundColor: colors.primaryBg }]}
            >
              <Text style={[styles.monthYearText, { color: colors.primary }]}>
                {MONTHS_PT[currentMonth]}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
            </Pressable>
            
            <Pressable 
              onPress={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
              style={[styles.monthYearButton, showYearPicker && { backgroundColor: colors.primaryBg }]}
            >
              <Text style={[styles.monthYearText, { color: colors.primary }]}>
                {currentYear}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
            </Pressable>
          </View>
          
          <Pressable onPress={handleNextMonth} style={styles.navButton}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Picker de mês */}
        {showMonthPicker && (
          <View style={[styles.pickerGrid, { backgroundColor: colors.bg }]}>
            {MONTHS_PT.map((month, index) => (
              <Pressable
                key={month}
                onPress={() => handleSelectMonth(index)}
                style={[
                  styles.pickerItem,
                  currentMonth === index && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: currentMonth === index ? '#fff' : colors.text }
                ]}>
                  {month.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Picker de ano */}
        {showYearPicker && (
          <ScrollView style={[styles.yearPickerScroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.yearPickerContent}>
            {availableYears.map((year) => (
              <Pressable
                key={year}
                onPress={() => handleSelectYear(year)}
                style={[
                  styles.yearItem,
                  currentYear === year && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.yearItemText,
                  { color: currentYear === year ? '#fff' : colors.text }
                ]}>
                  {year}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Dias da semana */}
        {!showMonthPicker && !showYearPicker && (
          <>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS_PT.map((day) => (
                <View key={day} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, { color: colors.textMuted }]}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grid de dias */}
            <View style={styles.daysGrid}>
              {calendarDays.map((item, index) => {
                if (!item.date) return <View key={index} style={styles.dayCell} />;
                
                const selected = isSelected(item.date);
                const today = isToday(item.date);
                const disabled = isDisabled(item.date);
                
                return (
                  <Pressable
                    key={index}
                    onPress={() => handleSelectDate(item.date!)}
                    disabled={disabled}
                    style={[
                      styles.dayCell,
                      selected && { backgroundColor: colors.primary },
                      today && !selected && { borderWidth: 2, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: colors.text },
                      !item.isCurrentMonth && { color: colors.textMuted, opacity: 0.5 },
                      selected && { color: '#fff', fontWeight: '700' },
                      disabled && { color: colors.textMuted, opacity: 0.3 },
                    ]}>
                      {item.date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.calendarFooter}>
          <Pressable onPress={onClose} style={styles.footerButton}>
            <Text style={[styles.footerButtonText, { color: colors.textMuted }]}>Cancelar</Text>
          </Pressable>
          <Pressable 
            onPress={() => { onChange(new Date()); onClose(); }} 
            style={styles.footerButton}
          >
            <Text style={[styles.footerButtonText, { color: colors.primary }]}>Hoje</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

export default function DatePickerCrossPlatform({ 
  value, 
  onChange, 
  minimumDate, 
  maximumDate,
  label 
}: Props) {
  const { colors } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formatar data para input type="date" (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  const handleWebChange = (dateString: string) => {
    if (dateString) {
      const [year, month, day] = dateString.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      onChange(newDate);
    }
  };

  // Web: usar calendário customizado
  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.dateButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formatDate(value)}
          </Text>
        </Pressable>

        {showPicker && (
          <Modal
            visible={showPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPicker(false)}
          >
            <WebCalendar
              value={value}
              onChange={onChange}
              onClose={() => setShowPicker(false)}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              colors={colors}
            />
          </Modal>
        )}
      </View>
    );
  }

  // Mobile: usar DateTimePicker nativo
  return (
    <View>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.dateButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
      >
        <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
        <Text style={[styles.dateText, { color: colors.text }]}>
          {formatDate(value)}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleNativeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  dateText: {
    fontSize: 16,
  },
  // Estilos do calendário web
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : {}),
  },
  calendarContainer: {
    width: 320,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  pickerItem: {
    width: '30%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  yearPickerScroll: {
    maxHeight: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  yearPickerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  yearItem: {
    width: '23%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  yearItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  footerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
