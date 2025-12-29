import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/themeContext';
import { spacing, borderRadius } from '../theme';
import MainLayout from '../components/MainLayout';
import SimpleHeader from '../components/SimpleHeader';
import { FOOTER_HEIGHT } from '../components/AppFooter';

interface TutorialTopic {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  sections: {
    title: string;
    content: string;
  }[];
}

const topics: TutorialTopic[] = [
  {
    id: 'contas',
    icon: 'bank',
    iconColor: '#3B82F6',
    title: 'Contas',
    sections: [
      {
        title: 'O que são?',
        content: 'Contas representam onde seu dinheiro está: banco, carteira física, investimentos, etc.',
      },
      {
        title: 'Como criar?',
        content: '• Vá em Configurações → Contas\n• Toque em "Adicionar Conta"\n• Escolha um nome e saldo inicial\n• Pronto! Sua conta foi criada.',
      },
      {
        title: 'Dica importante',
        content: 'O saldo inicial é o valor que você tem naquela conta AGORA. Não precisa incluir transações antigas.',
      },
    ],
  },
  {
    id: 'categorias',
    icon: 'tag-multiple',
    iconColor: '#F59E0B',
    title: 'Categorias',
    sections: [
      {
        title: 'Para que servem?',
        content: 'Categorias ajudam você a organizar e entender seus gastos. Por exemplo: Alimentação, Transporte, Lazer.',
      },
      {
        title: 'Categorias e Subcategorias',
        content: 'Você pode criar categorias amplas (ex: Alimentação) e depois subcategorias mais específicas (ex: Restaurante, Supermercado).',
      },
      {
        title: 'Como criar?',
        content: '• Vá em Categorias\n• Toque em "+"\n• Escolha nome, cor e tipo (Despesa ou Receita)\n• Para subcategoria, selecione uma categoria pai',
      },
      {
        title: 'Dica',
        content: 'Não crie muitas categorias de uma vez. Comece com o básico e vá adicionando conforme precisa.',
      },
    ],
  },
  {
    id: 'lancamentos',
    icon: 'swap-vertical',
    iconColor: '#10B981',
    title: 'Lançamentos',
    sections: [
      {
        title: 'O que são?',
        content: 'Lançamentos são suas movimentações financeiras: toda despesa ou receita que você tem.',
      },
      {
        title: 'Como adicionar?',
        content: '• Toque no "+" grande da tela inicial\n• Escolha o tipo: Despesa (saiu dinheiro) ou Receita (entrou dinheiro)\n• Preencha: descrição, valor, categoria, conta e data\n• Confirme!',
      },
      {
        title: 'Tipos de Lançamento',
        content: '💸 Despesa: quando você gasta dinheiro\n💰 Receita: quando você recebe dinheiro\n🔄 Transferência: mover dinheiro entre suas contas',
      },
      {
        title: 'Lançamentos Recorrentes',
        content: 'Use "Repetir" para gastos fixos mensais como aluguel, academia, assinaturas. O app cria automaticamente nos próximos meses!',
      },
    ],
  },
  {
    id: 'cartoes',
    icon: 'credit-card',
    iconColor: '#8B5CF6',
    title: 'Cartões de Crédito',
    sections: [
      {
        title: 'Como funcionam?',
        content: 'Cartões de crédito são diferentes de contas. Os gastos ficam na fatura e só afetam sua conta quando você pagar a fatura.',
      },
      {
        title: 'Configurar cartão',
        content: '• Vá em Configurações → Cartões de Crédito\n• Adicione: nome, limite, dia de fechamento e vencimento\n• Vincule a uma conta para pagar a fatura',
      },
      {
        title: 'Compras no Cartão',
        content: 'Ao criar um lançamento de despesa, escolha o cartão no lugar da conta. O valor vai para a fatura do cartão.',
      },
      {
        title: 'Parcelamento',
        content: 'Compras parceladas são divididas automaticamente entre as próximas faturas. Ex: 3x de R$100 = 3 faturas.',
      },
      {
        title: 'Pagar Fatura',
        content: 'Vá em Cartões → sua fatura → "Pagar Fatura". Isso cria uma transferência da conta vinculada e baixa os lançamentos.',
      },
    ],
  },
  {
    id: 'metas-longo',
    icon: 'target',
    iconColor: '#EF4444',
    title: 'Metas de Longo Prazo',
    sections: [
      {
        title: 'O que são?',
        content: 'São objetivos financeiros de médio/longo prazo: comprar um carro, fazer uma viagem, reserva de emergência.',
      },
      {
        title: 'Como criar?',
        content: '• Vá em Metas\n• Toque em "Criar Meta"\n• Defina: nome, valor alvo e prazo\n• Acompanhe seu progresso!',
      },
      {
        title: 'Contribuir para Meta',
        content: 'Ao criar uma receita, você pode vincular a uma meta. O valor é somado ao progresso da meta.',
      },
      {
        title: 'Dica',
        content: 'Crie metas realistas! Divida o valor pelo número de meses e veja se consegue guardar essa quantia.',
      },
    ],
  },
  {
    id: 'metas-mensais',
    icon: 'calendar-check',
    iconColor: '#06B6D4',
    title: 'Metas Mensais',
    sections: [
      {
        title: 'O que são?',
        content: 'São limites de gastos que você define para cada categoria no mês. Exemplo: "Quero gastar no máximo R$500 em Alimentação".',
      },
      {
        title: 'Como criar?',
        content: '• Vá em Metas → Gerenciar Metas Mensais\n• Escolha o mês\n• Defina limites para as categorias que quiser\n• O app avisa quando você está perto do limite!',
      },
      {
        title: 'Acompanhar',
        content: 'Na tela inicial, você vê cards mostrando quanto gastou vs quanto pode gastar em cada categoria.',
      },
      {
        title: 'Benefício',
        content: 'Ajuda a ter consciência dos gastos e evitar surpresas no fim do mês!',
      },
    ],
  },
];

interface Props {
  navigation: any;
}

export default function Tutorial({ navigation }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const bottomPad = useMemo(
    () => FOOTER_HEIGHT + 6 + Math.max(insets.bottom, 8) + spacing.lg,
    [insets.bottom]
  );

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  return (
    <MainLayout>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header simples */}
        <SimpleHeader title="Como usar o Cofrin" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad },
          ]}
        >
          <View style={styles.centeredContainer}>
            <View style={styles.content}>
              
              {/* Intro sem logo grande */}
              <View style={styles.intro}>
                <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
                  Seu controle financeiro simplificado
                </Text>
                <Text style={[styles.introText, { color: colors.textMuted }]}>
                  Toque em cada tópico para aprender mais
                </Text>
              </View>

        {topics.map((topic) => {
          const isExpanded = expandedTopics.has(topic.id);
          return (
            <View
              key={topic.id}
              style={[
                styles.topicCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => toggleTopic(topic.id)}
                style={styles.topicHeader}
              >
                <View style={styles.topicHeaderLeft}>
                  <View
                    style={[
                      styles.topicIconContainer,
                      { backgroundColor: topic.iconColor + '20' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={topic.icon as any}
                      size={24}
                      color={topic.iconColor}
                    />
                  </View>
                  <Text style={[styles.topicTitle, { color: colors.text }]}>
                    {topic.title}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.textMuted}
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.topicContent}>
                  {topic.sections.map((section, index) => (
                    <View
                      key={index}
                      style={[
                        styles.section,
                        index < topic.sections.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border + '40',
                        },
                      ]}
                    >
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        {section.title}
                      </Text>
                      <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                        {section.content}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
            </View>
          </View>
        </ScrollView>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  centeredContainer: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  content: {
    width: '100%',
  },
  intro: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  introSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  introText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  topicCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topicHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  topicIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  topicContent: {
    borderTopWidth: 1,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
