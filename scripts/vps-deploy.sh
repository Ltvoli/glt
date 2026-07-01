#!/bin/bash
# Script de déploiement automatique sur le VPS pour le Cabinet Parlementaire (CDC)
set -e

echo "============================================"
echo "🚀 Démarrage de la mise à jour sur le VPS..."
echo "============================================"

# Aller dans le dossier du projet
cd /var/www/cdc

# 1. Tirer les derniers changements depuis la branche principale
echo "📥 Récupération des dernières sources (Git)..."
git pull origin main

# 2. Installer les dépendances de production
echo "📦 Installation des dépendances NPM..."
npm install --omit=dev

# 3. Synchroniser la base de données avec Prisma
echo "🗄️ Synchronisation du schéma de base de données..."
npx prisma db push --accept-data-loss
npx prisma generate

# 4. Compiler l'application Next.js
echo "🏗️ Compilation Next.js..."
npm run build

# 5. Redémarrer ou démarrer l'application avec PM2
echo "🔄 Rechargement du service Node.js (PM2)..."
if pm2 show cdc-app > /dev/null 2>&1; then
  pm2 reload cdc-app
  echo "✅ Processus existant rechargé avec succès."
else
  pm2 start npm --name "cdc-app" -- start
  pm2 save
  echo "✅ Nouveau processus démarré et sauvegardé avec succès."
fi

echo "============================================"
echo "🎉 Mise à jour terminée avec succès !"
echo "============================================"
