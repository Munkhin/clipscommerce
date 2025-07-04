// ClipsCommerce Service Worker v1.0
const CACHE_NAME = 'clipscommerce-v1';
const OFFLINE_URL = '/offline';

// Core assets to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/landing',
  '/landing/pricing',
  '/landing/terms-of-service',
  '/sign-in',
  '/sign-up',
  '/offline',
  // Static assets
  '/images/ChatGPT Image Jun 1, 2025, 07_27_54 PM.png',
  // Fonts and CSS will be cached automatically by the browser
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core resources');
      return cache.addAll(CACHE_URLS);
    }).catch((error) => {
      console.error('[SW] Failed to cache resources during install:', error);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests and API calls
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }

      // Network first for non-cached resources
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache the response for future use
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          console.log('[SW] Caching new resource:', event.request.url);
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((error) => {
        console.log('[SW] Network failed, serving offline page:', error);
        
        // For navigation requests, serve the offline page
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        
        // For other requests, just fail
        throw error;
      });
    })
  );
});

// Background sync for form submissions when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'contact-form') {
    event.waitUntil(syncContactForm());
  }
});

// Handle contact form sync
async function syncContactForm() {
  try {
    const formData = await getStoredFormData();
    if (formData) {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await clearStoredFormData();
        console.log('[SW] Contact form synced successfully');
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync contact form:', error);
  }
}

// Helper functions for form data storage
async function getStoredFormData() {
  return new Promise((resolve) => {
    // Implementation would depend on IndexedDB or localStorage
    resolve(null);
  });
}

async function clearStoredFormData() {
  // Clear stored form data after successful sync
  return Promise.resolve();
}