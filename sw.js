// Simple PWA cache-first SW (v2)
const CACHE = 'athletx-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(asset=> new Request(asset, {cache:'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
  }
});
