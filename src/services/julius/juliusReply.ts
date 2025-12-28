/**
 * Julius Reply Generator
 * Gera respostas com humor baseadas nos dados financeiros do usuário
 * Inspirado no Julius de "Todo Mundo Odeia o Chris"
 */

import { JuliusIntent } from './juliusIntent';
import { FinancialSummary, formatCurrency, formatPercent } from './juliusSummary';

/**
 * Frases do Julius para diferentes situações - COM HUMOR!
 */
const FRASES = {
  economia: [
    'Cada centavo conta! Centavo vira real, real vira cem! 💰',
    'Isso aí! Quem controla o dinheiro, dorme melhor!',
    'Gastar menos hoje = tranquilidade amanhã. O Julius aprova! ✅',
    'Tá economizando? O Chris poderia aprender com você!',
  ],
  alerta: [
    'Eita! Tá gastando como se tivesse dinheiro sobrando! 😅',
    'Calma aí! Dinheiro não cai do céu... a menos que você limpe avião!',
    'Opa! Hora de apertar o cinto! O Julius tá de olho! 👀',
    'Cuidado! Se continuar assim, vai ter que arrumar um segundo emprego igual o Julius!',
  ],
  positivo: [
    'Isso aí! O Julius tá orgulhoso! 💪',
    'Mandou bem! Continua assim que você vai longe!',
    'Boa! Tá no caminho certo! Até o Chris ia te respeitar!',
    'Excelente! Se dá pra economizar, economiza! ✨',
  ],
  piadas: [
    'Sabe quantas horas de trabalho isso representa? 🤔',
    'Com esse dinheiro dava pra comprar muita coisa no atacado!',
    'O Julius trabalharia uma semana por esse valor!',
    'Luz acesa sem ninguém no quarto? São reais jogados fora!',
  ],
};

function getFrase(tipo: keyof typeof FRASES): string {
  const lista = FRASES[tipo];
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Gera resposta do Julius baseada na intenção e dados
 */
export function generateReply(intent: JuliusIntent, summary: FinancialSummary): string {
  if (!summary.hasData && !['SAUDACAO', 'AJUDA', 'DICA'].includes(intent)) {
    return `Ainda não encontrei lançamentos em ${summary.currentMonth.monthName}. Registre suas despesas e eu te ajudo a analisar! 📊`;
  }

  switch (intent) {
    case 'SAUDACAO':
      return getSaudacao(summary);
    case 'TOTAL_MES':
      return getTotalMes(summary);
    case 'CARTAO_CREDITO':
      return getCartaoCredito(summary);
    case 'METAS':
      return getMetas(summary);
    case 'CATEGORIA_MAIOR':
      return getCategoriaMaior(summary);
    case 'GASTOS_ALTOS':
      return getGastosAltos(summary);
    case 'COMPARAR_MES':
      return getComparacao(summary);
    case 'LISTA_CATEGORIAS':
      return getListaCategorias(summary);
    case 'MEDIA_DIARIA':
      return getMediaDiaria(summary);
    case 'DICA':
      return getDica();
    case 'AJUDA':
      return getAjuda();
    default:
      return getDesconhecido();
  }
}

function getSaudacao(summary: FinancialSummary): string {
  const saudacoes = [
    'E aí! Aqui é o Julius!',
    'Olá! Julius na área!',
    'Oi! Seu consultor financeiro favorito chegou!',
  ];
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
  
  if (summary.hasData) {
    const saldo = summary.totalIncomes - summary.totalExpenses;
    if (saldo < 0) {
      return `${saudacao} 😬\n\nVi que você tem ${summary.transactionCount} lançamento(s) em ${summary.currentMonth.monthName}, totalizando ${formatCurrency(summary.totalExpenses)} em gastos.\n\nEpa, tá no vermelho! Bora dar uma olhada nisso?`;
    }
    return `${saudacao} 💪\n\nVi que você tem ${summary.transactionCount} lançamento(s) em ${summary.currentMonth.monthName}. Total de gastos: ${formatCurrency(summary.totalExpenses)}.\n\nO que quer saber?`;
  }
  return `${saudacao}\n\nSou seu assistente financeiro pessoal. Registra aí suas despesas que eu te ajudo a controlar! 📊`;
}

function getTotalMes(summary: FinancialSummary): string {
  const total = formatCurrency(summary.totalExpenses);
  const receita = formatCurrency(summary.totalIncomes);
  const saldo = summary.totalIncomes - summary.totalExpenses;
  
  let reply = `📊 Em ${summary.currentMonth.monthName}:\n`;
  reply += `• Gastos: ${total}\n`;
  reply += `• Receitas: ${receita}\n`;
  reply += `• Saldo: ${formatCurrency(saldo)} ${saldo >= 0 ? '✅' : '🔴'}\n`;
  
  if (summary.dailyAverage > 0) {
    reply += `\nMédia diária: ${formatCurrency(summary.dailyAverage)}`;
  }
  
  if (saldo < 0) {
    reply += `\n\n${getFrase('alerta')}`;
  } else if (saldo > 0) {
    reply += `\n\n${getFrase('positivo')}`;
  }
  
  return reply;
}

function getCartaoCredito(summary: FinancialSummary): string {
  const cc = summary.creditCard;
  
  if (!cc || cc.cards.length === 0) {
    return `💳 Não encontrei gastos de cartão de crédito em ${summary.currentMonth.monthName}.\n\nSe você tem cartões cadastrados, pode ser que ainda não tenha lançamentos este mês.`;
  }
  
  const totalUsed = formatCurrency(cc.totalUsed);
  const totalIncome = formatCurrency(cc.totalIncome);
  const pct = cc.usagePercentage.toFixed(1);
  
  let reply = `💳 **Cartões de Crédito em ${summary.currentMonth.monthName}:**\n\n`;
  reply += `• Total no cartão: ${totalUsed}\n`;
  reply += `• Receitas do mês: ${totalIncome}\n`;
  reply += `• Comprometimento: ${pct}%\n\n`;
  
  // Listar cada cartão
  reply += `**Por cartão:**\n`;
  for (const card of cc.cards) {
    reply += `• ${card.name}: ${formatCurrency(card.amount)}\n`;
  }
  
  // Status e dica
  reply += '\n';
  if (cc.status === 'controlled') {
    reply += `✅ ${cc.statusMessage}. ${getFrase('positivo')}`;
  } else if (cc.status === 'warning') {
    reply += `⚠️ ${cc.statusMessage}. Bora ficar de olho!`;
  } else if (cc.status === 'alert') {
    reply += `🚨 ${cc.statusMessage}!\n\n${getFrase('alerta')}`;
  } else {
    reply += `ℹ️ ${cc.statusMessage}`;
  }
  
  return reply;
}

function getMetas(summary: FinancialSummary): string {
  const goals = summary.goals;
  
  if (!goals || (!goals.hasMonthlyGoals && !goals.hasLongTermGoals)) {
    return `🎯 Você ainda não tem metas definidas!\n\nQue tal criar algumas pra eu poder te ajudar a acompanhar? Vá em **Metas** no menu e defina seus limites de gastos por categoria ou crie metas de longo prazo como uma reserva de emergência! 💪`;
  }
  
  let reply = `🎯 **Suas Metas em ${summary.currentMonth.monthName}:**\n\n`;
  
  // Metas mensais (por categoria)
  if (goals.hasMonthlyGoals) {
    reply += `📊 **Metas Mensais (por categoria):**\n`;
    reply += `• Total definido: ${goals.monthlyGoalsCount} metas\n`;
    
    if (goals.exceededCount > 0) {
      reply += `• 🔴 Estouradas: ${goals.exceededCount}\n`;
    }
    if (goals.warningCount > 0) {
      reply += `• 🟡 Em alerta (>80%): ${goals.warningCount}\n`;
    }
    if (goals.onTrackCount > 0) {
      reply += `• ✅ Sob controle: ${goals.onTrackCount}\n`;
    }
    
    // Detalhes das metas estouradas ou em alerta
    if (goals.monthlyGoals && goals.monthlyGoals.length > 0) {
      const problemGoals = goals.monthlyGoals.filter(g => g.status !== 'on-track');
      if (problemGoals.length > 0) {
        reply += `\n⚠️ **Atenção especial:**\n`;
        for (const g of problemGoals.slice(0, 3)) {
          const icon = g.status === 'exceeded' ? '🔴' : '🟡';
          reply += `${icon} ${g.categoryName}: ${formatCurrency(g.spent)} de ${formatCurrency(g.limit)} (${g.percentage.toFixed(0)}%)\n`;
        }
      }
    }
    
    reply += '\n';
  }
  
  // Metas de longo prazo
  if (goals.hasLongTermGoals && goals.longTermGoals && goals.longTermGoals.length > 0) {
    reply += `💰 **Metas de Longo Prazo:**\n`;
    for (const g of goals.longTermGoals.slice(0, 3)) {
      const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100) : 0;
      reply += `• ${g.name}: ${formatCurrency(g.currentAmount)} de ${formatCurrency(g.targetAmount)} (${progress.toFixed(0)}%)\n`;
    }
    reply += '\n';
  }
  
  // Resumo e dica baseada no status
  if (goals.exceededCount > 0) {
    reply += `\n😬 ${goals.exceededCount === 1 ? 'Uma meta estourou' : `${goals.exceededCount} metas estouraram`}... ${getFrase('alerta')}`;
  } else if (goals.warningCount > 0) {
    reply += `\n⚠️ ${goals.warningCount === 1 ? 'Uma meta tá' : `${goals.warningCount} metas tão`} quase no limite! Bora segurar a onda! 🌊`;
  } else {
    reply += `\n🎉 Mandando bem! Todas as metas sob controle! ${getFrase('positivo')}`;
  }
  
  return reply;
}

function getCategoriaMaior(summary: FinancialSummary): string {
  if (!summary.topCategory) {
    return `Ainda não tenho categorias para analisar. Registra uns gastos aí!`;
  }
  
  const { categoryName, total, percentage } = summary.topCategory;
  const pct = percentage || 0;
  
  let reply = `🏷️ A categoria que mais pesa é **${categoryName}** com ${formatCurrency(total)} (${formatPercent(pct)} do total).`;
  
  if (pct > 50) {
    reply += `\n\n😱 Mais da metade do seu dinheiro tá indo pra isso! ${getFrase('alerta')}`;
  } else if (pct > 30) {
    reply += `\n\n👀 Tá pesando bastante... ${getFrase('economia')}`;
  } else {
    reply += `\n\n${getFrase('economia')}`;
  }
  
  return reply;
}

function getGastosAltos(summary: FinancialSummary): string {
  if (summary.topExpenses.length === 0) {
    return `Não encontrei gastos registrados. Tá economizando ou esqueceu de anotar? 🤔`;
  }
  
  let reply = `💸 Seus maiores gastos em ${summary.currentMonth.monthName}:\n\n`;
  summary.topExpenses.slice(0, 5).forEach((exp, i) => {
    const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
    reply += `${emoji} ${exp.description} - ${formatCurrency(exp.amount)}\n`;
  });
  
  reply += `\n${getFrase('piadas')}`;
  
  return reply.trim();
}

function getComparacao(summary: FinancialSummary): string {
  if (!summary.hasPreviousMonthData) {
    return `Não tenho dados do mês anterior para comparar. Continue registrando que mês que vem a gente analisa a evolução! 📈`;
  }
  
  const atual = formatCurrency(summary.totalExpenses);
  const anterior = formatCurrency(summary.previousMonthTotal || 0);
  
  let reply = `📈 Comparação mensal:\n\n• Este mês: ${atual}\n• Mês passado: ${anterior}\n\n`;
  
  if (summary.monthVariation && summary.monthVariation > 0) {
    const aumento = formatCurrency(summary.monthVariation);
    reply += `🔴 Aumento de ${aumento}!\n\n${getFrase('alerta')}`;
  } else if (summary.monthVariation && summary.monthVariation < 0) {
    const reducao = formatCurrency(Math.abs(summary.monthVariation));
    reply += `🟢 Redução de ${reducao}!\n\n${getFrase('positivo')}`;
  } else {
    reply += `Gastos estáveis. Nem subiu, nem desceu. Pelo menos não piorou! 😅`;
  }
  
  return reply;
}

function getListaCategorias(summary: FinancialSummary): string {
  if (summary.categories.length === 0) {
    return `Ainda não há categorias com gastos. Cadê os lançamentos? 📝`;
  }
  
  let reply = `🏷️ Divisão dos gastos em ${summary.currentMonth.monthName}:\n\n`;
  summary.categories.forEach((cat, index) => {
    const barra = '█'.repeat(Math.min(Math.floor((cat.percentage || 0) / 10), 10));
    reply += `${cat.categoryName}: ${formatCurrency(cat.total)}\n${barra} ${formatPercent(cat.percentage || 0)}\n\n`;
  });
  
  return reply.trim();
}

function getMediaDiaria(summary: FinancialSummary): string {
  if (summary.daysPassed === 0) {
    return `Ainda é o primeiro dia do mês! Calma aí que o Julius precisa de mais dados! 😅`;
  }
  
  const media = formatCurrency(summary.dailyAverage);
  const projecao = formatCurrency(summary.dailyAverage * summary.daysInMonth);
  const diasRestantes = summary.daysInMonth - summary.daysPassed;
  
  let reply = `📅 Sua média diária: ${media}\n\n`;
  reply += `Se continuar assim, vai gastar cerca de ${projecao} até o fim do mês.\n`;
  reply += `Faltam ${diasRestantes} dias.\n\n`;
  
  if (summary.dailyAverage > 100) {
    reply += getFrase('alerta');
  } else {
    reply += getFrase('economia');
  }
  
  return reply;
}

function getDica(): string {
  const dicas = [
    '💡 Anote TODOS os gastos, mesmo o cafezinho! Gasto pequeno repetido vira gasto grande!',
    '💡 Defina um limite por categoria. Bateu o limite? Para de gastar! Simples assim!',
    '💡 Quer comprar algo? Espera 24 horas. Se ainda quiser, aí pensa. Se esqueceu, não precisava!',
    '💡 Reveja suas assinaturas mensais. Aposto que tem coisa aí que você nem usa mais!',
    '💡 Separa o dinheiro das contas fixas ASSIM que receber. O que sobra é o que pode gastar!',
    '💡 Vai ao mercado? Faz lista E não vai com fome! O estômago é o pior consultor financeiro!',
    '💡 Promoção só é economia se você JÁ ia comprar! Senão é só gasto com desconto!',
    '💡 Quer ficar rico? Gasta menos do que ganha. Simples assim! O Julius aprova! ✅',
  ];
  
  return dicas[Math.floor(Math.random() * dicas.length)];
}

function getAjuda(): string {
  return `Sou o Julius! 💪\n\n` +
    `Por que Julius? Porque todo brasileiro deveria se inspirar no Julius de "Todo Mundo Odeia o Chris"! ` +
    `O cara trabalha em dois empregos, sustenta 3 filhos e ainda leva a vida com humor!\n\n` +
    `Posso te ajudar com:\n` +
    `• "Quanto gastei esse mês?"\n` +
    `• "Qual categoria mais gasto?"\n` +
    `• "Meus maiores gastos"\n` +
    `• "Comparar com mês anterior"\n` +
    `• "Me dá uma dica"\n` +
    `• Ou pergunta qualquer coisa sobre finanças!`;
}

function getDesconhecido(): string {
  return `Hmm, não entendi essa. Mas pode perguntar sobre seus gastos, pedir uma dica ou qualquer coisa sobre finanças que eu respondo! 💬`;
}
