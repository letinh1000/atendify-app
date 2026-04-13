const CACHE_NAME = 'atendify-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/style.css',
    '/app.js',
    '/admin.js',
    '/checkin.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Cài đặt Service Worker và Cache tài nguyên
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Xóa bộ nhớ cache cũ khi có phiên bản mới
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Chặn các request để fetch từ Cache nếu offline
self.addEventListener('fetch', (event) => {
    // Không chặn các request liên quan đến Firebase/Firestore API
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            // Hiển thị fallback (nếu có, ví dụ trang offline.html)
        })
    );
});
