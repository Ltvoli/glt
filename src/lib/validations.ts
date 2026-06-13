import { z } from 'zod'

// Helper for optional strings from FormData that might be empty ("")
export const emptyAsUndefined = z.string().trim().optional().transform(val => val === '' ? undefined : val)

export const optionalEmail = z
  .string()
  .trim()
  .refine(val => val === '' || z.string().email().safeParse(val).success, {
    message: "Le format de l'adresse e-mail est invalide."
  })
  .transform(val => val === '' ? undefined : val)

export const optionalPhone = z
  .string()
  .trim()
  .refine(val => val === '' || /^[\d\s\+\-\(\)]+$/.test(val), {
    message: "Le numéro de téléphone ne doit contenir que des chiffres et des symboles autorisés (+, -, espaces)."
  })
  .transform(val => val === '' ? undefined : val)

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
  apartment: emptyAsUndefined,
  building: emptyAsUndefined,
  streetNumber: emptyAsUndefined,
  streetName: emptyAsUndefined,
  addressComplement: emptyAsUndefined,
  postalCode: z.string().trim().refine(val => val === '' || /^\d{5}$/.test(val), {
    message: "Le code postal doit contenir exactement 5 chiffres."
  }).transform(val => val === '' ? undefined : val),
  supportLevel: emptyAsUndefined,
  meetingStep: emptyAsUndefined,
  territorySector: emptyAsUndefined,
  source: emptyAsUndefined,
  whatsappStatus: emptyAsUndefined,
  linkedinUrl: emptyAsUndefined,
  notes: emptyAsUndefined,
})

// Schéma pour les tâches
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Le titre de la tâche est obligatoire."),
  description: emptyAsUndefined,
  priority: z.enum(['HAUTE', 'NORMALE', 'BASSE']),
  status: z.string().optional(),
  expectedDeliverable: emptyAsUndefined,
  assigneeId: emptyAsUndefined,
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
})

// Schéma pour les Questions Écrites
export const qeSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire."),
  type: z.string().min(1, "Le type est obligatoire."),
  anNumber: z.string().trim().min(1, "Le numéro de question est obligatoire."),
  theme: emptyAsUndefined,
  ministry: emptyAsUndefined,
  author: emptyAsUndefined,
  coSigners: emptyAsUndefined,
  text: emptyAsUndefined,
  response: emptyAsUndefined,
  notes: emptyAsUndefined,
  status: z.string().optional()
})
