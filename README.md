# QCM App - Application d'apprentissage par Quiz

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

**QCM App** est une application web complète pour créer, partager et apprendre via des quiz à choix multiples. Parfaite pour l'apprentissage des langues, des mathématiques, de l'histoire, des sciences, et bien plus encore.

## ✨ Fonctionnalités

### 📚 Création de Quiz
- **Éditeur visuel** : Interface intuitive pour créer des quiz
- **Éditeur JSON** : Modification directe du JSON avec validation en temps réel
- **Synchronisation** : Les deux éditeurs restent toujours synchronisés
- **Types de contenu** : Texte (Markdown), Images, Audio, Vidéo
- **Questions combinées** : Une question peut avoir plusieurs médias (ex: vidéo + texte)
- **Réponses** : Unique ou multiple, avec explications et indices

### 🎯 Système d'Apprentissage
- **Répétition espacée** : Algorithme SM-2 adapté pour optimiser la mémorisation
- **Révision des erreurs** : Les questions ratées reviennent plus vite
- **Points faibles** : Détection automatique par tag/matière
- **Entrelacement** : Mélange des sujets pour un apprentissage efficace
- **Objectifs quotidiens** : Streak et suivi de progression
- **Session recommandée** : Génération automatique basée sur votre historique

### 📊 Statistiques Complètes
- **Taux de réussite** : Global, par matière, par tag, par quiz
- **Évolution** : Courbes sur 7/30/90 jours
- **Temps de réponse** : Temps moyen par question
- **Calendrier** : Heatmap d'activité
- **Prévisions** : Charge de révision des 7 prochains jours
- **Top erreurs** : Questions les plus souvent ratées

### 📱 Expérience Utilisateur
- **PWA** : Installation sur téléphone et utilisation hors ligne
- **Responsive** : Design mobile-first qui s'adapte à toutes les tailles
- **Thème** : Clair/Sombre avec suivi des préférences système
- **Accessibilité** : Navigation clavier, contrastes ≥ 4.5:1, labels ARIA
- **Raccourcis** : Clavier (1-9 pour répondre, Entrée pour valider)

### 🔒 Sécurité & Vie Privée
- **Aucun serveur requis** : Tout est stocké localement (SQLite) ou dans votre navigateur
- **Données privées** : Vos quiz et statistiques vous appartiennent
- **Import/Export** : Sauvegarde et restauration complète de vos données
- **Authentification** : Comptes utilisateurs avec mot de passe haché

## 🏗️ Architecture

```
qcm/
├── apps/
│   ├── web/          # Frontend React + Vite + PWA
│   │   ├── src/
│   │   │   ├── components/  # Composants React
│   │   │   ├── pages/        # Pages de l'application
│   │   │   ├── contexts/    # Contextes React
│   │   │   ├── hooks/       # Hooks personnalisés
│   │   │   ├── lib/         # Client API, utilitaires
│   │   │   ├── types/       # Types TypeScript
│   │   │   ├── db.ts        # IndexedDB via Dexie
│   │   │   ├── App.tsx      # Routing principal
│   │   │   └── main.tsx     # Point d'entrée
│   │   ├── public/         # Assets statiques
│   │   ├── vite.config.ts  # Configuration Vite
│   │   └── ...
│   └── api/          # Backend Node.js + Express
│       ├── src/
│       │   ├── controllers/ # Contrôleurs Express
│       │   ├── routes/      # Routes API
│       │   ├── middleware/  # Middleware
│       │   ├── config/      # Configuration
│       │   ├── server.ts    # Point d'entrée
│       │   └── ...
│       └── prisma/
│           ├── schema.prisma  # Schéma de la base
│           └── seed.ts         # Données initiales
└── packages/
    └── shared/        # Logique partagée
        ├── src/
        │   ├── types/       # Types TypeScript
        │   ├── schemas/     # Schémas Zod
        │   ├── learning/    # Algorithme d'apprentissage
        │   ├── stats/       # Calcul des statistiques
        │   ├── utils/       # Fonctions utilitaires
        │   └── index.ts     # Exports
        └── package.json
└── docs/
    ├── README.md       # Ce document
    ├── DECISIONS.md    # Décisions architecturelles
    └── quiz.schema.json # Schéma JSON pour l'IA
```

### Structure des Données

#### Schéma JSON d'un Quiz

```json
{
  "schemaVersion": 1,
  "id": "quiz-001",
  "title": "Irregular verbs - niveau B1",
  "subject": "Anglais",
  "tags": ["grammaire", "verbes"],
  "difficulty": 2,
  "questions": [
    {
      "id": "q1",
      "prompt": [
        { "type": "text", "value": "Quel est le prétérit de « go » ?" }
      ],
      "options": [
        { "id": "a", "content": [{ "type": "text", "value": "goed" }], "correct": false },
        { "id": "b", "content": [{ "type": "text", "value": "went" }], "correct": true }
      ],
      "multiple": false,
      "hint": "Verbe irrégulier",
      "explanation": "« go » devient « went » au prétérit.",
      "tags": ["verbes irréguliers"],
      "difficulty": 2
    }
  ]
}
```

#### Types de Contenu Supportés

| Type | Format | Description |
|------|--------|-------------|
| text | Markdown | Texte avec mise en forme |
| image | png, jpg, webp | Image avec texte alternatif obligatoire |
| audio | mp3, wav, ogg | Audio avec boutons de contrôle |
| video | mp4, webm | Vidéo avec lecteur intégré |

#### Référencement des Médias

Dans le JSON, les médias peuvent être référencés de 3 façons :
- `"src": "media/cat.jpg"` - Chemin relatif dans un fichier ZIP
- `"src": "media:<uuid>"` - ID d'un média uploadé via l'API
- `"src": "https://..."` - URL absolue (externe)

## 🚀 Installation

### Prérequis

- Node.js 20+ (LTS recommandé)
- npm 10+
- Git
- SQLite (intégré, pas d'installation requise)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-repo/qcm.git
cd qcm

# Installer les dépendances (monorepo)
npm install

# Initialiser la base de données SQLite
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
cd ../..
```

### Configuration

#### Variables d'Environnement (Backend)

Créer un fichier `.env` dans `apps/api/` basé sur `.env.example` :

```env
# Port du serveur
PORT=3001

# URL de la base de données SQLite
DATABASE_URL="file:./dev.db"

# Clé secrète pour JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Configuration CORS
CORS_ORIGIN=http://localhost:3000

# Répertoire d'upload des médias
MEDIA_UPLOAD_DIR=./uploads/media

# Limites de taille des médias (en Mo)
MAX_IMAGE_SIZE_MB=5
MAX_AUDIO_SIZE_MB=20
MAX_VIDEO_SIZE_MB=100

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Configuration Frontend

Dans `apps/web/.env` :

```env
VITE_API_URL=http://localhost:3001
```

## 🏃 Démarrage

### Développement

```bash
# Démarrer frontend et backend ensemble
npm run dev

# Ou séparément
npm run dev:api    # Backend sur http://localhost:3001
npm run dev:web    # Frontend sur http://localhost:3000
```

### Production

```bash
# Build
npm run build

# Démarrer le serveur de production
npm run start:api

# Le frontend est servi par le backend en production
```

## 📦 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Démarre frontend + backend en développement |
| `npm run build` | Build du frontend |
| `npm run start:api` | Démarre le backend en production |
| `npm run lint` | Lint de tout le code |
| `npm run test` | Exécute tous les tests |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm run schema` | Génère quiz.schema.json |
| `npm run seed` | Remplit la base avec des données de test |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:migrate` | Applique les migrations |
| `npm run prisma:studio` | Ouvre Prisma Studio |

## 🎯 Endpoints API

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Informations de l'utilisateur connecté

### Quiz
- `GET /api/quizzes` - Liste des quiz (avec pagination et filtres)
- `POST /api/quizzes` - Créer un quiz
- `GET /api/quizzes/:id` - Obtenir un quiz
- `PUT /api/quizzes/:id` - Mettre à jour un quiz
- `DELETE /api/quizzes/:id` - Supprimer un quiz
- `POST /api/quizzes/:id/duplicate` - Dupliquer un quiz
- `POST /api/quizzes/import` - Importer un quiz (JSON ou ZIP)
- `GET /api/quizzes/:id/export` - Exporter un quiz (JSON ou ZIP)

### Médias
- `POST /api/media` - Uploader un média
- `GET /api/media/:id` - Obtenir un média (streaming)
- `DELETE /api/media/:id` - Supprimer un média

### Réponses
- `POST /api/answers` - Enregistrer une réponse
- `POST /api/answers/batch` - Enregistrer plusieurs réponses

### Statistiques
- `GET /api/stats` - Obtenir les statistiques (avec filtres)

### Aujourd'hui
- `GET /api/today` - Obtenir la session recommandée du jour

### Sauvegarde
- `GET /api/backup` - Créer une sauvegarde
- `POST /api/backup/restore` - Restaurer une sauvegarde

### Santé
- `GET /api/health` - Vérifier la santé de l'API

## 📊 Algorithme d'Apprentissage

L'application utilise une version adaptée de l'algorithme **SM-2** (utilisé par Anki) :

### Variables
- **Intervalle (days)**: Nombre de jours avant la prochaine révision
- **Facteur de facilité (easeFactor)**: Entre 1.3 et 2.5, ajusté selon les performances
- **Compteur de répétitions**: Nombre de fois que la question a été vue

### Règle de Répétition

1. **Première réponse** : Intervalle = 1 jour
2. **Réponse correcte** :
   - Si première répétition: Intervalle = 1 jour
   - Sinon: Intervalle = Intervalle × easeFactor
   - easeFactor = min(2.5, easeFactor + 0.1)
3. **Réponse incorrecte** :
   - Intervalle = 1 jour
   - easeFactor = max(1.3, easeFactor - 0.2)
   - Reset du compteur de répétitions

### Priorisation

Les questions sont proposées selon cet ordre de priorité :
1. **Questions dues** (nextReviewDate < aujourd'hui)
2. **Points faibles** (taux de réussite < 70% sur 30 jours)
3. **Nouvelles questions** (20% du total)
4. **Entrelacement** : Pas plus de 2 questions consécutives du même tag/quiz

## 🔧 Technologies Utilisées

### Frontend
- **React 18** + **TypeScript** - Framework principal
- **Vite** - Build tool rapide
- **Tailwind CSS** - Styling utility-first
- **React Query** - Gestion du cache API
- **Recharts** - Graphiques statistiques
- **CodeMirror** - Éditeur JSON avec coloration
- **Dexie** - Wrapper IndexedDB
- **vite-plugin-pwa** - Support PWA

### Backend
- **Node.js 20** + **Express** - Serveur API
- **TypeScript** - Typage fort
- **Prisma** - ORM pour SQLite
- **SQLite** - Base de données (portable vers PostgreSQL)
- **Zod** - Validation des données
- **Multer** - Upload de fichiers
- **bcrypt** - Hachage des mots de passe
- **helmet** + **cors** + **rate-limit** - Sécurité

### DevOps
- **Docker** + **docker-compose** - Containerisation
- **Vitest** - Tests frontend
- **Supertest** - Tests API
- **Playwright** - Tests E2E
- **ESLint** + **Prettier** - Linting et formatage

## 📁 Exemples de Quiz

Deux quiz d'exemple sont inclus dans la base de données après le seed :

1. **Verbes irréguliers - Niveau B1** (`quiz-001`)
   - Texte seulement
   - 5 questions sur les verbes irréguliers anglais
   - Difficulté: Moyenne

2. **Vocabulaire des animaux - avec médias** (`quiz-002`)
   - Multimédia (images + audio)
   - 3 questions avec différents types de contenu
   - Difficulté: Facile

## 🎓 Utilisation

### Créer un Quiz
1. Allez dans **Bibliothèque** → **Nouveau Quiz**
2. Utilisez l'éditeur visuel pour ajouter des questions
3. Ou collez directement le JSON dans l'éditeur JSON
4. Sauvegardez et testez votre quiz

### Faire un Quiz
1. Allez dans **Bibliothèque** et sélectionnez un quiz
2. Cliquez sur **Jouer**
3. Répondez aux questions (utilisez les raccourcis clavier 1-9)
4. Consultez vos résultats à la fin

### Session du Jour
1. Allez dans **Aujourd'hui**
2. L'application propose automatiquement une session basée sur :
   - Les questions à réviser
   - Vos points faibles
   - Quelques nouvelles questions
3. Cliquez sur **Commencer la session recommandée**

### Statistiques
1. Allez dans **Statistiques**
2. Consultez vos performances globales
3. Filtrez par matière, tag ou période
4. Identifiez vos points faibles

## 📱 PWA (Progressive Web App)

L'application est une **PWA** et peut être installée sur :
- **Android** : via Chrome (Ajouter à l'écran d'accueil)
- **iOS** : via Safari (Partager → Sur l'écran d'accueil)
- **Windows/macOS** : via Edge/Chrome

### Fonctionnalités Hors Ligne
- ✅ Accès aux quiz déjà ouverts
- ✅ Enregistrement des réponses dans une file d'attente
- ✅ Synchronisation automatique au retour du réseau
- ✅ Indication visuelle de l'état hors ligne

## 🔒 Sécurité

- **Hashing** : bcrypt avec salt (10 rounds)
- **Authentification** : JWT dans cookies httpOnly
- **CSRF** : Protection via SameSite cookies
- **CORS** : Configurable avec origine spécifique
- **Rate Limiting** : 100 requêtes/minute par défaut
- **Validation** : Zod sur toutes les entrées
- **Upload** : Vérification du type MIME réel
- **SQL Injection** : Prévention via Prisma ORM
- **XSS** : Prévention via désinfection des entrées

## 🌐 Déploiement

### Option 1: Local avec Docker (Recommandé pour développement)

```bash
# Créer les images
docker-compose build

# Démarrer les services
docker-compose up

# Accéder à :
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
```

### Option 2: Production sur Render + Netlify (Gratuit)

#### Backend (Render)
1. Créer un nouveau **Web Service** sur Render
2. Connecter votre dépôt GitHub
3. Configurer les variables d'environnement
4. Déployer

#### Frontend (Netlify)
1. Créer un nouveau site sur Netlify
2. Connecter votre dépôt
3. Configurer `VITE_API_URL` pour pointer vers votre backend Render
4. Déployer

### Option 3: Auto-hébergement

```bash
# Build du frontend
cd apps/web
npm run build

# Serveur statique (Netlify, Vercel, etc.)
# ou avec Node.js
npm install -g serve
serve -s dist

# Backend
cd apps/api
npm run build
npm run start:api
```

## 📚 Générer des Quiz avec une IA

Vous pouvez utiliser le schéma JSON (`docs/quiz.schema.json`) pour demander à une IA de générer des quiz :

```
Tu es un professeur d'anglais. Génère un quiz de 10 questions sur les verbes irréguliers.
Le quiz doit respecter le schéma JSON suivant : [COLLER LE CONTENU DE quiz.schema.json]
```

Exemple de prompt pour ChatGPT :
```
Crée un quiz QCM sur le vocabulaire des animaux en français pour des enfants de 8 ans.
Le quiz doit avoir 5 questions avec images (utilise des URLs de Wikimedia Commons).
Formate la réponse selon ce schéma JSON : [SCHEMA]
```

## 🐛 Dépannage

### Problèmes courants

#### Le backend ne démarre pas
- Vérifiez que le fichier `.env` existe dans `apps/api/`
- Exécutez `npx prisma generate` après avoir créé le `.env`
- Vérifiez que la base SQLite existe : `ls apps/api/prisma/dev.db`

#### Problème CORS
- Vérifiez que `CORS_ORIGIN` dans `.env` inclut l'URL de votre frontend
- Exemple : `CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000`

#### Problème de connexion
- Vérifiez que l'utilisateur de test a été créé : `npx prisma db seed`
- Email: `demo@example.com`, Mot de passe: `password123`

#### Problème PWA
- Vérifiez que le service worker est enregistré (onglet Application dans Chrome DevTools)
- Assurez-vous que le site est servi via HTTPS en production

## 📜 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 🙏 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Forker le projet
2. Créer une branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committer vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pousser vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème, veuillez ouvrir une **Issue** sur le dépôt GitHub.

---

**Fait avec ❤️ et TypeScript**

*© 2024 - QCM App*
