import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';
import { formatCurrencyBRL } from '../../utils/format';
import { Account, Transaction, CreditCard } from '../../types/firebase';

interface Props {
  accounts?: Account[];
  username?: string;
  totalBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  pendingTransactions?: Transaction[];
  creditCards?: CreditCard[];
  onAccountPress?: (account: Account) => void;
  onAddPress?: () => void;
  showGreeting?: boolean;
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

export default memo(function AccountsCard({ 
  accounts = [], 
  username = 'Usuário',
  totalBalance,
  pendingTransactions = [],
  creditCards = [],
  onAccountPress, 
  onAddPress,
  showGreeting = true,
}: Props) {
  const { colors } = useAppTheme();

  // Filtrar apenas contas com saldo diferente de zero OU que tenham lançamentos/faturas pendentes
  const accountsWithBalance = accounts.filter(account => {
    // Se tem saldo, mostrar
    if (account.balance !== 0) return true;
    
    // Se saldo = 0, verificar se tem lançamentos pendentes associados
    const hasPendingTransactions = pendingTransactions.some(
      transaction => transaction.accountId === account.id
    );
    
    // Verificar se há cartões com faturas pendentes que usam esta conta para pagamento
    const hasPendingCardBills = creditCards.some(
      card => card.paymentAccountId === account.id && (card.currentUsed || 0) > 0
    );
    
    return hasPendingTransactions || hasPendingCardBills;
  });

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
    : accountsWithBalance.reduce((sum, account) => sum + (account.balance || 0), 0);

  // Componente de item da conta (minimal design)
  const AccountItem = ({ account, index }: { account: Account; index: number }) => {
    const accountColor = getAccountColor(account.type);
    const accountIcon = getAccountIcon(account.type);
    const isNegative = account.balance < 0;
    
    return (
      <>
        {index > 0 && (
          <View style={[styles.divider, { borderColor: colors.border }]} />
        )}
        <Pressable
          onPress={() => onAccountPress?.(account)}
          style={({ pressed }) => [
            styles.accountItem,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          {/* Primeira linha: ícone + nome */}
          <View style={styles.accountHeader}>
            <MaterialCommunityIcons
              name={accountIcon as any}
              size={20}
              color={accountColor}
            />
            <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
              {account.name}
            </Text>
          </View>

          {/* Segunda linha: saldo */}
          <View style={styles.accountInfo}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Saldo atual:</Text>
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
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Saudação */}
      {showGreeting && (
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
      )}

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
        {accountsWithBalance.length > 0 && (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}

        {/* Lista de contas */}
        {accountsWithBalance.length > 0 && (
          <View style={styles.accountsList}>
            <Text style={[styles.accountsTitle, { color: titleGray }]}>
              Contas
            </Text>
            {accountsWithBalance.map((account, index) => (
              <AccountItem key={account.id} account={account} index={index} />
            ))}
          </View>
        )}

        {/* Mensagem vazia */}
        {accountsWithBalance.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="wallet-outline" size={48} color="#9CA3AF" />
            <Text style={[styles.emptyText, { color: '#9CA3AF' }]}>
              Nenhuma conta com saldo disponível
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

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
    gap: 0,
    marginTop: 8,
  },
  accountsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountItem: {
    paddingVertical: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 0,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  accountName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  accountInfo: {
    flexDirection: 'row',
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
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
