import { useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
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

  // Web: usar input nativo
  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
        <View style={[styles.webInputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          <input
            type="date"
            value={formatDateForInput(value)}
            onChange={(e) => handleWebChange(e.target.value)}
            min={minimumDate ? formatDateForInput(minimumDate) : undefined}
            max={maximumDate ? formatDateForInput(maximumDate) : undefined}
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.text,
              fontSize: 16,
              fontFamily: 'inherit',
              marginLeft: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </View>
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
  webInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
