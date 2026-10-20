#!/bin/bash

# Script pour tester manuellement l'API

cd /home/libii/Bureau/Projets/QCM/qcm

# Tuer les processus existants
pkill -f "node.*server" || true

# Attendre que le port soit libre
sleep 2

# Démarrer le backend en arrière-plan
cd apps/api
npm run dev:api &
API_PID=$!

# Attendre que le backend soit prêt
sleep 5

# Tester l'endpoint health
curl -s http://localhost:3001/api/health | head -20

# Tester la création d'un utilisateur
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "Password123"}' | head -20

# Tester la connexion
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "Password123"}')

echo "Login response: $LOGIN_RESPONSE"

# Arrêter le backend
kill $API_PID 2>/dev/null || true
