'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { PermanenceStatus, TaskStatus, CallStatus, ContactRole, SettingType } from '@prisma/client'

export type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

// ----------------------------------------------------
// HELPER: VERIFY USER SESSION & ROLE PERMISSION
// ----------------------------------------------------
async function checkPermission(permissionKey: string) {
  const session = await getSession()
  if (!session || !session.userId) {
    return { success: false, error: 'Non authentifié' }
  }

  // SUPERADMIN bypass
  if (session.role === 'SUPERADMIN') {
    return { success: true, userId: session.userId, role: session.role }
  }

  // Check role permission in DB
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || !user.isActive) {
    return { success: false, error: 'Compte inactif ou inexistant' }
  }

  const hasPerm = await prisma.rolePermission.findFirst({
    where: {
      role: user.role,
      permission: { key: permissionKey }
    }
  })

  if (!hasPerm) {
    return { success: false, error: `Permission requise: ${permissionKey}` }
  }

  return { success: true, userId: session.userId, role: user.role }
}

// ----------------------------------------------------
// SCORE COMPUTATION
// ----------------------------------------------------
export async function computePermanenceScore(permanenceId: string): Promise<number> {
  const tasks = await prisma.permanenceTask.findMany({
    where: { permanenceId }
  })

  const sections = ['communication', 'phoning', 'courrier', 'commercants', 'institutionnel', 'logistique']
  let totalScore = 0

  for (const section of sections) {
    const sectionTasks = tasks.filter(t => t.section === section)
    if (sectionTasks.length === 0) {
      totalScore += 100 / 6
    } else {
      const doneTasks = sectionTasks.filter(t => t.status === 'DONE').length
      totalScore += (doneTasks / sectionTasks.length) * 100 / 6
    }
  }

  const roundedScore = Math.min(100, Math.max(0, Math.round(totalScore)))

  await prisma.mobilePermanence.update({
    where: { id: permanenceId },
    data: { score: roundedScore }
  })

  return roundedScore
}

// Helper to auto-transition DRAFT to IN_PROGRESS when a task is updated
async function autoTransitionToInProgress(permanenceId: string, userId: string) {
  const perm = await prisma.mobilePermanence.findUnique({
    where: { id: permanenceId }
  })

  if (perm && perm.status === 'DRAFT') {
    await prisma.mobilePermanence.update({
      where: { id: permanenceId },
      data: { status: 'IN_PROGRESS' }
    })
    await logAudit('status_change', 'MobilePermanence', permanenceId, userId, {
      from: 'DRAFT',
      to: 'IN_PROGRESS',
      comment: 'Transition automatique suite à la mise à jour d\'une tâche.'
    })
  }
}

// ----------------------------------------------------
// PERMANENCE CRUD ACTIONS
// ----------------------------------------------------
export async function createPermanence(prevState: any, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const auth = await checkPermission('permanences.create')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    const title = formData.get('title') as string
    const scheduledStartDateStr = formData.get('scheduledStartDate') as string
    const notes = formData.get('notes') as string
    const communeId = formData.get('communeId') as string
    const communeNameFree = formData.get('communeNameFree') as string
    const address = formData.get('address') as string
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string

    if (!title || !scheduledStartDateStr) {
      return { success: false, error: 'Le titre et la date de début sont requis.' }
    }

    const scheduledStartDate = new Date(scheduledStartDateStr)

    // Find commune if selected
    let finalCommuneName = communeNameFree || ''
    if (communeId) {
      const c = await prisma.commune.findUnique({ where: { id: communeId } })
      if (c) finalCommuneName = c.name
    }

    const perm = await prisma.mobilePermanence.create({
      data: {
        title,
        scheduledStartDate,
        notes,
        status: 'DRAFT',
        ownerUserId: auth.userId,
      }
    })

    // Generate location
    await prisma.permanenceLocation.create({
      data: {
        permanenceId: perm.id,
        communeId: communeId || null,
        communeName: finalCommuneName,
        date: scheduledStartDate,
        startTime: startTime || null,
        endTime: endTime || null,
        address: address || null,
        parkingStatus: 'TODO',
        order: 0
      }
    })

    // Generate default tasks template
    const defaultTasks = [
      { section: 'communication', label: 'Envoyer email aux élus', required: true, order: 0 },
      { section: 'communication', label: 'Post réseaux sociaux', required: true, order: 1 },
      { section: 'phoning', label: 'Valider liste contacts', required: true, order: 0 },
      { section: 'phoning', label: 'Lancer les appels', required: true, order: 1 },
      { section: 'courrier', label: 'Identifier contacts sans email', required: true, order: 0 },
      { section: 'courrier', label: 'Envoyer courrier postal', required: true, order: 1 },
      { section: 'commercants', label: 'Identifier commerces à visiter', required: true, order: 0 },
      { section: 'commercants', label: 'Valider programme visite', required: true, order: 1 },
      { section: 'institutionnel', label: 'Contacter mairies concernées', required: true, order: 0 },
      { section: 'institutionnel', label: 'Envoyer convocations presse', required: true, order: 1 },
      { section: 'logistique', label: 'Réserver parking', required: true, order: 0 },
      { section: 'logistique', label: 'Préparer le matériel', required: true, order: 1 },
      { section: 'logistique', label: 'Confirmation accès lieux', required: true, order: 2 },
    ]

    for (const t of defaultTasks) {
      await prisma.permanenceTask.create({
        data: {
          permanenceId: perm.id,
          section: t.section,
          label: t.label,
          required: t.required,
          order: t.order,
          status: 'TODO'
        }
      })
    }

    await logAudit('permanence.create', 'MobilePermanence', perm.id, auth.userId, { title, scheduledStartDate })
    revalidatePath('/permanences')
    return { success: true, data: { id: perm.id } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de la création.' }
  }
}

export async function updatePermanence(id: string, data: { title: string; scheduledStartDate: Date; notes?: string }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.mobilePermanence.update({
      where: { id },
      data: {
        title: data.title,
        scheduledStartDate: data.scheduledStartDate,
        notes: data.notes
      }
    })

    await logAudit('permanence.update', 'MobilePermanence', id, auth.userId, data)
    revalidatePath(`/permanences/${id}`)
    revalidatePath('/permanences')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de la mise à jour.' }
  }
}

export async function deletePermanence(id: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.delete')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.mobilePermanence.update({
      where: { id },
      data: { archivedAt: new Date() }
    })

    await logAudit('permanence.archive', 'MobilePermanence', id, auth.userId)
    revalidatePath('/permanences')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de l\'archivage.' }
  }
}

// ----------------------------------------------------
// WORKFLOW / STATUS TRANSITIONS
// ----------------------------------------------------
export async function transitionPermanenceStatus(id: string, newStatus: PermanenceStatus, comment?: string): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session || !session.userId) return { success: false, error: 'Non authentifié' }

    // Retrieve current status & required tasks check
    const perm = await prisma.mobilePermanence.findUnique({
      where: { id },
      include: { tasks: true }
    })
    if (!perm) return { success: false, error: 'Permanence introuvable' }

    // RBAC validation depending on target status
    if (newStatus === 'VALIDATED' || newStatus === 'TO_CORRECT') {
      const auth = await checkPermission('permanences.validate')
      if (!auth.success) return { success: false, error: 'Seul le député ou super-admin peut valider/renvoyer.' }
    } else if (newStatus === 'ARCHIVED') {
      if (session.role !== 'SUPERADMIN' && session.role !== 'ADMIN') {
        return { success: false, error: 'Accès restreint aux administrateurs.' }
      }
    } else {
      const auth = await checkPermission('permanences.update')
      if (!auth.success) return { success: false, error: auth.error }
    }

    // Validation rules
    if (newStatus === 'READY') {
      // Must be score >= 80% AND no uncompleted required tasks
      if (perm.score < 80) {
        return { success: false, error: 'Le score doit être d\'au moins 80% pour soumettre.' }
      }
      const uncompletedRequired = perm.tasks.filter(t => t.required && t.status !== 'DONE')
      if (uncompletedRequired.length > 0) {
        return { success: false, error: 'Toutes les tâches obligatoires doivent être complétées.' }
      }
    }

    if (newStatus === 'TO_CORRECT' && !comment?.trim()) {
      return { success: false, error: 'Un commentaire est obligatoire pour renvoyer à correction.' }
    }

    // Update status
    await prisma.mobilePermanence.update({
      where: { id },
      data: {
        status: newStatus,
        validationUserId: (newStatus === 'VALIDATED' || newStatus === 'TO_CORRECT') ? session.userId : undefined,
        validationComment: comment || null
      }
    })

    await logAudit('permanence.status_change', 'MobilePermanence', id, session.userId, {
      from: perm.status,
      to: newStatus,
      comment
    })

    revalidatePath(`/permanences/${id}`)
    revalidatePath('/permanences')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de transition.' }
  }
}

// ----------------------------------------------------
// PERMANENCE LOCATIONS / COMMUNES
// ----------------------------------------------------
export async function addLocation(permanenceId: string, data: { communeId?: string; communeName: string; date: Date; startTime?: string; endTime?: string; address?: string }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceLocation.create({
      data: {
        permanenceId,
        communeId: data.communeId || null,
        communeName: data.communeName,
        date: data.date,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        address: data.address || null,
        parkingStatus: 'TODO',
        order: 0
      }
    })

    await autoTransitionToInProgress(permanenceId, auth.userId)
    revalidatePath(`/permanences/${permanenceId}/locations`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur d\'ajout du lieu.' }
  }
}

export async function deleteLocation(permanenceId: string, locationId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceLocation.delete({
      where: { id: locationId }
    })

    revalidatePath(`/permanences/${permanenceId}/locations`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de suppression du lieu.' }
  }
}

export async function updateParkingStatus(permanenceId: string, locationId: string, status: TaskStatus): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceLocation.update({
      where: { id: locationId },
      data: { parkingStatus: status }
    })

    revalidatePath(`/permanences/${permanenceId}/locations`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de mise à jour.' }
  }
}

// ----------------------------------------------------
// PERMANENCE TASKS ACTIONS
// ----------------------------------------------------
export async function addTask(permanenceId: string, section: string, label: string, required: boolean, assigneeUserId?: string, dueDateStr?: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceTask.create({
      data: {
        permanenceId,
        section,
        label,
        required,
        assigneeUserId: assigneeUserId || null,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        status: 'TODO'
      }
    })

    await computePermanenceScore(permanenceId)
    await autoTransitionToInProgress(permanenceId, auth.userId)

    revalidatePath(`/permanences/${permanenceId}`)
    revalidatePath(`/permanences/${permanenceId}/${section}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur d\'ajout de tâche.' }
  }
}

export async function updateTask(permanenceId: string, taskId: string, data: { status?: TaskStatus; assigneeUserId?: string | null; comment?: string | null; label?: string }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    const task = await prisma.permanenceTask.findUnique({ where: { id: taskId } })
    if (!task) return { success: false, error: 'Tâche introuvable.' }

    await prisma.permanenceTask.update({
      where: { id: taskId },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        assigneeUserId: data.assigneeUserId !== undefined ? data.assigneeUserId : undefined,
        comment: data.comment !== undefined ? data.comment : undefined,
        label: data.label !== undefined ? data.label : undefined
      }
    })

    await computePermanenceScore(permanenceId)
    await autoTransitionToInProgress(permanenceId, auth.userId)

    await logAudit('task.update', 'PermanenceTask', taskId, auth.userId, { 
      section: task.section, 
      label: task.label, 
      status: data.status 
    })

    revalidatePath(`/permanences/${permanenceId}`)
    revalidatePath(`/permanences/${permanenceId}/${task.section}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de mise à jour.' }
  }
}

export async function deleteTask(permanenceId: string, taskId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    const task = await prisma.permanenceTask.findUnique({ where: { id: taskId } })
    if (!task) return { success: false, error: 'Tâche introuvable.' }

    await prisma.permanenceTask.delete({
      where: { id: taskId }
    })

    await computePermanenceScore(permanenceId)

    revalidatePath(`/permanences/${permanenceId}`)
    revalidatePath(`/permanences/${permanenceId}/${task.section}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de suppression.' }
  }
}

// ----------------------------------------------------
// PHONING ACTIONS
// ----------------------------------------------------
export async function addContactToPhoning(permanenceId: string, contactId: string, role: ContactRole = 'PHONING'): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    // Check if already added
    const existing = await prisma.permanenceContact.findFirst({
      where: { permanenceId, contactId }
    })
    if (existing) return { success: false, error: 'Ce contact est déjà dans la liste.' }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) return { success: false, error: 'Contact CRM introuvable.' }

    await prisma.permanenceContact.create({
      data: {
        permanenceId,
        contactId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.mobilePhone || contact.phone,
        email: contact.email,
        city: contact.city,
        role,
        callStatus: 'NOT_CALLED'
      }
    })

    await logAudit('contact.added', 'PermanenceContact', contactId, auth.userId, { permanenceId })
    await autoTransitionToInProgress(permanenceId, auth.userId)

    revalidatePath(`/permanences/${permanenceId}/phoning`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de l\'ajout.' }
  }
}

export async function importPhoningContactsAction(permanenceId: string, contacts: any[]): Promise<ActionResult<{ count: number; duplicates: number }>> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    let count = 0
    let duplicates = 0

    for (const c of contacts) {
      // Find duplicate in CRM
      let contactId: string | null = null
      if (c.email) {
        const d = await prisma.contact.findFirst({ where: { email: c.email, archivedAt: null } })
        if (d) {
          contactId = d.id
          duplicates++
        }
      }
      if (!contactId && c.phone) {
        const d = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: c.phone },
              { mobilePhone: c.phone }
            ],
            archivedAt: null
          }
        })
        if (d) {
          contactId = d.id
          duplicates++
        }
      }

      await prisma.permanenceContact.create({
        data: {
          permanenceId,
          contactId: contactId || undefined,
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          phone: c.phone || null,
          email: c.email || null,
          city: c.city || null,
          role: c.role || 'PHONING',
          callStatus: 'NOT_CALLED'
        }
      })
      count++
    }

    await logAudit('phoning.import', 'MobilePermanence', permanenceId, auth.userId, { count, duplicates })
    await autoTransitionToInProgress(permanenceId, auth.userId)

    revalidatePath(`/permanences/${permanenceId}/phoning`)
    return { success: true, data: { count, duplicates } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de l\'import.' }
  }
}

export async function updateCallStatusAction(permanenceId: string, permanenceContactId: string, data: { callStatus: CallStatus; requestSummary?: string; requiresDeputyAttention?: boolean }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceContact.update({
      where: { id: permanenceContactId },
      data: {
        callStatus: data.callStatus,
        requestSummary: data.requestSummary !== undefined ? data.requestSummary : undefined,
        requiresDeputyAttention: data.requiresDeputyAttention !== undefined ? data.requiresDeputyAttention : undefined
      }
    })

    revalidatePath(`/permanences/${permanenceId}/phoning`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

export async function deletePhoningContact(permanenceId: string, pcId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceContact.delete({
      where: { id: pcId }
    })

    revalidatePath(`/permanences/${permanenceId}/phoning`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

// ----------------------------------------------------
// COMMERCANTS ACTIONS
// ----------------------------------------------------
export async function addOrganizationToMerchant(permanenceId: string, orgId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    const existing = await prisma.permanenceOrganization.findFirst({
      where: { permanenceId, organizationId: orgId }
    })
    if (existing) return { success: false, error: 'Cette organisation est déjà ajoutée.' }

    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) return { success: false, error: 'Organisation introuvable.' }

    await prisma.permanenceOrganization.create({
      data: {
        permanenceId,
        organizationId: orgId,
        orgName: org.name,
        type: org.type,
        sector: org.sector
      }
    })

    await autoTransitionToInProgress(permanenceId, auth.userId)
    revalidatePath(`/permanences/${permanenceId}/commercants`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

export async function createQuickOrganization(permanenceId: string, name: string, sector?: string, notes?: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    const org = await prisma.organization.create({
      data: {
        name,
        type: 'COMMERCE',
        sector: sector || 'Commerce',
        notes
      }
    })

    await prisma.permanenceOrganization.create({
      data: {
        permanenceId,
        organizationId: org.id,
        orgName: org.name,
        type: org.type,
        sector: org.sector
      }
    })

    await autoTransitionToInProgress(permanenceId, auth.userId)
    revalidatePath(`/permanences/${permanenceId}/commercants`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

export async function updateMerchantAttitudeAction(permanenceId: string, permOrgId: string, data: { attitude?: string; concern?: string; visitRecommended?: boolean; visited?: boolean }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceOrganization.update({
      where: { id: permOrgId },
      data: {
        attitude: data.attitude !== undefined ? data.attitude : undefined,
        concern: data.concern !== undefined ? data.concern : undefined,
        visitRecommended: data.visitRecommended !== undefined ? data.visitRecommended : undefined,
        visited: data.visited !== undefined ? data.visited : undefined
      }
    })

    revalidatePath(`/permanences/${permanenceId}/commercants`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

export async function deleteMerchantOrganization(permanenceId: string, poId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceOrganization.delete({
      where: { id: poId }
    })

    revalidatePath(`/permanences/${permanenceId}/commercants`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur.' }
  }
}

// ----------------------------------------------------
// SYNTHESIS & SIGNATURE ACTIONS
// ----------------------------------------------------
export async function saveSynthesisAction(permanenceId: string, data: { attentionPoints?: string; merchantProgram?: string; phoningTopics?: string; recommendations?: string }): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.update')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    await prisma.permanenceSynthesis.upsert({
      where: { permanenceId },
      update: data,
      create: {
        permanenceId,
        ...data
      }
    })

    revalidatePath(`/permanences/${permanenceId}/synthese`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de sauvegarde de la synthèse.' }
  }
}

export async function signSynthesisAction(permanenceId: string): Promise<ActionResult> {
  try {
    // Requires validate permission (the deputy)
    const auth = await checkPermission('permanences.validate')
    if (!auth.success || !auth.userId) return { success: false, error: 'Seul le député ou super-admin peut signer la synthèse.' }

    await prisma.permanenceSynthesis.update({
      where: { permanenceId },
      data: {
        signedByUserId: auth.userId,
        signedAt: new Date()
      }
    })

    await logAudit('synthesis.sign', 'MobilePermanence', permanenceId, auth.userId)
    revalidatePath(`/permanences/${permanenceId}/synthese`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur de signature.' }
  }
}

// ----------------------------------------------------
// RGPD COMPLIANCE ANONYMIZATION
// ----------------------------------------------------
export async function anonymizePermanenceContacts(permanenceId: string): Promise<ActionResult> {
  try {
    const auth = await checkPermission('permanences.delete')
    if (!auth.success || !auth.userId) return { success: false, error: auth.error }

    // Anonymize contacts phoning not linked to CRM
    await prisma.permanenceContact.updateMany({
      where: {
        permanenceId,
        contactId: null // non lié à la fiche CRM
      },
      data: {
        firstName: 'Anonyme',
        lastName: 'Anonymisé (RGPD)',
        phone: null,
        email: null,
        requestSummary: 'Anonymisé suite à la rétention légale.'
      }
    })

    await logAudit('permanence.anonymize', 'MobilePermanence', permanenceId, auth.userId)
    revalidatePath(`/permanences/${permanenceId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur lors de l\'anonymisation.' }
  }
}
