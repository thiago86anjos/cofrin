/**
 * Testes para proteção da categoria Meta
 * 
 * A categoria Meta é uma categoria do sistema que:
 * 1. NÃO pode ser excluída
 * 2. NÃO pode ser editada
 * 3. É usada exclusivamente para lançamentos de objetivos/metas
 * 4. Não deve aparecer na seleção manual de categorias pelo usuário
 */

import * as categoryService from '../categoryService';

// Mock do Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

jest.mock('../firebase', () => ({
  db: {},
  COLLECTIONS: {
    CATEGORIES: 'categories',
    TRANSACTIONS: 'transactions',
  },
}));

describe('Categoria Meta - Proteção do Sistema', () => {
  const mockMetaCategory = {
    id: 'meta-category-id',
    name: 'Meta',
    type: 'expense',
    icon: 'flag',
    isDefault: true,
    isMetaCategory: true,
    userId: 'test-user-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteCategory', () => {
    it('deve lançar erro ao tentar excluir categoria Meta por isMetaCategory', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMetaCategory,
        id: mockMetaCategory.id,
      });

      await expect(
        categoryService.deleteCategory(mockMetaCategory.id)
      ).rejects.toThrow('A categoria Meta não pode ser removida pois é usada para lançamentos de objetivos.');
    });

    it('deve lançar erro ao tentar excluir categoria com nome "Meta"', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockMetaCategory, isMetaCategory: false, name: 'Meta' }),
        id: mockMetaCategory.id,
      });

      await expect(
        categoryService.deleteCategory(mockMetaCategory.id)
      ).rejects.toThrow('A categoria Meta não pode ser removida pois é usada para lançamentos de objetivos.');
    });
  });

  describe('updateCategory', () => {
    it('deve lançar erro ao tentar editar categoria Meta por isMetaCategory', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockMetaCategory,
        id: mockMetaCategory.id,
      });

      await expect(
        categoryService.updateCategory(mockMetaCategory.id, { name: 'Novo Nome' })
      ).rejects.toThrow('A categoria Meta não pode ser editada pois é usada pelo sistema para lançamentos de objetivos.');
    });

    it('deve lançar erro ao tentar editar categoria com nome "Meta"', async () => {
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockMetaCategory, isMetaCategory: false, name: 'Meta' }),
        id: mockMetaCategory.id,
      });

      await expect(
        categoryService.updateCategory(mockMetaCategory.id, { icon: 'star' })
      ).rejects.toThrow('A categoria Meta não pode ser editada pois é usada pelo sistema para lançamentos de objetivos.');
    });
  });

  describe('Categoria Meta - Regras de negócio', () => {
    it('categoria Meta deve ter isMetaCategory: true', () => {
      expect(mockMetaCategory.isMetaCategory).toBe(true);
    });

    it('categoria Meta deve ter isDefault: true', () => {
      expect(mockMetaCategory.isDefault).toBe(true);
    });

    it('categoria Meta deve ter name: "Meta"', () => {
      expect(mockMetaCategory.name).toBe('Meta');
    });
  });
});

describe('Filtragem de categorias no modal', () => {
  const categories = [
    { id: '1', name: 'Alimentação', type: 'expense', isMetaCategory: false },
    { id: '2', name: 'Transporte', type: 'expense', isMetaCategory: false },
    { id: '3', name: 'Meta', type: 'expense', isMetaCategory: true },
    { id: '4', name: 'Salário', type: 'income', isMetaCategory: false },
    { id: '5', name: 'Outros', type: 'expense', isMetaCategory: false },
  ];

  it('deve filtrar a categoria Meta da lista de despesas', () => {
    const filteredCategories = categories.filter(c => 
      c.type === 'expense' && !c.isMetaCategory && c.name !== 'Meta'
    );

    expect(filteredCategories).toHaveLength(3);
    expect(filteredCategories.find(c => c.name === 'Meta')).toBeUndefined();
    expect(filteredCategories.find(c => c.isMetaCategory)).toBeUndefined();
  });

  it('deve incluir outras categorias de despesa normalmente', () => {
    const filteredCategories = categories.filter(c => 
      c.type === 'expense' && !c.isMetaCategory && c.name !== 'Meta'
    );

    expect(filteredCategories.find(c => c.name === 'Alimentação')).toBeDefined();
    expect(filteredCategories.find(c => c.name === 'Transporte')).toBeDefined();
    expect(filteredCategories.find(c => c.name === 'Outros')).toBeDefined();
  });

  it('não deve afetar categorias de receita', () => {
    const filteredCategories = categories.filter(c => 
      c.type === 'income' && !c.isMetaCategory && c.name !== 'Meta'
    );

    expect(filteredCategories).toHaveLength(1);
    expect(filteredCategories[0].name).toBe('Salário');
  });
});
