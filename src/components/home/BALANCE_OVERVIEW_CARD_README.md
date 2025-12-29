# BalanceOverviewCard - Card de Visão Patrimonial

## 📋 Descrição

Card moderno e premium que exibe o patrimônio disponível do usuário com foco em hierarquia visual e experiência fintech de alto nível. Substitui o antigo componente "Onde está meu dinheiro" com design orientado à percepção patrimonial.

## 🎯 Objetivos

- **Protagonismo do total**: Valor principal em destaque máximo
- **Clareza visual**: Entendimento em segundos da distribuição patrimonial
- **Design premium**: Sensação de fintech moderna, não relatório contábil
- **Hierarquia clara**: Total → Distribuição visual → Detalhe por conta

## 🎨 Estrutura Visual

```
┌─────────────────────────────────────┐
│ Seu dinheiro                        │
│                                     │
│ R$ 6.303,11                        │ ← Protagonista (32px, bold, verde)
│ Total disponível hoje              │ ← Microcopy (13px, muted)
│                                     │
│ ████████████████████▓▓▓▓▓          │ ← Barra de distribuição
│                                     │
│ DISTRIBUIÇÃO POR CONTA             │ ← Título discreto (12px, uppercase)
│                                     │
│ ┌───────────────────────────────┐  │
│ │ [💳] Mercado Pago             │  │
│ │ R$ 6.303,11                   │  │
│ │ ████████████████████ 100%     │  │
│ └───────────────────────────────┘  │
│                                     │
│ ┌───────────────────────────────┐  │
│ │ [🏦] Itaú                     │  │
│ │ R$ 0,00                       │  │
│ │ ░░░░░░░░░░░░░░░░░░░ 0%        │  │
│ └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 📦 Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `accounts` | `Account[]` | Não | Array de contas do usuário |
| `username` | `string` | Não | Nome do usuário (default: "Usuário") |
| `totalBalance` | `number` | Não | Saldo total (calcula automaticamente se não fornecido) |
| `onAccountPress` | `(account: Account) => void` | Não | Callback ao clicar em uma conta |
| `onAddPress` | `() => void` | Não | Callback ao clicar em adicionar conta |
| `showGreeting` | `boolean` | Não | Exibir saudação (default: true) |

## 🎨 Design Tokens

### Cores por tipo de conta
- **checking** (Corrente): `#6366F1` (Roxo/Azul)
- **savings** (Poupança): `#2FAF8E` (Verde)
- **investment** (Investimento): `#7B5CD6` (Roxo claro)
- **cash** (Dinheiro): `#E07A3F` (Laranja)
- **default**: `#9A96B0` (Cinza)

### Ícones por tipo
- **checking**: `bank`
- **savings**: `piggy-bank`
- **investment**: `chart-line`
- **cash**: `cash`
- **wallet**: `wallet`

### Espaçamentos
- Card padding: `20px`
- Card border radius: `24px`
- Item cards border radius: `16px`
- Gaps entre elementos: `12px` - `24px`

### Tipografia
- **Valor principal**: 32px, bold, verde
- **Nome da conta**: 15px, semibold
- **Valor da conta**: 20px, bold
- **Percentual**: 12px, medium
- **Microcopy**: 13px, regular

## 📊 Comportamento

### Cálculo de percentuais
```typescript
percentual = (saldoConta / saldoTotal) * 100
```

### Filtros aplicados
- Apenas contas com `includeInTotal !== false`
- Não considera contas arquivadas/ocultas

### Estados especiais

#### Conta zerada
- Barra de progresso vazia (0%)
- Cor neutra (cinza)
- Texto: "0% do total"

#### Todas as contas zeradas
Exibe estado vazio:
```
[Ícone carteira]
Nenhum saldo disponível no momento
[Botão: Adicionar conta]
```

#### Saldo negativo
- Valor em laranja escuro (`colors.danger`)
- Percentual calculado com valor absoluto

## 🔧 Uso

```tsx
import BalanceOverviewCard from '../components/home/BalanceOverviewCard';

<BalanceOverviewCard 
  accounts={accounts}
  totalBalance={totalAccountsBalance}
  username={userName}
  onAccountPress={handleAccountPress}
  onAddPress={navigateToConfigureAccounts}
  showGreeting={false}
/>
```

## 🎯 Diferenças do componente antigo (AccountsCard)

| Aspecto | Antigo | Novo |
|---------|--------|------|
| **Título** | "Onde está meu dinheiro" | "Seu dinheiro" |
| **Hierarquia** | Todas informações com peso igual | Total em destaque máximo |
| **Visualização** | Lista simples | Cards individuais com barras |
| **Estilo** | Relatório contábil | Dashboard fintech |
| **Microcopy** | "Saldo geral" | "Total disponível hoje" |
| **Cards de conta** | Linha simples com label "Saldo atual:" | Mini-card premium com barra visual |
| **Percentuais** | ❌ Não exibido | ✅ Percentual + barra visual |
| **Barra geral** | ❌ Não existe | ✅ Barra de distribuição total |

## ✅ Princípios de Design

1. **Menos bordas, mais espaço em branco**
2. **Texto mínimo, números grandes**
3. **Sem caps lock** (exceto labels discretos)
4. **Ícones discretos com background suave**
5. **Hierarquia clara através de tamanho e peso**
6. **Cores significativas** (verde = positivo, laranja = negativo)

## 🚀 Melhorias futuras

- [ ] Animação da barra ao aparecer
- [ ] Modo compacto (menos padding)
- [ ] Suporte a múltiplas moedas
- [ ] Gráfico de pizza opcional
- [ ] Filtro por tipo de conta
- [ ] Ordenação customizável

## 📝 Notas técnicas

- Componente memoizado com `React.memo`
- Usa hook `useAppTheme` para cores dinâmicas
- Compatível com modo claro/escuro
- Acessibilidade: Todos os Pressables com feedback visual
- Performance: Cálculos simples, sem loops complexos
