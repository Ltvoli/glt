// src/lib/rate-limit.ts

type RateLimitRecord = {
  count: number
  firstAttemptAt: number
}

// Stockage en mémoire (idéal pour un serveur Next.js unique)
const limits = new Map<string, RateLimitRecord>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now()
  const record = limits.get(ip)

  if (!record) {
    // Premier échec
    limits.set(ip, { count: 1, firstAttemptAt: now })
    return { allowed: true }
  }

  // Vérifier si la fenêtre de temps est expirée
  if (now - record.firstAttemptAt > WINDOW_MS) {
    // Réinitialiser
    limits.set(ip, { count: 1, firstAttemptAt: now })
    return { allowed: true }
  }

  // Incrémenter le compteur
  record.count += 1
  limits.set(ip, record)

  if (record.count > MAX_ATTEMPTS) {
    const remainingMs = WINDOW_MS - (now - record.firstAttemptAt)
    return { allowed: false, remainingMs }
  }

  return { allowed: true }
}

export function resetRateLimit(ip: string) {
  limits.delete(ip)
}
