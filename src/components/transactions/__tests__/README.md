# Testes do AddTransactionModal

## 📋 Visão Geral

Este arquivo contém testes unitários para o componente `AddTransactionModal`, garantindo que as funcionalidades críticas funcionem corretamente e prevenindo regressões.

## 🎯 O que está sendo testado

### 1. **Bug Fix: Campo "Pago com"**
- ✅ Pré-preenchimento correto quando transação está em **conta**
- ✅ Pré-preenchimento correto quando transação está em **cartão**
- ✅ **CASO CRÍTICO**: Transação movida de conta para cartão mostra apenas cartão
- ✅ Transferências mostram conta origem e destino

### 2. **Formato de valores**
- ✅ Formatação correta de valores monetários (R$ 150,50, R$ 1.000,00, etc.)

### 3. **Tipos de transação**
- ✅ Mapeamento correto entre tipos locais e Firebase:
  - `despesa` ↔ `expense`
  - `receita` ↔ `income`
  - `transfer` ↔ `transfer`

### 4. **Validações de campos obrigatórios**
- ✅ Despesa e receita devem ter categoria
- ✅ Transferência deve ter conta destino diferente da origem
- ✅ Valor deve ser maior que zero

## 🚀 Como executar os testes

### Executar todos os testes
```bash
npm test
```

### Executar testes específicos
```bash
npm test -- AddTransactionModal.logic.test.ts
```

### Executar testes em modo watch (reexecuta ao salvar)
```bash
npm run test:watch
```

### Executar com cobertura de código
```bash
npm run test:coverage
```

## 📊 Resultado dos Testes

```
Test Suites: 1 passed
Tests:       11 passed
```

### Testes incluídos:
1. ✓ deve pré-preencher conta e limpar cartão quando transação está em conta
2. ✓ deve pré-preencher cartão e limpar conta quando transação está em cartão
3. ✓ CASO CRÍTICO: transação movida de conta para cartão deve mostrar apenas cartão
4. ✓ deve pré-preencher transferência com conta origem e destino
5. ✓ NÃO deve setar conta padrão quando useCreditCard está ativo
6. ✓ DEVE setar conta padrão quando useCreditCard está inativo e não há accountId
7. ✓ deve formatar valores corretamente para exibição
8. ✓ deve mapear tipos corretamente (local <-> Firebase)
9. ✓ despesa e receita devem ter categoria
10. ✓ transferência deve ter conta destino
11. ✓ valor deve ser maior que zero

## 🐛 Bug Corrigido

### Problema
Quando o usuário editava uma transação que foi movida de conta para cartão (ou que foi criada originalmente em um cartão), o campo "Pago com" ainda mostrava a conta original/padrão em vez do cartão correto.

**Causa raiz**: Havia dois problemas:
1. **Falta de limpeza explícita**: Ao pré-preencher campos de cartão, não estávamos limpando os campos de conta
2. **useEffect conflitante**: Havia um `useEffect` que definia uma conta padrão sempre que `!accountId`, mesmo quando a transação estava em um cartão

### Solução
1. **Limpeza explícita dos campos** (linhas 275-292):
   - Se `accountId` existe: limpa `creditCardId` e `creditCardName`
   - Se `creditCardId` existe: limpa `accountId` e `accountName`

2. **Correção do useEffect** (linha 219):
   - Adicionada verificação `!useCreditCard` antes de setar conta padrão
   - Agora só define conta padrão quando não está usando cartão

### Código da correção
```typescript
// CORREÇÃO 1: Limpeza explícita ao pré-preencher (linhas 275-292)
// Account or Credit Card - clear the other when one is set
if (editTransaction.accountId) {
  setAccountId(editTransaction.accountId);
  setAccountName(editTransaction.accountName || '');
  setUseCreditCard(false);
  // Clear credit card fields
  setCreditCardId('');
  setCreditCardName('');
} else if (editTransaction.creditCardId) {
  setUseCreditCard(true);
  setCreditCardId(editTransaction.creditCardId);
  setCreditCardName(editTransaction.creditCardName || '');
  // Clear account fields
  setAccountId('');
  setAccountName('');
}

// CORREÇÃO 2: useEffect não seta conta padrão quando usando cartão (linha 219)
useEffect(() => {
  if (activeAccounts.length > 0 && !accountId && !useCreditCard) {
    setAccountId(activeAccounts[0].id);
    setAccountName(activeAccounts[0].name);
    // ...
  }
}, [activeAccounts.length]);
```

## 🔄 Integração Contínua

Os testes devem ser executados:
- ✅ Antes de fazer commits importantes
- ✅ Antes de fazer push para o repositório
- ✅ Antes de fazer deploy em produção
- ✅ Sempre que modificar o AddTransactionModal

## 📝 Adicionando novos testes

Para adicionar novos testes:

1. Abra `AddTransactionModal.logic.test.ts`
2. Adicione um novo `describe` ou `it` block
3. Implemente a lógica do teste
4. Execute `npm test` para validar
5. Commit com a mensagem descritiva

Exemplo:
```typescript
it('deve validar novo comportamento', () => {
  // Arrange
  const data = { ... };
  
  // Act
  const result = someFunction(data);
  
  // Assert
  expect(result).toBe(expectedValue);
});
```

## 🎓 Benefícios dos testes

1. **Previne regressões**: Garante que bug fixes não sejam reintroduzidos
2. **Documentação viva**: Os testes documentam como o componente deve se comportar
3. **Confiança em refatorações**: Permite melhorar o código sem medo de quebrar
4. **Feedback rápido**: Detecta problemas em segundos, não em produção
5. **Qualidade do código**: Força pensar em casos extremos e validações

## 🔗 Arquivos relacionados

- `src/components/transactions/AddTransactionModal.tsx` - Componente principal
- `src/services/transactionService.ts` - Serviço de transações
- `jest.config.js` - Configuração do Jest
- `package.json` - Scripts de teste

---

**Última atualização**: 19 de dezembro de 2025
**Mantido por**: Equipe de desenvolvimento Cofrin
