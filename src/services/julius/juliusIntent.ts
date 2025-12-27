/**
 * Julius Intent Detector
 * Detecta a intenção do usuário a partir de perguntas em linguagem natural
 */

export type JuliusIntent =
  | 'TOTAL_MES'
  | 'CATEGORIA_MAIOR'
  | 'GASTOS_ALTOS'
  | 'COMPARAR_MES'
  | 'LISTA_CATEGORIAS'
  | 'MEDIA_DIARIA'
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
      /em\s+relação\s+ao\s+mês/i,
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
    intent: 'AJUDA',
    patterns: [
      /ajuda/i,
      /o\s+que\s+você\s+(faz|pode|sabe)/i,
      /como\s+(funciona|usar|uso)/i,
      /me\s+ajud(a|e)/i,
      /dicas?/i,
      /sugest(ão|ões)/i,
      /pode\s+me\s+ajudar/i,
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
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
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

/**
 * Extrai informações extras da pergunta (ex: mês específico, categoria)
 */
export function extractContext(question: string): {
  month?: number;
  year?: number;
  category?: string;
} {
  const context: { month?: number; year?: number; category?: string } = {};
  const normalizedQuestion = question.toLowerCase();

  // Detectar mês mencionado
  const monthNames: Record<string, number> = {
    janeiro: 1, fevereiro: 2, março: 3, marco: 3,
    abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9,
    outubro: 10, novembro: 11, dezembro: 12,
  };

  for (const [name, num] of Object.entries(monthNames)) {
    if (normalizedQuestion.includes(name)) {
      context.month = num;
      break;
    }
  }

  return context;
}
