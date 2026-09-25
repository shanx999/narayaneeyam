'use strict';
const $=id=>document.getElementById(id),audio=$('audio');
const AUDIO_CACHE='narayaneeyam-audio-v1';
let catalog=[],chapter=null,shown=-1,lastLine=-1,loadId=0,downloads=null,installPrompt=null,swReady=false;
let preferences={mode:'both',size:innerWidth<700?28:36,follow:false,ml:false,en:false};
try{preferences={...preferences,...JSON.parse(localStorage.getItem('nar-preferences')||'{}')}}catch{}
function savePreferences(){try{localStorage.setItem('nar-preferences',JSON.stringify(preferences))}catch{}}
function status(text){$('status').textContent=text}
function selectMode(mode){preferences.mode=mode;$('reader').className='mode-'+mode;for(const m of ['original','recital','both'])$(m).setAttribute('aria-pressed',m===mode);savePreferences();applyMissing()}
function passageFor(n){return n<0?chapter?.opening_prayers?.[-n-1]:chapter?.verses?.[n-1]}
function playbackScenes(){return [...(chapter?.opening_prayers||[]),...(chapter?.scenes||[])]}
function applyMissing(){const missing=!!passageFor(shown)?.source_missing;$('reader').classList.toggle('opening-prayer',shown<0);$('reader').classList.toggle('missing-recital',missing);$('sourceNotice').hidden=!missing}
function sceneAt(t){return playbackScenes().find(s=>t>=s.display_start&&t<s.display_end)}
function highlight(){if(!chapter||!shown)return;const v=passageFor(shown),t=audio.currentTime,active=new Set(),originalLines=new Set(),recitalLines=new Set();let line=-1;
 v.lines.forEach((l,i)=>{if(t>=l.start_seconds&&t<l.end_seconds)line=i;l.tokens.forEach(p=>{if(p.cue_id!==undefined&&t>=p.start&&t<p.end){active.add(p.cue_id);recitalLines.add(i)}})});
 v.lines.forEach((l,i)=>{if(l.original_tokens?.some(p=>p.cue_ids.some(k=>active.has(k))))originalLines.add(i)});
 document.querySelectorAll('.word').forEach(el=>el.classList.toggle('current',el.dataset.cues.split(',').some(k=>active.has(+k))));
 document.querySelectorAll('.cell').forEach(el=>el.classList.toggle('active',(el.classList.contains('original')?originalLines:recitalLines).has(+el.dataset.line)));
 if(line!==lastLine&&line>=0&&preferences.follow)$('pairs').children[line]?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});lastLine=line;
}
function meanings(){const m=shown>0?chapter?.meanings?.[shown-1]:null;const available=!!m;$('ml').disabled=$('en').disabled=shown<0||!chapter?.meanings?.length;
 $('meaningAvailability').textContent=shown<0?'Meanings for the opening prayers are not yet included.':chapter?.meanings?.length?'Explanatory drafts, awaiting scholarly review.':'Meanings for this chapter are not yet included.';
 $('meanings').hidden=!available||!(preferences.ml||preferences.en);$('meaningMl').hidden=!preferences.ml;$('meaningEn').hidden=!preferences.en;
 $('meaningTitle').textContent=available?'Dasakam '+chapter.dasakam+' · Verse '+shown:'';$('meaningMl').textContent=m?.ml||'';$('meaningEn').textContent=m?.en||'';
}
function render(force=false){if(!chapter)return;const scene=sceneAt(audio.currentTime),n=scene?.verse||0;if(n===shown&&!force){highlight();return}shown=n;lastLine=-1;$('verse').value=n;$('pairs').replaceChildren();$('reader').hidden=!n;$('opening').hidden=!!n;$('heading').textContent=n<0?'Dasakam '+chapter.dasakam+' · '+passageFor(n).title:n?'Dasakam '+chapter.dasakam+' · Verse '+n+' of '+chapter.verses.length:'';
 applyMissing();$('opening').textContent=audio.currentTime>=chapter.scenes.at(-1).display_end?'Closing recitation · സമർപ്പണം':chapter.opening_prayers?.length?'Opening invocation · പ്രാരംഭ പ്രാർത്ഥനകൾ':'Opening recitation · Select Verse 1 to begin the text.';meanings();if(!n)return;
 passageFor(n).lines.forEach((l,i)=>{const pair=document.createElement('div');pair.className='pair';for(const type of n<0?['recital']:['original','recital']){if(type==='recital'&&passageFor(n).source_missing)continue;const b=document.createElement('button');b.className='cell '+type;b.dataset.line=i;b.lang='ml';b.title='Replay line '+(i+1);b.onclick=()=>seek(l.start_seconds,true);const label=document.createElement('span');label.className='lineno';label.textContent='Line '+(i+1);label.dataset.label=n<0?'Opening prayer':type==='original'?'Original':'Recital aid';label.lang='en';b.append(label);
 for(const p of type==='original'?l.original_tokens:l.tokens){const ids=type==='original'?p.cue_ids:(p.cue_id===undefined?[]:[p.cue_id]);if(!ids.length)b.append(document.createTextNode(p.text));else{const w=document.createElement('span');w.className='word';w.textContent=p.text;w.dataset.cues=ids.join(',');b.append(w)}}pair.append(b)}$('pairs').append(pair)});highlight();
}
function start(){audio.play().catch(()=>status('Tap the audio Play control to begin.'))}
function seek(t,play=false){audio.currentTime=Math.max(0,t);render(true);if(play)start()}
async function load(n,position=0){const id=++loadId;audio.pause();status('Loading Dasakam '+n+'…');try{let d;if(window.NARAYANEEYAM_OFFLINE_DATA){d=window.NARAYANEEYAM_OFFLINE_DATA.find(c=>c.dasakam===n);if(!d)throw Error('Chapter unavailable')}else{const r=await fetch('chapters/'+String(n).padStart(2,'0')+'.json');if(!r.ok)throw Error('Chapter unavailable');d=await r.json()}if(id!==loadId)return;chapter=d;shown=-1;$('chapter').value=n;audio.src=d.audio;$('verse').replaceChildren();for(const [value,text] of [[0,d.opening_prayers?.length?'Start recording':'Opening / closing'],...(d.opening_prayers||[]).map(p=>[p.verse,'Opening prayer '+p.prayer]),...d.scenes.map(s=>[s.verse,'Verse '+s.verse])]){const o=document.createElement('option');o.value=value;o.textContent=text;$('verse').append(o)}
 if(position){audio.addEventListener('loadedmetadata',()=>{if(id===loadId)seek(Math.min(position,Math.max(0,audio.duration-.2)))},{once:true})}
 render(true);status('');updateSaved();if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'Narayaneeyam · Dasakam '+n,artist:'A Narayana Iyer',album:'Parayana Sahayi',artwork:[{src:'assets/portrait.png',sizes:'512x512',type:'image/png'}]})}
 }catch(e){if(id===loadId)status('This chapter could not be opened. Connect to the internet and try again.')}}
async function updateSaved(){if(location.protocol==='file:'&&window.NARAYANEEYAM_OFFLINE_DATA){$('saved').textContent='Recordings included in this folder';$('save').disabled=$('saveAll').disabled=$('remove').disabled=true;$('storageStatus').textContent='This computer copy already contains all 100 recordings.';return}if(!('caches'in window)){ $('saved').textContent='Offline saving is not available in this browser.';return}try{const cache=await caches.open(AUDIO_CACHE),keys=await cache.keys();const set=new Set(keys.map(k=>new URL(k.url).pathname));const present=chapter&&set.has(new URL(chapter.audio,location.href).pathname);$('saved').textContent=present?'✓ Saved offline':'Not saved offline';$('save').disabled=!!downloads||!!present||!swReady;$('remove').disabled=!present||!!downloads;$('saveAll').disabled=!!downloads||!swReady;$('storageStatus').textContent=set.size+' of '+catalog.length+' recordings saved on this device.'}catch{ $('saved').textContent='Offline storage is unavailable.'}}
async function cacheChapter(meta,signal){const cache=await caches.open(AUDIO_CACHE),url=new URL(meta.audio,location.href).href;if(await cache.match(url))return;
 const response=await fetch(url,{cache:'no-store',signal});if(response.status!==200)throw Error('The full recording could not be downloaded.');const blob=await response.blob();if(meta.audio_bytes&&blob.size!==meta.audio_bytes)throw Error('The recording download was incomplete.');if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 // Store only complete files; the worker supplies byte ranges for iPhone seeking.
 await cache.put(url,new Response(blob,{status:200,headers:{'Content-Type':'audio/mpeg','Content-Length':String(blob.size)}}));
}
async function download(list){if(downloads)return;if(!swReady){status('Offline setup is not ready yet. Open the published HTTPS link, wait a moment and try again.');return}
 const controller=new AbortController();downloads=controller;$('progress').hidden=false;$('progress').value=0;$('cancelDownload').hidden=false;updateSaved();
 try{await navigator.storage?.persist?.();for(let i=0;i<list.length;i++){if(controller.signal.aborted)break;const m=list[i];$('downloadStatus').textContent='Saving Dasakam '+m.dasakam+' · '+(i+1)+' of '+list.length+'…';await cacheChapter(m,controller.signal);$('progress').value=Math.round((i+1)/list.length*100);await updateSaved()}
 $('downloadStatus').textContent=controller.signal.aborted?'Download stopped. Completed chapters remain saved.':'Saved offline. Keep this home-screen app to read and listen without internet.';
 }catch(e){$('downloadStatus').textContent=e.name==='AbortError'?'Download stopped. Completed chapters remain saved.':e.name==='QuotaExceededError'?'Your phone has insufficient free storage. Already saved chapters are available.':'Download interrupted. Reconnect and tap Save again; completed chapters will be skipped.'}
 finally{downloads=null;$('cancelDownload').hidden=true;updateSaved()}
}
for(const m of ['original','recital','both'])$(m).onclick=()=>selectMode(m);selectMode(['original','recital','both'].includes(preferences.mode)?preferences.mode:'both');
preferences.size=Math.max(24,Math.min(64,Number(preferences.size)||28));$('reader').style.setProperty('--size',preferences.size+'px');
for(const [id,delta]of [['smaller',-4],['larger',4]])$(id).onclick=()=>{preferences.size=Math.max(24,Math.min(64,preferences.size+delta));$('reader').style.setProperty('--size',preferences.size+'px');savePreferences()};
for(const id of ['follow','ml','en']){$(id).checked=preferences[id];$(id).onchange=()=>{preferences[id]=$(id).checked;savePreferences();meanings()}}
$('chapter').onchange=()=>load(+$('chapter').value);$('verse').onchange=()=>seek(playbackScenes().find(s=>s.verse===+$('verse').value)?.chant_start||0);
$('play').onclick=()=>audio.paused?start():audio.pause();$('replay').onclick=()=>seek(playbackScenes().find(s=>s.verse===shown)?.chant_start||0,true);
function stepPassage(delta){if(!chapter)return;const scenes=playbackScenes();let i=scenes.findIndex(s=>s.verse===shown);if(i<0)i=audio.currentTime>=scenes.at(-1).display_end?scenes.length:-1;seek(scenes[Math.max(0,Math.min(scenes.length-1,i+delta))].chant_start,!audio.paused)}
$('previous').onclick=()=>stepPassage(-1);$('next').onclick=()=>stepPassage(1);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('For more space, open from your home-screen icon and turn the phone sideways.')}catch{status('Turn the phone sideways for a wider reading view.')}};
$('save').onclick=()=>chapter&&download(catalog.filter(c=>c.dasakam===chapter.dasakam));$('saveAll').onclick=()=>download(catalog);$('cancelDownload').onclick=()=>downloads?.abort();
$('remove').onclick=async()=>{if(chapter&&!downloads){const c=await caches.open(AUDIO_CACHE);await c.delete(new URL(chapter.audio,location.href).href);updateSaved()}};
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else{$('help').open=true;$('help').scrollIntoView({block:'start',behavior:'smooth'})}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
audio.ontimeupdate=()=>{render();if(chapter){try{localStorage.setItem('nar-position',JSON.stringify({dasakam:chapter.dasakam,time:audio.currentTime}))}catch{}}};audio.onseeked=()=>render();audio.onloadedmetadata=()=>render(true);audio.onplay=()=>{$('play').textContent='❚❚ Pause';status('')};audio.onpause=()=>{$('play').textContent='▶ Play'};audio.onerror=()=>status('Recording unavailable. Connect to the internet, or save this chapter offline first.');
if('mediaSession'in navigator){for(const [name,handler]of Object.entries({play:start,pause:()=>audio.pause(),seekbackward:d=>seek(audio.currentTime-(d.seekOffset||10)),seekforward:d=>seek(audio.currentTime+(d.seekOffset||10)),seekto:d=>seek(d.seekTime)})){try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}}
async function setup(){try{if(window.NARAYANEEYAM_OFFLINE_CATALOG)catalog=window.NARAYANEEYAM_OFFLINE_CATALOG;else{const r=await fetch('catalog.json');if(!r.ok)throw Error();catalog=(await r.json()).chapters}for(const c of catalog){const o=document.createElement('option');o.value=c.dasakam;o.textContent='Dasakam '+c.dasakam;$('chapter').append(o)}let saved=null;try{saved=JSON.parse(localStorage.getItem('nar-position'))}catch{};const n=catalog.some(c=>c.dasakam===saved?.dasakam)?saved.dasakam:1;await load(n,saved?.time||0)}catch{status('The player could not load. Open its website link while connected to the internet.')}
 if('serviceWorker'in navigator&&location.protocol==='https:'){try{await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;swReady=true;updateSaved()}catch{status('Online playback is available, but offline setup failed. Try reopening in Safari or Chrome.')}}else{status(window.NARAYANEEYAM_OFFLINE_DATA?'Computer copy: audio is included in this folder. Use the website link for phone installation.':'Offline saving needs the published HTTPS website. Open that link in Safari or Chrome.')}updateSaved();
}
setup();
