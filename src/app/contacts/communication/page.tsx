import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { buildWhereClause } from '@/lib/contacts-filter'
import CommunicationClient from './communication-client'

export default async function CommunicationComposerPage({
  searchParams
}: {
  searchParams: Promise<{
    listId?: string
    ids?: string
    all?: string
    filterParams?: string
  }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const params = await searchParams

  let contacts: any[] = []
  let listName: string | undefined

  if (params.listId) {
    const list = await prisma.contactList.findUnique({
      where: { id: params.listId },
      include: {
        contacts: {
          where: { archivedAt: null }
        }
      }
    })
    if (list) {
      contacts = list.contacts
      listName = list.name
    }
  } else if (params.ids) {
    const idsList = params.ids.split(',').filter(Boolean)
    contacts = await prisma.contact.findMany({
      where: {
        id: { in: idsList },
        archivedAt: null
      }
    })
  } else if (params.all === 'true' && params.filterParams) {
    const filterParamsObj = Object.fromEntries(new URLSearchParams(params.filterParams).entries())
    const where = buildWhereClause(filterParamsObj)
    contacts = await prisma.contact.findMany({
      where
    })
  }

  const totalTarget = contacts.length
  const hasEmailCount = contacts.filter(c => c.email && c.email.trim() !== '').length
  const hasPhoneCount = contacts.filter(c => c.mobilePhone && c.mobilePhone.trim() !== '').length

  const firstContact = contacts.length > 0 ? {
    firstName: contacts[0].firstName,
    lastName: contacts[0].lastName,
    city: contacts[0].city,
    email: contacts[0].email,
    mobilePhone: contacts[0].mobilePhone,
    phone: contacts[0].phone
  } : null

  return (
    <CommunicationClient
      totalTarget={totalTarget}
      hasEmailCount={hasEmailCount}
      hasPhoneCount={hasPhoneCount}
      firstContact={firstContact}
      listName={listName}
      listId={params.listId}
      ids={params.ids}
      all={params.all}
      filterParams={params.filterParams}
    />
  )
}
