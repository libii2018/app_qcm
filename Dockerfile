# Dockerfile pour l'application QCM
# Multi-stage build pour une image optimisée

# ============================================
# Stage 1: Build du frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copier les fichiers du monorepo
COPY package.json ./
COPY apps/web/package.json apps/web/.
COPY packages/shared/package.json packages/shared/.

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY apps/web apps/web/
COPY packages/shared packages/shared/

# Build du frontend
RUN cd apps/web && npm run build

# ============================================
# Stage 2: Build du backend
# ============================================
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copier les fichiers du monorepo
COPY package.json ./
COPY apps/api/package.json apps/api/.
COPY packages/shared/package.json packages/shared/.

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY apps/api apps/api/
COPY packages/shared packages/shared/

# Installer Prisma
RUN cd apps/api && npx prisma generate

# Build du backend
RUN cd apps/api && npm run build

# ============================================
# Stage 3: Image finale avec Nginx
# ============================================
FROM nginx:alpine

# Copier le fichier de configuration Nginx
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Créer le répertoire pour le frontend
RUN mkdir -p /usr/share/nginx/html

# Copier le build du frontend depuis le stage 1
COPY --from=frontend-builder /app/apps/web/dist /usr/share/nginx/html

# Copier le build du backend depuis le stage 2
COPY --from=backend-builder /app/apps/api/dist /usr/share/nginx/api
COPY --from=backend-builder /app/apps/api/prisma /usr/share/nginx/api/prisma
COPY --from=backend-builder /app/apps/api/node_modules /usr/share/nginx/api/node_modules

# Créer le répertoire pour les uploads
RUN mkdir -p /usr/share/nginx/api/uploads/media

# Créer le fichier .env par défaut
RUN echo "PORT=3001\nDATABASE_URL=file:/usr/share/nginx/api/prisma/dev.db\nJWT_SECRET=change-this-in-production\nCORS_ORIGIN=http://localhost:3000\nMEDIA_UPLOAD_DIR=/usr/share/nginx/api/uploads/media" > /usr/share/nginx/api/.env

# Copier le script d'entrée
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exposer les ports
EXPOSE 80

# Démarrer Nginx et le backend
CMD ["/entrypoint.sh"]
