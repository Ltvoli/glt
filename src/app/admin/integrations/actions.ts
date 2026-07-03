'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/lib/auth-actions'
import { randomBytes, createHash, createHmac } from 'crypto'

async function requireAdministrateurSession() {
  const session = await getSession()
  if (!session?.userId) throw new Error('Non authentifié')
  if (session.dbRole !== 'ADMINISTRATEUR') {
    throw new Error('Accès refusé. Réservé aux administrateurs.')
  }
  return session
}

// ==========================================
// 1. API Keys Server Actions
// ==========================================

export async function createApiKeyAction(
  name: string,
  scopes: string[],
  expiresDays: number | null
): Promise<ActionResult<{ rawKey: string }>> {
  try {
    const session = await requireAdministrateurSession()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom de la clé est obligatoire' }
    }

    const trimmedName = name.trim()

    // Generate random API key: cdc_live_<48 chars hex>
    const randomHex = randomBytes(24).toString('hex')
    const rawKey = `cdc_live_${randomHex}`
    const keyPrefix = `cdc_live_${randomHex.substring(0, 6)}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    let expiresAt: Date | null = null
    if (expiresDays && expiresDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresDays)
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name: trimmedName,
        keyHash,
        keyPrefix,
        scopes,
        expiresAt,
        createdById: session.userId
      }
    })

    await logAudit(
      'CREATE_API_KEY',
      'ApiKey',
      apiKey.id,
      session.userId,
      { name: trimmedName, scopes, expiresAt }
    )

    revalidatePath('/admin/integrations')
    return { success: true, data: { rawKey } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdministrateurSession()

    const apiKey = await prisma.apiKey.findUnique({
      where: { id }
    })

    if (!apiKey) {
      return { success: false, error: 'Clé API introuvable' }
    }

    if (apiKey.revokedAt) {
      return { success: false, error: 'Clé déjà révoquée' }
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() }
    })

    await logAudit(
      'REVOKE_API_KEY',
      'ApiKey',
      id,
      session.userId,
      { before: { id: apiKey.id, name: apiKey.name }, after: { revokedAt: updated.revokedAt } }
    )

    revalidatePath('/admin/integrations')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// ==========================================
// 2. Webhooks Server Actions
// ==========================================

export async function createWebhookAction(
  name: string,
  url: string,
  events: string[]
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAdministrateurSession()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom est obligatoire' }
    }
    if (!url || !url.startsWith('https://')) {
      return { success: false, error: 'L\'URL doit commencer par https:// pour des raisons de sécurité' }
    }
    if (!events || events.length === 0) {
      return { success: false, error: 'Sélectionnez au moins un événement' }
    }

    const secret = `whsec_${randomBytes(24).toString('hex')}`

    const webhook = await prisma.webhook.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        events,
        secret,
        isActive: true
      }
    })

    await logAudit(
      'CREATE_WEBHOOK',
      'Webhook',
      webhook.id,
      session.userId,
      { name: webhook.name, url: webhook.url, events }
    )

    revalidatePath('/admin/integrations')
    return { success: true, data: { id: webhook.id } }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function updateWebhookAction(
  id: string,
  name: string,
  url: string,
  events: string[],
  isActive: boolean
): Promise<ActionResult> {
  try {
    const session = await requireAdministrateurSession()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom est obligatoire' }
    }
    if (!url || !url.startsWith('https://')) {
      return { success: false, error: 'L\'URL doit commencer par https:// pour des raisons de sécurité' }
    }
    if (!events || events.length === 0) {
      return { success: false, error: 'Sélectionnez au moins un événement' }
    }

    const oldWebhook = await prisma.webhook.findUnique({
      where: { id }
    })

    if (!oldWebhook) {
      return { success: false, error: 'Webhook introuvable' }
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        name: name.trim(),
        url: url.trim(),
        events,
        isActive
      }
    })

    await logAudit(
      'UPDATE_WEBHOOK',
      'Webhook',
      id,
      session.userId,
      { before: { name: oldWebhook.name, url: oldWebhook.url, events: oldWebhook.events, isActive: oldWebhook.isActive }, after: { name: updated.name, url: updated.url, events: updated.events, isActive: updated.isActive } }
    )

    revalidatePath('/admin/integrations')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdministrateurSession()

    const webhook = await prisma.webhook.findUnique({
      where: { id }
    })

    if (!webhook) {
      return { success: false, error: 'Webhook introuvable' }
    }

    await prisma.webhook.delete({
      where: { id }
    })

    await logAudit(
      'DELETE_WEBHOOK',
      'Webhook',
      id,
      session.userId,
      { webhook: { name: webhook.name, url: webhook.url } }
    )

    revalidatePath('/admin/integrations')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function testWebhookAction(id: string): Promise<ActionResult<{ status: number; body: string }>> {
  try {
    await requireAdministrateurSession()

    const webhook = await prisma.webhook.findUnique({
      where: { id }
    })

    if (!webhook) {
      return { success: false, error: 'Webhook introuvable' }
    }

    // Prepare ping payload
    const payload = {
      event: 'ping',
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        message: 'Test ping from BP-Lionel Tivoli',
        webhookId: webhook.id
      }
    }
    const payloadString = JSON.stringify(payload)

    // Compute signature using HMAC-SHA256
    const signature = createHmac('sha256', webhook.secret)
      .update(payloadString)
      .digest('hex')

    // Call endpoint with 8s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CDC-Webhook-Bot/1.0',
          'X-CDC-Signature': signature
        },
        body: payloadString,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Update lastCalledAt
      await prisma.webhook.update({
        where: { id },
        data: { lastCalledAt: new Date() }
      })

      const responseBody = await response.text()
      return {
        success: true,
        data: {
          status: response.status,
          body: responseBody.substring(0, 1000) // Truncate response if too long
        }
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      return {
        success: false,
        error: fetchErr.name === 'AbortError' 
          ? 'Temps d\'attente dépassé (timeout 8s)' 
          : `Erreur de connexion : ${fetchErr.message}`
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

// ==========================================
// 3. Audit Logs Server Actions
// ==========================================

export type AuditLogResult = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  userId: string | null
  userEmail: string
  userName: string
  details: any
  ip: string | null
  createdAt: Date
}

export async function getAuditLogsAction(
  page: number = 1,
  limit: number = 50,
  filters: { action?: string; entityType?: string; userId?: string } = {}
): Promise<ActionResult<{ logs: AuditLogResult[]; totalCount: number; pagesCount: number }>> {
  try {
    await requireAdministrateurSession()

    const where: any = {}
    if (filters.action) {
      where.action = filters.action
    }
    if (filters.entityType) {
      where.entity = filters.entityType
    }
    if (filters.userId) {
      where.userId = filters.userId
    }

    const skip = (page - 1) * limit

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    const mappedLogs: AuditLogResult[] = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entity,
      entityId: log.entityId,
      userId: log.userId,
      userEmail: log.user?.email || 'System / Inconnu',
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      details: log.details,
      ip: log.ip,
      createdAt: log.createdAt
    }))

    return {
      success: true,
      data: {
        logs: mappedLogs,
        totalCount,
        pagesCount: Math.ceil(totalCount / limit)
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function getAllAuditLogsForExportAction(
  filters: { action?: string; entityType?: string; userId?: string } = {}
): Promise<ActionResult<AuditLogResult[]>> {
  try {
    await requireAdministrateurSession()

    const where: any = {}
    if (filters.action) {
      where.action = filters.action
    }
    if (filters.entityType) {
      where.entity = filters.entityType
    }
    if (filters.userId) {
      where.userId = filters.userId
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mappedLogs: AuditLogResult[] = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entity,
      entityId: log.entityId,
      userId: log.userId,
      userEmail: log.user?.email || 'System / Inconnu',
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      details: log.details,
      ip: log.ip,
      createdAt: log.createdAt
    }))

    return {
      success: true,
      data: mappedLogs
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}
