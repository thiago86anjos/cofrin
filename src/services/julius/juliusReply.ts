/**
 * Julius Reply Generator
 * Gera respostas humanizadas baseadas na intenção e resumo financeiro
 * Inspirado no Julius de "Todo Mundo Odeia o Chris" - sempre com sabedoria financeira!
 */

import { JuliusIntent } from './juliusIntent';
import { FinancialSummary, formatCurrency, formatPercent } from './juliusSummary';

/**
 * Frases sábias do Julius para cada contexto
 */
const JULIUS_WISDOM = {
  // Quando está gastando muito
  gastando_muito: [
    'Dinheiro não cai do céu.',
    'Gastar sem precisar é jogar dinheiro fora.',
    'Dívida é dor de cabeça garantida.',
    'Se faltou, corta gastos.',
  ],
  // Quando está economizando
  economizando: [
    'Se dá pra economizar, economiza.',
    'Cada centavo conta.',
    'Economia pequena vira dinheiro grande.',
    'Se sobrou, guarda.',
    'Quem controla o dinheiro, dorme melhor.',
  ],
  // Conselhos gerais
  geral: [
    'Luz acesa sem ninguém no quarto? Apaga.',
    'Trabalho duro primeiro, descanso depois.',
    'Se não precisa hoje, não compra.',
    'Promoção só vale se você já ia comprar.',
    'Planejar agora evita problema depois.',
    'Luxo é pagar as contas em dia.',
  ],
};

/**
 * Retorna uma frase sábia do Julius baseada no contexto
 */
function getJuliusWisdom(context: 'gastando_muito' | 'economizando' | 'geral'): string {
  const phrases = JULIUS_WISDOM[context];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Gera resposta do Julius baseada na intenção e dados
 */
export function generateReply(
  intent: JuliusIntent,
  summary: FinancialSummary
): string {
  // Se não há dados, informar
  if (!summary.hasData && intent !== 'SAUDACAO' && intent !== 'AJUDA') {
    return getNoDataReply(summary);
  }

  switch (intent) {
    case 'SAUDACAO':
      return getSaudacaoReply(summary);
    
    case 'TOTAL_MES':
      return getTotalMesReply(summary);
    
    case 'CATEGORIA_MAIOR':
      return getCategoriaMaiorReply(summary);
    
    case 'GASTOS_ALTOS':
      return getGastosAltosReply(summary);
    
    case 'COMPARAR_MES':
      return getCompararMesReply(summary);
    
    case 'LISTA_CATEGORIAS':
      return getListaCategoriasReply(summary);
    
    case 'MEDIA_DIARIA':
      return getMediaDiariaReply(summary);
    
    case 'AJUDA':
      return getAjudaReply();
    
    case 'DESCONHECIDO':
    default:
      return getDesconhecidoReply();
  }
}

function getNoDataReply(summary: FinancialSummary): string {
  return `Ainda não encontrei lançamentos em ${summary.currentMonth.monthName}. ` +
    `Assim que você registrar suas despesas, posso te ajudar a analisá-las! 📊`;
}

function getSaudacaoReply(summary: FinancialSummary): string {
  const greetings = [
    `Olá! Sou o Julius, seu assistente financeiro.`,
    `E aí! Aqui é o Julius, pronto pra te ajudar com suas finanças.`,
    `Oi! Julius aqui. Bora organizar suas finanças?`,
  ];
  
  const wisdom = getJuliusWisdom('geral');
  
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  if (summary.hasData) {
    return `${greeting}\n\nVi que você tem ${summary.transactionCount} lançamento(s) em ${summary.currentMonth.monthName}. Quer saber mais?\n\n💬 *${wisdom}*`;
  }
  
  return `${greeting}\n\n💬 *${wisdom}*\n\nMe pergunte sobre seus gastos, categorias ou peça dicas!`;
}

function getTotalMesReply(summary: FinancialSummary): string {
  const total = formatCurrency(summary.totalExpenses);
  const dias = summary.daysPassed;
  const mes = summary.currentMonth.monthName;
  
  let reply = `📊 Em ${mes}, você gastou ${total} até o dia ${dias}.`;
  
  // Adicionar contexto da média diária
  if (summary.dailyAverage > 0) {
    reply += `\n\nIsso dá uma média de ${formatCurrency(summary.dailyAverage)} por dia.`;
  }
  
  // Comparação com mês anterior se disponível
  if (summary.hasPreviousMonthData && summary.monthVariation !== undefined) {
    if (summary.monthVariation > 0) {
      reply += `\n\n⚠️ Você está gastando mais que o mês passado.`;
      reply += `\n\n💬 *${getJuliusWisdom('gastando_muito')}*`;
    } else if (summary.monthVariation < 0) {
      reply += `\n\n✅ Está gastando menos que o mês passado. Continue assim!`;
      reply += `\n\n💬 *${getJuliusWisdom('economizando')}*`;
    }
  }
  
  return reply;
}

function getCategoriaMaiorReply(summary: FinancialSummary): string {
  if (!summary.topCategory) {
    return `Ainda não tenho categorias registradas para analisar.`;
  }
  
  const cat = summary.topCategory;
  const total = formatCurrency(cat.total);
  const pct = formatPercent(cat.percentage || 0);
  
  let reply = `🏷️ A categoria que mais pesa é **${cat.categoryName}**.\n\n`;
  reply += `Você gastou ${total} nela, representando ${pct} do total.`;
  
  // Dica contextual com sabedoria do Julius
  if ((cat.percentage || 0) > 40) {
    reply += `\n\n💡 Essa categoria representa mais de 40% dos seus gastos.`;
    reply += `\n\n💬 *${getJuliusWisdom('gastando_muito')}*`;
  } else {
    reply += `\n\n💬 *${getJuliusWisdom('geral')}*`;
  }
  
  return reply;
}

function getGastosAltosReply(summary: FinancialSummary): string {
  if (summary.topExpenses.length === 0) {
    return `Não encontrei gastos registrados para listar.`;
  }
  
  let reply = `💸 Seus maiores gastos em ${summary.currentMonth.monthName}:\n\n`;
  
  summary.topExpenses.slice(0, 5).forEach((expense, index) => {
    const valor = formatCurrency(expense.amount);
    const categoria = expense.categoryName || 'Sem categoria';
    reply += `${index + 1}. ${expense.description} - ${valor} (${categoria})\n`;
  });
  
  reply += `\n💬 *${getJuliusWisdom('gastando_muito')}*`;
  
  return reply.trim();
}

function getCompararMesReply(summary: FinancialSummary): string {
  if (!summary.hasPreviousMonthData) {
    return `Não tenho dados do mês anterior para comparar. Continue registrando que no próximo mês podemos analisar a evolução!`;
  }
  
  const atual = formatCurrency(summary.totalExpenses);
  const anterior = formatCurrency(summary.previousMonthTotal || 0);
  
  let reply = `📈 Comparação com o mês anterior:\n\n`;
  reply += `• Este mês: ${atual}\n`;
  reply += `• Mês passado: ${anterior}\n\n`;
  
  if (summary.monthVariation !== undefined) {
    if (summary.monthVariation > 0) {
      reply += `⚠️ Aumento de ${formatCurrency(summary.monthVariation)} (${formatPercent(summary.monthVariationPercent || 0)}).`;
      reply += `\n\n💬 *${getJuliusWisdom('gastando_muito')}*`;
    } else if (summary.monthVariation < 0) {
      reply += `✅ Redução de ${formatCurrency(Math.abs(summary.monthVariation))} (${formatPercent(Math.abs(summary.monthVariationPercent || 0))}).`;
      reply += `\n\n💬 *${getJuliusWisdom('economizando')}*`;
    } else {
      reply += `Seus gastos estão estáveis.`;
      reply += `\n\n💬 *${getJuliusWisdom('geral')}*`;
    }
  }
  
  return reply;
}

function getListaCategoriasReply(summary: FinancialSummary): string {
  if (summary.categories.length === 0) {
    return `Ainda não há categorias com gastos registrados.`;
  }
  
  let reply = `🏷️ Divisão por categoria em ${summary.currentMonth.monthName}:\n\n`;
  
  summary.categories.forEach((cat) => {
    const valor = formatCurrency(cat.total);
    const pct = formatPercent(cat.percentage || 0);
    reply += `• ${cat.categoryName}: ${valor} (${pct})\n`;
  });
  
  reply += `\n💬 *${getJuliusWisdom('geral')}*`;
  
  return reply.trim();
}

function getMediaDiariaReply(summary: FinancialSummary): string {
  if (summary.daysPassed === 0) {
    return `Ainda é o primeiro dia do mês, não tenho dados suficientes.`;
  }
  
  const media = formatCurrency(summary.dailyAverage);
  const projecao = formatCurrency(summary.dailyAverage * summary.daysInMonth);
  
  let reply = `📅 Sua média diária de gastos é ${media}.\n\n`;
  reply += `Se continuar assim, deve gastar cerca de ${projecao} até o fim do mês.`;
  reply += `\n\n💬 *${getJuliusWisdom('geral')}*`;
  
  return reply;
}

function getAjudaReply(): string {
  const wisdom = getJuliusWisdom('geral');
  return `Sou o Julius, seu assistente financeiro!\n\n` +
    `Posso te ajudar com:\n` +
    `• "Quanto gastei esse mês?"\n` +
    `• "Qual categoria mais gasto?"\n` +
    `• "Meus maiores gastos"\n` +
    `• "Comparar com mês anterior"\n` +
    `• "Média diária de gastos"\n\n` +
    `💬 *${wisdom}*`;
}

function getDesconhecidoReply(): string {
  const wisdom = getJuliusWisdom('geral');
  const replies = [
    `Hmm, não entendi bem essa pergunta. 🤔\n\nTente perguntar sobre seus gastos, categorias ou comparação mensal!\n\n💬 *${wisdom}*`,
    `Essa eu não sei responder ainda. Mas posso te ajudar com análise de gastos e comparativos mensais!\n\n💬 *${wisdom}*`,
    `Não consegui entender, mas posso te ajudar com suas finanças! Pergunte sobre gastos ou peça ajuda.\n\n💬 *${wisdom}*`,
  ];
  
  return replies[Math.floor(Math.random() * replies.length)];
}
