'use server'

import prisma from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function createContactList(
  name: string,
  description?: string,
  contactIds?: string[]
): Promise<{ success: boolean; error?: string; listId?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!name || !name.trim()) {
      return { success: false, error: 'Le nom de la liste est obligatoire.' }
    }

    const trimmedName = name.trim()

    // Check if name is already taken
    const existing = await prisma.contactList.findUnique({
      where: { name: trimmedName }
    })
    if (existing) {
      return { success: false, error: 'Une liste avec ce nom existe déjà.' }
    }

    // Create the list and optionally connect contacts
    const newList = await prisma.contactList.create({
      data: {
        name: trimmedName,
        description: description || null,
        contacts: contactIds && contactIds.length > 0 
          ? { connect: contactIds.map(id => ({ id })) }
          : undefined
      }
    })

    await logAudit(
      'CREATE_CONTACT_LIST',
      'ContactList',
      newList.id,
      session.userId,
      { name: trimmedName, description, memberCount: contactIds?.length || 0 }
    )

    revalidatePath('/contacts/lists')
    return { success: true, listId: newList.id }
  } catch (err: any) {
    console.error('Error creating contact list:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function addContactsToList(
  listId: string,
  contactIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!listId || !contactIds || contactIds.length === 0) {
      return { success: false, error: 'Paramètres manquants.' }
    }

    await prisma.contactList.update({
      where: { id: listId },
      data: {
        contacts: {
          connect: contactIds.map(id => ({ id }))
        }
      }
    })

    await logAudit(
      'ADD_CONTACTS_TO_LIST',
      'ContactList',
      listId,
      session.userId,
      { contactIds }
    )

    revalidatePath(`/contacts/lists/${listId}`)
    revalidatePath('/contacts/lists')
    return { success: true }
  } catch (err: any) {
    console.error('Error adding contacts to list:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function removeContactFromList(
  listId: string,
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!listId || !contactId) {
      return { success: false, error: 'Paramètres manquants.' }
    }

    await prisma.contactList.update({
      where: { id: listId },
      data: {
        contacts: {
          disconnect: { id: contactId }
        }
      }
    })

    await logAudit(
      'REMOVE_CONTACT_FROM_LIST',
      'ContactList',
      listId,
      session.userId,
      { contactId }
    )

    revalidatePath(`/contacts/lists/${listId}`)
    revalidatePath('/contacts/lists')
    return { success: true }
  } catch (err: any) {
    console.error('Error removing contact from list:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function deleteContactList(
  listId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!listId) {
      return { success: false, error: 'Identifiant de liste manquant.' }
    }

    const deletedList = await prisma.contactList.delete({
      where: { id: listId }
    })

    await logAudit(
      'DELETE_CONTACT_LIST',
      'ContactList',
      listId,
      session.userId,
      { name: deletedList.name }
    )

    revalidatePath('/contacts/lists')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleting contact list:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function updateContactList(
  listId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireWriteAccess()

    if (!listId || !name || !name.trim()) {
      return { success: false, error: 'Le nom de la liste est obligatoire.' }
    }

    const trimmedName = name.trim()

    // Check if name is taken by another list
    const existing = await prisma.contactList.findFirst({
      where: {
        name: trimmedName,
        id: { not: listId }
      }
    })
    if (existing) {
      return { success: false, error: 'Une autre liste porte déjà ce nom.' }
    }

    const updatedList = await prisma.contactList.update({
      where: { id: listId },
      data: {
        name: trimmedName,
        description: description || null
      }
    })

    await logAudit(
      'UPDATE_CONTACT_LIST',
      'ContactList',
      listId,
      session.userId,
      { name: trimmedName, description }
    )

    revalidatePath(`/contacts/lists/${listId}`)
    revalidatePath('/contacts/lists')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating contact list:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function getContactLists() {
  try {
    return await prisma.contactList.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    })
  } catch (err) {
    console.error('Error fetching contact lists:', err)
    return []
  }
}

async function resolveContactIds(ids: string[], filterParams: string, allFiltered: boolean): Promise<string[]> {
  if (!allFiltered) {
    return ids
  }

  const sp = new URLSearchParams(filterParams)
  const andClauses: any[] = []
  const whereClause: any = { archivedAt: null }

  const nameQ = sp.get('nameQ')
  if (nameQ) {
    for (const term of nameQ.split(',').filter(Boolean)) {
      andClauses.push({ OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName:  { contains: term, mode: 'insensitive' } },
      ]})
    }
  }
  const city = sp.get('city')
  if (city) {
    const cities = city.split(',').filter(Boolean)
    if (cities.length === 1) whereClause.city = { equals: cities[0], mode: 'insensitive' }
    else andClauses.push({ OR: cities.map(c => ({ city: { equals: c, mode: 'insensitive' } })) })
  }
  const q = sp.get('q')
  if (q) {
    andClauses.push({ OR: [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName:  { contains: q, mode: 'insensitive' } },
      { city:      { contains: q, mode: 'insensitive' } },
    ]})
  }
  if (andClauses.length > 0) whereClause.AND = andClauses

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    select: { id: true }
  })
  return contacts.map(c => c.id)
}

export async function createContactListBulk(
  name: string,
  description: string | undefined,
  ids: string[],
  filterParams: string,
  allFiltered: boolean
): Promise<{ success: boolean; error?: string; listId?: string }> {
  try {
    const contactIds = await resolveContactIds(ids, filterParams, allFiltered)
    return await createContactList(name, description, contactIds)
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function addContactsToListBulk(
  listId: string,
  ids: string[],
  filterParams: string,
  allFiltered: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const contactIds = await resolveContactIds(ids, filterParams, allFiltered)
    return await addContactsToList(listId, contactIds)
  } catch (err: any) {
    return { success: false, error: err.message || 'Erreur interne' }
  }
}

export async function syncListToBrevo(listId: string, brevoListId: number): Promise<{ success: boolean; error?: string; syncedCount?: number }> {
  const { syncContactToBrevo } = await import('@/lib/brevo')
  try {
    const session = await requireWriteAccess()
    
    const list = await prisma.contactList.findUnique({
      where: { id: listId },
      include: {
        contacts: {
          where: { archivedAt: null }
        }
      }
    })

    if (!list) return { success: false, error: 'Liste introuvable.' }
    if (list.contacts.length === 0) return { success: false, error: 'La liste est vide.' }

    let count = 0
    for (const contact of list.contacts) {
      if (contact.email) {
        const res = await syncContactToBrevo(contact.id, [brevoListId])
        if (res.success) count++
      }
    }

    await logAudit(
      'SYNC_LIST_TO_BREVO',
      'ContactList',
      listId,
      session.userId,
      { brevoListId, count }
    )

    revalidatePath(`/contacts/lists/${listId}`)
    return { success: true, syncedCount: count }
  } catch (err: any) {
    console.error('Error syncing list to Brevo:', err)
    return { success: false, error: err.message || 'Erreur interne' }
  }
}
