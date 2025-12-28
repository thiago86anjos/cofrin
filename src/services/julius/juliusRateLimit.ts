/**
 * Julius Rate Limiter
 * Controla limite de mensagens por usuário por dia
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
} from 'firebase/firestore';
import { db } from '../firebase';

// Configurações
const DAILY_LIMIT = 20;
const UNLIMITED_EMAILS = ['thiago.w3c@gmail.com'];
const COLLECTION = 'julius_usage';

interface UsageData {
  count: number;
  date: string; // formato YYYY-MM-DD
  lastUsed: Date;
}

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Verifica se o email tem acesso ilimitado
 */
export function isUnlimitedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return UNLIMITED_EMAILS.includes(email.toLowerCase());
}

/**
 * Verifica se o usuário pode enviar mensagem
 * Retorna { allowed: boolean, remaining: number, limit: number }
 */
export async function checkRateLimit(
  userId: string,
  userEmail: string | null | undefined
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  // Usuários ilimitados sempre podem
  if (isUnlimitedUser(userEmail)) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  const today = getTodayString();
  const docRef = doc(db, COLLECTION, userId);

  try {
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Primeiro uso do usuário
      return { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
    }

    const data = docSnap.data() as UsageData;

    // Se é um novo dia, reseta o contador
    if (data.date !== today) {
      return { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
    }

    // Verifica se ainda tem mensagens disponíveis
    const remaining = Math.max(0, DAILY_LIMIT - data.count);
    return {
      allowed: remaining > 0,
      remaining,
      limit: DAILY_LIMIT,
    };
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error);
    // Em caso de erro, permite (melhor UX)
    return { allowed: true, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
  }
}

/**
 * Registra uso de uma mensagem
 */
export async function recordUsage(
  userId: string,
  userEmail: string | null | undefined
): Promise<void> {
  // Não registra para usuários ilimitados
  if (isUnlimitedUser(userEmail)) {
    return;
  }

  const today = getTodayString();
  const docRef = doc(db, COLLECTION, userId);

  try {
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Primeiro uso
      await setDoc(docRef, {
        count: 1,
        date: today,
        lastUsed: new Date(),
      });
    } else {
      const data = docSnap.data() as UsageData;

      if (data.date !== today) {
        // Novo dia, reseta contador
        await setDoc(docRef, {
          count: 1,
          date: today,
          lastUsed: new Date(),
        });
      } else {
        // Mesmo dia, incrementa
        await updateDoc(docRef, {
          count: increment(1),
          lastUsed: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Erro ao registrar uso:', error);
    // Não bloqueia o usuário por erro de registro
  }
}

/**
 * Retorna mensagem amigável quando limite é atingido
 */
export function getLimitReachedMessage(remaining: number): string {
  if (remaining <= 0) {
    return `😅 Eita! Você já usou suas ${DAILY_LIMIT} mensagens de hoje!\n\n` +
      `O Julius precisa descansar (e economizar tokens, né? 💰).\n\n` +
      `Volta amanhã que eu te ajudo! Enquanto isso, dá uma olhada nos seus gastos pelo app. 📊`;
  }
  return '';
}

/**
 * Retorna aviso quando está perto do limite
 */
export function getLowLimitWarning(remaining: number): string {
  if (remaining <= 3 && remaining > 0) {
    return `\n\n⚠️ _Você ainda tem ${remaining} mensagem(ns) hoje._`;
  }
  return '';
}
