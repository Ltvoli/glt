#!/bin/bash
# Script de sauvegarde manuelle pour la base de données Supabase
# Nécessite pg_dump installé localement

set -e

# Charger les variables d'environnement depuis .env
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

if [ -z "$DIRECT_URL" ]; then
  echo "Erreur : DIRECT_URL non défini dans le fichier .env"
  exit 1
fi

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/supabase_backup_$DATE.sql"

# Créer le dossier si n'existe pas
mkdir -p "$BACKUP_DIR"

echo "Démarrage de la sauvegarde Supabase..."
# Utilisation de pg_dump via l'URL directe (sans pgbouncer pour les dumps)
pg_dump "$DIRECT_URL" -c -O -f "$BACKUP_FILE"

echo "Sauvegarde terminée avec succès : $BACKUP_FILE"

# Nettoyage des vieilles sauvegardes (> 30 jours)
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +30 -exec rm {} \;
echo "Vieilles sauvegardes purgées."
