/**
 * Service Worker pour la PWA QCM
 * 
 * Fonctionnalités :
 * - Mise en cache de l'application pour le mode hors ligne
 * - Synchronisation des réponses données hors ligne
 * - Notification des mises à jour
 */

/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Nom de la cache pour les assets de l'application
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'qcm-app-v1';
const API_CACHE_NAME = 'qcm-api-v1';
const MEDIA_CACHE_NAME = 'qcm-media-v1';

// Liste des fichiers à précacher
const precacheFiles = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// Initialiser le service worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installation en cours...');
  
  // Précacher les assets principaux
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(precacheFiles);
    })
  );
});

// Activer le service worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activation...');
  
  // Supprimer les anciennes caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME && name !== MEDIA_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Gestion du fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pour les requêtes API, utiliser NetworkFirst avec fallback sur la cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Si on a une réponse en cache et que c'est une requête GET, retourner la réponse cache
        if (response && event.request.method === 'GET') {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request).then((response) => {
          // Si la requête a réussi, mettre en cache
          if (response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Si la requête échoue, retourner la réponse cache si disponible
          return response || caches.match(event.request).then((cached) => cached || new Response(null, { status: 503 }));
        });
      })
    );
  }

  // Pour les médias, utiliser CacheFirst
  if (url.pathname.startsWith('/media/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(MEDIA_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }

  // Pour les autres requêtes, utiliser le cache normal
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Gestion de la synchronisation en arrière-plan pour les réponses hors ligne
const answerQueue = new BackgroundSyncPlugin('answerQueue', {
  maxRetentionTime: 24 * 60, // 24 heures
});

// Écouter les événements de synchronisation
self.addEventListener('sync', (event) => {
  if (event.tag === 'answerQueue') {
    console.log('[ServiceWorker] Synchronisation des réponses hors ligne...');
    event.waitUntil(syncAnswers());
  }
});

// Synchroniser les réponses en attente
async function syncAnswers() {
  const queue = await (answerQueue as any).getQueue();
  const entries = await queue.getAll();

  if (entries.length === 0) {
    console.log('[ServiceWorker] Aucune réponse à synchroniser');
    return;
  }

  console.log(`[ServiceWorker] Synchronisation de ${entries.length} réponse(s)...`);

  for (const entry of entries) {
    try {
      const { request, timestamp } = entry;
      const requestClone = request.clone();
      
      // Attendre la connexion réseau
      await self.registration.sync.register('answerQueue');

      // Envoyer la requête
      const response = await fetch(requestClone);

      if (response.ok) {
        // Supprimer de la queue si réussi
        await queue.delete(entry);
        console.log('[ServiceWorker] Réponse synchronisée avec succès');
      } else {
        console.error('[ServiceWorker] Erreur lors de la synchronisation:', response.status);
      }
    } catch (error) {
      console.error('[ServiceWorker] Erreur lors de la synchronisation:', error);
    }
  }
}

// Gestion des messages depuis le client
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'SYNC_ANSWERS') {
    console.log('[ServiceWorker] Message de synchronisation reçu');
    event.waitUntil(syncAnswers());
  }
});

// Notifications Push (optionnel)
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  
  if (data) {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/pwa-192x192.png',
        data: data.url,
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data)
    );
  }
});
