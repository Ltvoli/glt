# Plan d'implémentation : Module de Réponses Mails Premium & Raccordement IA

**Objectif** : Implémenter l'édition in-situ, l'assistant de rédaction IA (Gemini), l'autosave et l'impression PDF directe.

---

## 📋 Liste des Tâches

### 1. Server Actions pour la Rédaction IA et la Mise à Jour Inline

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
- Ajouter l'action `updateMailContentAction(mailId: string, content: string): Promise<{ success: boolean, error?: string }>` pour mettre à jour directement `mail.content` (utilisé par l'inline edit et l'autosave).
- Ajouter l'action `generateAiResponseAction(mailId: string, instruction: string): Promise<{ success: boolean, text?: string, error?: string }>` :
  - Récupérer les informations du courrier entrant.
  - Appeler Gemini (depuis `src/lib/gemini.ts`) avec le contexte du courrier et les instructions de l'utilisateur pour rédiger un corps de réponse fluide et poli.
  - Retourner le texte rédigé sous format HTML simple.

---

### 2. Intégration de l'Édition Inline et de l'Assistant IA

#### [MODIFY] [mail-collaboration-tabs.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/mail-collaboration-tabs.tsx)
- Rendre le composant capable de basculer en mode édition inline au clic sur « Modifier la réponse ».
- Charger dynamiquement le script Quill et initialiser l'éditeur directement à la place de la lettre.
- Ajouter la section **« Assistant de Rédaction IA ✨ »** :
  - Champ de saisie d'instruction (ex : *"Réfuse poliment..."*).
  - Bouton pour appeler `generateAiResponseAction`.
  - Bouton pour insérer la suggestion IA dans l'éditeur Quill.
- Ajouter la **sauvegarde automatique (Autosave)** avec un intervalle de 15 secondes si l'éditeur a subi des changements, en affichant un badge discret « Sauvegardé automatiquement à XX:XX ».
- Ajouter un bouton **« Imprimer / PDF »** qui utilise une iframe temporaire ou déclenche `window.print()` en isolant uniquement la lettre A4 via CSS d'impression.
- Exposer les nouveaux boutons d'action directement au-dessus de l'aperçu.

---

## 🧪 Plan de Vérification

- Lancer la compilation de contrôle : `npx tsc --noEmit`.
- Déployer sur le VPS.
- Ouvrir un courrier, cliquer sur « Modifier la réponse », écrire du texte, attendre 15 secondes pour vérifier l'autosave, cliquer sur Enregistrer.
- Tester l'assistant IA en donnant une instruction, et vérifier que la réponse rédigée s'insère dans l'éditeur.
- Tester le bouton d'impression directe.
