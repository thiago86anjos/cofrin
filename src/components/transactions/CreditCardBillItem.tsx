import React, { memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrencyBRL } from '../../utils/format';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius } from '../../theme';

interface Props {
  creditCardName: string;
  creditCardIcon?: string;
  creditCardColor?: string;
  billMonth: number;
  billYear: number;
  totalAmount: number;
  isPaid: boolean;
  onPress: () => void;
}

// Nomes dos meses abreviados
const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function CreditCardBillItemComponent({
  creditCardName,
  creditCardIcon = 'credit-card',
  creditCardColor = '#3B82F6',
  billMonth,
  billYear,
  totalAmount,
  isPaid,
  onPress,
}: Props) {
  const { colors } = useAppTheme();
  
  const monthName = MONTHS_SHORT[billMonth - 1] || '';
  const title = `Fatura ${creditCardName}`;
  const subtitle = `${monthName}/${billYear}`;
  
  // Cor do valor - igual ao TransactionItem
  const amountColor = isPaid ? colors.textMuted : '#dc2626';
  
  // Status icon e cor - igual ao TransactionItem
  const statusColor = isPaid ? '#10b981' : colors.textMuted;
  const statusIcon = isPaid ? 'check-circle' : 'circle-outline';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { 
          backgroundColor: pressed ? colors.grayLight : colors.card,
        }
      ]}
    >
      {/* Ícone do cartão */}
      <View style={[styles.iconContainer, { backgroundColor: creditCardColor + '15' }]}>
        <MaterialCommunityIcons 
          name={creditCardIcon as any} 
          size={24} 
          color={creditCardColor} 
        />
        {/* Badge de status no canto inferior direito */}
        <View style={[styles.statusBadge, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons 
            name={statusIcon} 
            size={14} 
            color={statusColor} 
          />
        </View>
      </View>
      
      {/* Conteúdo principal */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.amount, { color: amountColor }]}>
            {formatCurrencyBRL(-totalAmount)}
          </Text>
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}{!isPaid && ' • Pendente'}
          </Text>
        </View>
      </View>
      
      {/* Seta para indicar navegação */}
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={20} 
        color={colors.textMuted}
        style={styles.chevron}
      />
    </Pressable>
  );
}

export default memo(CreditCardBillItemComponent);

const styles = StyleSheet.create({
  row: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  iconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24,
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: { 
    fontWeight: '700', 
    fontSize: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 12,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
