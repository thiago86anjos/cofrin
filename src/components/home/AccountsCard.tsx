import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../../theme';
import { formatCurrencyBRL } from '../../utils/format';
import { Account, ACCOUNT_TYPE_LABELS } from '../../types/firebase';

interface Props {
  accounts?: Account[];
  onAccountPress?: (account: Account) => void;
  onAddPress?: () => void;
}

// Cores e ícones para os tipos de conta
const getAccountIcon = (type: string): string => {
  switch (type) {
    case 'checking': return 'bank';
    case 'savings': return 'piggy-bank';
    case 'investment': return 'chart-line';
    case 'cash': return 'cash';
    default: return 'wallet';
  }
};

const getAccountColor = (type: string): string => {
  switch (type) {
    case 'checking': return '#3b82f6';
    case 'savings': return '#10b981';
    case 'investment': return '#8b5cf6';
    case 'cash': return '#f59e0b';
    default: return '#6b7280';
  }
};

export default function AccountsCard({ accounts = [], onAccountPress, onAddPress }: Props) {
  const { colors } = useAppTheme();

  // Componente de item da conta (compacto e moderno)
  const AccountItem = ({ account }: { account: Account }) => {
    const accountColor = getAccountColor(account.type);
    const accountIcon = getAccountIcon(account.type);
    const isNegative = account.balance < 0;
    
    return (
      <Pressable
        onPress={() => onAccountPress?.(account)}
        style={({ pressed }) => [
          styles.accountItem,
          { 
            backgroundColor: colors.bg,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          }
        ]}
      >
        <View style={styles.accountContent}>
          {/* Ícone e nome */}
          <View style={styles.accountHeader}>
            <View style={[styles.accountIconSmall, { backgroundColor: `${accountColor}20` }]}>
              <MaterialCommunityIcons
                name={accountIcon as any}
                size={18}
                color={accountColor}
              />
            </View>
            <View style={styles.accountTitleSection}>
              <Text style={[styles.accountNameCompact, { color: colors.text }]} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={[styles.accountType, { color: colors.textMuted }]}>
                {ACCOUNT_TYPE_LABELS[account.type]}
              </Text>
            </View>
          </View>

          {/* Saldo */}
          <View style={styles.balanceSection}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Saldo</Text>
            <Text 
              style={[
                styles.balanceValue, 
                { color: isNegative ? colors.expense : colors.text }
              ]}
            >
              {formatCurrencyBRL(account.balance)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // Calcular saldo total
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons 
              name="wallet" 
              size={20} 
              color={colors.primary} 
            />
            <Text style={[styles.title, { color: colors.text }]}>
              Minhas contas
            </Text>
          </View>
          <Pressable 
            onPress={onAddPress}
            style={({ pressed }) => [{
              opacity: pressed ? 0.5 : 1,
            }]}
          >
            <View style={[styles.addIconButton, { backgroundColor: colors.primaryBg }]}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
            </View>
          </Pressable>
        </View>
        {accounts.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
              Saldo total
            </Text>
            <Text style={[styles.totalValue, { color: totalBalance < 0 ? colors.expense : colors.income }]}>
              {formatCurrencyBRL(totalBalance)}
            </Text>
          </View>
        )}
      </View>

      {/* Lista de contas */}
      <View style={styles.accountsList}>
        {accounts.map((account) => (
          <AccountItem key={account.id} account={account} />
        ))}
      </View>

      {/* Mensagem vazia */}
      {accounts.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="wallet-plus" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Adicione sua primeira conta
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountsList: {
    gap: spacing.sm,
  },
  accountItem: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountContent: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  accountIconSmall: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitleSection: {
    flex: 1,
  },
  accountNameCompact: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountType: {
    fontSize: 11,
  },
  balanceSection: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 14,
    textAlign: 'center',
  },
});
