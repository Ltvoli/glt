import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const dictionaryData = [
  // --- Task Statuses ---
  { type: 'TASK_STATUS', code: 'A_FAIRE', label: 'À faire', color: '#94a3b8', order: 1, isDefault: true },
  { type: 'TASK_STATUS', code: 'EN_COURS', label: 'En cours', color: '#3b82f6', order: 2 },
  { type: 'TASK_STATUS', code: 'EN_ATTENTE', label: 'En attente', color: '#f59e0b', order: 3 },
  { type: 'TASK_STATUS', code: 'TERMINEE', label: 'Terminée', color: '#10b981', order: 4 },
  { type: 'TASK_STATUS', code: 'ANNULEE', label: 'Annulée', color: '#ef4444', order: 5 },

  // --- Task Priorities ---
  { type: 'TASK_PRIORITY', code: 'BASSE', label: 'Basse', color: '#94a3b8', order: 1 },
  { type: 'TASK_PRIORITY', code: 'NORMALE', label: 'Normale', color: '#3b82f6', order: 2, isDefault: true },
  { type: 'TASK_PRIORITY', code: 'HAUTE', label: 'Haute', color: '#ef4444', order: 3 },

  // --- Contact Types ---
  { type: 'CONTACT_TYPE', code: 'ELECTEUR', label: 'Électeur', color: '#3b82f6', order: 1 },
  { type: 'CONTACT_TYPE', code: 'ELU', label: 'Élu', color: '#8b5cf6', order: 2 },
  { type: 'CONTACT_TYPE', code: 'ASSO', label: 'Association', color: '#10b981', order: 3 },
  { type: 'CONTACT_TYPE', code: 'PARTENAIRE', label: 'Partenaire', color: '#f59e0b', order: 4 },
  { type: 'CONTACT_TYPE', code: 'PRESSE', label: 'Presse', color: '#ef4444', order: 5 },
  { type: 'CONTACT_TYPE', code: 'AUTRE', label: 'Autre', color: '#94a3b8', order: 6, isDefault: true },

  // --- Contact Roles ---
  { type: 'CONTACT_ROLE', code: 'PHONING', label: 'Phoning', color: '#3b82f6', order: 1, isDefault: true },
  { type: 'CONTACT_ROLE', code: 'ELU', label: 'Élu', color: '#8b5cf6', order: 2 },
  { type: 'CONTACT_ROLE', code: 'INSTITUTIONNEL', label: 'Institutionnel', color: '#6366f1', order: 3 },
  { type: 'CONTACT_ROLE', code: 'PRESSE', label: 'Presse', color: '#ef4444', order: 4 },
  { type: 'CONTACT_ROLE', code: 'COMMERCANT', label: 'Commerçant', color: '#f59e0b', order: 5 },
  { type: 'CONTACT_ROLE', code: 'CITOYEN', label: 'Citoyen', color: '#10b981', order: 6 },

  // --- Mail Statuses ---
  { type: 'MAIL_STATUS', code: 'RECU', label: 'Reçu', color: '#94a3b8', order: 1, isDefault: true },
  { type: 'MAIL_STATUS', code: 'LU', label: 'Lu', color: '#64748b', order: 2 },
  { type: 'MAIL_STATUS', code: 'EN_TRAITEMENT', label: 'En traitement', color: '#3b82f6', order: 3 },
  { type: 'MAIL_STATUS', code: 'REPONDU', label: 'Répondu', color: '#10b981', order: 4 },
  { type: 'MAIL_STATUS', code: 'CLASSE', label: 'Classé', color: '#475569', order: 5 },
  { type: 'MAIL_STATUS', code: 'ENVOYE', label: 'Envoyé', color: '#8b5cf6', order: 6 },

  // --- QE Types ---
  { type: 'QE_TYPE', code: 'QE', label: 'Question Écrite', color: '#3b82f6', order: 1, isDefault: true },
  { type: 'QE_TYPE', code: 'QAG', label: 'QAG', color: '#f59e0b', order: 2 },
  { type: 'QE_TYPE', code: 'AMENDEMENT', label: 'Amendement', color: '#8b5cf6', order: 3 },

  // --- QE Statuses ---
  { type: 'QE_STATUS', code: 'DEPOSEE', label: 'Déposée', color: '#3b82f6', order: 1, isDefault: true },
  { type: 'QE_STATUS', code: 'EN_ATTENTE', label: 'En attente de réponse', color: '#f59e0b', order: 2 },
  { type: 'QE_STATUS', code: 'REPONSE_RECUE', label: 'Réponse reçue', color: '#10b981', order: 3 },
  { type: 'QE_STATUS', code: 'RETOUR_EFFECTUE', label: 'Retour effectué', color: '#8b5cf6', order: 4 },
]

async function main() {
  console.log('🔄 Début de l\'initialisation du Dictionnaire de Données...')
  
  for (const entry of dictionaryData) {
    await prisma.appDictionary.upsert({
      where: {
        type_code: {
          type: entry.type,
          code: entry.code,
        }
      },
      update: {
        label: entry.label,
        color: entry.color,
        order: entry.order,
        isDefault: entry.isDefault || false,
      },
      create: {
        type: entry.type,
        code: entry.code,
        label: entry.label,
        color: entry.color,
        order: entry.order,
        isDefault: entry.isDefault || false,
      }
    })
    console.log(`✅ ${entry.type} - ${entry.code}`)
  }

  console.log('🎉 Initialisation terminée !')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
