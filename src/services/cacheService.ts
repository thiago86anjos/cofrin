// ==========================================
// SERVIÇO DE CACHE
// Gerencia caches compartilhados entre services
// ==========================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

// Cache para saldo acumulado (carryOver) - chave: `${userId}-${month}-${year}`
export const carryOverCache = new Map<string, CacheEntry<number>>();

// Cache para saldo acumulado por conta - chave: `${userId}-${accountId}-${month}-${year}`
export const accountCarryOverCache = new Map<string, CacheEntry<number>>();

// Tempo de expiração do cache (5 minutos)
export const CACHE_TTL = 5 * 60 * 1000;

/**
 * Limpa completamente os caches de saldo acumulado.
 * Deve ser chamado quando houver alterações que afetam o cálculo de saldo
 * (ex: visibilidade de conta, saldo inicial, etc.)
 */
export function clearCarryOverCache(): void {
  carryOverCache.clear();
  accountCarryOverCache.clear();
}

/**
 * Invalida entradas específicas do cache (para uso interno do transactionService)
 */
export function invalidateCachePartial(userId?: string, accountId?: string): void {
  if (!userId) {
    carryOverCache.clear();
    accountCarryOverCache.clear();
    return;
  }

  // Remove entradas do cache geral para este usuário
  for (const key of carryOverCache.keys()) {
    if (key.startsWith(`${userId}-`)) {
      carryOverCache.delete(key);
    }
  }

  // Remove entradas do cache por conta
  if (accountId) {
    for (const key of accountCarryOverCache.keys()) {
      if (key.startsWith(`${userId}-${accountId}-`)) {
        accountCarryOverCache.delete(key);
      }
    }
  } else {
    for (const key of accountCarryOverCache.keys()) {
      if (key.startsWith(`${userId}-`)) {
        accountCarryOverCache.delete(key);
      }
    }
  }
}
