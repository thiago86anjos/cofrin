/**
 * Julius Assistant - Entrada principal do chat
 * Coordena detecção de intenção, busca de dados e geração de resposta
 * Usa Groq (LLaMA) para perguntas complexas
 */

import { detectIntent, JuliusIntent } from './juliusIntent';
import { generateFinancialSummary, FinancialSummary } from './juliusSummary';
import { generateReply } from './juliusReply';
import { askGroq, formatFinancialContext } from './juliusGroq';
import {
  checkRateLimit,
  recordUsage,
  getLimitReachedMessage,
  getLowLimitWarning,
} from './juliusRateLimit';

export interface JuliusResponse {
  reply: string;
  intent: JuliusIntent;
  summary: FinancialSummary;
  timestamp: Date;
  usedAI?: boolean;
  rateLimitInfo?: {
    remaining: number;
    limit: number;
  };
}

/**
 * Intenções que são respondidas localmente (sem IA)
 */
const LOCAL_INTENTS: JuliusIntent[] = [
  'TOTAL_MES',
  'CARTAO_CREDITO',
  'METAS',
  'CATEGORIA_MAIOR',
  'GASTOS_ALTOS',
  'COMPARAR_MES',
  'LISTA_CATEGORIAS',
  'MEDIA_DIARIA',
  'AJUDA',
  'SAUDACAO',
];

/**
 * Função principal do Julius
 */
export async function askJulius(
  userId: string,
  question: string,
  userEmail?: string | null
): Promise<JuliusResponse> {
  try {
    // Verifica rate limit primeiro
    const rateLimit = await checkRateLimit(userId, userEmail);
    
    if (!rateLimit.allowed) {
      return {
        reply: getLimitReachedMessage(0),
        intent: 'DESCONHECIDO',
        summary: createEmptySummary(),
        timestamp: new Date(),
        usedAI: false,
        rateLimitInfo: {
          remaining: 0,
          limit: rateLimit.limit,
        },
      };
    }

    const intent = detectIntent(question);
    const summary = await generateFinancialSummary(userId);

    // Registra uso da mensagem
    await recordUsage(userId, userEmail);
    const newRemaining = rateLimit.remaining - 1;

    // Para intenções conhecidas, usa resposta local (rápido)
    if (LOCAL_INTENTS.includes(intent)) {
      let reply = generateReply(intent, summary);
      
      // Aviso quando está perto do limite
      reply += getLowLimitWarning(newRemaining);
      
      return {
        reply,
        intent,
        summary,
        timestamp: new Date(),
        usedAI: false,
        rateLimitInfo: {
          remaining: newRemaining,
          limit: rateLimit.limit,
        },
      };
    }

    // Para DICA ou DESCONHECIDO, usa IA do Groq
    try {
      const financialContext = formatFinancialContext(summary);
      let aiReply = await askGroq(question, financialContext);
      
      // Aviso quando está perto do limite
      aiReply += getLowLimitWarning(newRemaining);
      
      return {
        reply: aiReply,
        intent,
        summary,
        timestamp: new Date(),
        usedAI: true,
        rateLimitInfo: {
          remaining: newRemaining,
          limit: rateLimit.limit,
        },
      };
    } catch (aiError) {
      console.error('Erro na IA, usando fallback:', aiError);
      // Fallback para resposta local se IA falhar
      let reply = generateReply(intent, summary);
      reply += getLowLimitWarning(newRemaining);
      
      return {
        reply,
        intent,
        summary,
        timestamp: new Date(),
        usedAI: false,
        rateLimitInfo: {
          remaining: newRemaining,
          limit: rateLimit.limit,
        },
      };
    }
  } catch (error) {
    console.error('Erro no Julius:', error);
    
    return {
      reply: 'Meu salário está atrasado, infelizmente não posso te ajudar agora. 😅',
      intent: 'DESCONHECIDO',
      summary: createEmptySummary(),
      timestamp: new Date(),
      usedAI: false,
    };
  }
}

function createEmptySummary(): FinancialSummary {
  const now = new Date();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  
  return {
    currentMonth: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthName: monthNames[now.getMonth()],
    },
    totalExpenses: 0,
    totalIncomes: 0,
    balance: 0,
    categories: [],
    categoryCount: 0,
    transactionCount: 0,
    averageExpense: 0,
    dailyAverage: 0,
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    daysPassed: now.getDate(),
    topExpenses: [],
    hasData: false,
    hasPreviousMonthData: false,
  };
}

export { JuliusIntent } from './juliusIntent';
export { FinancialSummary } from './juliusSummary';
