import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where,
    limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeText } from '../utils/normalizeText';

type SuggestionPatternDoc = {
  categoryId?: string;
  accountId?: string;
  creditCardId?: string;
  paymentMethod?: 'account' | 'creditCard';
  count?: number;
  lastUsedAt?: unknown;
};

const inMemoryCache = new Map<string, SuggestionPatternDoc | null>();

const getCacheKey = (userId: string, normalizedDescription: string) =>
  `${userId}::${normalizedDescription}`;

const getPatternDocRef = (userId: string, normalizedDescription: string) =>
  doc(db, 'user_suggestions', userId, 'patterns', normalizedDescription);

const getPatternsColRef = (userId: string) =>
  collection(db, 'user_suggestions', userId, 'patterns');

export async function learnSuggestionPattern(params: {
  userId: string;
  description: string;
  categoryId: string;
  accountId?: string;
  creditCardId?: string;
  paymentMethod?: 'account' | 'creditCard';
}): Promise<void> {
  const normalizedDescription = normalizeText(params.description);
  if (!params.userId || !params.categoryId) return;
  if (normalizedDescription.length < 3) return;

  const ref = getPatternDocRef(params.userId, normalizedDescription);

  await setDoc(
    ref,
    {
      normalizedDescription,
      categoryId: params.categoryId,
      accountId: params.accountId || null,
      creditCardId: params.creditCardId || null,
      paymentMethod: params.paymentMethod || null,
      count: increment(1),
      lastUsedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const cacheKey = getCacheKey(params.userId, normalizedDescription);
  const cached = inMemoryCache.get(cacheKey);
  const previousCount = typeof cached?.count === 'number' ? cached.count : 0;
  inMemoryCache.set(cacheKey, {
    categoryId: params.categoryId,
    accountId: params.accountId || null,
    creditCardId: params.creditCardId || null,
    paymentMethod: params.paymentMethod || null,
    count: previousCount + 1,
    lastUsedAt: new Date().toISOString(),
  });
}

export async function getSuggestionForNormalizedDescription(params: {
  userId: string;
  normalizedDescription: string;
}): Promise<
  | {
      categoryId: string;
      count: number;
      accountId?: string | null;
      creditCardId?: string | null;
      paymentMethod?: 'account' | 'creditCard' | null;
    }
  | null
> {
  const normalizedDescription = params.normalizedDescription;
  if (!params.userId) return null;
  if (!normalizedDescription || normalizedDescription.length < 3) return null;

  const cacheKey = getCacheKey(params.userId, normalizedDescription);
  if (inMemoryCache.has(cacheKey)) {
    const cached = inMemoryCache.get(cacheKey);
    if (!cached?.categoryId || typeof cached?.count !== 'number') return null;
    if (cached.count < 1) return null;
    return {
      categoryId: cached.categoryId,
      count: cached.count,
      accountId: cached.accountId ?? null,
      creditCardId: cached.creditCardId ?? null,
      paymentMethod: cached.paymentMethod ?? null,
    };
  }

  // 1) Exact match (fast path)
  const ref = getPatternDocRef(params.userId, normalizedDescription);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as SuggestionPatternDoc;
    inMemoryCache.set(cacheKey, data);
    if (!data?.categoryId || typeof data.count !== 'number') return null;
    if (data.count < 1) return null;
    return {
      categoryId: data.categoryId,
      count: data.count,
      accountId: data.accountId ?? null,
      creditCardId: data.creditCardId ?? null,
      paymentMethod: data.paymentMethod ?? null,
    };
  }

  // 2) Prefix match (e.g. "merc" -> "mercado pago")
  // We query by a stored field because Firestore doesn't support prefix queries on doc IDs.
  const patternsRef = getPatternsColRef(params.userId);
  const end = `${normalizedDescription}\uf8ff`;
  const q = query(
    patternsRef,
    where('normalizedDescription', '>=', normalizedDescription),
    where('normalizedDescription', '<', end),
    orderBy('normalizedDescription'),
    limit(25)
  );

  const result = await getDocs(q);
  let best:
    | {
        categoryId: string;
        count: number;
        accountId?: string | null;
        creditCardId?: string | null;
        paymentMethod?: 'account' | 'creditCard' | null;
      }
    | null = null;

  for (const docSnap of result.docs) {
    const data = docSnap.data() as SuggestionPatternDoc & { normalizedDescription?: string };
    if (!data?.categoryId || typeof data.count !== 'number') continue;
    if (data.count < 1) continue;

    if (!best || data.count > best.count) {
      best = {
        categoryId: data.categoryId,
        count: data.count,
        accountId: data.accountId ?? null,
        creditCardId: data.creditCardId ?? null,
        paymentMethod: data.paymentMethod ?? null,
      };
    }
  }

  if (best) {
    inMemoryCache.set(cacheKey, {
      categoryId: best.categoryId,
      count: best.count,
      accountId: best.accountId ?? null,
      creditCardId: best.creditCardId ?? null,
      paymentMethod: best.paymentMethod ?? null,
    });
    return best;
  }

  inMemoryCache.set(cacheKey, null);
  return null;
}

export async function getSuggestionForDescription(params: {
  userId: string;
  description: string;
}): Promise<{ categoryId: string; count: number; normalizedDescription: string } | null> {
  const normalizedDescription = normalizeText(params.description);
  const suggestion = await getSuggestionForNormalizedDescription({
    userId: params.userId,
    normalizedDescription,
  });

  if (!suggestion) return null;
  return { ...suggestion, normalizedDescription };
}
