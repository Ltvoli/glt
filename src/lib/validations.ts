import { z } from 'zod'

// Helper for optional strings from FormData that might be empty ("") or null
export const emptyAsUndefined = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '') || val === null ? undefined : val,
  z.string().trim().optional()
)

export const optionalEmail = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '') || val === null ? undefined : val,
  z.string().trim().email("Le format de l'adresse e-mail est invalide.").optional()
)

export const optionalPhone = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '') || val === null ? undefined : val,
  z.string().trim().regex(/^[\d\s\+\-\(\)]+$/, "Le numéro de téléphone ne doit contenir que des chiffres et des symboles autorisés (+, -, espaces).").optional()
)

// Schéma pour les contacts
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom de famille est obligatoire."),
  usageName: emptyAsUndefined,
  email: optionalEmail,
  phone: optionalPhone,
  mobilePhone: optionalPhone,
  type: z.string().min(1, "Le type de contact est obligatoire."),
  city: emptyAsUndefined,
  gender: emptyAsUndefined,
  birthDate: z.preprocess(
    (val) => {
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return undefined;
      return new Date(val as any);
    },
    z.date().optional()
  ),
  nationality: emptyAsUndefined,
  address: emptyAsUndefined,
  apartment: emptyAsUndefined,
  building: emptyAsUndefined,
  buildingType: emptyAsUndefined,
  floor: emptyAsUndefined,
  door: emptyAsUndefined,
  streetNumber: emptyAsUndefined,
  streetName: emptyAsUndefined,
  addressComplement: emptyAsUndefined,
  postalCode: z.string().trim().refine(val => val === '' || /^\d{5}$/.test(val), {
    message: "Le code postal doit contenir exactement 5 chiffres."
  }).transform(val => val === '' ? undefined : val),
  supportLevel: emptyAsUndefined,
  whatsappStatus: emptyAsUndefined,
  linkedinUrl: emptyAsUndefined,
  notes: emptyAsUndefined,
  isNpai: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional().default(false)),
  profession: emptyAsUndefined,
  ageRange: emptyAsUndefined,
  lastContactMobile: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) ? undefined : new Date(val as any),
    z.date().optional()
  ),
  territory: emptyAsUndefined,
  department: emptyAsUndefined,
  consentEmail: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : null, z.boolean().nullable().optional()),
  consentPhone: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : null, z.boolean().nullable().optional()),
  consentSms: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : null, z.boolean().nullable().optional()),
  consentPostal: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : null, z.boolean().nullable().optional()),
  consentCustom: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : null, z.boolean().nullable().optional()),
  noContact: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional().default(false)),
  consentDate: z.preprocess(
    (val) => {
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return undefined;
      return new Date(val as any);
    },
    z.date().optional()
  ),
  consentSource: emptyAsUndefined,
})

// Schéma pour les tâches
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Le titre de la tâche est obligatoire."),
  description: emptyAsUndefined,
  priority: z.enum(['HAUTE', 'NORMALE', 'BASSE']),
  status: z.string().optional(),
  expectedDeliverable: emptyAsUndefined,
  assigneeId: emptyAsUndefined,
  validatorId: emptyAsUndefined,
  validationStatus: emptyAsUndefined,
  dueDate: z.preprocess(
    (val) => {
      if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return undefined;
      return new Date(val as any);
    },
    z.date().optional()
  ),
})

// Schéma pour les courriers
export const mailCaseSchema = z.object({
  subject: z.string().trim().min(1, "Le sujet du courrier est obligatoire."),
  senderName: emptyAsUndefined,
  recipientName: emptyAsUndefined,
  city: emptyAsUndefined,
  channel: z.string().min(1, "Le canal (Postal, Mail, etc.) est obligatoire."),
  category: emptyAsUndefined,
  urgency: z.enum(['NORMALE', 'HAUTE', 'URGENTE']).optional().default('NORMALE'),
  content: emptyAsUndefined,
  notes: emptyAsUndefined,
  assigneeId: emptyAsUndefined,
  type: z.enum(['ENTRANT', 'SORTANT']),
  validationStatus: emptyAsUndefined,
})

// Schéma pour les Questions Écrites
export const qeSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire."),
  type: z.string().min(1, "Le type est obligatoire."),
  anNumber: emptyAsUndefined,
  theme: emptyAsUndefined,
  ministry: emptyAsUndefined,
  content: emptyAsUndefined,
  responseContent: emptyAsUndefined,
  notes: emptyAsUndefined,
  status: z.string().optional()
})
