/**
 * Julius Reply Generator
 * Gera respostas com humor baseadas nos dados financeiros do usuário
 * Inspirado no Julius de "Todo Mundo Odeia o Chris"
 */

import { JuliusIntent } from './juliusIntent';
import { FinancialSummary, formatCurrency, formatPercent, GoalData } from './juliusSummary';

// Tipo para meta mensal (extraído de GoalData)
type MonthlyGoal = GoalData['monthlyGoals'][number];

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
    case 'PENDENTES':
      return getPendentes();
    case 'RECEITAS':
      return getReceitas(summary);
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
    case 'ECONOMIZAR':
      return getEconomizar(summary);
    case 'JUNTAR_DINHEIRO':
      return getJuntarDinheiro(summary);
    case 'DICA':
      return getDica();
    case 'AJUDA':
      return getAjuda();
    default:
      return getDesconhecido();
  }
}

function getSaudacao(summary: FinancialSummary): string {
  const nome = summary.userName;
  const primeiroNome = nome.split(' ')[0]; // Pega só o primeiro nome
  
  const saudacoes = [
    `E aí, ${primeiroNome}! Aqui é o Julius!`,
    `Olá, ${primeiroNome}! Julius na área!`,
    `Oi, ${primeiroNome}! Seu consultor financeiro favorito chegou!`,
    `Fala, ${primeiroNome}! O Julius tá on!`,
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
  if (goals.hasMonthlyGoals && goals.monthlyGoals.length > 0) {
    const exceededCount = goals.monthlyGoalsExceeded ?? 0;
    const warningCount = goals.monthlyGoalsWarning ?? 0;
    const onTrackCount = goals.monthlyGoals.length - exceededCount - warningCount;
    
    reply += `📊 **Metas Mensais (por categoria):**\n`;
    reply += `• Total definido: ${goals.monthlyGoals.length} metas\n`;
    
    if (exceededCount > 0) {
      reply += `• 🔴 Estouradas: ${exceededCount}\n`;
    }
    if (warningCount > 0) {
      reply += `• 🟡 Em alerta (>85%): ${warningCount}\n`;
    }
    if (onTrackCount > 0) {
      reply += `• ✅ Sob controle: ${onTrackCount}\n`;
    }
    
    // Detalhes das metas estouradas ou em alerta
    const problemGoals = goals.monthlyGoals.filter((g: MonthlyGoal) => g.status !== 'ok');
    if (problemGoals.length > 0) {
      reply += `\n⚠️ **Atenção especial:**\n`;
      for (const g of problemGoals.slice(0, 3)) {
        const icon = g.status === 'exceeded' ? '🔴' : '🟡';
        const current = g.currentAmount ?? 0;
        const target = g.targetAmount ?? 0;
        const pct = g.percentage ?? 0;
        reply += `${icon} ${g.name || 'Meta'}: ${formatCurrency(current)} de ${formatCurrency(target)} (${pct.toFixed(0)}%)\n`;
      }
    }
    
    reply += '\n';
  }
  
  // Metas de longo prazo
  if (goals.hasLongTermGoals && goals.longTermGoals && goals.longTermGoals.length > 0) {
    reply += `💰 **Metas de Longo Prazo:**\n`;
    for (const g of goals.longTermGoals.slice(0, 3)) {
      const current = g.currentAmount ?? 0;
      const target = g.targetAmount ?? 0;
      const progress = target > 0 ? (current / target * 100) : 0;
      reply += `• ${g.name || 'Meta'}: ${formatCurrency(current)} de ${formatCurrency(target)} (${progress.toFixed(0)}%)\n`;
    }
    reply += '\n';
  }
  
  // Resumo e dica baseada no status
  const exceededCount = goals.monthlyGoalsExceeded ?? 0;
  const warningCount = goals.monthlyGoalsWarning ?? 0;
  
  if (exceededCount > 0) {
    reply += `\n😬 ${exceededCount === 1 ? 'Uma meta estourou' : `${exceededCount} metas estouraram`}... ${getFrase('alerta')}`;
  } else if (warningCount > 0) {
    reply += `\n⚠️ ${warningCount === 1 ? 'Uma meta tá' : `${warningCount} metas tão`} quase no limite! Bora segurar a onda! 🌊`;
  } else {
    reply += `\n🎉 Mandando bem! Todas as metas sob controle! ${getFrase('positivo')}`;
  }
  
  return reply;
}

function getPendentes(): string {
  return `🧘 Calma aí, jovem... Você precisa primeiro fechar o mês atual pra pensar no próximo!

Fique presente, pense como o Buda, viva o presente! 🙏

Mas você tem razão em se preocupar com o futuro - faz bem sim! A questão é que a gente começa o futuro **hoje**, organizando as finanças, certo?

💡 Dica do Julius: Foque nos gastos que já aconteceram. Quando a fatura fechar e você pagar, aí sim ela entra na conta!`;
}

function getReceitas(summary: FinancialSummary): string {
  const total = formatCurrency(summary.totalIncomes);
  const categories = summary.incomeCategories || [];
  
  if (summary.totalIncomes === 0) {
    return `💰 Não encontrei receitas registradas em ${summary.currentMonth.monthName}.\n\nRegistre seus ganhos pra eu poder te ajudar a entender de onde vem seu dinheiro!`;
  }
  
  let reply = `💰 **Suas Receitas em ${summary.currentMonth.monthName}:**\n\n`;
  reply += `📥 Total recebido: **${total}**\n\n`;
  
  if (categories.length > 0) {
    reply += `**Por categoria:**\n`;
    for (const cat of categories.slice(0, 5)) {
      const pct = cat.percentage?.toFixed(1) || '0';
      reply += `• ${cat.categoryName}: ${formatCurrency(cat.total)} (${pct}%)\n`;
    }
    
    if (summary.topIncomeCategory) {
      reply += `\n🌟 Sua principal fonte de renda é **${summary.topIncomeCategory.categoryName}**!`;
    }
  } else {
    reply += `Total: ${total}`;
  }
  
  // Comparar com gastos
  const saldo = summary.totalIncomes - summary.totalExpenses;
  reply += `\n\n`;
  if (saldo > 0) {
    reply += `✅ Tá sobrando ${formatCurrency(saldo)} esse mês. ${getFrase('positivo')}`;
  } else if (saldo < 0) {
    reply += `🔴 Tá gastando ${formatCurrency(Math.abs(saldo))} a mais do que ganha! ${getFrase('alerta')}`;
  } else {
    reply += `⚖️ Tá empatado! Receitas = Despesas. Bora economizar um pouco?`;
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

/**
 * Como economizar - baseado em Pai Rico, Pai Pobre
 * Inclui saldo da conta, metas de longo prazo e cálculo de 10% da renda
 */
function getEconomizar(summary: FinancialSummary): string {
  let reply = `💰 **Como Economizar - A Regra de Ouro**\n\n`;
  
  reply += `Como diria Robert Kiyosaki em "Pai Rico, Pai Pobre": **"Pague-se primeiro!"**\n\n`;
  reply += `A ideia é simples: assim que receber, separe uma parte ANTES de pagar qualquer conta. `;
  reply += `Não é o que sobra no final do mês - é o que você guarda PRIMEIRO! 🏦\n\n`;

  // Saldo atual das contas
  if (summary.accountsBalance > 0) {
    reply += `📊 **Seu saldo atual:** ${formatCurrency(summary.accountsBalance)}\n\n`;
  }

  // Calcular 10% da renda (se tiver receitas registradas)
  if (summary.totalIncomes > 0) {
    const dezPorcento = summary.totalIncomes * 0.1;
    reply += `💡 **Sugestão baseada na sua renda:**\n`;
    reply += `Você teve ${formatCurrency(summary.totalIncomes)} de receitas em ${summary.currentMonth.monthName}.\n`;
    reply += `10% disso = **${formatCurrency(dezPorcento)}** que poderia ir direto pra poupança/investimento!\n\n`;
  }

  // Verificar metas de longo prazo
  const goals = summary.goals;
  if (goals?.hasLongTermGoals && goals.longTermGoals.length > 0) {
    type LongTermGoal = { id: string; name: string; targetAmount: number; currentAmount: number; percentage: number };
    const emergencyGoal = goals.longTermGoals.find((g: LongTermGoal) => 
      g.name.toLowerCase().includes('emergência') || 
      g.name.toLowerCase().includes('emergencia') ||
      g.name.toLowerCase().includes('reserva')
    );
    
    if (emergencyGoal) {
      reply += `🎯 **Você tem uma meta de reserva!**\n`;
      reply += `• ${emergencyGoal.name}: ${formatCurrency(emergencyGoal.currentAmount)} de ${formatCurrency(emergencyGoal.targetAmount)} (${emergencyGoal.percentage.toFixed(0)}%)\n`;
      reply += `Bora fazer um aporte? Cada real conta! 💪\n\n`;
    } else {
      reply += `🎯 **Suas metas de longo prazo:**\n`;
      goals.longTermGoals.slice(0, 2).forEach((g: LongTermGoal) => {
        reply += `• ${g.name}: ${g.percentage.toFixed(0)}% completo\n`;
      });
      reply += `\nQue tal fazer um aporte hoje?\n\n`;
    }
  } else {
    reply += `⚠️ Você ainda não tem metas de longo prazo cadastradas!\n`;
    reply += `Que tal criar uma **Reserva de Emergência**? É o primeiro passo pra liberdade financeira! 🚀\n\n`;
  }

  reply += `✨ Lembre-se: Rico não é quem ganha muito, é quem guarda com consistência!`;
  
  return reply;
}

/**
 * Dica pra juntar dinheiro - baseado em O Homem Mais Rico da Babilônia
 */
function getJuntarDinheiro(summary: FinancialSummary): string {
  let reply = `📚 **Os 7 Segredos da Babilônia**\n`;
  reply += `_(baseado no livro "O Homem Mais Rico da Babilônia")_\n\n`;

  const segredos = [
    {
      titulo: '1. Comece a engordar sua carteira',
      texto: 'Guarde pelo menos 10% de tudo que ganhar. De cada 10 moedas, gaste apenas 9.',
    },
    {
      titulo: '2. Controle seus gastos',
      texto: 'Não confunda desejos com necessidades. O que você QUER é diferente do que você PRECISA.',
    },
    {
      titulo: '3. Faça seu ouro se multiplicar',
      texto: 'Dinheiro parado é dinheiro perdendo valor. Invista! Faça cada real trabalhar pra você.',
    },
    {
      titulo: '4. Proteja seu tesouro',
      texto: 'Fuja de "investimentos milagrosos". Se parece bom demais, provavelmente é golpe!',
    },
    {
      titulo: '5. Torne sua casa um investimento',
      texto: 'Tenha um lar próprio. Aluguel é dinheiro que nunca volta.',
    },
    {
      titulo: '6. Garanta uma renda para o futuro',
      texto: 'Prepare-se para quando não puder mais trabalhar. Pense na aposentadoria AGORA.',
    },
    {
      titulo: '7. Aumente sua capacidade de ganhar',
      texto: 'Invista em você! Estudar e se qualificar é o investimento de maior retorno.',
    },
  ];

  // Pegar 2-3 segredos aleatórios
  const shuffled = segredos.sort(() => Math.random() - 0.5);
  const selecionados = shuffled.slice(0, 3);

  selecionados.forEach(s => {
    reply += `**${s.titulo}**\n${s.texto}\n\n`;
  });

  // Adicionar contexto financeiro do usuário
  if (summary.totalIncomes > 0 && summary.totalExpenses > 0) {
    const saldo = summary.totalIncomes - summary.totalExpenses;
    if (saldo > 0) {
      reply += `💪 Você está sobrando ${formatCurrency(saldo)} este mês. Ótima oportunidade de aplicar esses princípios!`;
    } else {
      reply += `⚠️ Você está gastando mais do que ganha. Hora de aplicar o segredo #2: controle seus gastos!`;
    }
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
