// ==========================================
// TESTES: Pagamento de Fatura de Cartão
// ==========================================
// Verifica que pagamentos de fatura não são contados duas vezes no saldo

import { Timestamp } from 'firebase/firestore';
import { Transaction } from '../../types/firebase';
import { getMonthTotals, getCarryOverBalance, getExpensesByCategory } from '../transactionService';

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

// Helper para criar transação mock
function createMockTransaction(
  id: string,
  type: 'expense' | 'income' | 'transfer',
  amount: number,
  month: number,
  year: number,
  status: 'completed' | 'pending' | 'cancelled' = 'completed',
  creditCardBillId?: string,
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
    status,
    recurrence: 'none',
    creditCardBillId,
    categoryId,
    categoryName,
    categoryIcon: 'cart',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Transaction;
}

describe('Pagamento de Fatura de Cartão - Saldo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthTotals', () => {
    it('deve excluir pagamento de fatura do cálculo de despesas do mês', async () => {
      // Cenário: Dezembro/2025
      // - Compra no cartão: R$ 500 (compra real, registrada no cartão)
      // - Pagamento da fatura: R$ 500 (transferência interna, não deve contar como despesa)
      // - Despesa normal: R$ 100 (conta bancária)
      // Total de despesas deve ser apenas R$ 100

      const transactions = [
        createMockTransaction('1', 'expense', 500, 12, 2025, 'completed', undefined, 'cat-food', 'Alimentação'), // Compra no cartão
        createMockTransaction('2', 'expense', 500, 12, 2025, 'completed', 'bill-123'), // Pagamento de fatura (deve ser ignorado)
        createMockTransaction('3', 'expense', 100, 12, 2025, 'completed', undefined, 'cat-transport', 'Transporte'), // Despesa normal
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const result = await getMonthTotals('user-123', 12, 2025);

      // Apenas as compras reais devem contar (R$ 500 no cartão + R$ 100 normal = R$ 600)
      expect(result.expense).toBe(600);
      expect(result.income).toBe(0);
      expect(result.balance).toBe(-600);
    });

    it('deve contar apenas receitas e despesas reais, excluindo pagamentos de fatura', async () => {
      // Cenário: Novembro/2025
      // - Receita: R$ 5000
      // - Compra no cartão: R$ 800
      // - Despesa normal: R$ 200
      // - Pagamento de fatura (mês anterior): R$ 600 (deve ser ignorado)
      // - Pagamento de fatura (mês atual): R$ 800 (deve ser ignorado)

      const transactions = [
        createMockTransaction('1', 'income', 5000, 11, 2025, 'completed'), // Receita
        createMockTransaction('2', 'expense', 800, 11, 2025, 'completed', undefined, 'cat-shopping', 'Compras'), // Compra no cartão
        createMockTransaction('3', 'expense', 200, 11, 2025, 'completed', undefined, 'cat-utilities', 'Contas'), // Despesa normal
        createMockTransaction('4', 'expense', 600, 11, 2025, 'completed', 'bill-oct'), // Pagamento fatura outubro (ignorar)
        createMockTransaction('5', 'expense', 800, 11, 2025, 'completed', 'bill-nov'), // Pagamento fatura novembro (ignorar)
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const result = await getMonthTotals('user-123', 11, 2025);

      expect(result.income).toBe(5000);
      expect(result.expense).toBe(1000); // R$ 800 + R$ 200 (pagamentos de fatura ignorados)
      expect(result.balance).toBe(4000);
    });

    it('deve ignorar pagamentos de fatura com status pending ou cancelled', async () => {
      const transactions = [
        createMockTransaction('1', 'expense', 500, 12, 2025, 'completed', 'bill-1'), // Ignorado (é pagamento de fatura)
        createMockTransaction('2', 'expense', 300, 12, 2025, 'pending', 'bill-2'), // Ignorado (pending)
        createMockTransaction('3', 'expense', 200, 12, 2025, 'cancelled', 'bill-3'), // Ignorado (cancelled)
        createMockTransaction('4', 'expense', 100, 12, 2025, 'completed', undefined, 'cat-food', 'Alimentação'), // Conta
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const result = await getMonthTotals('user-123', 12, 2025);

      expect(result.expense).toBe(100); // Apenas a despesa normal
    });
  });

  describe('getCarryOverBalance - Pagamento em Mês Anterior', () => {
    it('não deve reprocessar pagamento de fatura de mês anterior', async () => {
      // Cenário: Calculando saldo acumulado até Dezembro/2025
      // Novembro/2025:
      // - Receita: R$ 5000
      // - Compra no cartão: R$ 800
      // - Despesa normal: R$ 200
      // - Pagamento da fatura: R$ 800 (deve ser ignorado para evitar duplicação)
      // Saldo acumulado esperado: R$ 5000 - R$ 800 - R$ 200 = R$ 4000

      const transactions = [
        createMockTransaction('1', 'income', 5000, 11, 2025, 'completed'), // Receita novembro
        createMockTransaction('2', 'expense', 800, 11, 2025, 'completed', undefined, 'cat-shopping', 'Compras'), // Compra no cartão nov
        createMockTransaction('3', 'expense', 200, 11, 2025, 'completed', undefined, 'cat-utilities', 'Contas'), // Despesa normal nov
        createMockTransaction('4', 'expense', 800, 11, 2025, 'completed', 'bill-nov'), // Pagamento fatura (ignorar)
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const carryOver = await getCarryOverBalance('user-123', 12, 2025);

      // Saldo acumulado = R$ 5000 - R$ 800 - R$ 200 = R$ 4000
      // O pagamento de R$ 800 não deve ser contado
      expect(carryOver).toBe(4000);
    });

    it('deve calcular corretamente saldo histórico com múltiplos pagamentos de fatura', async () => {
      // Cenário: Histórico de 3 meses (Set, Out, Nov 2025)
      // Cada mês: Receita R$ 3000, Compras cartão R$ 500, Pagamento fatura R$ 500
      // Saldo esperado: (3000 - 500) * 3 = R$ 7500

      const transactions = [
        // Setembro
        createMockTransaction('1', 'income', 3000, 9, 2025, 'completed'),
        createMockTransaction('2', 'expense', 500, 9, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('3', 'expense', 500, 9, 2025, 'completed', 'bill-sep'),
        // Outubro
        createMockTransaction('4', 'income', 3000, 10, 2025, 'completed'),
        createMockTransaction('5', 'expense', 500, 10, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('6', 'expense', 500, 10, 2025, 'completed', 'bill-oct'),
        // Novembro
        createMockTransaction('7', 'income', 3000, 11, 2025, 'completed'),
        createMockTransaction('8', 'expense', 500, 11, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('9', 'expense', 500, 11, 2025, 'completed', 'bill-nov'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const carryOver = await getCarryOverBalance('user-123', 12, 2025);

      // (3000 - 500) * 3 meses = 7500
      expect(carryOver).toBe(7500);
    });

    it('deve ser idempotente ao recalcular meses passados', async () => {
      // Testa que recalcular o mesmo período múltiplas vezes dá o mesmo resultado
      const transactions = [
        createMockTransaction('1', 'income', 2000, 10, 2025, 'completed'),
        createMockTransaction('2', 'expense', 300, 10, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('3', 'expense', 300, 10, 2025, 'completed', 'bill-oct'), // Pagamento (ignorar)
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      // Calcular múltiplas vezes
      const result1 = await getCarryOverBalance('user-123', 11, 2025);
      const result2 = await getCarryOverBalance('user-123', 11, 2025);
      const result3 = await getCarryOverBalance('user-123', 11, 2025);

      expect(result1).toBe(1700); // 2000 - 300
      expect(result2).toBe(result1);
      expect(result3).toBe(result1);
    });
  });

  describe('getExpensesByCategory', () => {
    it('não deve incluir pagamentos de fatura nas despesas por categoria', async () => {
      // Pagamento de fatura não é uma categoria de despesa real
      // As compras reais já foram categorizadas quando feitas no cartão

      const transactions = [
        createMockTransaction('1', 'expense', 200, 12, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('2', 'expense', 150, 12, 2025, 'completed', undefined, 'cat-transport', 'Transporte'),
        createMockTransaction('3', 'expense', 500, 12, 2025, 'completed', 'bill-123', 'bill-payment', 'Pagamento de Fatura'), // Ignorar
        createMockTransaction('4', 'expense', 100, 12, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const result = await getExpensesByCategory('user-123', 12, 2025);

      // Deve ter apenas 2 categorias (Alimentação e Transporte)
      expect(result.size).toBe(2);
      expect(result.get('cat-food')?.total).toBe(300); // 200 + 100
      expect(result.get('cat-transport')?.total).toBe(150);
      expect(result.has('bill-payment')).toBe(false); // Pagamento de fatura não deve aparecer
    });

    it('deve contar despesas de cartão de crédito por categoria, mas não o pagamento', async () => {
      const transactions = [
        // Compras no cartão (devem contar)
        createMockTransaction('1', 'expense', 300, 12, 2025, 'completed', undefined, 'cat-restaurant', 'Restaurante'),
        createMockTransaction('2', 'expense', 200, 12, 2025, 'completed', undefined, 'cat-shopping', 'Compras'),
        // Pagamento da fatura (não deve contar)
        createMockTransaction('3', 'expense', 500, 12, 2025, 'completed', 'bill-123'),
      ];

      mockGetDocs.mockResolvedValue({
        docs: transactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const result = await getExpensesByCategory('user-123', 12, 2025);

      expect(result.size).toBe(2);
      expect(result.get('cat-restaurant')?.total).toBe(300);
      expect(result.get('cat-shopping')?.total).toBe(200);
    });
  });

  describe('Cenário Completo: Ciclo de Vida do Cartão', () => {
    it('deve processar corretamente um ciclo completo de compras e pagamento', async () => {
      // Novembro: Compras no cartão
      // Dezembro: Pagamento da fatura de novembro + novas compras
      
      const allTransactions = [
        // Novembro - Compras no cartão
        createMockTransaction('1', 'income', 5000, 11, 2025, 'completed'),
        createMockTransaction('2', 'expense', 200, 11, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('3', 'expense', 150, 11, 2025, 'completed', undefined, 'cat-transport', 'Transporte'),
        createMockTransaction('4', 'expense', 100, 11, 2025, 'completed', undefined, 'cat-utilities', 'Contas'),
        
        // Dezembro - Pagamento da fatura de novembro + novas compras
        createMockTransaction('5', 'income', 5000, 12, 2025, 'completed'),
        createMockTransaction('6', 'expense', 450, 12, 2025, 'completed', 'bill-nov'), // Pagamento fatura nov (ignorar)
        createMockTransaction('7', 'expense', 300, 12, 2025, 'completed', undefined, 'cat-food', 'Alimentação'),
        createMockTransaction('8', 'expense', 250, 12, 2025, 'completed', undefined, 'cat-shopping', 'Compras'),
      ];

      // Testar totais de novembro
      mockGetDocs.mockResolvedValue({
        docs: allTransactions
          .filter(t => t.month === 11)
          .map(t => ({
            id: t.id,
            data: () => t,
          })),
      });

      const novemberTotals = await getMonthTotals('user-123', 11, 2025);
      expect(novemberTotals.income).toBe(5000);
      expect(novemberTotals.expense).toBe(450); // 200 + 150 + 100
      expect(novemberTotals.balance).toBe(4550);

      // Testar totais de dezembro
      mockGetDocs.mockResolvedValue({
        docs: allTransactions
          .filter(t => t.month === 12)
          .map(t => ({
            id: t.id,
            data: () => t,
          })),
      });

      const decemberTotals = await getMonthTotals('user-123', 12, 2025);
      expect(decemberTotals.income).toBe(5000);
      expect(decemberTotals.expense).toBe(550); // 300 + 250 (pagamento de R$ 450 ignorado)
      expect(decemberTotals.balance).toBe(4450);

      // Testar saldo acumulado até dezembro (novembro)
      mockGetDocs.mockResolvedValue({
        docs: allTransactions.map(t => ({
          id: t.id,
          data: () => t,
        })),
      });

      const carryOver = await getCarryOverBalance('user-123', 12, 2025);
      expect(carryOver).toBe(4550); // Saldo de novembro
    });
  });
});
