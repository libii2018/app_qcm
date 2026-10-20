# Décisions Architecturelles - Application QCM

Ce document liste les choix techniques majeurs faits pendant le développement de l'application QCM.

## Structure du Projet

### ✅ Décision: Monorepo avec npm workspaces
- **Pourquoi**: Centraliser la logique partagée entre frontend et backend
- **Structure**: `/apps/web`, `/apps/api`, `/packages/shared`
- **Avantages**:
  - Partage facile des types TypeScript entre frontend et backend
  - Validation Zod partagée pour garantir la cohérence des données
  - Moteur d'apprentissage réutilisable dans les deux contextes

### ✅ Décision: Backend avec Node.js + Express + Prisma + SQLite
- **Base de données**: SQLite avec Prisma ORM
  - Simple à déployer (fichier unique)
  - Portable vers PostgreSQL si besoin (changer juste la config Prisma)
  - Parfait pour une application mono-utilisateur ou multi-utilisateurs légère
- **Authentification**: JWT + cookies httpOnly
  - Sécurisé contre XSS
  - Sessions persistantes
- **Validation**: Zod pour toutes les entrées/sorties
  - Typage fort
  - Documentation auto-générée

### ✅ Décision: Frontend avec React + Vite + TypeScript + Tailwind
- **Framework**: React 18 avec hooks
- **Build**: Vite pour rapidité de développement
- **UI**: Tailwind CSS avec thème clair/sombre
- **State Management**: React Query pour le cache API
- **PWA**: vite-plugin-pwa pour installation et mode hors ligne

### ✅ Décision: PWA avec IndexedDB pour le hors ligne
- **Service Worker**: Géré par vite-plugin-pwa
- **Stockage local**: Dexie (wrapper IndexedDB) pour:
  - Cache des quiz ouverts
  - File d'attente des réponses hors ligne
  - Synchronisation automatique au retour du réseau
- **Stratégie**: Network-first avec fallback sur le cache

## Algorithme d'Apprentissage

### ✅ Décision: SM-2 Adapté (Anki-like)
- **Base**: Algorithme SM-2 avec modifications
- **Formule**:
  ```
  nextInterval = previousInterval * easeFactor
  easeFactor = max(1.3, previousEaseFactor + 0.1)  // si correct
  easeFactor = max(1.3, previousEaseFactor - 0.2)  // si incorrect
  ```
- **Nouvelle question**: Intervalle initial = 1 jour
- **Première révision**: 1 jour
- **Deuxième révision**: 3 jours (1 * 3)
- **Facteur de facilité**: 2.5 par défaut, ajusté entre 1.3 et 2.5

### ✅ Décision: Priorisation des Questions
1. **Questions dues** (nextReviewDate < aujourd'hui)
2. **Points faibles** (taux de réussite < 70% sur 30 jours, minimum 5 réponses)
3. **Nouveaux quiz** (20% des questions)
4. **Entrelacement**: Max 2 questions consécutives du même tag/quiz

## Gestion des Médias

### ✅ Décision: Stockage sur disque avec streaming
- **Upload**: Multer pour gérer les fichiers
- **Streaming**: Support des requêtes Range pour audio/vidéo
- **Limites**: Configurables par type (5Mo image, 20Mo audio, 100Mo vidéo)
- **Vérification**: Type MIME réel vérifié
- **Référencement**: Dans le JSON: `media:<id>`, `media/filename.ext` ou URL absolue

## Validation et Schéma

### ✅ Décision: Zod pour la validation
- **Partagé**: Entre frontend (`@qcm/shared`) et backend
- **Schéma versionné**: `schemaVersion: 1` pour compatibilité future
- **JSON Schema**: Généré automatiquement pour l'IA
- **Vérification**: À chaque modification (éditeur JSON)

## Import/Export

### ✅ Décision: Format ZIP pour l'export complet
- **Structure ZIP**:
  ```
  quiz.json          # Métadonnées et contenu du quiz
  media/            # Dossier contenant tous les fichiers médias
    image1.jpg
    audio1.mp3
    video1.mp4
  ```
- **Import JSON seul**: Possible (médias référencés par URL)
- **Import ZIP**: Atomique (tout ou rien)
- **Sécurité**: Protection contre les zip malveillants (chemins `..`, taille décompressée limitée)

## Statistiques

### ✅ Décision: Calcul à la volée (pas de pré-agrégation)
- **Source**: Événements bruts `AnswerEvent` dans la base
- **Avantages**:
  - Toujours à jour
  - Flexibilité des filtres
  - Pas de données redondantes
- **Cache**: Résultats mis en cache côté client (React Query)

### ✅ Décision: Tableau de bord complet
- **Taux de réussite**: Global, par matière, par tag, par quiz
- **Évolution**: Courbes sur 7/30/90 jours
- **Heatmap**: Calendrier d'activité
- **Prévision**: Charge de révision des 7 prochains jours
- **Top erreurs**: Questions les plus ratées

## Sécurité

### ✅ Décision: Middleware de sécurité complet
- **helmet**: En-têtes de sécurité
- **CORS**: Configuré avec origin spécifique
- **Rate Limiting**: 100 requêtes/minute par défaut
- **Authentification**: Obligatoire sauf pour `/auth/*`
- **Validation**: Zod sur toutes les entrées
- **Type MIME**: Vérification réelle des fichiers uploadés

## Tests

### ✅ Décision: Stack de test complète
- **Frontend**: Vitest pour la logique métier
- **Backend**: Supertest pour les routes API
- **E2E**: Playwright pour le parcours principal
- **Couverture**: 80% minimum sur le shared package

## Déploiement

### ✅ Décision: Déploiement gratuit recommandé
- **Backend**: Render, Railway ou Fly.io
  - SQLite avec volume persistant
  - Upload de médias avec storage
- **Frontend**: Netlify ou Vercel
  - Build statique
  - PWA compatible

### ✅ Décision: Docker pour développement local
- **docker-compose.yml**: API + frontend
- **Volumes**: Persistance de la base SQLite et des médias
- **Réseau**: Communication entre containers

## Accessibilité

### ✅ Décision: Conformité WCAG 2.1 AA
- **Contraste**: Minimum 4.5:1
- **Navigation clavier**: Complète (tab, flèches, raccourcis)
- **Labels ARIA**: Sur tous les éléments interactifs
- **Texte alternatif**: Obligatoire pour les images
- **Transcriptions**: Pour audio/vidéo
- **Never color alone**: Les informations ne sont pas indiquées par la couleur seule

## Internationalisation

### ✅ Décision: Interface en français uniquement (pour v1)
- **Raison**: Cible initiale francophone
- **Prévu**: i18n avec next-intl pour v2
- **Contenu**: Les quiz peuvent être dans n'importe quelle langue

## Performances

### ✅ Décision: Optimisations clés
- **Pagination**: Sur toutes les listes (quiz, statistiques)
- **Streaming**: Pour audio/vidéo (requêtes Range)
- **Lazy loading**: Images et médias
- **Cache**: React Query + Service Worker
- **Bundle splitting**: Vite avec code splitting

## Synchronisation Hors Ligne

### ✅ Décision: File d'attente + Sync automatique
- **Storage**: IndexedDB via Dexie
- **Queue**: SyncQueue table pour les opérations à synchroniser
- **Strategy**: Retry exponentiel (2^n secondes)
- **Conflits**: Last-write-wins avec timestamps
- **Indicateurs**: UI pour l'état hors ligne

## Monitoring

### ✅ Décision: Logging structuré
- **Format**: JSON avec timestamp, level, context
- **Niveaux**: error, warn, info, debug
- **Middleware**: Express request logger
- **Frontend**: Console + reporting optionnel (Sentry pour production)

---

## Résumé des Technologies

| Catégorie | Technologie | Justification |
|----------|-------------|---------------|
| Frontend | React + TypeScript + Vite | Modern, rapide, typé |
| UI | Tailwind CSS | Utility-first, maintenable |
| Backend | Express + TypeScript | Simple, typé, scalable |
| Database | SQLite + Prisma | Portable, ORM moderne |
| Validation | Zod | Typage fort, partageable |
| State | React Query | Cache, devtools |
| PWA | vite-plugin-pwa | Standard, configurable |
| Storage | Dexie (IndexedDB) | Simple, typé |
| Auth | JWT + cookies | Sécurisé, stateless |
| Tests | Vitest + Supertest + Playwright | Couverture complète |
| CI/CD | GitHub Actions | Intégration facile |
| Deployment | Docker + Render/Netlify | Gratuit, professionnel |

---

## CHANGELOG des Décisions

- **2024-01-XX**: Créé ce document avec les décisions initiales
- **2024-01-XX**: Ajout des détails sur l'algorithme SM-2
- **2024-01-XX**: Clarification de la stratégie de synchronisation hors ligne

> ⚠️ **Note**: Certaines décisions peuvent évoluer. Consulter le README pour les dernières informations.
