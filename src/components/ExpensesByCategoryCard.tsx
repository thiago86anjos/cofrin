import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../theme';
import { formatCurrencyBRL } from '../utils/format';

interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  total: number;
}

interface Props {
  expenses: CategoryExpense[];
  totalExpenses: number;
  maxItems?: 3 | 5;
  showTitle?: boolean;
}

export default function ExpensesByCategoryCard({ 
  expenses, 
  totalExpenses, 
  maxItems = 5,
  showTitle = true 
}: Props) {
  const { colors } = useAppTheme();

  // Calcular percentual de cada categoria
  const expensesWithPercentage = expenses.map(expense => ({
    ...expense,
    percentage: totalExpenses > 0 ? (expense.total / totalExpenses) * 100 : 0
  }));

  // Top N categorias
  const topExpenses = expensesWithPercentage.slice(0, maxItems);

  // Verificar se "Outros" representa mais de 50%
  const othersCategory = topExpenses.find(
    cat => cat.categoryName.toLowerCase() === 'outros'
  );
  const hasOthersAlert = othersCategory && othersCategory.percentage > 50;

  // Verificar se alguma categoria domina (>50%)
  const dominantCategory = topExpenses.find(cat => cat.percentage > 50);
  const hasDominantCategory = dominantCategory && dominantCategory.categoryName.toLowerCase() !== 'outros';

  // Se não há gastos
  if (expenses.length === 0 || totalExpenses === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
        {showTitle && (
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
              <MaterialCommunityIcons name="chart-pie" size={24} color={colors.expense} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Onde você gastou</Text>
          </View>
        )}
        
        <View style={[styles.emptyState, { backgroundColor: colors.grayLight }]}>
          <MaterialCommunityIcons name="information" size={20} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhum gasto registrado neste mês
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, getShadow(colors)]}>
      {showTitle && (
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
            <MaterialCommunityIcons name="chart-pie" size={24} color={colors.expense} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Onde você gastou</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {topExpenses.length} {topExpenses.length === 1 ? 'categoria principal' : 'principais categorias'}
            </Text>
          </View>
        </View>
      )}

      {/* Alerta: Outros > 50% */}
      {hasOthersAlert && (
        <View style={[styles.alert, { backgroundColor: colors.warningBg || '#FEF3C7' }]}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={18} 
            color="#D97706" 
          />
          <Text style={[styles.alertText, { color: '#92400E' }]}>
            Muitos gastos estão em "Outros". Classificar melhor ajuda a entender para onde seu dinheiro está indo.
          </Text>
        </View>
      )}

      {/* Destaque: Categoria dominante > 50% */}
      {hasDominantCategory && dominantCategory && (
        <View style={[styles.highlight, { backgroundColor: colors.primaryBg }]}>
          <MaterialCommunityIcons 
            name="information" 
            size={18} 
            color={colors.primary} 
          />
          <Text style={[styles.highlightText, { color: colors.primary }]}>
            Mais da metade dos seus gastos foi em{' '}
            <Text style={{ fontWeight: '700' }}>{dominantCategory.categoryName}</Text>
          </Text>
        </View>
      )}

      {/* Lista de categorias */}
      <View style={styles.categoryList}>
        {topExpenses.map((expense, index) => {
          const isOthers = expense.categoryName.toLowerCase() === 'outros';
          const isDominant = expense.percentage > 50;
          
          return (
            <View key={expense.categoryId} style={styles.categoryItem}>
              {/* Lado esquerdo: Rank, ícone e nome */}
              <View style={styles.categoryLeft}>
                <View style={[
                  styles.categoryRank, 
                  { 
                    backgroundColor: isDominant && !isOthers
                      ? colors.primaryBg 
                      : colors.grayLight 
                  }
                ]}>
                  <Text style={[
                    styles.categoryRankText, 
                    { 
                      color: isDominant && !isOthers 
                        ? colors.primary 
                        : colors.textMuted 
                    }
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                
                <View style={[
                  styles.categoryIconCircle,
                  { backgroundColor: colors.grayLight }
                ]}>
                  <MaterialCommunityIcons 
                    name={expense.categoryIcon as any} 
                    size={18} 
                    color={colors.text} 
                  />
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {expense.categoryName}
                  </Text>
                  
                  {/* Barra de percentual */}
                  <View style={styles.barContainer}>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            width: `${Math.min(expense.percentage, 100)}%`,
                            backgroundColor: isDominant && !isOthers
                              ? colors.primary
                              : isOthers && expense.percentage > 50
                              ? colors.warning || '#F59E0B'
                              : colors.expense
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.percentageText, { color: colors.textMuted }]}>
                      {expense.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lado direito: Valor */}
              <Text style={[styles.categoryValue, { color: colors.expense }]}>
                {formatCurrencyBRL(expense.total)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Rodapé informativo */}
      {expenses.length > maxItems && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            +{expenses.length - maxItems} {expenses.length - maxItems === 1 ? 'outra categoria' : 'outras categorias'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  categoryList: {
    gap: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    flex: 1,
  },
});
