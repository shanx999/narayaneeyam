'use strict';
const SHELL='narayaneeyam-shell-20260925-1',AUDIO='narayaneeyam-audio-v1';
const BASE=new URL('./',self.location.href).href;
const ASSETS=['./','index.html','style.css','app.js','manifest.webmanifest','catalog.json','START-HERE.txt','completeness.html','videos.html','videos.js','assets/portrait.png','assets/malayalam.ttf','assets/icon.svg','assets/icon-192.png','assets/icon-512.png',...Array.from({length:100},(_,i)=>'chapters/'+String(i+1).padStart(2,'0')+'.json')];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(SHELL);await c.addAll(ASSETS.map(p=>new URL(p,BASE).href));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('narayaneeyam-shell-')&&k!==SHELL)await caches.delete(k);await self.clients.claim()})()));
async function ranged(response,header){if(!header)return response;const blob=await response.blob(),size=blob.size,m=/^bytes=(\d*)-(\d*)$/.exec(header.trim());if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Number(m[2]):size-1):size-1;if(start>=size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});end=Math.min(end,size-1);return new Response(blob.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes'}})}
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||!req.url.startsWith(BASE))return;const url=new URL(req.url);event.respondWith((async()=>{
 if(url.pathname.endsWith('.mp3')){const c=await caches.open(AUDIO),cached=await c.match(req.url);if(cached)return ranged(cached,req.headers.get('Range'));return fetch(req)}
 const c=await caches.open(SHELL),cached=await c.match(req,{ignoreSearch:true});if(cached)return cached;if(req.mode==='navigate')return (await c.match(new URL('index.html',BASE).href))||fetch(req);return fetch(req);
 })())});
