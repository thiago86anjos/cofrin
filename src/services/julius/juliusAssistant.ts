/**
 * Julius Assistant - Entrada principal do chat
 * Coordena detecção de intenção, busca de dados e geração de resposta
 */

import { detectIntent, extractContext, JuliusIntent } from './juliusIntent';
import { generateFinancialSummary, FinancialSummary } from './juliusSummary';
import { generateReply } from './juliusReply';

export interface JuliusResponse {
  reply: string;
  intent: JuliusIntent;
  summary: FinancialSummary;
  timestamp: Date;
}

/**
 * Função principal do Julius
 * Recebe a pergunta do usuário e retorna a resposta
 */
export async function askJulius(
  userId: string,
  question: string
): Promise<JuliusResponse> {
  try {
    // 1. Detectar intenção
    const intent = detectIntent(question);
    const context = extractContext(question);
    
    // 2. Buscar dados do Firestore
    const summary = await generateFinancialSummary(userId);
    
    // 3. Gerar resposta humanizada
    const reply = generateReply(intent, summary);
    
    // 4. Retornar resposta completa
    return {
      reply,
      intent,
      summary,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Erro no Julius:', error);
    
    // Resposta segura em caso de erro
    return {
      reply: 'Ops, tive um problema ao analisar seus dados. Tente novamente em alguns segundos! 🔄',
      intent: 'DESCONHECIDO',
      summary: createEmptySummary(),
      timestamp: new Date(),
    };
  }
}

/**
 * Cria um resumo vazio para casos de erro
 */
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

// Re-exportar tipos úteis
export { JuliusIntent } from './juliusIntent';
export { FinancialSummary } from './juliusSummary';
