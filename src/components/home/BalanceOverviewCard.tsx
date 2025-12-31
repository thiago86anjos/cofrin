import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../contexts/themeContext';
import { formatCurrencyBRL } from '../../utils/format';
import { Account } from '../../types/firebase';

interface Props {
  accounts?: Account[];
  username?: string;
  totalBalance?: number;
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
    case 'wallet': return 'wallet';
    default: return 'wallet';
  }
};

const getAccountColor = (type: string): string => {
  switch (type) {
    case 'checking': return '#6366F1';
    case 'savings': return '#2FAF8E';
    case 'investment': return '#7B5CD6';
    case 'cash': return '#E07A3F';
    default: return '#9A96B0';
  }
};

export default memo(function BalanceOverviewCard({ 
  accounts = [], 
  username = 'Usuário',
  totalBalance,
  onAccountPress, 
  onAddPress,
  showGreeting = true,
}: Props) {
  const { colors } = useAppTheme();

  // Filtrar apenas contas visíveis (includeInTotal !== false)
  const visibleAccounts = accounts.filter(account => account.includeInTotal !== false);

  // Calcular total disponível
  const displayTotalBalance = totalBalance !== undefined 
    ? totalBalance 
    : visibleAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Bom dia', icon: 'weather-sunny' as const };
    if (hour >= 12 && hour < 18) return { text: 'Boa tarde', icon: 'weather-partly-cloudy' as const };
    return { text: 'Boa noite', icon: 'weather-night' as const };
  };

  const greeting = getGreeting();

  // Calcular percentual de cada conta
  const getAccountPercentage = (balance: number): number => {
    if (displayTotalBalance === 0) return 0;
    return Math.abs((balance / displayTotalBalance) * 100);
  };

  // Componente individual de conta
  const AccountDistributionItem = ({ account }: { account: Account }) => {
    // Usar cor personalizada da conta, ou fallback para cor padrão do tipo
    const accountColor = account.color || getAccountColor(account.type);
    const accountIcon = getAccountIcon(account.type);
    const percentage = getAccountPercentage(account.balance);
    const isZero = account.balance === 0;

    return (
      <View
        style={[
          styles.accountCard,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
          }
        ]}
      >
        <Pressable
          onPress={() => onAccountPress?.(account)}
          style={({ pressed }) => [
            styles.accountCardContent,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View style={styles.accountCardHeader}>
            <View style={[styles.accountIconCircle, { backgroundColor: accountColor + '15' }]}>
              <MaterialCommunityIcons
                name={accountIcon as any}
                size={22}
                color={accountColor}
              />
            </View>
            <View style={styles.accountCardInfo}>
              <Text style={[styles.accountCardName, { color: colors.text }]} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={[
                styles.accountCardValue, 
                { color: account.balance < 0 ? colors.danger : colors.text }
              ]}>
                {formatCurrencyBRL(account.balance)}
              </Text>
            </View>
            <MaterialCommunityIcons 
              name="dots-horizontal" 
              size={20} 
              color={colors.textMuted}
            />
          </View>

          {/* Barra de progresso e percentual - apenas se houver mais de 1 conta */}
          {visibleAccounts.length > 1 && (
            <View style={styles.accountProgressSection}>
              <Text style={[
                styles.accountPercentage, 
                { color: isZero ? colors.textMuted : colors.textSecondary }
              ]}>
                {percentage.toFixed(0)}% do total
              </Text>
              <View style={[styles.accountProgressBg, { backgroundColor: colors.grayLight }]}>
                <View 
                  style={[
                    styles.accountProgressFill, 
                    { 
                      width: `${percentage}%`,
                      backgroundColor: isZero ? colors.gray : accountColor
                    }
                  ]} 
                />
              </View>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  // Estado vazio
  if (visibleAccounts.length === 0) {
    return (
      <View style={styles.container}>
        {showGreeting && (
          <View style={styles.greetingSection}>
            <View style={styles.greetingRow}>
              <Text style={[styles.greeting, { color: colors.primary }]}>
                {greeting.text}, {username}
              </Text>
              <MaterialCommunityIcons 
                name={greeting.icon} 
                size={28} 
                color={colors.primary}
                style={styles.greetingIcon}
              />
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            Seu dinheiro
          </Text>

          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="wallet-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              Nenhum saldo disponível no momento
            </Text>
            {onAddPress && (
              <Pressable
                onPress={onAddPress}
                style={({ pressed }) => [
                  styles.emptyStateButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={styles.emptyStateButtonText}>Adicionar conta</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Saudação */}
      {showGreeting && (
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: colors.primary }]}>
              {greeting.text}, {username}
            </Text>
            <MaterialCommunityIcons 
              name={greeting.icon} 
              size={28} 
              color={colors.primary}
              style={styles.greetingIcon}
            />
          </View>
        </View>
      )}

      {/* Card Principal */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Header do card */}
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          Seu dinheiro
        </Text>

        {/* Valor principal (protagonista) */}
        <View style={styles.mainValueSection}>
          <Text style={[styles.mainValue, { color: colors.success }]}>
            {formatCurrencyBRL(displayTotalBalance)}
          </Text>
        </View>

        <View style={styles.accountsGrid}>
          {visibleAccounts.map((account) => (
            <AccountDistributionItem key={account.id} account={account} />
          ))}
        </View>
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
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 16,
  },
  mainValueSection: {
    gap: 6,
    marginBottom: 20,
  },
  mainValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  mainValueSubtext: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  distributionBarContainer: {
    marginBottom: 24,
  },
  distributionBarBg: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  distributionSection: {
    gap: 12,
  },
  distributionTitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 12,
  },
  accountsGrid: {
    gap: 12,
  },
  accountCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountCardContent: {
    padding: 16,
    gap: 12,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCardInfo: {
    flex: 1,
    gap: 4,
  },
  accountCardName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  accountCardValue: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  accountProgressSection: {
    gap: 8,
  },
  accountPercentage: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'right',
  },
  accountProgressBg: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accountProgressFill: {
    height: '100%',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
