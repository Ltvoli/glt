# Plan d'implémentation : Application des Métadonnées IA aux Courriers

**Objectif** : Permettre à l'utilisateur d'appliquer en un clic les métadonnées extraites par l'IA (Expéditeur, Objet, Ville, Urgence, Catégorie) directement sur la fiche réelle du courrier en base de données.
**Architecture** : Création d'une action serveur `applyMailMetadataAction` dans actions.ts et intégration d'un panneau de révision interactif avec un bouton d'action dans ai-assistant.tsx.
**Stack Tech** : Next.js (Server Actions), React transitions, Prisma, Lucide Icons.

---

## Proposed Changes

### [Mails Actions]

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
* Ajouter et exporter la fonction `applyMailMetadataAction` :
  ```typescript
  export async function applyMailMetadataAction(mailCaseId: string) {
    const session = await requireWriteAccess()
    requirePermission(session.role, 'MANAGE_MAILS')

    const mail = await prisma.mailCase.findUnique({ where: { id: mailCaseId } })
    if (!mail) return { error: 'Courrier introuvable.' }
    if (!mail.aiAnalysis) return { error: "Aucune analyse IA disponible pour ce courrier." }

    const analysis = mail.aiAnalysis as any
    const metadata = analysis.metadata || {}
    const analyseDetails = analysis.analyse || {}

    const updateData: any = {}

    if (metadata.expediteur_nom) {
      if (mail.type === 'ENTRANT') {
        updateData.senderName = metadata.expediteur_nom
      } else {
        updateData.recipientName = metadata.expediteur_nom
      }
    }

    if (metadata.objet) {
      updateData.subject = metadata.objet
    }

    if (metadata.commune) {
      updateData.city = metadata.commune
    }

    if (analyseDetails.urgence) {
      updateData.urgency = analyseDetails.urgence === 'élevée' ? 'HAUTE' : 'NORMALE'
    }

    if (analyseDetails.type_courrier) {
      switch (analyseDetails.type_courrier) {
        case 'demande_intervention':
        case 'demande_soutien':
          updateData.category = 'DEMANDE_INTERVENTION'
          break
        case 'invitation':
        case 'demande_rdv':
          updateData.category = 'INVITATION'
          break
        case 'reclamation':
          updateData.category = 'RECLAMATION'
          break
        case 'autre':
        default:
          updateData.category = 'INFORMATION'
          break
      }
    }

    try {
      await prisma.mailCase.update({
        where: { id: mailCaseId },
        data: updateData
      })
      revalidatePath(`/mails/${mailCaseId}`)
      return { success: true }
    } catch (err: any) {
      console.error('[applyMailMetadataAction] error:', err)
      return { error: `Erreur lors de la mise à jour : ${err.message || err}` }
    }
  }
  ```

---

### [AI Assistant UI]

#### [MODIFY] [ai-assistant.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/ai-assistant.tsx)
* Importer l'action `applyMailMetadataAction` :
  ```typescript
  import { analyzeMailCaseAction, generateMailResponsesAction, toggleAiAssistantAction, applyMailMetadataAction } from '../actions'
  ```
* Dans le bloc `CASE B: ANALYZED` (autour de la ligne 385, juste avant le résumé), ajouter un encart **« Données d'identité détectées »** montrant les valeurs extraites et un bouton d'application :
  ```tsx
  {analysis.metadata && (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid var(--border)',
      padding: '1rem',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Données d'identité détectées
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem 1rem', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{mail.type === 'ENTRANT' ? 'Expéditeur :' : 'Destinataire :'}</span>
        <span style={{ fontWeight: 600 }}>{analysis.metadata.expediteur_nom || '-'}</span>
        
        <span style={{ color: 'var(--text-muted)' }}>Objet :</span>
        <span style={{ fontWeight: 600 }}>{analysis.metadata.objet || '-'}</span>
        
        <span style={{ color: 'var(--text-muted)' }}>Commune :</span>
        <span style={{ fontWeight: 600 }}>{analysis.metadata.commune || '-'}</span>
        
        <span style={{ color: 'var(--text-muted)' }}>Catégorie :</span>
        <span style={{ fontWeight: 600 }}>
          {analysis.analyse?.type_courrier === 'demande_intervention' ? "Demande d'intervention" :
           analysis.analyse?.type_courrier === 'reclamation' ? 'Réclamation' :
           analysis.analyse?.type_courrier === 'invitation' ? 'Invitation' :
           analysis.analyse?.type_courrier === 'demande_rdv' ? 'Rendez-vous' :
           analysis.analyse?.type_courrier === 'demande_soutien' ? 'Soutien' : 'Information'}
        </span>
      </div>
      
      <button
        onClick={handleApplyMetadata}
        className="button outline"
        style={{ 
          width: '100%', 
          fontSize: '0.8rem', 
          padding: '0.4rem 0.8rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.25rem',
          borderColor: 'var(--primary)',
          color: 'var(--primary)'
        }}
        disabled={isPending}
      >
        <Sparkles size={14} />
        Appliquer ces données à la fiche
      </button>
    </div>
  )}
  ```
* Ajouter la fonction de gestion du clic `handleApplyMetadata` :
  ```typescript
  const handleApplyMetadata = () => {
    startTransition(async () => {
      setLoadingStep("Application des métadonnées sur la fiche...")
      try {
        const res = await applyMailMetadataAction(mailId)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success("Fiche du courrier mise à jour avec succès !")
        }
      } catch (err: any) {
        toast.error("Erreur technique : " + err.message)
      } finally {
        setLoadingStep('')
      }
    })
  }
  ```

---

## Verification Plan

### Automated Tests
* Vérifier le typage et l'absence d'erreurs de compilation :
  ```powershell
  npx tsc --noEmit
  ```
* Lancer le linter :
  ```powershell
  npm run lint
  ```

### Manual Verification
1. Aller sur un courrier non analysé.
2. Lancer l'analyse IA.
3. Vérifier que la boîte récapitulative "Données d'identité détectées" s'affiche correctement avec le bouton "Appliquer ces données à la fiche".
4. Cliquer sur le bouton et s'assurer que les valeurs sont transférées en base de données et apparaissent immédiatement dans la fiche de détails à gauche de l'écran.
