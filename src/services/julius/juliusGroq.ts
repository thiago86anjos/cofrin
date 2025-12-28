/**
 * Julius Groq Service
 * Integração com Groq API para respostas inteligentes
 * Dados são anonimizados antes de enviar para a API
 */

import Constants from 'expo-constants';

const GROQ_API_KEY = Constants.expoConfig?.extra?.groqApiKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Prompt de sistema do Julius - Com mais humor e personalidade!
 */
const JULIUS_SYSTEM_PROMPT = `Você é o Julius, um assistente financeiro pessoal.

QUEM É O JULIUS?
Você é inspirado no Julius do seriado "Todo Mundo Odeia o Chris" - um pai de família que trabalha em DOIS empregos, sustenta 3 filhos, paga todas as contas em dia e ainda leva a vida com bom humor. Todo brasileiro deveria se inspirar nele! Por isso nosso assistente financeiro se chama Julius.

PERSONALIDADE:
- Direto ao ponto, não enrola
- Obcecado com economia (conta até os centavos!)
- Usa humor para falar de dinheiro
- Faz piadas sobre gastos desnecessários
- Realista mas nunca desanima o usuário
- Celebra quando o usuário economiza
- Bronca carinhosa quando gasta demais

FRASES QUE VOCÊ USA:
- "Isso aí custa X reais! Sabe quantas horas de trabalho isso é?"
- "Dinheiro não cai do céu, a menos que você trabalhe de limpador de avião!"
- "Tá gastando como se tivesse dinheiro sobrando!"
- "Economia começa nos centavos. Centavo vira real, real vira cem!"
- "Quer saber como ficar rico? Gasta menos do que ganha. Simples assim!"
- "Luz acesa sem ninguém? São X reais por mês jogados fora!"
- "Promoção só é economia se você JÁ ia comprar!"
- "Se dá pra economizar, economiza. Se não dá, dá um jeito!"
- "Esse gasto aí... o Chris faria melhor!"

QUANDO PERGUNTAREM "POR QUE JULIUS?":
Responda: "Por que Julius? Porque todo brasileiro deveria se inspirar no Julius de 'Todo Mundo Odeia o Chris'! O cara trabalha em dois empregos, consegue manter 3 filhos, paga as contas em dia e ainda leva a vida com humor. Se ele consegue, você também consegue! 💪"

REGRAS:
- NUNCA recomende investimentos específicos
- NUNCA prometa ganhos
- NUNCA incentive dívidas
- Foque em controle de gastos e economia
- Use os dados financeiros do usuário para personalizar
- Responda em português brasileiro
- Seja breve (2-3 parágrafos no máximo)
- Use emojis com moderação
- Faça piadas sobre os gastos quando apropriado`;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Formata o contexto financeiro do usuário para o prompt
 * DADOS SÃO ANONIMIZADOS - não envia descrições específicas
 */
export function formatFinancialContext(summary: {
  totalExpenses: number;
  totalIncomes: number;
  categories: { categoryName: string; total: number; percentage?: number }[];
  topExpenses: { description: string; amount: number; categoryName?: string }[];
  currentMonth: { monthName: string };
  dailyAverage: number;
  hasPreviousMonthData: boolean;
  previousMonthTotal?: number;
  monthVariation?: number;
}): string {
  if (summary.totalExpenses === 0 && summary.totalIncomes === 0) {
    return 'O usuário ainda não tem lançamentos registrados este mês.';
  }

  let context = `DADOS FINANCEIROS ANONIMIZADOS (${summary.currentMonth.monthName}):\n`;
  context += `- Total de gastos: R$ ${summary.totalExpenses.toFixed(2)}\n`;
  context += `- Total de receitas: R$ ${summary.totalIncomes.toFixed(2)}\n`;
  context += `- Média diária de gastos: R$ ${summary.dailyAverage.toFixed(2)}\n`;
  
  // Calcula saldo
  const saldo = summary.totalIncomes - summary.totalExpenses;
  context += `- Saldo do mês: R$ ${saldo.toFixed(2)} (${saldo >= 0 ? 'positivo' : 'negativo'})\n`;

  if (summary.categories.length > 0) {
    context += `\nGASTOS POR CATEGORIA (apenas nomes de categoria, sem detalhes pessoais):\n`;
    summary.categories.slice(0, 5).forEach((cat) => {
      context += `- ${cat.categoryName}: R$ ${cat.total.toFixed(2)} (${(cat.percentage || 0).toFixed(1)}%)\n`;
    });
  }

  // ANONIMIZAÇÃO: Não envia descrições específicas dos gastos
  // Apenas envia valores agrupados por categoria
  if (summary.topExpenses.length > 0) {
    context += `\nMAIORES GASTOS (apenas valores e categorias):\n`;
    summary.topExpenses.slice(0, 3).forEach((exp, index) => {
      // Usa categoria ou "Gasto" genérico, nunca a descrição real
      const categoria = exp.categoryName || 'Outros';
      context += `- Gasto ${index + 1} em ${categoria}: R$ ${exp.amount.toFixed(2)}\n`;
    });
  }

  if (summary.hasPreviousMonthData && summary.previousMonthTotal !== undefined) {
    context += `\nCOMPARAÇÃO COM MÊS ANTERIOR:\n`;
    context += `- Mês passado: R$ ${summary.previousMonthTotal.toFixed(2)}\n`;
    if (summary.monthVariation !== undefined) {
      const variacao = summary.monthVariation > 0 ? 'aumento' : 'redução';
      const percentual = summary.previousMonthTotal > 0 
        ? ((Math.abs(summary.monthVariation) / summary.previousMonthTotal) * 100).toFixed(1)
        : '0';
      context += `- Variação: ${variacao} de R$ ${Math.abs(summary.monthVariation).toFixed(2)} (${percentual}%)\n`;
    }
  }

  return context;
}

/**
 * Chama a API do Groq para gerar resposta inteligente
 */
export async function askGroq(
  userMessage: string,
  financialContext: string,
  conversationHistory: GroqMessage[] = []
): Promise<string> {
  const messages: GroqMessage[] = [
    {
      role: 'system',
      content: JULIUS_SYSTEM_PROMPT + '\n\n' + financialContext,
    },
    ...conversationHistory.slice(-6), // Mantém últimas 6 mensagens para contexto
    {
      role: 'user',
      content: userMessage,
    },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modelo rápido e gratuito
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro Groq:', error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
  } catch (error) {
    console.error('Erro ao chamar Groq:', error);
    throw error;
  }
}
