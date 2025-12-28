/**
 * Julius Intent Detector
 * Detecta a intenção do usuário a partir de perguntas em linguagem natural
 */

export type JuliusIntent =
  | 'TOTAL_MES'
  | 'CARTAO_CREDITO'
  | 'METAS'
  | 'CATEGORIA_MAIOR'
  | 'GASTOS_ALTOS'
  | 'COMPARAR_MES'
  | 'LISTA_CATEGORIAS'
  | 'MEDIA_DIARIA'
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
    intent: 'DICA',
    patterns: [
      /dicas?/i,
      /como\s+(economizar|controlar|organizar)/i,
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
