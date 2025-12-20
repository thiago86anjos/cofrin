import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrencyBRL } from '../../utils/format';
import { useAppTheme } from '../../contexts/themeContext';
import { getShadow } from '../../theme';

interface Props {
  username?: string;
  revenue?: number;
  expenses?: number;
  onSaveTransaction?: () => void;
}

export default function HomeOverview({ 
  username = 'Usuário', 
  revenue = 0, 
  expenses = 0, 
  onSaveTransaction 
}: Props) {
  const { colors } = useAppTheme();

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', emoji: '👋' };
    if (hour < 18) return { text: 'Boa tarde', emoji: '👋' };
    return { text: 'Boa noite', emoji: '👋' };
  };

  // Formatar data amigável
  const getFriendlyDate = () => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);
    const day = now.getDate();
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
    
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    
    return `${capitalizedWeekday}, ${day} de ${month}`;
  };

  // Obter mês atual completo
  const getCurrentMonth = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
  };

  const greeting = getGreeting();
  const friendlyDate = getFriendlyDate();
  const currentMonth = getCurrentMonth();
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
  const balance = revenue - expenses;

  return (
    <View style={styles.container}>
      {/* Saudação */}
      <View style={styles.greetingSection}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {greeting.text}, {username} {greeting.emoji}
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {friendlyDate}
        </Text>
      </View>

      {/* Card Hero - Resumo do Mês */}
      <View style={[styles.heroCard, { backgroundColor: '#fff' }, getShadow(colors)]}>
        <Text style={[styles.heroTitle, { color: '#6B7280' }]}>
          Resumo de {capitalizedMonth}
        </Text>
        
        <Text style={[styles.heroValue, { color: '#10B981' }]}>
          {formatCurrencyBRL(balance)}
        </Text>

        {/* Receitas e Despesas */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statIconLabel}>
              <MaterialCommunityIcons name="arrow-up" size={16} color="#10B981" />
              <Text style={[styles.statLabel, { color: '#6B7280' }]}>Receitas</Text>
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {formatCurrencyBRL(revenue)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statIconLabel}>
              <MaterialCommunityIcons name="arrow-down" size={16} color="#EF4444" />
              <Text style={[styles.statLabel, { color: '#6B7280' }]}>Despesas</Text>
            </View>
            <Text style={[styles.statValue, { color: '#6B7280' }]}>
              {formatCurrencyBRL(expenses)}
            </Text>
          </View>
        </View>
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
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
    marginBottom: 20,
    letterSpacing: -1,
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
