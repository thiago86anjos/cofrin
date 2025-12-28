/**
 * Julius Reply Generator
 * Gera respostas com humor baseadas nos dados financeiros do usuário
 * Inspirado no Julius de "Todo Mundo Odeia o Chris"
 */

import { JuliusIntent } from './juliusIntent';
import { FinancialSummary, formatCurrency, formatPercent, GoalData } from './juliusSummary';
import {
    getRandomTip,
    getBookRecommendation,
    getFullChecklist,
    getAllTipsSummary,
    getJuliusStory
} from './juliusEducation';

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
    'Economia começa nos centavos. Centavo vira real, real vira cem!',
    'Dinheiro guardado é dinheiro garantido! 🏦',
    'Quem guarda, tem! Quem gasta, pede emprestado depois!',
    'Economizar não é ser mão de vaca, é ser inteligente! 🧠',
  ],
  alerta: [
    'Eita! Tá gastando como se tivesse dinheiro sobrando! 😅',
    'Calma aí! Dinheiro não cai do céu... a menos que você limpe avião!',
    'Opa! Hora de apertar o cinto! O Julius tá de olho! 👀',
    'Cuidado! Se continuar assim, vai ter que arrumar um segundo emprego igual o Julius!',
    'Peraí! Esse gasto tá alto demais! Sabe quantas horas de trabalho isso representa?',
    'Ó o buraco aí! Bora tapar antes que fique maior! 🕳️',
    'Esse mês tá pegando fogo! Hora de jogar água nesse incêndio! 🔥',
    'Dinheiro não dá em árvore! A menos que você plante um pé de nota! 🌳',
  ],
  positivo: [
    'Isso aí! O Julius tá orgulhoso! 💪',
    'Mandou bem! Continua assim que você vai longe!',
    'Boa! Tá no caminho certo! Até o Chris ia te respeitar!',
    'Excelente! Se dá pra economizar, economiza! ✨',
    'Tá vendo? Quando você quer, você consegue! 🎯',
    'Aí sim! Esse é o caminho da liberdade financeira! 🚀',
    'Parabéns! Tá fazendo o dinheiro trabalhar pra você! 💼',
    'Olha só! Até o Julius ficaria impressionado com essa gestão! 👏',
  ],
  piadas: [
    'Sabe quantas horas de trabalho isso representa? 🤔',
    'Com esse dinheiro dava pra comprar muita coisa no atacado!',
    'O Julius trabalharia uma semana por esse valor!',
    'Luz acesa sem ninguém no quarto? São reais jogados fora!',
    'Esse valor daria pra pagar quantas contas de luz? Muitas!',
    'No meu tempo, isso dava pra alimentar a família por um mês!',
    'Tá vendo? Por isso o Julius trabalha em dois empregos!',
    'Se o Chris soubesse, ia pedir aumento na mesada!',
  ],
  sabedoria: [
    '💡 Lembre-se: "Não invista pra ficar rico. Invista pra parar de passar aperto."',
    '📜 "Eu não invisto quando sobra. Eu faço sobrar pra poder investir."',
    '🎯 "Pobre não fica rico rápido, mas ficar zerado toda hora é opcional."',
    '🏦 "Riqueza é construída no silêncio." - Aprendi isso numa capa de livro!',
    '⚡ "Quem vive parcelando o presente, atrasa o futuro."',
    '💰 "Não é quanto você ganha, é quanto você guarda."',
    '🧠 "Sabedoria não é cara, ignorância é."',
    '⏰ "Tempo é mais importante que valor. Comece cedo!"',
  ],
};

function getFrase(tipo: keyof typeof FRASES): string {
  const lista = FRASES[tipo];
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Fechamentos variados para deixar as respostas menos monótonas
 */
function getFechamentoAleatorio(): string {
  const fechamentos = [
    '\n\n' + getFrase('sabedoria'),
    '\n\nQuer mais dicas? É só perguntar! 💬',
    '\n\nPrecisa de mais alguma coisa? Tamo junto! 🤝',
    '\n\nCuriosidade: pergunte sobre investimentos, livros ou minhas histórias!',
    '\n\nDica: digite "me dá uma dica" pra mais insights! 💡',
    '', // às vezes sem fechamento
    '', // às vezes sem fechamento
  ];
  return fechamentos[Math.floor(Math.random() * fechamentos.length)];
}

/**
 * Gera resposta do Julius baseada na intenção e dados
 */
export function generateReply(intent: JuliusIntent, summary: FinancialSummary): string {
  if (!summary.hasData && !['SAUDACAO', 'AJUDA', 'DICA', 'EDUCACAO_FINANCEIRA', 'INVESTIMENTOS', 'LIVROS', 'CHECKLIST', 'HISTORIA_JULIUS'].includes(intent)) {
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
    case 'EDUCACAO_FINANCEIRA':
      return getEducacaoFinanceira();
    case 'INVESTIMENTOS':
      return getInvestimentos();
    case 'LIVROS':
      return getLivros();
    case 'CHECKLIST':
      return getChecklist();
    case 'HISTORIA_JULIUS':
      return getHistoriaJulius();
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
    `Salve, ${primeiroNome}! Beleza?`,
    `Opa, ${primeiroNome}! Bora falar de grana?`,
    `${primeiroNome}! Julius aqui, pronto pra te ajudar!`,
    `Hey, ${primeiroNome}! Vamos ver esses números?`,
  ];
  const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
  
  if (summary.hasData) {
    const saldo = summary.totalIncomes - summary.totalExpenses;
    
    const contextos = [
      `Vi que você tem ${summary.transactionCount} lançamento(s) em ${summary.currentMonth.monthName}, totalizando ${formatCurrency(summary.totalExpenses)} em gastos.`,
      `Já dei uma olhada: ${summary.transactionCount} lançamento(s) este mês, ${formatCurrency(summary.totalExpenses)} no total.`,
      `Tá registrando direitinho! ${summary.transactionCount} lançamento(s), gastou ${formatCurrency(summary.totalExpenses)}.`,
    ];
    const contexto = contextos[Math.floor(Math.random() * contextos.length)];
    
    if (saldo < 0) {
      const alertas = [
        `Epa, tá no vermelho! Bora dar uma olhada nisso?`,
        `Opa! Gastou mais que ganhou. Vamos analisar?`,
        `Vermelho no saldo! Hora de revisar os gastos!`,
      ];
      return `${saudacao} 😬\n\n${contexto}\n\n${alertas[Math.floor(Math.random() * alertas.length)]}`;
    }
    
    const perguntas = [
      `O que quer saber?`,
      `Como posso te ajudar?`,
      `Quer ver alguma categoria específica?`,
      `Bora analisar mais alguma coisa?`,
    ];
    return `${saudacao} 💪\n\n${contexto}\n\n${perguntas[Math.floor(Math.random() * perguntas.length)]}`;
  }
  
  const semDados = [
    `Sou seu assistente financeiro pessoal. Registra aí suas despesas que eu te ajudo a controlar! 📊`,
    `Ainda não vi lançamentos por aqui. Bora registrar pra eu poder te ajudar! 💰`,
    `Cadê os gastos? Registra aí que eu analiso tudo pra você! 📝`,
  ];
  return `${saudacao}\n\n${semDados[Math.floor(Math.random() * semDados.length)]}`;
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
  
  reply += getFechamentoAleatorio();
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
    const avisos = [
      'Bora ficar de olho!',
      'Atenção dobrada aqui!',
      'Cuidado pra não estourar!',
    ];
    reply += `⚠️ ${cc.statusMessage}. ${avisos[Math.floor(Math.random() * avisos.length)]}`;
  } else if (cc.status === 'alert') {
    reply += `🚨 ${cc.statusMessage}!\n\n${getFrase('alerta')}`;
  } else {
    reply += `ℹ️ ${cc.statusMessage}`;
  }
  
  reply += getFechamentoAleatorio();
  return reply;
}

function getMetas(summary: FinancialSummary): string {
  const goals = summary.goals;
  
  if (!goals || (!goals.hasMonthlyGoals && !goals.hasLongTermGoals)) {
    const semMetas = [
      `🎯 Você ainda não tem metas definidas!\n\nQue tal criar algumas pra eu poder te ajudar a acompanhar? Vá em **Metas** no menu!`,
      `🎯 Cadê as metas?\n\nDefina limites de gastos por categoria ou crie metas de longo prazo. Vai lá em **Metas**! 💪`,
      `🎯 Nenhuma meta cadastrada ainda!\n\nMetas são essenciais! Crie uma reserva de emergência ou limite seus gastos. Menu **Metas** te espera! 🚀`,
    ];
    return semMetas[Math.floor(Math.random() * semMetas.length)];
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
    const avisos = [
      'Bora segurar a onda! 🌊',
      'Controla esse gás aí! 🚗',
      'Freio de mão! 🛑',
    ];
    reply += `\n⚠️ ${warningCount === 1 ? 'Uma meta tá' : `${warningCount} metas tão`} quase no limite! ${avisos[Math.floor(Math.random() * avisos.length)]}`;
  } else {
    reply += `\n🎉 Mandando bem! Todas as metas sob controle! ${getFrase('positivo')}`;
  }
  
  reply += getFechamentoAleatorio();
  return reply;
}

function getPendentes(): string {
  const respostas = [
    `🧘 Calma aí, jovem... Você precisa primeiro fechar o mês atual pra pensar no próximo!\n\nFique presente, pense como o Buda, viva o presente! 🙏\n\nMas você tem razão em se preocupar com o futuro - faz bem sim! A questão é que a gente começa o futuro **hoje**, organizando as finanças, certo?\n\n💡 Dica do Julius: Foque nos gastos que já aconteceram. Quando a fatura fechar e você pagar, aí sim ela entra na conta!`,
    `⏳ Opa! Os pendentes aparecem quando a fatura fechar!\n\nPor enquanto, foca no que já gastou. ${getFrase('sabedoria')}\n\nQuando chegar a hora de pagar, aí sim você vê o estrago... digo, o total! 😅`,
    `🔮 Tentando ver o futuro? O Julius não é vidente!\n\nOs lançamentos pendentes aparecem quando você fecha a fatura. Por ora, controla o presente que o futuro agradece! 💪`,
  ];
  return respostas[Math.floor(Math.random() * respostas.length)];
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
  const totalMes = formatCurrency(summary.totalExpenses);
  const diasRestantes = summary.daysInMonth - summary.daysPassed;
  
  let reply = `📅 **Seus gastos até agora:**\n\n`;
  reply += `• Total do mês: ${totalMes}\n`;
  reply += `• Média por dia: ${media}\n`;
  reply += `• Dias já passados: ${summary.daysPassed} de ${summary.daysInMonth}\n`;
  reply += `• Dias restantes: ${diasRestantes}\n\n`;
  
  if (summary.dailyAverage > 100) {
    reply += `Opa! Média de mais de R$ 100 por dia... ${getFrase('alerta')}`;
  } else {
    reply += `Boa! Mantendo uma média controlada. ${getFrase('economia')}`;
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

  // Mostrar dados de renda e saldo
  if (summary.totalIncomes > 0) {
    const saldo = summary.totalIncomes - summary.totalExpenses;
    reply += `💡 **Sua situação em ${summary.currentMonth.monthName}:**\n`;
    reply += `• Receitas: ${formatCurrency(summary.totalIncomes)}\n`;
    reply += `• Gastos: ${formatCurrency(summary.totalExpenses)}\n`;
    reply += `• Saldo: ${formatCurrency(saldo)} ${saldo >= 0 ? '✅' : '🔴'}\n\n`;
    
    if (saldo > 0) {
      reply += `Opa! Sobrou dinheiro! Esse é o momento de pagar-se primeiro e guardar uma parte antes que ela "desapareça"! 💰\n\n`;
    } else {
      reply += `Eita! Tá no vermelho! Hora de revisar os gastos e ver onde dá pra cortar. O Julius recomenda: comece pelas categorias que mais pesam! 📊\n\n`;
    }
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
 * Dica pra juntar dinheiro - usa conteúdo educacional
 */
function getJuntarDinheiro(summary: FinancialSummary): string {
  // Retorna o resumo dos 8 princípios
  return getAllTipsSummary();
}

function getDica(): string {
  // 33% dica educacional completa
  // 33% história do Julius
  // 33% dica rápida do Julius
  const random = Math.random();
  
  if (random < 0.33) {
    return getRandomTip();
  } else if (random < 0.66) {
    return getJuliusStory();
  }
  
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

/**
 * Educação Financeira - retorna uma dica aleatória dos 8 princípios
 */
function getEducacaoFinanceira(): string {
  return getRandomTip();
}

/**
 * Investimentos - retorna conteúdo sobre como investir
 */
function getInvestimentos(): string {
  return getInvestmentWisdom();
}

/**
 * Recomendação de livros
 */
function getLivros(): string {
  return getBookRecommendation();
}

/**
 * Checklist completo de Pai Rico, Pai Pobre
 */
function getChecklist(): string {
  return getFullChecklist();
}

/**
 * História do Julius - como ele aprendeu sobre finanças
 */
function getHistoriaJulius(): string {
  return getJuliusStory();
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
    `• "Dicas para juntar dinheiro"\n` +
    `• "Como investir?" ou "Manifesto do Julius"\n` +
    `• "Me indique um livro"\n` +
    `• "Como você aprendeu sobre finanças?"\n` +
    `• "Educação financeira"\n` +
    `• Ou pergunta qualquer coisa sobre finanças!`;
}

function getDesconhecido(): string {
  return `Hmm, não entendi essa. Mas pode perguntar sobre seus gastos, pedir uma dica ou qualquer coisa sobre finanças que eu respondo! 💬`;
}
