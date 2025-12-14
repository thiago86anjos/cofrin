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
  const docRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Deletar categoria
export async function deleteCategory(categoryId: string): Promise<void> {
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
