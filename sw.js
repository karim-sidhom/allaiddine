const CACHE_NAME = 'farhoum-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES).catch(function(){ /* ignore missing files */ });
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// App-shell strategy: serve index.html/shell from cache first (works offline),
// but let live API calls (Quran, hadith, Wikipedia, prayer times, maps...) always hit the network.
self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);

  // Only handle GET requests for our own origin's shell files; everything else goes straight to network.
  if(req.method !== 'GET' || url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      var fetchPromise = fetch(req).then(function(networkRes){
        if(networkRes && networkRes.status === 200){
          var resClone = networkRes.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return networkRes;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
