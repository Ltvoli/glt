# CDC SaaS - Système de Gestion du Bureau Parlementaire (v2)

Ce projet est le logiciel interne de gestion et de paramétrage du bureau parlementaire du député **Lionel Tivoli**. Il permet à l'équipe de centraliser les contacts, les tâches, les courriers, les questions écrites, les plannings des salariés et d'exporter des rapports d'activité de manière sécurisée et centralisée.

---

## 🚀 Stack Technique

* **Framework :** [Next.js 16 (App Router)](https://nextjs.org/)
* **Base de données :** [PostgreSQL](https://www.postgresql.org/) avec [Prisma ORM 6+](https://www.prisma.io/)
* **Gestion des sessions & Sécurité :** JWT chiffrés avec [jose](https://github.com/panva/jose) (compatible Edge Runtime) et hashage [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
* **Interface & Styles :** CSS Modules (Vanilla CSS) avec variables de design système centralisées
* **Interactions avancées :** Drag & Drop avec `@dnd-kit` (pour l'organisation dynamique des pages) et graphiques avec `Recharts`

---

## 🛠️ Modules Fonctionnels du CRM

1. **👥 Contacts & Électeurs**
   * Création, édition et filtrage multicritères des fiches de contacts.
   * Importation de fichiers CSV (Qomon) avec détection intelligente des doublons, validation ou fusion par un administrateur.
   * *RGPD :* Consentements explicites pour les SMS et newsletters, anonymisation et soft-delete (`archivedAt`).

2. **📋 Tâches & Livrables**
   * Assignation des tâches à un membre de l'équipe avec indicateur de priorité (`HAUTE`, `NORMALE`, `BASSE`).
   * Décomposition en sous-tâches, commentaires internes et dépôt de livrables attendus.

3. **✉️ Courriers Entrants & Sortants**
   * Enregistrement des courriers (canaux : postal, email, autre) avec génération automatique de références uniques (ex: `COU-2026-0042`).
   * Association des réponses aux courriers d'origine pour un suivi de discussion clair.

4. **🏛️ Questions Écrites (QE, QAG & Amendements)**
   * Suivi des interventions déposées à l'Assemblée Nationale (numérotation AN, ministère cible, thème, dates clés).
   * Système d'alertes pour relancer les ministères si la date limite de réponse est dépassée.

5. **📅 Planning & Présences Salariés**
   * Agenda mensuel interactif pour la saisie des jours travaillés (Paris, Circo, Télétravail, Déplacement) et des absences (Congés, Maladie).
   * Pré-remplissage automatique des week-ends et des jours fériés français.
   * Décompte annuel automatique avec quotas personnalisés par salarié (par défaut 218 jours sur la période de référence du 1er juin au 31 mai).

6. **📊 Rapports & KPI**
   * Dashboard sur 7 jours dynamique et rapports d'activité hebdomadaires complets imprimables (PDF).

---

## 🛡️ Administration & SaaS (Phase 12)

Le système intègre un panneau d'administration centralisé pour piloter l'ensemble de l'instance :

* **RBAC (Role-Based Access Control) Strict :**
  * Rôles prédéfinis : `SUPERADMIN`, `ADMIN`, `USER`, `READONLY`.
  * Sécurité renforcée : Un utilisateur standard ne peut pas accéder aux routes `/admin/*`. Un `ADMIN` ne peut pas modifier, archiver ou dégrader un compte `SUPERADMIN`. L'auto-archivage et l'auto-modification de rôle sont impossibles.
* **Gestion Dynamique des Modules & Pages :**
  * Activation ou désactivation globale des modules (ex. masquer le module Courriers s'il n'est pas utilisé).
  * Réorganisation de l'ordre des pages dans la sidebar par **Drag & Drop** via une interface ergonomique (`dnd-kit`).
* **Paramètres Globaux (Settings) :**
  * Configuration complète de l'application (nom, fuseau horaire, durée de session JWT, configuration des seuils de verrouillage de sécurité).
  * Gestion des tables de référence système (types de contacts, origines des courriers).
* **Journalisation d'Audit & Traçabilité :**
  * Enregistrement de chaque action métier sensible (connexion, suppression, modification de rôles).
  * Page de visualisation avec filtrage multicritères et export au format CSV (via `papaparse`).

---

## 💻 Configuration & Installation Locale

### 1. Prérequis
* [Node.js](https://nodejs.org/) v18+
* [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (pour la base de données locale)

### 2. Variables d'environnement
Créez un fichier `.env` à la racine du projet en vous inspirant de `.env.example` :

```env
# URL de connexion PostgreSQL
DATABASE_URL="postgresql://tivoli_user:tivoli_pass@localhost:5433/tivoli_db?schema=public"

# Variables pour le conteneur PostgreSQL Docker
POSTGRES_USER=tivoli_user
POSTGRES_PASSWORD=tivoli_pass
POSTGRES_DB=tivoli_db

# Clé de chiffrement des sessions JWT
JWT_SECRET="remplacez_par_une_cle_secrete_longue_en_production"
```

### 3. Lancement de la Base de Données
Démarrez le conteneur PostgreSQL local :
```bash
docker-compose up -d db
```

### 4. Installation des Dépendances
```bash
npm install
```

### 5. Application des Migrations et Seeding
Appliquez les schémas Prisma à la base de données et insérez les données par défaut (rôles, permissions, paramètres, modules et utilisateurs initiaux) :

```bash
npx prisma migrate dev
npx prisma db seed
```

> 💡 **Comptes par défaut créés par le Seed :**
> * **Super-Administrateur :** `admin@cdc.app` (Mot de passe : `Admin@123456!`)
> * **Administrateur :** `manager@cdc.app` (Mot de passe : `Manager@123456!`)
> * **Collaborateur :** `user@cdc.app` (Mot de passe : `User@123456!`)
> * **Lecteur simple :** `readonly@cdc.app` (Mot de passe : `Readonly@123456!`)

---

## 🛠️ Commandes de Développement

* **Lancer en mode développement :**
  ```bash
  npm run dev
  ```
  L'application est alors accessible à l'adresse : [http://localhost:3000](http://localhost:3000)

* **Compiler l'application pour la production :**
  ```bash
  npm run build
  ```

* **Lancer l'application compilée :**
  ```bash
  npm start
  ```

* **Accéder au client Prisma Studio (visualisation de la BDD) :**
  ```bash
  npx prisma studio
  ```

---

## 🐳 Déploiement en Production via Docker

Le projet intègre un `Dockerfile` et un service `app` dans le fichier `docker-compose.yml`. Pour lancer l'ensemble de la stack (App + Base de données) en mode production :

1. Ajustez les variables d'environnement dans votre fichier `.env`.
2. Lancez la commande suivante :
   ```bash
   docker-compose up -d --build
   ```

---

## 💾 Sauvegardes
Un script de sauvegarde de la base de données PostgreSQL est disponible dans `scripts/db-backup.sh`. Il réalise des dumps SQL quotidiens et nettoie automatiquement les fichiers de sauvegarde vieux de plus de 30 jours.
