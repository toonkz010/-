const CACHE = 'pricetag-v4';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // หน้าเว็บ: ลองออนไลน์ก่อน (ได้เวอร์ชันล่าสุดเสมอ) ถ้าออฟไลน์ใช้ของที่เก็บไว้
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // ไฟล์ในโดเมนเดียวกัน + ฟอนต์ Google: ใช้ที่เก็บไว้ก่อน แล้วอัปเดตเบื้องหลัง
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isFont || url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const cp = res.clone();
            caches.open(CACHE).then(c => c.put(req, cp));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
