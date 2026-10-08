'use strict';
// Network-only: no shell precache, offline audio storage or cache access.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET')event.respondWith(fetch(event.request,{cache:'no-store'}));
});
