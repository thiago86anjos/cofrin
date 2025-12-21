// ==========================================
// SERVIÇO DE CATEGORIAS
// ==========================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where, Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import {
    Category,
    CreateCategoryInput,
    UpdateCategoryInput,
    CategoryType,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
} from '../types/firebase';

const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);

// Criar categoria
export async function createCategory(
  userId: string,
  data: CreateCategoryInput
): Promise<Category> {
  const now = Timestamp.now();
  
  const docRef = await addDoc(categoriesRef, {
    ...data,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

// Buscar todas as categorias do usuário
export async function getCategories(userId: string): Promise<Category[]> {
  const q = query(
    categoriesRef,
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  const categories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
  
  // Ordenar no cliente
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Buscar categorias por tipo
export async function getCategoriesByType(
  userId: string,
  type: CategoryType
): Promise<Category[]> {
  const q = query(
    categoriesRef,
    where('userId', '==', userId),
    where('type', '==', type)
  );

  const snapshot = await getDocs(q);
  const categories = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Category[];
  
  // Ordenar no cliente
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Buscar categoria por ID
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  const snapshot = await getDoc(docRef);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Category;
}

// Atualizar categoria
export async function updateCategory(
  categoryId: string,
  data: UpdateCategoryInput
): Promise<void> {
  // Verificar se é a categoria protegida
  const category = await getCategoryById(categoryId);
  if (category?.isDefault && category.name === 'Renda') {
    throw new Error('A categoria Renda não pode ser editada pois é usada para cálculos de relatórios.');
  }
  
  // Proteger categoria Meta de edições
  if (category?.isMetaCategory || category?.name === 'Meta') {
    throw new Error('A categoria Meta não pode ser editada pois é usada pelo sistema para lançamentos de objetivos.');
  }
  
  const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Transferir todas as transações de uma categoria para outra
export async function transferTransactionsToCategory(
  userId: string,
  fromCategoryId: string,
  toCategoryId: string
): Promise<number> {
  const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
  
  // Buscar todas as transações da categoria de origem (incluir userId para validar permissões)
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    where('categoryId', '==', fromCategoryId)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return 0;
  
  // Buscar dados da categoria de destino
  const toCategory = await getCategoryById(toCategoryId);
  if (!toCategory) {
    throw new Error('Categoria de destino não encontrada');
  }
  
  // Atualizar todas as transações em batch
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((docSnapshot) => {
    const docRef = doc(db, COLLECTIONS.TRANSACTIONS, docSnapshot.id);
    batch.update(docRef, {
      categoryId: toCategoryId,
      categoryName: toCategory.name,
      categoryIcon: toCategory.icon,
      updatedAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
  return snapshot.size;
}

// Deletar categoria
export async function deleteCategory(categoryId: string): Promise<void> {
  // Verificar se é a categoria protegida
  const category = await getCategoryById(categoryId);
  
  if (!category) {
    throw new Error('Categoria não encontrada');
  }
  
  // Proteger categorias essenciais
  if (category.name === 'Renda' && category.type === 'income') {
    throw new Error('A categoria Renda não pode ser removida pois é essencial para o sistema.');
  }
  
  if (category.name === 'Outros') {
    throw new Error('A categoria Outros não pode ser removida pois é essencial para o sistema.');
  }
  
  if (category.isMetaCategory || category.name === 'Meta') {
    throw new Error('A categoria Meta não pode ser removida pois é usada para lançamentos de objetivos.');
  }
  
  const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  await deleteDoc(docRef);
}

// Criar categorias padrão para novo usuário
export async function createDefaultCategories(userId: string): Promise<void> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // Categorias de despesa
  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    const docRef = doc(categoriesRef);
    batch.set(docRef, {
      ...category,
      userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Categorias de receita
  for (const category of DEFAULT_INCOME_CATEGORIES) {
    const docRef = doc(categoriesRef);
    batch.set(docRef, {
      ...category,
      userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}

// Verificar se usuário já tem categorias
export async function userHasCategories(userId: string): Promise<boolean> {
  const q = query(
    categoriesRef,
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Buscar ou criar categoria de meta
export async function getOrCreateMetaCategory(userId: string): Promise<string> {
  // Buscar categoria de meta existente
  const q = query(
    categoriesRef,
    where('userId', '==', userId),
    where('isMetaCategory', '==', true)
  );
  
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  
  // Se não existe, criar
  const now = Timestamp.now();
  const docRef = await addDoc(categoriesRef, {
    name: 'Meta',
    icon: 'flag-checkered',
    type: 'expense',
    isDefault: true,
    isMetaCategory: true,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  
  return docRef.id;
}
