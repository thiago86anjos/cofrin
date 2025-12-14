import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MainLayout from '../components/MainLayout';
import AppHeader from '../components/AppHeader';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius, getShadow } from '../theme';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  icon: string;
  color: string;
}

export default function Goals() {
  const { colors } = useAppTheme();

  // Livros recomendados sobre finanças
  const books: Book[] = [
    { 
      id: '1', 
      title: 'Pai Rico, Pai Pobre', 
      author: 'Robert Kiyosaki',
      description: 'Aprenda a diferença entre ativos e passivos e como fazer o dinheiro trabalhar para você.',
      icon: 'book-open-variant', 
      color: '#8b5cf6' 
    },
    { 
      id: '2', 
      title: 'O Homem Mais Rico da Babilônia', 
      author: 'George S. Clason',
      description: 'Princípios financeiros atemporais através de parábolas da antiga Babilônia.',
      icon: 'bank', 
      color: '#f59e0b' 
    },
    { 
      id: '3', 
      title: 'Os Segredos da Mente Milionária', 
      author: 'T. Harv Eker',
      description: 'Descubra como sua mentalidade sobre dinheiro afeta sua vida financeira.',
      icon: 'head-lightbulb', 
      color: '#10b981' 
    },
    { 
      id: '4', 
      title: 'Me Poupe!', 
      author: 'Nathalia Arcuri',
      description: '10 passos para nunca mais faltar dinheiro no seu bolso.',
      icon: 'piggy-bank', 
      color: '#ec4899' 
    },
    { 
      id: '5', 
      title: 'Do Mil ao Milhão', 
      author: 'Thiago Nigro',
      description: 'Sem cortar o cafezinho - como alcançar a independência financeira.',
      icon: 'chart-line', 
      color: '#3b82f6' 
    },
  ];

  // Dicas rápidas
  const tips = [
    { id: '1', text: 'Pague-se primeiro: separe pelo menos 10% da sua renda assim que receber.', icon: 'cash-check' },
    { id: '2', text: 'Crie uma reserva de emergência de 6 a 12 meses de despesas.', icon: 'shield-check' },
    { id: '3', text: 'Evite dívidas de cartão de crédito - os juros são os mais altos do mercado.', icon: 'credit-card-off' },
    { id: '4', text: 'Invista em conhecimento financeiro - é o melhor retorno que existe.', icon: 'school' },
  ];

  const BookCard = ({ book }: { book: Book }) => (
    <View style={[styles.bookCard, { backgroundColor: colors.card }, getShadow(colors)]}>
      <View style={[styles.bookIcon, { backgroundColor: book.color + '15' }]}>
        <MaterialCommunityIcons name={book.icon as any} size={28} color={book.color} />
      </View>
      <View style={styles.bookContent}>
        <Text style={[styles.bookTitle, { color: colors.text }]}>{book.title}</Text>
        <Text style={[styles.bookAuthor, { color: colors.primary }]}>{book.author}</Text>
        <Text style={[styles.bookDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {book.description}
        </Text>
      </View>
    </View>
  );

  const TipCard = ({ tip, index }: { tip: typeof tips[0]; index: number }) => (
    <View style={[styles.tipCard, { backgroundColor: colors.card }, getShadow(colors)]}>
      <View style={[styles.tipNumber, { backgroundColor: colors.primaryBg }]}>
        <Text style={[styles.tipNumberText, { color: colors.primary }]}>{index + 1}</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={[styles.tipText, { color: colors.text }]}>{tip.text}</Text>
      </View>
      <MaterialCommunityIcons name={tip.icon as any} size={24} color={colors.primary} />
    </View>
  );

  return (
    <MainLayout>
      <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={styles.scrollContent}>
        <AppHeader />
        <View style={styles.content}>
          <View style={styles.maxWidth}>
            {/* Header Section */}
            <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="lightbulb-on" size={32} color="#fff" />
              <Text style={styles.headerTitle}>Dicas de Finanças</Text>
              <Text style={styles.headerSubtitle}>
                Conhecimento é o melhor investimento que você pode fazer
              </Text>
            </View>

            {/* Quick Tips Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💡 Dicas rápidas</Text>
            <View style={styles.tipsList}>
              {tips.map((tip, index) => (
                <TipCard key={tip.id} tip={tip} index={index} />
              ))}
            </View>

            {/* Books Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📚 Livros recomendados</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Os melhores livros para começar sua jornada financeira
            </Text>
            <View style={styles.booksList}>
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 980,
    paddingHorizontal: spacing.md,
  },
  headerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  booksList: {
    gap: spacing.md,
  },
  bookCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  bookIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  bookDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
