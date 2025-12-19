// ==========================================
// SERVIÇO DE METAS FINANCEIRAS
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
    where,
    Timestamp,
    orderBy,
    limit,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import {
    Goal,
    CreateGoalInput,
    UpdateGoalInput,
} from '../types/firebase';

const goalsRef = collection(db, COLLECTIONS.GOALS);

// Criar meta
export async function createGoal(
  userId: string,
  data: CreateGoalInput
): Promise<Goal> {
  // Desativar meta atual se existir
  await deactivateCurrentGoal(userId);

  const now = Timestamp.now();
  const inputData = data as any;

  // Montar objeto apenas com campos definidos (Firestore não aceita undefined)
  const goalData: Record<string, any> = {
    name: data.name,
    targetAmount: data.targetAmount,
    currentAmount: inputData.currentAmount ?? 0,
    timeframe: data.timeframe,
    isActive: data.isActive,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  // Adicionar campos opcionais apenas se definidos
  if (data.icon) goalData.icon = data.icon;
  if (data.color) goalData.color = data.color;
  if (data.targetDate) goalData.targetDate = data.targetDate;

  const docRef = await addDoc(goalsRef, goalData);

  const createdGoal: Goal = {
    id: docRef.id,
    userId,
    name: data.name,
    targetAmount: data.targetAmount,
    currentAmount: inputData.currentAmount ?? 0,
    timeframe: data.timeframe,
    isActive: true,
    icon: data.icon,
    color: data.color,
    createdAt: now,
    updatedAt: now,
  };

  return createdGoal;
}

// Buscar meta ativa do usuário
export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const q = query(
    goalsRef,
    where('userId', '==', userId),
    where('isActive', '==', true),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Goal;
}

// Buscar todas as metas do usuário (histórico)
export async function getAllGoals(userId: string): Promise<Goal[]> {
  const q = query(
    goalsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Goal[];
}

// Buscar meta por ID
export async function getGoalById(goalId: string): Promise<Goal | null> {
  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Goal;
}

// Atualizar meta
export async function updateGoal(
  goalId: string,
  data: UpdateGoalInput
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Atualizar progresso da meta (adicionar valor)
export async function addToGoalProgress(
  goalId: string,
  amount: number
): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal) throw new Error('Meta não encontrada');

  const newAmount = goal.currentAmount + amount;
  const isCompleted = newAmount >= goal.targetAmount;

  const updateData: any = {
    currentAmount: newAmount,
    updatedAt: Timestamp.now(),
  };

  if (isCompleted && !goal.completedAt) {
    updateData.completedAt = Timestamp.now();
  }

  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await updateDoc(docRef, updateData);
}

// Remover valor do progresso da meta (quando excluir transação de aporte)
export async function removeFromGoalProgress(
  goalId: string,
  amount: number
): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal) return; // Se a meta não existe mais, não faz nada

  const newAmount = Math.max(0, goal.currentAmount - amount);

  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await updateDoc(docRef, {
    currentAmount: newAmount,
    updatedAt: Timestamp.now(),
  });
}

// Definir progresso da meta (valor absoluto)
export async function setGoalProgress(
  goalId: string,
  amount: number
): Promise<void> {
  const goal = await getGoalById(goalId);
  if (!goal) throw new Error('Meta não encontrada');

  const isCompleted = amount >= goal.targetAmount;

  const updateData: any = {
    currentAmount: amount,
    updatedAt: Timestamp.now(),
  };

  if (isCompleted && !goal.completedAt) {
    updateData.completedAt = Timestamp.now();
  }

  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await updateDoc(docRef, updateData);
}

// Desativar meta atual (quando criar nova)
async function deactivateCurrentGoal(userId: string): Promise<void> {
  const currentGoal = await getActiveGoal(userId);
  if (currentGoal) {
    const docRef = doc(db, COLLECTIONS.GOALS, currentGoal.id);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  }
}

// Desativar meta manualmente
export async function deactivateGoal(goalId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await updateDoc(docRef, {
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

// Deletar meta
export async function deleteGoal(goalId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.GOALS, goalId);
  await deleteDoc(docRef);
}

// Calcular percentual de progresso
export function calculateGoalProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount === 0) return 0;
  return Math.min((currentAmount / targetAmount) * 100, 100);
}
