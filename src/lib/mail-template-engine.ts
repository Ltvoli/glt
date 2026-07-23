/**
 * Moteur de Templates et Variables Dynamiques pour Courriers Institutionnels
 */

export interface VariableDefinition {
  key: string
  label: string
  category: 'CONTACT' | 'INSTITUTION' | 'DATES' | 'SYSTEM'
  description: string
  sampleValue: string
}

export const MAIL_VARIABLES_CATALOG: VariableDefinition[] = [
  // Contact
  { key: 'CONTACT_CIVILITE', label: 'Civilité du contact', category: 'CONTACT', description: 'Monsieur / Madame / Docteur / Me', sampleValue: 'Monsieur' },
  { key: 'CONTACT_TITRE', label: 'Titre / Fonction du contact', category: 'CONTACT', description: 'Monsieur le Maire, Madame la Présidente', sampleValue: 'Monsieur le Maire' },
  { key: 'CONTACT_PRENOM', label: 'Prénom du contact', category: 'CONTACT', description: 'Prénom', sampleValue: 'Jean' },
  { key: 'CONTACT_NOM', label: 'Nom du contact', category: 'CONTACT', description: 'Nom de famille', sampleValue: 'DUPONT' },
  { key: 'CONTACT_ADRESSE', label: 'Adresse postale', category: 'CONTACT', description: 'Numéro et nom de rue', sampleValue: '12 rue de la République' },
  { key: 'CONTACT_CP', label: 'Code postal', category: 'CONTACT', description: 'Code postal (5 chiffres)', sampleValue: '75008' },
  { key: 'CONTACT_VILLE', label: 'Ville', category: 'CONTACT', description: 'Nom de la commune', sampleValue: 'Paris' },
  { key: 'CONTACT_ORGANISATION', label: 'Organisation / Structure', category: 'CONTACT', description: 'Mairie, Entreprise ou Association', sampleValue: 'Mairie de Paris' },

  // Institution & Cabinet
  { key: 'DEPUTE_NOM', label: 'Nom du Député', category: 'INSTITUTION', description: 'Nom officiel du Parlementaire', sampleValue: 'Jean-Marc TIVOLI' },
  { key: 'DEPUTE_CIRCONSCRIPTION', label: 'Circonscription', category: 'INSTITUTION', description: 'Libellé de la circonscription', sampleValue: '1ère circonscription du Rhône' },
  { key: 'DEPUTE_CHAMBRE', label: 'Assemblée / Chambre', category: 'INSTITUTION', description: 'Assemblée nationale / Sénat', sampleValue: 'Assemblée nationale' },
  { key: 'CABINET_EMAIL', label: 'Email officiel du Cabinet', category: 'INSTITUTION', description: 'Adresse email institutionnelle', sampleValue: 'contact@depute-tivoli.fr' },
  { key: 'CABINET_TEL', label: 'Téléphone du Cabinet', category: 'INSTITUTION', description: 'Standard téléphonique', sampleValue: '01 40 63 60 00' },
  { key: 'CABINET_ADRESSE', label: 'Adresse du Cabinet', category: 'INSTITUTION', description: 'Adresse officielle permanence', sampleValue: '126 Rue de l\'Université, 75007 Paris' },

  // Dates & Système
  { key: 'DATE_DU_JOUR', label: 'Date du jour', category: 'DATES', description: 'Date au format texte français', sampleValue: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
  { key: 'REFERENCE_COURRIER', label: 'Référence du courrier', category: 'SYSTEM', description: 'Référence unique COU-YYYY-XXXX', sampleValue: 'COU-2026-0042' },
  { key: 'COLLABORATEUR_NOM', label: 'Rédacteur / Collaborateur', category: 'SYSTEM', description: 'Nom du membre du cabinet en charge', sampleValue: 'Sophie BERNARD' },
]

export interface MailVariableContext {
  contact?: {
    firstName?: string | null
    lastName?: string | null
    title?: string | null
    address?: string | null
    postalCode?: string | null
    city?: string | null
    organization?: string | null
    civilite?: string | null
  } | null
  deputy?: {
    name?: string
    constituency?: string
    chamber?: string
    email?: string
    phone?: string
    address?: string
  }
  reference?: string
  assigneeName?: string
  customDate?: string
}

/**
 * Scan n'importe quel texte pour extraire toutes les variables au format {{VARIABLE_NAME}}
 */
export function extractVariablesFromText(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\{\{([A-Z0-9_]+)\}\}/g)
  if (!matches) return []
  const vars = matches.map(m => m.replace(/[\{\}]/g, ''))
  return Array.from(new Set(vars))
}

/**
 * Résout les variables dans un texte HTML/Texte en utilisant le contexte fourni.
 */
export function resolveVariables(
  templateText: string,
  context: MailVariableContext
): {
  resolvedText: string
  missingVariables: { key: string; label: string; sampleValue: string }[]
  detectedVariables: string[]
} {
  if (!templateText) {
    return { resolvedText: '', missingVariables: [], detectedVariables: [] }
  }

  const detectedVariables = extractVariablesFromText(templateText)
  const missingVariables: { key: string; label: string; sampleValue: string }[] = []

  const todayStr = context.customDate || new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Valeurs par défaut du Cabinet (paramétrage global)
  const deputyName = context.deputy?.name || 'Jean-Marc TIVOLI'
  const deputyConstituency = context.deputy?.constituency || '1ère circonscription'
  const deputyChambre = context.deputy?.chamber || 'Assemblée nationale'
  const cabinetEmail = context.deputy?.email || 'contact@depute-tivoli.fr'
  const cabinetTel = context.deputy?.phone || '01 40 63 60 00'
  const cabinetAdresse = context.deputy?.address || '126 Rue de l\'Université, 75007 Paris'

  const contact = context.contact

  const valueMap: Record<string, string | undefined> = {
    CONTACT_CIVILITE: contact?.civilite || (contact?.title?.includes('Mme') || contact?.title?.includes('Madame') ? 'Madame' : 'Monsieur'),
    CONTACT_TITRE: contact?.title || undefined,
    CONTACT_PRENOM: contact?.firstName || undefined,
    CONTACT_NOM: contact?.lastName ? contact.lastName.toUpperCase() : undefined,
    CONTACT_ADRESSE: contact?.address || undefined,
    CONTACT_CP: contact?.postalCode || undefined,
    CONTACT_VILLE: contact?.city || undefined,
    CONTACT_ORGANISATION: contact?.organization || undefined,

    DEPUTE_NOM: deputyName,
    DEPUTE_CIRCONSCRIPTION: deputyConstituency,
    DEPUTE_CHAMBRE: deputyChambre,
    CABINET_EMAIL: cabinetEmail,
    CABINET_TEL: cabinetTel,
    CABINET_ADRESSE: cabinetAdresse,

    DATE_DU_JOUR: todayStr,
    REFERENCE_COURRIER: context.reference || 'COU-2026-XXXX',
    COLLABORATEUR_NOM: context.assigneeName || 'Le Cabinet'
  }

  let resolvedText = templateText

  detectedVariables.forEach(vKey => {
    const value = valueMap[vKey]
    const def = MAIL_VARIABLES_CATALOG.find(cat => cat.key === vKey)

    if (value !== undefined && value.trim() !== '') {
      const regex = new RegExp(`\\{\\{${vKey}\\}\\}`, 'g')
      resolvedText = resolvedText.replace(regex, value)
    } else {
      missingVariables.push({
        key: vKey,
        label: def?.label || vKey,
        sampleValue: def?.sampleValue || 'Non renseigné'
      })
      // Pour l'affichage interactif sur la feuille A4, on entoure d'un span classe spéciale
      const regex = new RegExp(`\\{\\{${vKey}\\}\\}`, 'g')
      resolvedText = resolvedText.replace(
        regex,
        `<span class="missing-var-badge" data-var="${vKey}" style="background-color: #fee2e2; color: #dc2626; border: 1px dashed #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Cliquez pour renseigner cette information">⚠️ [${def?.label || vKey} manquant]</span>`
      )
    }
  })

  return {
    resolvedText,
    missingVariables,
    detectedVariables
  }
}

export interface QualityCheckItem {
  id: string
  label: string
  status: 'SUCCESS' | 'WARNING' | 'ERROR'
  message: string
}

/**
 * Exécute le Contrôle Qualité (QC) sur un courrier avant soumission / validation
 */
export function performMailQualityCheck(mail: any, contact?: any): {
  isValid: boolean
  items: QualityCheckItem[]
} {
  const items: QualityCheckItem[] = []

  // 1. Contrôle Objet
  if (!mail.subject || mail.subject.trim().length === 0) {
    items.push({
      id: 'OBJECT',
      label: 'Objet du courrier',
      status: 'ERROR',
      message: 'L\'objet du courrier est obligatoire.'
    })
  } else {
    items.push({
      id: 'OBJECT',
      label: 'Objet du courrier',
      status: 'SUCCESS',
      message: `Objet renseigné : "${mail.subject}"`
    })
  }

  // 2. Rapprochement Contact CRM
  if (!contact && (!mail.senderName || !mail.recipientName)) {
    items.push({
      id: 'CONTACT',
      label: 'Contact lié CRM',
      status: 'WARNING',
      message: 'Aucun contact rattaché. Il est recommandé de lier le destinataire au CRM.'
    })
  } else {
    items.push({
      id: 'CONTACT',
      label: 'Contact lié CRM',
      status: 'SUCCESS',
      message: contact ? `Lié à ${contact.firstName} ${contact.lastName}` : `Destinataire : ${mail.recipientName}`
    })
  }

  // 3. Contrôle des variables
  const textToScan = (mail.content || '') + (mail.subject || '')
  const missingVars = extractVariablesFromText(textToScan).filter(v => {
    // Si la variable ne trouve pas de correspondance dans le contact
    if (v.startsWith('CONTACT_')) {
      const propMap: Record<string, string> = {
        CONTACT_NOM: 'lastName',
        CONTACT_PRENOM: 'firstName',
        CONTACT_ADRESSE: 'address',
        CONTACT_CP: 'postalCode',
        CONTACT_VILLE: 'city'
      }
      const prop = propMap[v]
      return prop ? !contact?.[prop] : true
    }
    return false
  })

  if (missingVars.length > 0) {
    items.push({
      id: 'VARIABLES',
      label: 'Résolution des variables',
      status: 'ERROR',
      message: `${missingVars.length} variable(s) non résolue(s) : ${missingVars.join(', ')}`
    })
  } else {
    items.push({
      id: 'VARIABLES',
      label: 'Résolution des variables',
      status: 'SUCCESS',
      message: 'Toutes les variables dynamiques sont résolues.'
    })
  }

  // 4. Contrôle Contenu / Corps
  if (!mail.content || mail.content.replace(/<[^>]*>/g, '').trim().length < 20) {
    items.push({
      id: 'CONTENT',
      label: 'Corps du courrier',
      status: 'ERROR',
      message: 'Le corps du courrier est trop court ou vide.'
    })
  } else {
    items.push({
      id: 'CONTENT',
      label: 'Corps du courrier',
      status: 'SUCCESS',
      message: 'Le corps du courrier est rédigé.'
    })
  }

  const isValid = !items.some(i => i.status === 'ERROR')

  return {
    isValid,
    items
  }
}
