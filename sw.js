const CACHE_NAME = 'remindme-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'no-cache' })));
            })
            .catch(err => {
                console.log('Cache failed:', err);
            })
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch with Cache Strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback
                return caches.match('./index.html');
            })
    );
});

// Push Notification
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Time for your reminder!',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            {
                action: 'complete',
                title: 'Mark Complete'
            },
            {
                action: 'snooze',
                title: 'Snooze'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('RemindMe', options)
    );
});

// Notification Click
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'complete') {
        // Handle complete action
        console.log('Marked as complete');
    } else if (event.action === 'snooze') {
        // Handle snooze action
        console.log('Snoozed');
    } else {
        // Open app
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Background Sync (for future use)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-reminders') {
        event.waitUntil(syncReminders());
    }
});

async function syncReminders() {
    // Placeholder for syncing reminders in the future
    console.log('Syncing reminders...');
}
