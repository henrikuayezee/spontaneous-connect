/**
 * Service Worker for SpontaneousConnect PWA
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'spontaneous-connect-v1.0.0';
const DYNAMIC_CACHE = 'spontaneous-connect-dynamic-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Resources to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should use network-first strategy
const API_ENDPOINTS = [
  'https://*/auth/v1/',
  'https://*/rest/v1/',
  'https://api.emailjs.com/'
];

// Resources that should use cache-first strategy
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css|woff|woff2|ttf|eot)$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Failed to clean up caches:', error);
      })
  );
});

// Fetch event - handle network requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine caching strategy based on request
  const strategy = getCachingStrategy(request);

  event.respondWith(
    handleRequest(request, strategy)
      .catch((error) => {
        console.error('[SW] Request failed:', error);
        return handleOfflineResponse(request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'schedule-call') {
    event.waitUntil(syncScheduleCall());
  } else if (event.tag === 'call-history') {
    event.waitUntil(syncCallHistory());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: 'Time to call your partner!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'call-now',
        title: 'Call Now',
        icon: '/icons/action-call.png'
      },
      {
        action: 'remind-later',
        title: 'Remind Later',
        icon: '/icons/action-later.png'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }

  event.waitUntil(
    self.registration.showNotification('SpontaneousConnect', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'call-now') {
    // Open app and trigger call
    event.waitUntil(
      clients.openWindow('/?action=call-now')
    );
  } else if (event.action === 'remind-later') {
    // Schedule another notification
    event.waitUntil(
      scheduleReminderNotification(15) // 15 minutes later
    );
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      }));
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Helper Functions

function getCachingStrategy(request) {
  const url = new URL(request.url);

  // API requests - network first
  if (API_ENDPOINTS.some(pattern => url.href.match(pattern))) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Static assets - cache first
  if (CACHE_FIRST_PATTERNS.some(pattern => url.pathname.match(pattern))) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // HTML pages - stale while revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
    default:
      return networkFirst(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await cacheResponse(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      await cacheResponse(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cache if network fails
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  // Always fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cacheResponse(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Ignore network errors in background
    });

  // Return cached version immediately if available
  if (cached) {
    // Don't await the fetch promise
    fetchPromise;
    return cached;
  }

  // Wait for network if no cached version
  return fetchPromise;
}

async function cacheResponse(request, response) {
  // Only cache GET requests with OK status
  if (request.method === 'GET' && response.ok) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.put(request, response);
  }
}

async function handleOfflineResponse(request) {
  const url = new URL(request.url);

  // Return cached version if available
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  // Return offline page for HTML requests
  if (request.headers.get('accept')?.includes('text/html')) {
    return caches.match('/offline.html') || createOfflineResponse();
  }

  // Return placeholder for images
  if (request.headers.get('accept')?.includes('image/')) {
    return caches.match('/icons/offline-image.png') || createPlaceholderImage();
  }

  // Return error response for other requests
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

function createOfflineResponse() {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Offline - SpontaneousConnect</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui; text-align: center; padding: 2rem; }
          .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="offline-icon">📱</div>
        <h1>You're offline</h1>
        <p>SpontaneousConnect isn't available right now. Check your connection and try again.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function createPlaceholderImage() {
  // Return a simple SVG placeholder
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#f3f4f6"/>
      <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="system-ui" font-size="14" fill="#6b7280">
        Image unavailable offline
      </text>
    </svg>
  `;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Background sync functions
async function syncScheduleCall() {
  try {
    console.log('[SW] Syncing schedule call data');

    // Get pending schedule requests from IndexedDB
    const pendingRequests = await getPendingRequests('schedule-call');

    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          await removePendingRequest('schedule-call', request.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync schedule call:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncCallHistory() {
  try {
    console.log('[SW] Syncing call history data');

    const pendingRequests = await getPendingRequests('call-history');

    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          await removePendingRequest('call-history', request.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync call history:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Utility functions for IndexedDB operations
async function getPendingRequests(store) {
  // Implementation would use IndexedDB to store/retrieve pending requests
  // For now, return empty array
  return [];
}

async function removePendingRequest(store, id) {
  // Implementation would remove the request from IndexedDB
  console.log(`[SW] Removing pending request ${id} from ${store}`);
}

async function scheduleReminderNotification(delayMinutes) {
  // Implementation would schedule a notification using the Notifications API
  console.log(`[SW] Scheduling reminder notification in ${delayMinutes} minutes`);
}

async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
}

async function clearCache(cacheName) {
  await caches.delete(cacheName || DYNAMIC_CACHE);
}

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }

  return status;
}