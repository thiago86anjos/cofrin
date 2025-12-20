import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';
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
    <View style={[styles.card, { backgroundColor: '#fff' }, getShadow(colors)]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: '#1F2937' }]}>
            Onde está meu dinheiro
          </Text>
          {accounts.length > 0 && (
            <Text style={[styles.subtitle, { color: '#9CA3AF' }]}>
              Saldo total: {formatCurrencyBRL(totalBalance)}
            </Text>
          )}
        </View>
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
          <MaterialCommunityIcons name="wallet-plus" size={48} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: '#9CA3AF' }]}>
            Nenhuma conta cadastrada
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  accountsList: {
    gap: 12,
  },
  accountItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitleSection: {
    flex: 1,
  },
  accountNameCompact: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountType: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  balanceSection: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    marginBottom: 2,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
