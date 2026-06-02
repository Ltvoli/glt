/**
 * Service de logging standardisé pour la production.
 * Masque automatiquement les données sensibles avant affichage.
 */

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'cookie', 'session']

function sanitizeData(data: any): any {
  if (!data) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }

  const sanitized = { ...data }
  for (const key in sanitized) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key])
    } else if (key.toLowerCase() === 'email' && typeof sanitized[key] === 'string') {
      // Masquage partiel de l'email : a***@domain.com
      const parts = sanitized[key].split('@')
      if (parts.length === 2) {
        sanitized[key] = `${parts[0].charAt(0)}***@${parts[1]}`
      }
    }
  }
  return sanitized
}

function formatMessage(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString()
  const metaString = meta ? ` | ${JSON.stringify(sanitizeData(meta))}` : ''
  return `[${timestamp}] [${level}] ${message}${metaString}`
}

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(formatMessage('INFO', message, meta))
  },
  warn: (message: string, meta?: any) => {
    console.warn(formatMessage('WARN', message, meta))
  },
  error: (message: string, error?: any) => {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
      : error
    console.error(formatMessage('ERROR', message, errorDetails))
  }
}
