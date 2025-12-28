/**
 * Julius Education Content
 * Conteúdo educacional baseado em "Pai Rico, Pai Pobre" e princípios de educação financeira
 */

export interface EducationalTip {
  title: string;
  items: string[];
  cofrinTip?: string;
}

/**
 * Retorna uma dica aleatória de educação financeira
 */
export function getRandomTip(): string {
  const tips = [
    getPayYourselfFirstTip(),
    getAbsoluteControlTip(),
    getLiveBelowMeansTip(),
    getEmergencyReserveTip(),
    getMoneyWorkingTip(),
    getProtectMoneyTip(),
    getFinancialKnowledgeTip(),
    getPlanFutureTip(),
  ];
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  return randomTip;
}

/**
 * Retorna uma história do Julius sobre como ele aprendeu sobre finanças
 * (estilo "Todo Mundo Odeia o Chris")
 */
export function getJuliusStory(): string {
  const stories = [
    {
      icon: '📚',
      title: 'Biblioteca do bairro (usar só uma vez)',
      text: `"Livro tá caro, então eu fui na biblioteca do meu bairro.
Já economizei antes mesmo de aprender.
Li com atenção pra não ter que voltar, porque tempo também custa.
A frase dizia: 'pague-se primeiro'.
Comecei guardando pouco.
Pobre não fica rico rápido, mas ficar zerado toda hora é opcional."`,
    },
    {
      icon: '📺',
      title: 'Comercial de TV',
      text: `"Eu vi isso num comercial de banco.
Não confio no banco, mas a frase era boa: 'planejamento traz tranquilidade'.
Ignorei o banco e fiquei com a ideia.
Hoje planejo até o pouco.
Tranquilidade não é luxo, é organização."`,
    },
    {
      icon: '🚌',
      title: 'Letreiro de busão',
      text: `"Li num letreiro de ônibus indo trabalhar cedo.
A frase dizia: 'não é quanto você ganha, é quanto você guarda'.
O ônibus sacolejava, mas a verdade era firme.
Guardei o hábito, não o dinheiro.
Hábito rende mais que salário."`,
    },
    {
      icon: '📖',
      title: 'Capa de livro',
      text: `"Não comprei o livro, só li a capa.
Tava escrito: 'riqueza é construída no silêncio'.
Capa é grátis, conteúdo eu apliquei.
Parei de gastar pra aparecer.
Dinheiro gosta de discrição."`,
    },
    {
      icon: '💈',
      title: 'Barbeiro conversando com o cliente',
      text: `"Tava cortando o cabelo e ouvi o barbeiro falando pro cliente:
'quem vive parcelando o presente, atrasa o futuro'.
O cliente não ouviu, mas eu ouvi.
Pare de parcelar besteira.
O futuro não aceita fiado."`,
    },
    {
      icon: '🗣️',
      title: 'Rochelle dando conselho (que ela não segue)',
      text: `"Ouvi a Rochelle dando conselho financeiro que ela mesma não segue.
Ela disse: 'gaste menos do que ganha'.
Ela não faz, mas eu fiz.
Nem todo bom conselho precisa vir de exemplo.
Resultado importa mais que discurso."`,
    },
    {
      icon: '📻',
      title: 'Rádio às 5 da manhã',
      text: `"Ouvi isso no rádio num programa de finanças às 5 da manhã.
Esse horário só tem pobre acordado, rico tá dormindo.
O cara disse: 'invista todo mês, sem emoção'.
Emoção eu deixo pra conta bancária vazia.
Disciplina é investimento."`,
    },
    {
      icon: '🧒',
      title: 'Chris falando da aula de economia',
      text: `"O Chris disse que aprendeu isso na aula de economia.
Pena que no Brasil quase não tem aula disso.
Ele falou: 'tempo é mais importante que valor'.
Então comecei cedo, mesmo com pouco.
Quem começa tarde paga juros pro tempo."`,
    },
    {
      icon: '📰',
      title: 'Legenda pequena na TV da padaria',
      text: `"Tava esperando o pão e li uma legenda pequena passando na TV:
'dívida não é renda futura'.
Peguei o pão, larguei o parcelamento.
Comida passa, dívida fica.
Escolhi o que passa."`,
    },
    {
      icon: '🧠',
      title: 'Pensamento depois de ouvir tudo isso',
      text: `"Depois de ouvir tudo isso em lugar que não cobra nada, eu aprendi uma coisa:
sabedoria não é cara, ignorância é.
Investir não começa com dinheiro, começa com decisão.
E decisão, até hoje, ainda é grátis."`,
    },
  ];

  const story = stories[Math.floor(Math.random() * stories.length)];
  return `${story.icon} **${story.title}**\n\n${story.text}\n\n💪 **— Julius`;
}

/**
 * Retorna uma dica sobre livros e recursos educacionais
 */
export function getBookRecommendation(): string {
  return `📚 **Livros essenciais para sua educação financeira:**

🔥 **Pai Rico, Pai Pobre** - Robert Kiyosaki
A bíblia da educação financeira! Aprenda a diferença entre ativos e passivos, e como fazer o dinheiro trabalhar por você.

💰 **Os Segredos da Mente Milionária** - T. Harv Eker
Entenda como sua mentalidade financeira afeta suas decisões com dinheiro.

📊 **O Homem Mais Rico da Babilônia** - George S. Clason
Lições atemporais de como construir riqueza através de parábolas antigas.

🎯 **Do Mil ao Milhão** - Thiago Nigro (Primo Rico)
Guia brasileiro prático de como sair do zero e construir patrimônio.

✅ **Dica do Julius:**
Comece pelo "Pai Rico, Pai Pobre" - é um divisor de águas! Depois continue com os outros. E lembre-se: conhecimento sem ação não vale nada. Aplique o que aprender! 💪`;
}

/**
 * Retorna o checklist completo de Pai Rico, Pai Pobre
 */
export function getFullChecklist(): string {
  return `🧠 **Checklist Prático - Pai Rico, Pai Pobre (Versão Cofrin)**

**1. Mentalidade Financeira (base de tudo)**
✅ Eu sei quanto ganho e quanto gasto por mês
✅ Eu reviso meus gastos todo mês
✅ Eu tomo decisões pensando no longo prazo
✅ Eu entendo que salário ≠ riqueza
✅ Eu busco aprender sobre dinheiro continuamente

**2. Ativos x Passivos (regra de ouro)**
✅ Ativo → coloca dinheiro no bolso
❌ Passivo → tira dinheiro do bolso

**3. Gestão básica do dinheiro**
✅ Tenho clareza do meu saldo real
✅ Sei quanto sobra no fim do mês
✅ Tenho pelo menos 1 mês de reserva
✅ Minhas despesas estão organizadas por categoria

**4. Pagar-se primeiro (regra sagrada)**
✅ Invisto antes de gastar
✅ Tenho um valor fixo mensal para investir
✅ Esse valor é tratado como despesa obrigatória
✅ Não invisto "só se sobrar"

**5. Construção de renda e ativos**
✅ Tenho pelo menos 1 ativo financeiro
✅ Busco renda além do salário
✅ Reinvisto parte do que ganho
✅ Meu foco é liberdade financeira, não status

**6. Dívidas e riscos (controle consciente)**
✅ Minhas dívidas são planejadas (não emocionais)
✅ Evito parcelamentos longos
✅ Uso crédito como ferramenta, não muleta
✅ Sei exatamente quanto devo e até quando

**7. Liberdade financeira (visão de futuro)**
✅ Sei quanto custa meu padrão de vida mensal
✅ Sei quanto preciso gerar de renda passiva
✅ Tenho metas financeiras claras
✅ Meu dinheiro está alinhado com minha vida

💪 **O Julius recomenda:** Comece pelo item que você ainda não consegue marcar. Pequenos passos, grandes resultados!`;
}

// ============================================================================
// DICAS INDIVIDUAIS
// ============================================================================

function getPayYourselfFirstTip(): string {
  return `💰 **1. Pague-se primeiro (Regra de Ouro)**

📌 **O que fazer:**
• Guarde mínimo 10% de toda receita assim que receber
• Esse valor NÃO entra no saldo de gastos
• Use esse dinheiro apenas para investir, nunca para consumo
• Se possível, aumente para 15% ou 20%

🎯 **Dica do Julius:**
"Receita chegou? Primeiro pague você mesmo! Pensa assim: se você não se pagar, ninguém vai fazer isso por você. Trata seu investimento mensal como uma conta obrigatória - tipo luz ou internet - que você NÃO pode deixar de pagar!"

💪 Comece hoje mesmo! Defina uma meta de investimento mensal no Cofrin e trate como prioridade número 1.`;
}

function getAbsoluteControlTip(): string {
  return `📊 **2. Controle absoluto de gastos**

📌 **O que fazer:**
• Registre 100% das despesas (até as pequenas!)
• Saiba exatamente quanto gasta por categoria
• Seus gastos mensais NÃO devem ultrapassar suas receitas
• Veja claramente para onde o dinheiro está indo

🎯 **Dica do Julius:**
"Aquele cafezinho de R$ 5? Anota! Aquele lanche de R$ 15? Anota também! Parece bobeira, mas no fim do mês essas 'pequenas' despesas viram uma nota gorda. Se você não controla o dinheiro, ELE te controla!"

💪 Use o Cofrin para registrar TUDO. Quanto mais dados, melhor eu consigo te ajudar! 📱`;
}

function getLiveBelowMeansTip(): string {
  return `🏠 **3. Viva abaixo do que você ganha**

📌 **O que fazer:**
• Suas despesas fixas devem caber no seu salário
• Evite aumentar padrão de vida quando ganhar mais
• Ajuste gastos antes de pensar em ganhar mais dinheiro
• Saiba qual é seu custo de vida real

🎯 **Dica do Julius:**
"Ganhou aumento? Ótimo! Mas não saia correndo pra comprar um carro mais caro ou alugar apartamento melhor. Isso é armadilha! Aumento de salário = aumento de investimento. Seu padrão de vida pode esperar, sua aposentadoria não!"

💪 A diferença entre o que você ganha e o que gasta é sua LIBERDADE. Quanto maior essa diferença, mais rápido você fica livre! 🚀`;
}

function getEmergencyReserveTip(): string {
  return `🛡️ **4. Crie uma reserva de emergência**

📌 **O que fazer:**
• Tenha pelo menos 3 a 6 meses do seu custo de vida guardados
• A reserva fica em local seguro e líquido
• NÃO use reserva para lazer ou compras
• Saiba exatamente quanto falta para completar sua reserva

🎯 **Dica do Julius:**
"Reserva de emergência não é pra trocar de celular ou viajar! É pra quando a vida te pegar desprevenido: perdeu o emprego, carro quebrou, doença na família. Com reserva, você enfrenta a tempestade sem desespero. Sem reserva, você afunda na primeira onda!"

💪 Meta #1 de qualquer pessoa: completar a reserva de emergência. Depois disso, o resto é lucro! 🎯`;
}

function getMoneyWorkingTip(): string {
  return `📈 **5. Faça o dinheiro trabalhar por você**

📌 **O que fazer:**
• Invista regularmente (mensalmente)
• Seus investimentos devem ter objetivo claro
• Entenda onde está investindo
• Seus rendimentos devem ser reinvestidos

🎯 **Dica do Julius:**
"Você trabalha 8h por dia, mas e seu dinheiro? Ele tá trabalhando 24h por dia pra você? Se não tá, você tá perdendo tempo! Investir é colocar seu dinheiro pra trabalhar enquanto você dorme. Juros compostos são mágica - Einstein já dizia!"

💪 Comece pequeno, mas comece AGORA. R$ 50/mês investidos valem mais que R$ 500/mês daqui a 5 anos. O tempo é seu maior aliado! ⏰`;
}

function getProtectMoneyTip(): string {
  return `🛡️ **6. Proteja seu dinheiro**

📌 **O que fazer:**
• Evite promessas de ganho rápido
• NÃO invista no que não entende
• Diversifique seus investimentos
• Tenha controle de riscos (não coloque tudo em um lugar)

🎯 **Dica do Julius:**
"'Invista aqui e duplique seu dinheiro em 30 dias!' - FUJA! Se fosse fácil, todo mundo era rico. Investimento sério é chato, lento e consistente. Quer emoção? Assiste filme de ação! Quer dinheiro? Foca em investimentos sólidos e diversificados."

💪 Desconfia de tudo que promete muito e não explica nada. Se você não entende, NÃO investe! Simples assim. 🚫`;
}

function getFinancialKnowledgeTip(): string {
  return `📚 **7. Invista em conhecimento financeiro**

📌 **O que fazer:**
• Leia conteúdos sobre dinheiro e investimentos
• Aprenda com fontes confiáveis
• Melhore suas decisões financeiras ao longo do tempo
• Evite seguir "modinhas financeiras"

🎯 **Dica do Julius:**
"O melhor investimento que você pode fazer é em VOCÊ! Leia livros, assista vídeos, faz cursos... quanto mais você sabe sobre dinheiro, menos chance de cair em furada. Conhecimento financeiro é tipo seguro de carro - você torce pra não precisar, mas se precisar, salva sua vida!"

💪 Recomendação: comece pelo "Pai Rico, Pai Pobre". É curtinho, fácil de ler e muda sua cabeça. Depois me conta o que achou! 📖`;
}

function getPlanFutureTip(): string {
  return `🎯 **8. Planeje o futuro**

📌 **O que fazer:**
• Tenha metas financeiras claras
• Planeje aposentadoria / independência financeira
• Pense no longo prazo (5, 10, 20 anos)
• Suas decisões hoje ajudam seu "eu do futuro"

🎯 **Dica do Julius:**
"Onde você quer estar daqui a 10 anos? Trabalhando porque precisa ou trabalhando porque quer? A diferença tá no que você faz HOJE. Cada real economizado hoje é um passo em direção à sua liberdade amanhã. Seu 'eu do futuro' vai agradecer!"

💪 Defina suas metas no Cofrin: viagem, casa própria, carro, aposentadoria... Ter um objetivo claro torna muito mais fácil dizer 'não' para gastos bestas! 🎯`;
}

/**
 * Retorna todas as 8 dicas juntas (versão resumida)
 */
export function getAllTipsSummary(): string {
  return `💡 **8 Princípios de Ouro para Juntar Dinheiro**

1️⃣ **Pague-se primeiro** - Guarde 10-20% antes de gastar
2️⃣ **Controle absoluto** - Registre 100% dos gastos
3️⃣ **Viva abaixo dos meios** - Gaste menos que ganha
4️⃣ **Reserva de emergência** - 3-6 meses guardados
5️⃣ **Dinheiro trabalhando** - Invista mensalmente
6️⃣ **Proteja seu dinheiro** - Não caia em furadas
7️⃣ **Conhecimento financeiro** - Estude sempre
8️⃣ **Planeje o futuro** - Metas claras de longo prazo

🎯 **Julius recomenda:** Foque em um princípio por vez. Melhoria de 1% todo dia = transformação no fim do ano!

Quer detalhes de algum princípio específico? É só perguntar! 💪`;
}

// ============================================================================
// CONTEÚDO SOBRE INVESTIMENTOS
// ============================================================================

/**
 * Regra de Ouro do Julius sobre investimentos
 */
export function getGoldenRule(): string {
  return `🧠 **A REGRA DE OURO DO JULIUS**

"Não invista pra ficar rico.
Invista pra parar de passar aperto.
Se parar o aperto, a riqueza vem andando."

💪 **— Julius`;
}

/**
 * Manifesto do Julius
 */
export function getManifesto(): string {
  return `📜 **O MANIFESTO DO JULIUS** (versão simples e aplicável)

"Eu não invisto quando sobra.
Eu faço sobrar pra poder investir.
Porque se eu esperar sobrar, nunca sobra."

💡 **Aplique hoje:**
1. Calcule 10% da sua renda
2. Separe ASSIM que receber
3. Trate como conta obrigatória
4. Invista sem pensar

💪 **— Julius`;
}

/**
 * Os 7 Mandamentos do Julius sobre investimento
 */
export function getSevenCommandments(): string {
  return `🪙 **OS 7 MANDAMENTOS DO JULIUS** (investimento simples)

**1️⃣ Guarde antes de gastar**

"Pague-se primeiro, mesmo que seja pouco."
➡️ Comece com 5%, 10% ou até moedas
➡️ Valor pequeno cria hábito grande

**2️⃣ Nunca invista o dinheiro do aperto**

"Dinheiro que pode fazer falta não é investimento, é ansiedade."
➡️ Primeiro: contas em dia
➡️ Depois: reserva
➡️ Só então: investimento

**3️⃣ Disciplina vence salário**

"Quem ganha pouco e é disciplinado vence quem ganha muito e é desorganizado."
➡️ Investir todo mês > investir muito uma vez

**4️⃣ Tempo trabalha melhor que você**

"Enquanto você dorme, o tempo tá trabalhando."
➡️ Comece cedo
➡️ Não mexa toda hora
➡️ Deixa o tempo fazer hora extra

**5️⃣ Não complique o que é simples**

"Se você não entende, não é investimento, é aposta."
➡️ Comece pelo básico
➡️ Sofisticação é pra quem já tem dinheiro sobrando

**6️⃣ Aporte pequeno é melhor que desculpa grande**

"Quem espera ganhar mais pra investir, vai investir tarde."
➡️ R$10 hoje > R$0 esperando promoção da vida

**7️⃣ Riqueza é consequência, não objetivo**

"Quem corre atrás de dinheiro tropeça.
Quem organiza a vida financeira anda firme."
➡️ Foque em estabilidade
➡️ A riqueza vem como efeito colateral

💪 **— Julius`;
}

/**
 * Retorna um conteúdo aleatório sobre investimentos
 */
export function getInvestmentWisdom(): string {
  const contents = [
    getGoldenRule(),
    getManifesto(),
    getSevenCommandments(),
  ];
  
  return contents[Math.floor(Math.random() * contents.length)];
}
