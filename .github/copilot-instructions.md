# Copilot Instructions - Cofrin

## Visão Geral
App de finanças pessoais React Native/Expo com Firebase (Firestore + Auth). Nome: **Cofrin** (cofrinho).

## Stack & Arquitetura
- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Firebase (Firestore, Auth)
- **Navegação**: React Navigation
- **Estilo**: Styled via `src/theme.ts` (palette, spacing, typography)

## Estrutura de Diretórios
```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # React Contexts (auth, theme)
├── hooks/          # Custom hooks (useAccounts, useCategories, etc)
├── screens/        # Telas do app
├── services/       # Serviços Firebase e Julius
│   └── julius/     # Chatbot Julius (assistente financeiro)
└── theme/          # Constantes de estilo
```

## Julius - Chatbot Financeiro com IA
Assistente baseado nos dados financeiros do usuário. Usa Groq/LLaMA para perguntas complexas. Arquitetura em `src/services/julius/`:

| Arquivo | Função |
|---------|--------|
| `juliusAssistant.ts` | Coordenador principal, função `askJulius()` |
| `juliusIntent.ts` | Detecta intenção via regex patterns |
| `juliusReply.ts` | Gera respostas locais com personalidade Julius |
| `juliusGroq.ts` | Integração com Groq/LLaMA para IA |
| `juliusDataService.ts` | **USA AS MESMAS FUNÇÕES DA HOME** para garantir dados consistentes |
| `juliusSummary.ts` | Geração de resumo financeiro mensal |
| `juliusRateLimit.ts` | Limite de 20 msgs/dia por usuário |

### Dados Consistentes
O Julius usa `juliusDataService.ts` que chama `transactionService.getTransactionsByMonth()` e `getPendingBillsMap()` - as MESMAS funções que alimentam os cards da Home. Isso garante que os números sejam idênticos à UI.

### Intenções Suportadas
`TOTAL_MES`, `CATEGORIA_MAIOR`, `GASTOS_ALTOS`, `COMPARAR_MES`, `LISTA_CATEGORIAS`, `MEDIA_DIARIA`, `DICA`, `AJUDA`, `SAUDACAO`, `DESCONHECIDO`

## Convenções de Código
- Componentes funcionais com hooks
- TypeScript strict
- Arquivos de teste em `__tests__/` junto aos componentes
- Services separados por domínio (account, category, transaction, etc)
- Hooks customizados para acesso a dados (`use*.ts`)

## Firebase Collections
- `transactions` - Despesas/receitas do usuário
- `categories` - Categorias de gastos
- `accounts` - Contas bancárias
- `goals` - Metas financeiras

## Comandos
```bash
npm start          # Inicia Expo dev server
npm run android    # Build Android
npm run ios        # Build iOS
npm run web        # Build Web
npm test           # Jest tests
```

## Padrões Importantes
1. **Formatação de moeda**: Usar `formatCurrency()` de `juliusSummary.ts`
2. **Novas intenções**: Adicionar pattern em `juliusIntent.ts` + handler em `juliusReply.ts`
