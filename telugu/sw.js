'use strict';
// Retire the former offline edition without deleting readers' stored copies.
const ROOT=new URL('../',self.location.href);
const STREAM=new URL('listen/',ROOT).href;
function retired(url){
 const target=new URL(url);
 return target.origin===ROOT.origin&&target.pathname.startsWith(ROOT.pathname)
   &&target.pathname!==new URL(STREAM).pathname.slice(0,-1)
   &&!target.pathname.startsWith(new URL(STREAM).pathname);
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await self.clients.claim();
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 await Promise.all(windows.filter(client=>retired(client.url)).map(async client=>{
  try{await client.navigate(STREAM)}catch{/* A closed or offline window can retry on its next visit. */}
 }));
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(request.mode==='navigate'&&retired(request.url)){
  event.respondWith(Promise.resolve(Response.redirect(STREAM,302)));return;
 }
 // Preserve streaming requests and their Range headers. Do not use old caches.
 event.respondWith(fetch(request,{cache:'no-store'}));
});
