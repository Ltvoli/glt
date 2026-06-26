# Plan d'implémentation : Création et Liaison de Contact en 1-Clic

**Objectif** : Ajouter un bouton d'action dans l'Assistant IA pour créer et lier un contact (citoyen) en 1 clic à partir des métadonnées extraites.
**Architecture** : Recherche de contact server-side dans la page de détail, actions de modification sécurisées, et interface utilisateur réactive dans l'assistant client.
**Stack Tech** : Next.js Server Actions, React, Prisma, Tailwind/Vanilla CSS.

---

## Composants à Modifier / Créer

### 1. Bibliothèque utilitaire : `src/lib/mail-utils.ts`
Ajouter la fonction `parseFullName(fullName: string)` pour séparer prénom et nom proprement.

### 2. Actions serveur : `src/app/mails/actions.ts`
Ajouter les actions :
- `linkExistingContactAction(mailId: string, contactId: string)`
- `createAndLinkContactAction(mailId: string, metadata: any)`

### 3. Page de détail : `src/app/mails/[id]/page.tsx`
- Importer `parseFullName` depuis `@/lib/mail-utils`.
- Si `mail.aiAnalysis` est présent, analyser le nom de l'expéditeur et faire la recherche de contact en base de données.
- Passer le contact détecté (`detectedContact`) comme prop à `AiAssistant`.

### 4. Composant Assistant IA : `src/app/mails/[id]/ai-assistant.tsx`
- Mettre à jour `AiAssistantProps` pour accepter `detectedContact` et `linkedContactId` (ou utiliser la liste des contacts liés existante).
- Intégrer les boutons de liaison/création dans l'interface sous les données d'identité détectées.
- Appeler les actions serveur avec `useTransition` et gérer le statut de chargement.

---

## Étapes détaillées

### Étape 1 : Écriture de la fonction de découpage de nom
- Fichier : [src/lib/mail-utils.ts](file:///d:/Téléchargements/CDC/src/lib/mail-utils.ts)
- Ajouter l'implémentation de `parseFullName` :
```typescript
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: 'Inconnu', lastName: 'INCONNU' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const name = parts[0]
    return {
      firstName: '-',
      lastName: name.toUpperCase()
    }
  }

  const isUppercaseWord = (word: string) => {
    const hasLetter = /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(word)
    const hasLowercase = /[a-zà-öø-ÿ]/.test(word)
    return hasLetter && !hasLowercase
  }

  const uppercaseIndices = parts.map((w, i) => isUppercaseWord(w) ? i : -1).filter(idx => idx !== -1)

  if (uppercaseIndices.length > 0) {
    const firstUpperIdx = uppercaseIndices[0]
    if (firstUpperIdx > 0) {
      const firstNameParts = parts.slice(0, firstUpperIdx)
      const lastNameParts = parts.slice(firstUpperIdx)
      return {
        firstName: firstNameParts.join(' '),
        lastName: lastNameParts.join(' ').toUpperCase()
      }
    } else {
      const firstMixedIdx = parts.findIndex((w, i) => !isUppercaseWord(w))
      if (firstMixedIdx !== -1) {
        const lastNameParts = parts.slice(0, firstMixedIdx)
        const firstNameParts = parts.slice(firstMixedIdx)
        return {
          firstName: firstNameParts.join(' '),
          lastName: lastNameParts.join(' ').toUpperCase()
        }
      }
    }
  }

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return {
    firstName: firstName,
    lastName: lastName.toUpperCase()
  }
}
```

### Étape 2 : Écriture des Actions Serveur
- Fichier : [src/app/mails/actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
- Ajouter les deux nouvelles fonctions suivantes (en les exportant proprement) :
```typescript
import { parseFullName } from '@/lib/mail-utils'

export async function linkExistingContactAction(mailId: string, contactId: string) {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    // Supprimer les liens existants vers un contact pour ce mail
    await prisma.globalLink.deleteMany({
      where: { mailCaseId: mailId, contactId: { not: null } }
    })

    // Créer le nouveau lien
    await prisma.globalLink.create({
      data: {
        mailCaseId: mailId,
        contactId: contactId
      }
    })

    revalidatePath(`/mails/${mailId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[linkExistingContactAction] error:', err)
    return { error: `Erreur lors de la liaison : ${err.message || err}` }
  }
}

export async function createAndLinkContactAction(mailId: string, metadata: any) {
  let session
  try {
    session = await requireWriteAccess()
  } catch (e: any) {
    return { error: e.message }
  }

  try {
    const rawName = metadata.expediteur_nom || 'Inconnu'
    const parsed = parseFullName(rawName)
    
    const email = metadata.expediteur_coordonnees?.email || null
    const phone = metadata.expediteur_coordonnees?.telephone || null
    const address = metadata.expediteur_coordonnees?.adresse || null
    const city = metadata.commune || null

    // Créer le contact
    const contact = await prisma.contact.create({
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email,
        phone,
        address,
        city,
        type: 'ELECTEUR',
        createdById: session.userId
      }
    })

    // Supprimer les liens existants vers un contact pour ce mail
    await prisma.globalLink.deleteMany({
      where: { mailCaseId: mailId, contactId: { not: null } }
    })

    // Créer le lien
    await prisma.globalLink.create({
      data: {
        mailCaseId: mailId,
        contactId: contact.id
      }
    })

    revalidatePath(`/mails/${mailId}`)
    return { success: true, contactId: contact.id }
  } catch (err: any) {
    console.error('[createAndLinkContactAction] error:', err)
    return { error: `Erreur lors de la création et liaison : ${err.message || err}` }
  }
}
```

### Étape 3 : Modification de `page.tsx`
- Fichier : [src/app/mails/[id]/page.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/page.tsx)
- Importer `parseFullName` : `import { parseFullName } from '@/lib/mail-utils'`
- Dans le composant `MailDetailPage`, après la récupération de `mail` :
```typescript
  let detectedContact = null
  const analysis = mail?.aiAnalysis as any
  if (analysis?.metadata?.expediteur_nom) {
    const parsed = parseFullName(analysis.metadata.expediteur_nom)
    detectedContact = await prisma.contact.findFirst({
      where: {
        firstName: { equals: parsed.firstName, mode: 'insensitive' },
        lastName: { equals: parsed.lastName, mode: 'insensitive' },
        archivedAt: null
      },
      select: { id: true, firstName: true, lastName: true }
    })
  }
```
- Mettre à jour l'appel à `<AiAssistant>` :
```tsx
            <AiAssistant 
              mailId={mail.id}
              mailType={mail.type}
              aiAnalysis={mail.aiAnalysis}
              aiSuggestions={mail.aiSuggestions}
              hideAiAssistant={mail.hideAiAssistant}
              hasAttachments={mail.documents.length > 0}
              detectedContact={detectedContact}
              linkedContactId={linkedContacts[0]?.id || null}
            />
```

### Étape 4 : Modification de `ai-assistant.tsx`
- Fichier : [src/app/mails/[id]/ai-assistant.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/ai-assistant.tsx)
- Mettre à jour `AiAssistantProps` :
```typescript
interface AiAssistantProps {
  mailId: string
  mailType: string
  aiAnalysis: any
  aiSuggestions: any
  hideAiAssistant: boolean
  hasAttachments: boolean
  detectedContact?: { id: string, firstName: string, lastName: string } | null
  linkedContactId?: string | null
}
```
- Importer les nouvelles actions :
```typescript
import { analyzeMailCaseAction, generateMailResponsesAction, toggleAiAssistantAction, applyMailMetadataAction, linkExistingContactAction, createAndLinkContactAction } from '../actions'
```
- Dans l'encart Métadonnées Détectées (`analysis.metadata`), ajouter le bloc de liaison après le tableau de données :
```tsx
                  {/* Liaison 1-clic contact */}
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                    {linkedContactId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
                        <CheckCircle size={16} />
                        <span>Contact lié à ce courrier</span>
                      </div>
                    ) : detectedContact ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}>
                          ⚠️ Un contact correspondant a été trouvé en base de données.
                        </div>
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              setLoadingStep("Liaison du contact existant...")
                              const res = await linkExistingContactAction(mailId, detectedContact.id)
                              if (res.error) toast.error(res.error)
                              else toast.success("Contact lié avec succès !")
                              setLoadingStep('')
                            })
                          }}
                          className="button outline"
                          style={{
                            width: '100%',
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem',
                            borderColor: '#818cf8',
                            color: '#4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                          disabled={isPending}
                        >
                          <UserCheck size={14} />
                          Lier le contact existant ({detectedContact.lastName} {detectedContact.firstName})
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          startTransition(async () => {
                            setLoadingStep("Création et liaison du contact...")
                            const res = await createAndLinkContactAction(mailId, analysis.metadata)
                            if (res.error) toast.error(res.error)
                            else toast.success("Contact créé et lié avec succès !")
                            setLoadingStep('')
                          })
                        }}
                        className="button"
                        style={{
                          width: '100%',
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                        disabled={isPending}
                      >
                        ➕ Créer et lier ce contact en 1 clic
                      </button>
                    )}
                  </div>
```

---

## Plan de vérification et compilation

1. Exécuter le compilateur TypeScript :
   `npx tsc --noEmit`
2. Lancer le linter :
   `npm run lint`
3. Vérifier le comportement en conditions réelles avec différents types d'expéditeurs.
