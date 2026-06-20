import prisma from './prisma'

export type FieldConfigMap = Record<string, { label: string; isVisible: boolean; order: number; section: string | null }>

const DEFAULT_CONTACTS_FIELDS = [
  { module: 'contacts', section: 'État civil', fieldKey: 'gender', defaultLabel: 'Genre', customLabel: null, isVisible: true, order: 0 },
  { module: 'contacts', section: 'État civil', fieldKey: 'firstName', defaultLabel: 'Prénom', customLabel: null, isVisible: true, order: 1 },
  { module: 'contacts', section: 'État civil', fieldKey: 'lastName', defaultLabel: 'Nom', customLabel: null, isVisible: true, order: 2 },
  { module: 'contacts', section: 'État civil', fieldKey: 'birthDate', defaultLabel: 'Date de naissance', customLabel: null, isVisible: true, order: 3 },
  { module: 'contacts', section: 'État civil', fieldKey: 'usageName', defaultLabel: 'Nom d\'usage', customLabel: null, isVisible: true, order: 4 },
  { module: 'contacts', section: 'État civil', fieldKey: 'nationality', defaultLabel: 'Nationalité', customLabel: null, isVisible: true, order: 5 },
  { module: 'contacts', section: 'État civil', fieldKey: 'profession', defaultLabel: 'Profession', customLabel: null, isVisible: true, order: 6 },
  { module: 'contacts', section: 'État civil', fieldKey: 'ageRange', defaultLabel: 'Tranches d\'âge', customLabel: null, isVisible: true, order: 7 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'building', defaultLabel: 'Bâtiment', customLabel: null, isVisible: true, order: 8 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'streetNumber', defaultLabel: 'Numéro', customLabel: null, isVisible: true, order: 9 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'streetName', defaultLabel: 'Rue / Voie', customLabel: null, isVisible: true, order: 10 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'postalCode', defaultLabel: 'Code postal', customLabel: null, isVisible: true, order: 11 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'city', defaultLabel: 'Ville', customLabel: null, isVisible: true, order: 12 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'buildingType', defaultLabel: 'Type de bâtiment', customLabel: null, isVisible: false, order: 13 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'floor', defaultLabel: 'Étage', customLabel: null, isVisible: false, order: 14 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'door', defaultLabel: 'Porte', customLabel: null, isVisible: false, order: 15 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'territory', defaultLabel: 'Territoire', customLabel: null, isVisible: true, order: 16 },
  { module: 'contacts', section: 'Adresse', fieldKey: 'department', defaultLabel: 'Département', customLabel: null, isVisible: true, order: 17 },
  { module: 'contacts', section: 'Profil', fieldKey: 'lastContactMobile', defaultLabel: 'Dernier contact via mobile', customLabel: null, isVisible: true, order: 18 },
]

const DEFAULT_TASKS_FIELDS = [
  { module: 'tasks', section: 'Informations', fieldKey: 'title', defaultLabel: 'Titre de la tâche', customLabel: null, isVisible: true, order: 0 },
  { module: 'tasks', section: 'Informations', fieldKey: 'description', defaultLabel: 'Description', customLabel: null, isVisible: true, order: 1 },
  { module: 'tasks', section: 'Informations', fieldKey: 'expectedDeliverable', defaultLabel: 'Livrable attendu', customLabel: null, isVisible: true, order: 2 },
  { module: 'tasks', section: 'Informations', fieldKey: 'tags', defaultLabel: 'Tags', customLabel: null, isVisible: true, order: 3 },
  { module: 'tasks', section: 'Planification', fieldKey: 'priority', defaultLabel: 'Priorité', customLabel: null, isVisible: true, order: 4 },
  { module: 'tasks', section: 'Planification', fieldKey: 'status', defaultLabel: 'Statut', customLabel: null, isVisible: true, order: 5 },
  { module: 'tasks', section: 'Planification', fieldKey: 'assigneeId', defaultLabel: 'Assigner à', customLabel: null, isVisible: true, order: 6 },
  { module: 'tasks', section: 'Planification', fieldKey: 'dueDate', defaultLabel: 'Échéance', customLabel: null, isVisible: true, order: 7 },
]

const DEFAULT_MAILS_FIELDS = [
  { module: 'mailcases', section: 'Informations', fieldKey: 'subject', defaultLabel: 'Sujet du courrier', customLabel: null, isVisible: true, order: 0 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'type', defaultLabel: 'Type', customLabel: null, isVisible: true, order: 1 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'channel', defaultLabel: 'Canal', customLabel: null, isVisible: true, order: 2 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'category', defaultLabel: 'Catégorie', customLabel: null, isVisible: true, order: 3 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'urgency', defaultLabel: 'Urgence', customLabel: null, isVisible: true, order: 4 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'content', defaultLabel: 'Contenu', customLabel: null, isVisible: true, order: 5 },
  { module: 'mailcases', section: 'Informations', fieldKey: 'notes', defaultLabel: 'Notes', customLabel: null, isVisible: true, order: 6 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'senderName', defaultLabel: 'Nom de l\'expéditeur', customLabel: null, isVisible: true, order: 7 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'recipientName', defaultLabel: 'Nom du destinataire', customLabel: null, isVisible: true, order: 8 },
  { module: 'mailcases', section: 'Expéditeur / Destinataire', fieldKey: 'city', defaultLabel: 'Ville', customLabel: null, isVisible: true, order: 9 },
  { module: 'mailcases', section: 'Planification', fieldKey: 'responseDueDate', defaultLabel: 'Échéance de réponse', customLabel: null, isVisible: true, order: 10 },
  { module: 'mailcases', section: 'Planification', fieldKey: 'assigneeId', defaultLabel: 'Assigner à', customLabel: null, isVisible: true, order: 11 },
]

const DEFAULT_QE_FIELDS = [
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'anNumber', defaultLabel: 'Numéro de question AN', customLabel: null, isVisible: true, order: 0 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'title', defaultLabel: 'Titre de la question', customLabel: null, isVisible: true, order: 1 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'type', defaultLabel: 'Type', customLabel: null, isVisible: true, order: 2 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'ministry', defaultLabel: 'Ministère ciblé', customLabel: null, isVisible: true, order: 3 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'theme', defaultLabel: 'Thème', customLabel: null, isVisible: true, order: 4 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'content', defaultLabel: 'Texte de la question', customLabel: null, isVisible: true, order: 5 },
  { module: 'writtenquestions', section: 'Informations', fieldKey: 'notes', defaultLabel: 'Notes internes', customLabel: null, isVisible: true, order: 6 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'author', defaultLabel: 'Auteur', customLabel: null, isVisible: false, order: 7 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'coSigners', defaultLabel: 'Co-signataires', customLabel: null, isVisible: false, order: 8 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'depositDate', defaultLabel: 'Date de dépôt', customLabel: null, isVisible: true, order: 9 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'responseDate', defaultLabel: 'Date de réponse', customLabel: null, isVisible: true, order: 10 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'concernedPerson', defaultLabel: 'Personne concernée', customLabel: null, isVisible: false, order: 11 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'followUpDueDate', defaultLabel: 'Échéance de relance', customLabel: null, isVisible: true, order: 12 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'responseContent', defaultLabel: 'Contenu de la réponse', customLabel: null, isVisible: true, order: 13 },
  { module: 'writtenquestions', section: 'Suivi', fieldKey: 'assigneeId', defaultLabel: 'Assigné à', customLabel: null, isVisible: true, order: 14 },
]

const DEFAULT_PERMANENCES_FIELDS = [
  { module: 'permanences', section: 'Général', fieldKey: 'title', defaultLabel: 'Titre de la permanence', customLabel: null, isVisible: true, order: 0 },
  { module: 'permanences', section: 'Général', fieldKey: 'status', defaultLabel: 'Statut', customLabel: null, isVisible: true, order: 1 },
  { module: 'permanences', section: 'Général', fieldKey: 'scheduledStartDate', defaultLabel: 'Date prévue', customLabel: null, isVisible: true, order: 2 },
  { module: 'permanences', section: 'Général', fieldKey: 'ownerUserId', defaultLabel: 'Responsable', customLabel: null, isVisible: true, order: 3 },
  { module: 'permanences', section: 'Général', fieldKey: 'notes', defaultLabel: 'Notes de préparation', customLabel: null, isVisible: true, order: 4 },
  { module: 'permanences', section: 'Général', fieldKey: 'deputyRemarks', defaultLabel: 'Remarques du député', customLabel: null, isVisible: true, order: 5 },
]

const DEFAULT_FIELDS_BY_MODULE: Record<string, any[]> = {
  contacts: DEFAULT_CONTACTS_FIELDS,
  tasks: DEFAULT_TASKS_FIELDS,
  mailcases: DEFAULT_MAILS_FIELDS,
  writtenquestions: DEFAULT_QE_FIELDS,
  permanences: DEFAULT_PERMANENCES_FIELDS,
}

export async function getModuleFields(moduleKey: string): Promise<FieldConfigMap> {
  const defaults = DEFAULT_FIELDS_BY_MODULE[moduleKey]
  let fields = await prisma.fieldConfig.findMany({
    where: { module: moduleKey },
    orderBy: { order: 'asc' }
  })

  // Seeding/Upserting missing fields automatically
  if (defaults && fields.length < defaults.length) {
    await prisma.$transaction(
      defaults.map(field => 
        prisma.fieldConfig.upsert({
          where: {
            module_fieldKey: { module: field.module, fieldKey: field.fieldKey }
          },
          update: {}, // preserve existing label & visibility changes
          create: {
            module: field.module,
            section: field.section,
            fieldKey: field.fieldKey,
            defaultLabel: field.defaultLabel,
            customLabel: field.customLabel,
            isVisible: field.isVisible,
            order: field.order
          }
        })
      )
    )

    fields = await prisma.fieldConfig.findMany({
      where: { module: moduleKey },
      orderBy: { order: 'asc' }
    })
  }

  const map: FieldConfigMap = {}
  for (const f of fields) {
    map[f.fieldKey] = {
      label: f.customLabel || f.defaultLabel,
      isVisible: f.isVisible,
      order: f.order,
      section: f.section
    }
  }
  
  return map
}
