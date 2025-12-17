import { memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrencyBRL } from '../../utils/format';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../../theme';

interface Props {
  icon?: string; // letter or emoji
  title: string;
  account?: string;
  amount: number; // numeric value; positive = income, negative = expense
  type?: 'received' | 'paid' | 'transfer';
  category?: string;
  categoryIcon?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  goalName?: string; // Se for aporte em meta
  isLocked?: boolean; // Se for pagamento de fatura (não pode ser editado)
  isLastInGroup?: boolean; // Se é o último item do grupo de data
  onPress?: () => void;
  onEdit?: () => void;
  onStatusPress?: () => void;
}

function TransactionItemComponent({ 
  icon = '◻', 
  title, 
  account, 
  amount, 
  type, 
  category,
  categoryIcon,
  status = 'completed',
  goalName,
  isLocked = false,
  isLastInGroup = false,
  onPress,
  onEdit,
  onStatusPress,
}: Props) {
  const { colors } = useAppTheme();
  
  // Cores específicas para cada tipo de transação
  const incomeColor = '#10b981';  // Verde claro
  const expenseColor = '#dc2626'; // Vermelho
  const transferColor = '#64748b'; // Cinza
  const goalColor = colors.primary; // Cor da meta (teal)
  
  const getColor = () => {
    if (goalName) return goalColor; // Aporte em meta usa cor primária
    if (type === 'transfer') return transferColor;
    if (type === 'paid' || amount < 0) return expenseColor;
    return incomeColor;
  };
  
  const color = isLocked ? colors.textMuted : getColor();
  const initial = title.charAt(0).toUpperCase();

  // Subtítulo: categoria + conta (ou indicação de meta)
  const subtitle = goalName 
    ? `Meta • ${account || ''}`.replace(/ • $/, '')
    : [category, account].filter(Boolean).join(' • ');
  
  // Cor e ícone do status
  const statusColor = status === 'completed' ? '#10b981' : '#94a3b8';
  const statusIcon = status === 'completed' ? 'thumb-up' : 'thumb-down';

  return (
    <Pressable
      onPress={isLocked ? undefined : (onEdit || onPress)}
      disabled={isLocked}
      style={({ pressed }) => [
        styles.card,
        { 
          backgroundColor: isLocked ? colors.grayLight : colors.card,
          opacity: isLocked ? 0.7 : 1,
        },
        getShadow(colors, 'sm'),
        pressed && { backgroundColor: colors.grayLight },
      ]}
    >
      {/* Ícone da categoria */}
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        {goalName ? (
          <MaterialCommunityIcons name="flag-checkered" size={24} color={color} />
        ) : categoryIcon ? (
          <MaterialCommunityIcons name={categoryIcon as any} size={24} color={color} />
        ) : (
          <Text style={[styles.iconLabel, { color }]}>{initial}</Text>
        )}
      </View>
      
      {/* Conteúdo central - Título e Subtítulo */}
      <View style={styles.content}>
        <Text 
          style={[
            styles.title, 
            { color: status === 'pending' ? colors.textMuted : colors.text }
          ]} 
          numberOfLines={2}
        >
          {title}
          {isLocked && (
            <>
              <Text> </Text>
              <MaterialCommunityIcons name="lock" size={11} color={colors.textMuted} />
            </>
          )}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {isLocked && (
          <Text style={[styles.lockedLabel, { color: colors.textMuted }]}>
            Pagamento de fatura
          </Text>
        )}
      </View>
      
      {/* Coluna direita - Valor e ícone de feedback */}
      <View style={styles.rightColumn}>
        <Text style={[styles.amount, { color: status === 'pending' ? colors.textMuted : color }]}>
          {formatCurrencyBRL(amount)}
        </Text>
        {!isLocked && onStatusPress && (
          <Pressable
            onPress={onStatusPress}
            hitSlop={10}
            style={({ pressed }) => [
              styles.feedbackButton,
              { opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <MaterialCommunityIcons 
              name={statusIcon} 
              size={24} 
              color={statusColor}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default memo(TransactionItemComponent);

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  iconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24,
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
    flexShrink: 0,
  },
  iconLabel: { 
    fontWeight: '700',
    fontSize: 18,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  amount: { 
    fontWeight: '700', 
    fontSize: 16,
    lineHeight: 20,
  },
  feedbackButton: {
    marginTop: 2,
    padding: 2,
  },
  lockedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
