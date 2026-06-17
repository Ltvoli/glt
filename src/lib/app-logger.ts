import prisma from '@/lib/prisma'

type LogLevel = 'ERROR' | 'WARNING' | 'INFO'

interface LogOptions {
  level?: LogLevel
  source: string
  message: string
  details?: Record<string, unknown>
  userId?: string
}

/**
 * Enregistre une entrée dans les logs applicatifs (table AppLog).
 * Ne lève jamais d'exception pour ne pas casser le flux appelant.
 */
export async function logApp({
  level = 'ERROR',
  source,
  message,
  details,
  userId,
}: LogOptions): Promise<void> {
  try {
    await prisma.appLog.create({
      data: {
        level,
        source,
        message,
        details: details ?? undefined,
        userId: userId ?? undefined,
      },
    })
  } catch {
    // Silencieux — on ne veut pas créer une boucle d'erreurs
    console.error(`[AppLog] Impossible d'enregistrer le log: ${message}`)
  }
}

/**
 * Enregistre une erreur technique avec stack trace automatique.
 */
export async function logError(
  source: string,
  error: unknown,
  userId?: string
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error))
  await logApp({
    level: 'ERROR',
    source,
    message: err.message,
    details: { stack: err.stack },
    userId,
  })
}
