/**
 * Julius Intent Detector
 * Detecta a intenção do usuário a partir de perguntas em linguagem natural
 */

export type JuliusIntent =
  | 'TOTAL_MES'
  | 'CARTAO_CREDITO'
  | 'METAS'
  | 'PENDENTES'
  | 'RECEITAS'
  | 'CATEGORIA_MAIOR'
  | 'GASTOS_ALTOS'
  | 'COMPARAR_MES'
  | 'LISTA_CATEGORIAS'
  | 'MEDIA_DIARIA'
  | 'ECONOMIZAR'
  | 'JUNTAR_DINHEIRO'
  | 'EDUCACAO_FINANCEIRA'
  | 'INVESTIMENTOS'
  | 'LIVROS'
  | 'CHECKLIST'
  | 'HISTORIA_JULIUS'
  | 'DICA'
  | 'AJUDA'
  | 'SAUDACAO'
  | 'DESCONHECIDO';

interface IntentPattern {
  intent: JuliusIntent;
  patterns: RegExp[];
}

const intentPatterns: IntentPattern[] = [
  {
    intent: 'SAUDACAO',
    patterns: [
      /^(oi|olá|ola|hey|eae|e aí|boa tarde|bom dia|boa noite|tudo bem|opa)/i,
      /^(julius|ei julius|fala julius)/i,
    ],
  },
  {
    intent: 'TOTAL_MES',
    patterns: [
      /quanto\s+(gastei|gasto|foi|tenho)/i,
      /total\s+(do\s+mês|gasto|de\s+gastos?)/i,
      /gastos?\s+(do\s+mês|desse\s+mês|esse\s+mês|mensal)/i,
      /soma\s+(dos\s+gastos?|do\s+mês)/i,
      /meus\s+gastos/i,
      /qual\s+(o\s+total|meu\s+gasto)/i,
    ],
  },
  {
    intent: 'CARTAO_CREDITO',
    patterns: [
      /cart(ão|ao)\s*(de\s*)?(credito|crédito)/i,
      /gasto.*(cart(ão|ao)|credit)/i,
      /fatura/i,
      /credit\s*card/i,
      /nubank|itau|bradesco|santander|inter|c6|xp|picpay/i,
      /cart(ão|ao|ões|oes)/i,
    ],
  },
  {
    intent: 'PENDENTES',
    patterns: [
      /pendente/i,
      /lançamentos?\s+pendentes?/i,
      /gastos?\s+pendentes?/i,
      /fatura\s+pendente/i,
      /próximo\s+mês/i,
      /mes\s+que\s+vem/i,
      /futuro/i,
    ],
  },
  {
    intent: 'RECEITAS',
    patterns: [
      /receitas?/i,
      /entradas?/i,
      /ganhos?/i,
      /renda/i,
      /salário/i,
      /salario/i,
      /quanto\s+(ganhei|recebi|entrou)/i,
      /de\s+onde\s+vem/i,
      /origem\s+do\s+dinheiro/i,
      /fontes?\s+de\s+renda/i,
    ],
  },
  {
    intent: 'METAS',
    patterns: [
      /metas?/i,
      /objetivo/i,
      /planej(ado|amento|ei)/i,
      /or(ç|c)amento/i,
      /limite\s+(de\s+)?gasto/i,
      /quanto\s+(posso|devo)\s+gastar/i,
      /estou\s+(dentro|acima|abaixo)/i,
      /passei\s+do\s+limite/i,
      /longo\s+prazo/i,
    ],
  },
  {
    intent: 'CATEGORIA_MAIOR',
    patterns: [
      /categoria\s+(que\s+)?mais\s+(gasto|pesa|gastei)/i,
      /maior\s+(gasto|categoria)/i,
      /onde\s+(mais\s+)?gasto/i,
      /qual\s+categoria\s+(mais|maior)/i,
      /(pesa|pesando)\s+mais/i,
      /gastando\s+mais/i,
      /mais\s+dinheiro/i,
    ],
  },
  {
    intent: 'GASTOS_ALTOS',
    patterns: [
      /gastos?\s+(altos?|grandes?|maiores)/i,
      /maiores\s+(gastos?|despesas?)/i,
      /despesas?\s+(altas?|grandes?)/i,
      /gastei\s+muito/i,
      /muito\s+gasto/i,
      /top\s+gastos/i,
    ],
  },
  {
    intent: 'COMPARAR_MES',
    patterns: [
      /compar(ar|ando|ação|ativo)/i,
      /mês\s+(passado|anterior)/i,
      /(mais|menos)\s+que\s+(o\s+)?mês/i,
      /aumentou|diminuiu/i,
      /evolu(ção|indo)/i,
      /último\s+mês/i,
    ],
  },
  {
    intent: 'LISTA_CATEGORIAS',
    patterns: [
      /lista(r)?\s+(de\s+)?categorias/i,
      /quais\s+categorias/i,
      /todas?\s+(as\s+)?categorias/i,
      /minhas\s+categorias/i,
      /divisão\s+por\s+categoria/i,
      /gasto\s+por\s+categoria/i,
    ],
  },
  {
    intent: 'MEDIA_DIARIA',
    patterns: [
      /média\s+(diária|por\s+dia)/i,
      /gasto\s+por\s+dia/i,
      /quanto\s+por\s+dia/i,
      /diária(mente)?/i,
    ],
  },
  {
    intent: 'ECONOMIZAR',
    patterns: [
      /como\s+(economizar|poupar|guardar)/i,
      /quero\s+(economizar|poupar)/i,
      /ajuda.*economizar/i,
      /economizar/i,
    ],
  },
  {
    intent: 'JUNTAR_DINHEIRO',
    patterns: [
      /juntar\s+dinheiro/i,
      /guardar\s+dinheiro/i,
      /acumular\s+(dinheiro|grana)/i,
      /ficar\s+rico/i,
      /enriquecer/i,
      /construir\s+(patrimônio|riqueza)/i,
    ],
  },
  {
    intent: 'EDUCACAO_FINANCEIRA',
    patterns: [
      /educa(ç|c)(ão|ao)\s+financeira/i,
      /aprender\s+(sobre\s+)?(finan(ç|c)as?|dinheiro)/i,
      /princ(í|i)pios?\s+financeiros?/i,
      /como\s+(aprender|melhorar).*finan/i,
      /dicas?\s+para\s+(juntar|guardar|economizar)\s+dinheiro/i,
      /regras?\s+(de\s+ouro|financeiras?)/i,
      /pai\s+rico/i,
    ],
  },
  {
    intent: 'INVESTIMENTOS',
    patterns: [
      /investimentos?/i,
      /como\s+investir/i,
      /onde\s+investir/i,
      /devo\s+investir/i,
      /come(ç|c)ar\s+(a\s+)?investir/i,
      /aprende.*investir/i,
      /mandamentos?/i,
      /manifesto/i,
      /regra\s+de\s+ouro/i,
      /como\s+aplicar.*dinheiro/i,
      /aplica(ç|c)(ã|a)o\s+financeira/i,
    ],
  },
  {
    intent: 'LIVROS',
    patterns: [
      /livros?/i,
      /indica(ç|c)(ão|ao|ões|oes)\s+(de\s+)?livros?/i,
      /o\s+que\s+ler/i,
      /recomenda.*livro/i,
      /bibliografia/i,
      /leitura/i,
    ],
  },
  {
    intent: 'CHECKLIST',
    patterns: [
      /checklist/i,
      /check\s*list/i,
      /lista\s+completa/i,
      /todos?\s+(os\s+)?princ(í|i)pios/i,
      /resumo\s+completo/i,
    ],
  },
  {
    intent: 'HISTORIA_JULIUS',
    patterns: [
      /como\s+(você|vc|voce)\s+(aprendeu|aprendeste)/i,
      /onde\s+(você|vc|voce)\s+(aprendeu|aprendeste)/i,
      /sua\s+hist(ó|o)ria/i,
      /conte.*sua\s+hist(ó|o)ria/i,
      /de\s+onde\s+(você|vc|voce)\s+(tirou|pegou)/i,
      /me\s+conta.*como/i,
    ],
  },
  {
    intent: 'DICA',
    patterns: [
      /dicas?/i,
      /sugest(ão|ões)/i,
      /me\s+ajuda/i,
      /o\s+que\s+fazer/i,
    ],
  },
  {
    intent: 'AJUDA',
    patterns: [
      /ajuda/i,
      /o\s+que\s+você\s+(faz|pode|sabe)/i,
      /como\s+(funciona|usar|uso)/i,
    ],
  },
];

/**
 * Detecta a intenção de uma pergunta do usuário
 */
export function detectIntent(question: string): JuliusIntent {
  const normalizedQuestion = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const { intent, patterns } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuestion)) {
        return intent;
      }
    }
  }

  return 'DESCONHECIDO';
}
