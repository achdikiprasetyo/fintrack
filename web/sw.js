const CACHE_NAME = 'fintrack-cache-v93';
const STATIC_ASSETS = [
  '/finance/',
  '/finance/index.html',
  '/finance/css/app.css?v=2.8',
  '/finance/css/vendor.css',
  '/finance/js/audio-soundfx.js?v=2.4',
  '/finance/js/app-core.js?v=3.2',
  '/finance/js/toast.js',
  '/finance/js/pwa-init.js',
  '/finance/js/forex-usd.js?v=2.3',
  '/finance/js/analytics-charts.js?v=2.3',
  '/finance/js/tabs-engine.js',
  '/finance/js/receipt-simulation.js?v=2.3',
  '/finance/js/receipt-scanner.js?v=2.3',
  '/finance/js/ui-enhancers.js',
  '/finance/js/period-filter.js',
  '/finance/js/statement-export.js',
  '/finance/vendor/echarts.min.js',
  '/finance/vendor/flatpickr.min.js',
  '/finance/vendor/flatpickr.dark.min.css',
  '/finance/manifest.webmanifest',
  '/finance/icons/favicon.png',
  '/finance/icons/apple-touch-icon.png',
  '/finance/icons/icon-192.png',
  '/finance/icons/icon-512.png',
  '/finance/icon-192.png'
];

function openSharedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fintrack_shared_store', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('shared_items')) {
        db.createObjectStore('shared_items', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeSharedReceipt(data) {
  const db = await openSharedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('shared_items', 'readwrite');
    const store = tx.objectStore('shared_items');
    store.put({ id: 'pending_receipt', ...data });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Handle Web Share Target POST request from Bank / Share sheet
  if (event.request.method === 'POST' && url.pathname.includes('/share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const receiptFile = formData.get('receipt') || formData.get('file') || formData.get('image');
        const text = formData.get('text') || '';
        const title = formData.get('title') || '';

        let fileData = null;
        if (receiptFile && typeof receiptFile === 'object') {
          const buffer = await receiptFile.arrayBuffer();
          fileData = {
            name: receiptFile.name || 'receipt.jpg',
            type: receiptFile.type || 'image/jpeg',
            buffer: buffer
          };
        }

        await storeSharedReceipt({
          file: fileData,
          text: text,
          title: title,
          timestamp: Date.now()
        });

        return Response.redirect('/finance/?shared_receipt=1', 303);
      } catch (err) {
        console.error('Share target handling error:', err);
        return Response.redirect('/finance/', 303);
      }
    })());
    return;
  }

  // Bypass cache for external APIs & Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Network-first for HTML pages, JavaScript, and CSS assets to ensure instant updates
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((res) => res || (event.request.mode === 'navigate' ? caches.match('/finance/index.html') : null)))
    );
    return;
  }

  // Stale-while-revalidate for images and icons
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Fetch in background to update cache
        fetch(event.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
