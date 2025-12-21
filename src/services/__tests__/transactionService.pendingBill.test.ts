// ==========================================
// TESTES: Transações de Fatura Pendente
// ==========================================
// Verifica que transações de cartão com fatura pendente não impactam saldo realizado

import { Timestamp } from 'firebase/firestore';
import { Transaction } from '../../types/firebase';
import { getMonthTotals, getCarryOverBalance, getExpensesByCategory } from '../transactionService';
import { getPendingBillsMap } from '../creditCardBillService';

// Mock do Firestore
jest.mock('../firebase', () => ({
  db: {},
  COLLECTIONS: {
    TRANSACTIONS: 'transactions',
    ACCOUNTS: 'accounts',
    CATEGORIES: 'categories',
    CREDIT_CARDS: 'creditCards',
    CREDIT_CARD_BILLS: 'creditCardBills',
    GOALS: 'goals',
  },
}));

// Mock das funções do Firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2025-12-20'),
      toMillis: () => new Date('2025-12-20').getTime(),
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
    })),
  },
}));

const mockGetDocs = require('firebase/firestore').getDocs;

// Mock do creditCardBillService
jest.mock('../creditCardBillService', () => ({
  ...jest.requireActual('../creditCardBillService'),
  getPendingBillsMap: jest.fn(),
}));

const mockGetPendingBillsMap = getPendingBillsMap as jest.MockedFunction<typeof getPendingBillsMap>;

// Helper para criar transação mock
function createMockTransaction(
  id: string,
  type: 'expense' | 'income',
  amount: number,
  month: number,
  year: number,
  creditCardId?: string,
  categoryId?: string,
  categoryName?: string
): Transaction {
  return {
    id,
    userId: 'user-123',
    type,
    amount,
    description: `Transaction ${id}`,
    date: Timestamp.fromDate(new Date(year, month - 1, 15)),
    month,
    year,
    status: 'completed',
    recurrence: 'none',
    creditCardId,
    categoryId,
    categoryName,
    categoryIcon: 'cart',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Transaction;
}

describe('Transações de Cartão com Fatura Pendente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthTotals - Excluir transações de fatura pendente', () => {
    it('deve excluir transações de cartão quando a fatura está pendente', async () => {
      // Cenário: Dezembro/2025
      // - Compra no cartão: R$ 500 (fatura pendente - não deve contar no saldo)
      // - Despesa normal: R$ 100 (deve contar)
      // Total de despesas deve ser apenas R$ 100

      const transactions = [
        createMockTransaction('1', 'expense', 500, 12, 2025, 'card-1', 'cat-food', 'Alimentação'), // Cartão - fatura pendente
        createMockTransaction('2', 'expense', 100, 12, 2025, undefined, 'cat-transport', 'Transporte'), // Conta - deve contar
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      // Simular que card-1 tem fatura pendente em dez/2025
      const pendingBills = new Map([
        ['card-1-12-2025', true],
      ]);
      mockGetPendingBillsMap.mockResolvedValue(pendingBills);

      const result = await getMonthTotals('user-123', 12, 2025);

      // Apenas a despesa normal deve contar
      expect(result.expense).toBe(100);
      expect(result.income).toBe(0);
      expect(result.balance).toBe(-100);
    });

    it('deve incluir transações de cartão quando a fatura está paga', async () => {
      // Cenário: Dezembro/2025
      // - Compra no cartão: R$ 500 (fatura PAGA - deve contar no saldo)
      // - Despesa normal: R$ 100
      // Total de despesas: R$ 600

      const transactions = [
        createMockTransaction('1', 'expense', 500, 12, 2025, 'card-1', 'cat-food', 'Alimentação'), // Cartão - fatura paga
        createMockTransaction('2', 'expense', 100, 12, 2025, undefined, 'cat-transport', 'Transporte'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      // Nenhuma fatura pendente
      mockGetPendingBillsMap.mockResolvedValue(new Map());

      const result = await getMonthTotals('user-123', 12, 2025);

      // Ambas as despesas devem contar
      expect(result.expense).toBe(600);
      expect(result.income).toBe(0);
      expect(result.balance).toBe(-600);
    });

    it('deve processar múltiplos cartões com status diferentes', async () => {
      // Cenário:
      // - Cartão A: R$ 300 (fatura pendente - não conta)
      // - Cartão B: R$ 200 (fatura paga - conta)
      // - Despesa normal: R$ 150 (conta)
      // Total: R$ 350

      const transactions = [
        createMockTransaction('1', 'expense', 300, 12, 2025, 'card-a', 'cat-food', 'Alimentação'), // Pendente
        createMockTransaction('2', 'expense', 200, 12, 2025, 'card-b', 'cat-shopping', 'Compras'), // Paga
        createMockTransaction('3', 'expense', 150, 12, 2025, undefined, 'cat-transport', 'Transporte'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      // Apenas card-a tem fatura pendente
      const pendingBills = new Map([
        ['card-a-12-2025', true],
      ]);
      mockGetPendingBillsMap.mockResolvedValue(pendingBills);

      const result = await getMonthTotals('user-123', 12, 2025);

      expect(result.expense).toBe(350); // 200 (card-b) + 150 (normal)
    });

    it('deve incluir receitas normalmente e excluir apenas despesas de fatura pendente', async () => {
      const transactions = [
        createMockTransaction('1', 'income', 5000, 12, 2025), // Receita
        createMockTransaction('2', 'expense', 500, 12, 2025, 'card-1'), // Cartão pendente
        createMockTransaction('3', 'expense', 200, 12, 2025), // Despesa normal
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const pendingBills = new Map([
        ['card-1-12-2025', true],
      ]);
      mockGetPendingBillsMap.mockResolvedValue(pendingBills);

      const result = await getMonthTotals('user-123', 12, 2025);

      expect(result.income).toBe(5000);
      expect(result.expense).toBe(200); // Apenas despesa normal
      expect(result.balance).toBe(4800); // 5000 - 200
    });
  });

  describe('getCarryOverBalance - Histórico com faturas pendentes', () => {
    it('não deve incluir transações de fatura pendente no saldo histórico', async () => {
      // Novembro: Compra de R$ 800 no cartão (fatura pendente)
      // Despesa normal: R$ 200
      // Receita: R$ 5000
      // Saldo esperado: R$ 4800 (não conta os R$ 800 do cartão pendente)

      const transactions = [
        createMockTransaction('1', 'income', 5000, 11, 2025),
        createMockTransaction('2', 'expense', 800, 11, 2025, 'card-1', 'cat-shopping', 'Compras'), // Pendente
        createMockTransaction('3', 'expense', 200, 11, 2025, undefined, 'cat-utilities', 'Contas'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const pendingBills = new Map([
        ['card-1-11-2025', true],
      ]);
      mockGetPendingBillsMap.mockResolvedValue(pendingBills);

      const carryOver = await getCarryOverBalance('user-123', 12, 2025);

      expect(carryOver).toBe(4800); // 5000 - 200 (cartão pendente não conta)
    });

    it('deve recalcular corretamente ao pagar uma fatura', async () => {
      // Mês 1: Compra de R$ 500 (pendente)
      // Mês 2: Mesma compra agora tem fatura paga
      // O saldo histórico deve incluir a compra quando a fatura for paga

      const transactions = [
        createMockTransaction('1', 'income', 3000, 10, 2025),
        createMockTransaction('2', 'expense', 500, 10, 2025, 'card-1', 'cat-food', 'Alimentação'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      // Cenário 1: Fatura pendente
      mockGetPendingBillsMap.mockResolvedValue(new Map([
        ['card-1-10-2025', true],
      ]));

      const carryOverPending = await getCarryOverBalance('user-123', 11, 2025);
      expect(carryOverPending).toBe(3000); // Não conta a compra pendente

      // Cenário 2: Fatura paga
      jest.clearAllMocks();
      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });
      mockGetPendingBillsMap.mockResolvedValue(new Map()); // Sem pendências

      const carryOverPaid = await getCarryOverBalance('user-123', 11, 2025);
      expect(carryOverPaid).toBe(2500); // 3000 - 500 (agora conta a compra)
    });
  });

  describe('getExpensesByCategory - Faturas pendentes', () => {
    it('não deve incluir despesas de fatura pendente por categoria', async () => {
      const transactions = [
        createMockTransaction('1', 'expense', 200, 12, 2025, undefined, 'cat-food', 'Alimentação'), // Normal
        createMockTransaction('2', 'expense', 500, 12, 2025, 'card-1', 'cat-food', 'Alimentação'), // Pendente
        createMockTransaction('3', 'expense', 150, 12, 2025, undefined, 'cat-transport', 'Transporte'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const pendingBills = new Map([
        ['card-1-12-2025', true],
      ]);
      mockGetPendingBillsMap.mockResolvedValue(pendingBills);

      const result = await getExpensesByCategory('user-123', 12, 2025);

      expect(result.size).toBe(2);
      expect(result.get('cat-food')?.total).toBe(200); // Apenas despesa normal, não os R$ 500 pendentes
      expect(result.get('cat-transport')?.total).toBe(150);
    });

    it('deve incluir despesas de cartão com fatura paga', async () => {
      const transactions = [
        createMockTransaction('1', 'expense', 200, 12, 2025, undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('2', 'expense', 500, 12, 2025, 'card-1', 'cat-food', 'Alimentação'), // Paga
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      mockGetPendingBillsMap.mockResolvedValue(new Map()); // Sem pendências

      const result = await getExpensesByCategory('user-123', 12, 2025);

      expect(result.size).toBe(1);
      expect(result.get('cat-food')?.total).toBe(700); // 200 + 500
    });
  });

  describe('Cenário Completo: Ciclo de Fatura', () => {
    it('deve processar corretamente o ciclo: compra → fatura pendente → pagamento → fatura paga', async () => {
      // Novembro: Compra no cartão de R$ 800
      // Dezembro (antes do pagamento): Fatura pendente - não conta no saldo
      // Dezembro (após pagamento): Fatura paga - agora conta no saldo

      const novTransactions = [
        createMockTransaction('1', 'income', 5000, 11, 2025),
        createMockTransaction('2', 'expense', 800, 11, 2025, 'card-1', 'cat-shopping', 'Compras'),
        createMockTransaction('3', 'expense', 200, 11, 2025, undefined, 'cat-utilities', 'Contas'),
      ];

      // Cenário 1: Fatura de novembro ainda pendente em dezembro
      mockGetDocs.mockResolvedValue({
        docs: novTransactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      mockGetPendingBillsMap.mockResolvedValue(new Map([
        ['card-1-11-2025', true],
      ]));

      const carryOverPending = await getCarryOverBalance('user-123', 12, 2025);
      expect(carryOverPending).toBe(4800); // 5000 - 200 (compra de R$ 800 não conta)

      // Cenário 2: Fatura foi paga
      jest.clearAllMocks();
      mockGetDocs.mockResolvedValue({
        docs: novTransactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      mockGetPendingBillsMap.mockResolvedValue(new Map()); // Sem pendências

      const carryOverPaid = await getCarryOverBalance('user-123', 12, 2025);
      expect(carryOverPaid).toBe(4000); // 5000 - 800 - 200 (agora conta tudo)
    });
  });
});
