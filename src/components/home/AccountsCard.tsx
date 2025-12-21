import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';
import { formatCurrencyBRL } from '../../utils/format';
import { Account, ACCOUNT_TYPE_LABELS } from '../../types/firebase';

interface Props {
  accounts?: Account[];
  username?: string;
  totalBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
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
    case 'checking': return '#5B3CC4'; // roxo principal
    case 'savings': return '#2FAF8E';  // verde elegante do design system
    case 'investment': return '#7B5CD6'; // roxo claro
    case 'cash': return '#E07A3F';  // laranja atenção
    default: return '#9A96B0';  // cinza arroxeado
  }
};

// Cor cinza chumbo moderna para o título
const titleGray = '#6B7280';
// Fundo mais claro para visual moderno
const lightBg = '#FAFAFA';

export default function AccountsCard({ 
  accounts = [], 
  username = 'Usuário',
  totalBalance,
  onAccountPress, 
  onAddPress 
}: Props) {
  const { colors } = useAppTheme();

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Bom dia', icon: 'weather-sunny' as const };
    if (hour >= 12 && hour < 18) return { text: 'Boa tarde', icon: 'weather-partly-cloudy' as const };
    return { text: 'Boa noite', icon: 'weather-night' as const };
  };

  const greeting = getGreeting();
  
  // Se totalBalance for fornecido via prop, usa ele. Caso contrário, calcula.
  const displayTotalBalance = totalBalance !== undefined 
    ? totalBalance 
    : accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

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
            backgroundColor: lightBg,
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

  return (
    <View style={styles.container}>
      {/* Saudação */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {greeting.text}, {username}
          </Text>
          <MaterialCommunityIcons 
            name={greeting.icon} 
            size={28} 
            color={colors.text} 
            style={styles.greetingIcon}
          />
        </View>
      </View>

      {/* Card Principal */}
      <View style={[styles.card, { borderColor: colors.border }, getShadow(colors)]}>
        {/* Header com título e saldo geral */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: titleGray }]}>
            Onde está meu dinheiro
          </Text>
          
          {/* Saldo Geral - Destaque */}
          <View style={styles.totalBalanceSection}>
            <Text style={[styles.totalBalanceLabel, { color: colors.textMuted }]}>
              Saldo geral
            </Text>
            <Text style={[
              styles.totalBalanceValue, 
              { color: displayTotalBalance >= 0 ? colors.income : colors.expense }
            ]}>
              {formatCurrencyBRL(displayTotalBalance)}
            </Text>
          </View>
        </View>

        {/* Separador */}
        {accounts.length > 0 && (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}

        {/* Lista de contas */}
        {accounts.length > 0 && (
          <View style={styles.accountsList}>
            <Text style={[styles.accountsTitle, { color: titleGray }]}>
              Contas
            </Text>
            {accounts.map((account) => (
              <AccountItem key={account.id} account={account} />
            ))}
          </View>
        )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  greetingSection: {
    gap: 4,
    paddingHorizontal: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingIcon: {
    marginLeft: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalBalanceSection: {
    gap: 4,
  },
  totalBalanceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  totalBalanceValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  accountsList: {
    gap: 12,
    marginTop: 8,
  },
  accountsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
