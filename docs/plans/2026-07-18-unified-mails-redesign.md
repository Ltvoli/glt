# Plan d'implémentation : Refonte Unifiée du Module Réponses et Modèles de Courriers

**Objectif** : Unifier le flux de travail des réponses de courriers en intégrant les modèles en ligne directement dans le cycle de rédaction du CRM.

---

## 📋 Liste des Tâches

### 1. Server Actions de Fusion

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
- Ajouter l'action `applyHtmlTemplateToMailAction(mailId: string, templateId: string): Promise<{ success: boolean, error?: string }>` :
  - Charger le modèle en ligne (`DocumentTemplate`) et le courrier (`MailCase`).
  - Effectuer la fusion de toutes les variables (`{en_tete_officielle}`, `{civilite_expediteur}`, `{expediteur_adresse}`, `{reference}`, `{objet}`, `{date_courrier}`, `{signature_elu}`).
  - Pour `{corps_reponse}`, utiliser le contenu existant de `mail.content` (ou une chaîne vide s'il n'y en a pas).
  - Mettre à jour `mail.content` avec l'HTML final résultant de la fusion.
  - Enregistrer une nouvelle version dans l'historique des révisions du courrier.
  - Actualiser les chemins (`revalidatePath`).

---

### 2. Adaptation de l'Interface de Fiche Courrier

#### [MODIFY] [GenerateLetterButton.tsx](file:///d:/Téléchargements/CDC/src/components/GenerateLetterButton.tsx)
- Adapter le composant pour qu'il récupère tous les modèles (y compris HTML).
- Si l'utilisateur sélectionne un modèle HTML : appeler `applyHtmlTemplateToMailAction` en arrière-plan, afficher un toast de succès, et rafraîchir la page (au lieu de déclencher un téléchargement de fichier).
- Si l'utilisateur sélectionne un modèle Word (DOCX) : conserver le téléchargement de fichier DOCX existant (compatibilité descendante).

#### [MODIFY] [mail-collaboration-tabs.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/mail-collaboration-tabs.tsx)
- Remplacer le rendu textuel brut de `mail.content` (actuellement dans un conteneur `whiteSpace: 'pre-wrap'`) par un conteneur utilisant `dangerouslySetInnerHTML` pour restituer fidèlement la mise en page HTML du modèle appliqué.

---

### 3. Éditeur WYSIWYG sur la Page d'Édition

#### [MODIFY] [dynamic-mail-fields.tsx](file:///d:/Téléchargements/CDC/src/app/mails/dynamic-mail-fields.tsx)
- Si le champ est `content` (le corps de réponse) et que le courrier est de type `SORTANT` :
  - Charger Quill.js et son CSS dynamiquement.
  - Remplacer le `<textarea>` par un éditeur WYSIWYG Quill interactif.
  - Stocker la valeur HTML formatée dans un input caché `name="content"` pour qu'elle soit soumise normalement par le formulaire de mise à jour.

---

## 🧪 Plan de Vérification

- Lancer la compilation de contrôle : `npx tsc --noEmit`.
- Déployer sur le VPS.
- Ouvrir un courrier, sélectionner un modèle HTML dans le sélecteur, vérifier l'actualisation instantanée avec l'en-tête et pied de page visibles directement à l'écran.
- Cliquer sur modifier, ajuster le texte dans l'éditeur visuel, enregistrer et constater la persistance du formatage.
