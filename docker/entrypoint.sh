#!/bin/sh

# Entrypoint pour le container Docker QCM
# Démarre Nginx et le backend Node.js

set -e

echo "🚀 Démarrage de l'application QCM..."

# Créer la base de données SQLite si elle n'existe pas
if [ ! -f /usr/share/nginx/api/prisma/dev.db ]; then
    echo "📁 Création de la base de données SQLite..."
    cd /usr/share/nginx/api
    npx prisma migrate deploy
    npx prisma db seed
fi

# Démarrer le backend Node.js en arrière-plan
echo "🔧 Démarrage du backend Node.js..."
cd /usr/share/nginx/api
NODE_ENV=production node dist/server.js &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 5

# Démarrer Nginx
echo "🌐 Démarrage de Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Garder le container en vie et gérer les signaux
echo "✅ Application démarrée !"
echo "   - Frontend: http://localhost:80"
echo "   - Backend: http://localhost:3001"
echo "   - Prêt pour le trafic !"

# Attendre que l'un des processus se termine
wait -n

# Éteindre proprement
kill $BACKEND_PID $NGINX_PID 2>/dev/null
wait $BACKEND_PID $NGINX_PID 2>/dev/null

echo "🛑 Arrêt de l'application..."
