# Plan d'implémentation : Module d'Analyse et Réponse au Courrier Assisté par IA

**Objectif** : Mettre en place un assistant IA basé sur Gemini 2.5 pour analyser les courriers reçus (PDF/images) et aider les attachés parlementaires à rédiger des réponses types conformes aux prérogatives du député.
**Architecture** : Intégration de l'API Gemini 2.5 multimodale côté serveur via direct fetch. Persistance de la fiche d'analyse JSON sur la table `MailCase`, et affichage d'un panneau latéral interactif (sidebar) de suggestions pour générer des brouillons de réponses.
**Stack Tech** : Next.js Server Actions, Prisma client, PostgreSQL (Supabase), Gemini 2.5 API (Google AI Studio).

---

## Tâches par composant

### 1. Base de Données & Modèles Prisma
- [ ] **Tâche 1.1** : Modifier `prisma/schema.prisma` pour ajouter les champs `aiAnalysis` (Json?), `aiSuggestions` (Json?) et `hideAiAssistant` (Boolean, default `false`) au modèle `MailCase`.
- [ ] **Tâche 1.2** : Mettre à jour le script de seed `prisma/seed.ts` pour y insérer les deux nouveaux paramètres système : `ai.mail_enabled` (booléen global) et `ai.auto_analyze_on_import` (booléen déclencheur d'auto-analyse).
- [ ] **Tâche 1.3** : Lancer la mise à jour de la base de données via `npx prisma db push`.
- [ ] **Tâche 1.4** : Relancer le seed avec `npx prisma db seed` pour initialiser les paramètres.

### 2. Client Gemini API
- [ ] **Tâche 2.1** : Créer le fichier `src/lib/gemini.ts` pour encapsuler les appels à l'API Google AI Studio.
  - Fonction `callGeminiApi(prompt: string, base64Parts: any[], responseSchema?: any)` pour exécuter la requête HTTP POST avec `GEMINI_API_KEY`.
  - Fonction `analyzeIncomingMail(contentOrBase64: string, mimeType?: string)` qui injecte le prompt système d'analyse et retourne le JSON d'analyse (§ 5.3).
  - Fonction `generateResponses(originalMail: string, analysisJson: any, selectedSuggestions: any[], customInstruction?: string)` qui rédige les courriers de réponse (§ 5.4).

### 3. Server Actions (Gestion du courrier & IA)
- [ ] **Tâche 3.1** : Ajouter la server action `analyzeMailCaseAction(mailCaseId: string)` dans `src/app/mails/actions.ts` :
  - Lit le courrier et ses documents attachés en base.
  - S'il y a un PDF ou une image, l'envoie à `analyzeIncomingMail` en base64, sinon envoie le texte brut.
  - Stocke les résultats dans la table `MailCase`.
- [ ] **Tâche 3.2** : Ajouter la server action `generateMailResponsesAction(mailCaseId: string, selectedSuggestionIds: number[], customInstruction?: string)` dans `src/app/mails/actions.ts` :
  - Appelle `generateResponses` pour obtenir les brouillons.
  - Crée les nouveaux enregistrements `MailCase` (type `SORTANT`, status `BROUILLON`, liés par `parentMailCaseId`).
- [ ] **Tâche 3.3** : Ajouter la server action `toggleAiAssistantAction(mailCaseId: string, hide: boolean)` pour mettre à jour la valeur de `hideAiAssistant`.

### 4. Interface Utilisateur & Composants Client
- [ ] **Tâche 4.1** : Créer le composant client `src/app/mails/[id]/ai-assistant.tsx` :
  - Gère l'affichage des badges de compétence et d'urgence.
  - Affiche les pistes pliables et gère la sélection multiple.
  - Permet la saisie d'instructions personnalisées et lance la génération.
  - Propose un loader animé premium pendant l'attente.
- [ ] **Tâche 4.2** : Mettre à jour `src/app/mails/[id]/page.tsx` :
  - Charge les paramètres `ai.mail_enabled` et le courrier.
  - Intègre l'assistant IA à droite de l'écran en adaptant la mise en page (grille side-by-side).

---

## Plan de vérification

### Tests automatisés
- [ ] Exécuter `npx tsc --noEmit` pour s'assurer qu'aucun type n'est brisé.
- [ ] Exécuter `npx next build` pour valider l'absence d'erreurs de bundling.

### Tests manuels
1. Activer/Désactiver l'IA depuis l'onglet modules admin et vérifier l'apparition/disparition du panneau.
2. Importer un scan de courrier (Image/PDF), observer le loader pendant l'analyse automatique.
3. Cocher deux pistes de réponse, ajouter une consigne ("ton sec") et générer les courriers.
4. Valider que les deux courriers sortants apparaissent bien sous forme de brouillons reliés.
