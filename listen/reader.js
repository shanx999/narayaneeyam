'use strict';
const $=id=>document.getElementById(id),audio=$('audio');
let catalog=[],chapter=null,shown=-1,lastLine=-1,loadId=0,requestedChapter=1,ready=false;
let preferences={script:'ml',marking:'underline',mode:innerWidth<600?'recital':'both',size:innerWidth<700?28:36,follow:true,ml:false,en:false};
try{preferences={...preferences,...JSON.parse(localStorage.getItem('nar-streaming-preferences')||'{}')}}catch{}
let followFrame=0,forceFollow=false;
function savePreferences(){try{localStorage.setItem('nar-streaming-preferences',JSON.stringify(preferences))}catch{}}
function status(text){$('status').textContent=text}
function selectMode(mode){preferences.mode=mode;$('reader').className='mode-'+mode;for(const m of ['original','recital','both'])$(m).setAttribute('aria-pressed',m===mode);savePreferences();applyMissing();scheduleFollow()}
function passageFor(n){return n<0?chapter?.opening_prayers?.[-n-1]:chapter?.verses?.[n-1]}
function playbackScenes(){return [...(chapter?.opening_prayers||[]),...(chapter?.scenes||[])]}
function applyMissing(){const missing=!!passageFor(shown)?.source_missing;$('reader').classList.toggle('opening-prayer',shown<0);$('reader').classList.toggle('missing-recital',missing);$('sourceNotice').hidden=!missing}
function sceneAt(t){return playbackScenes().find(s=>t>=s.display_start&&t<s.display_end)}
function highlight(){if(!chapter||!shown)return;const v=passageFor(shown),t=audio.currentTime,active=new Set(),originalLines=new Set(),recitalLines=new Set();let line=-1;
 v.lines.forEach((l,i)=>{if(t>=l.start_seconds&&t<l.end_seconds)line=i;l.tokens.forEach(p=>{if(p.cue_id!==undefined&&t>=p.start&&t<p.end){active.add(p.cue_id);recitalLines.add(i)}})});
 v.lines.forEach((l,i)=>{if(l.original_tokens?.some(p=>p.cue_ids.some(k=>active.has(k))))originalLines.add(i)});
 document.querySelectorAll('.word').forEach(el=>el.classList.toggle('current',el.dataset.cues.split(',').some(k=>active.has(+k))));
 document.querySelectorAll('.cell').forEach(el=>el.classList.toggle('active',(el.classList.contains('original')?originalLines:recitalLines).has(+el.dataset.line)));
 lastLine=line;scheduleFollow();
}
// Scroll only when the active words leave the readable area. Measure actual
// wrapped text, rather than an entire (potentially very tall) verse or pair.
function scheduleFollow(force=false){
 if($('options').open||!preferences.follow||(!force&&audio.paused))return;
 forceFollow=forceFollow||force;
 if(followFrame)return;
 followFrame=requestAnimationFrame(()=>{const mustFollow=forceFollow;followFrame=0;forceFollow=false;followReading(mustFollow)});
}
function followReading(force=false){
 if($('options').open||!preferences.follow||(!force&&audio.paused)||$('reader').hidden)return;
 const viewport=window.visualViewport;
 const top=(viewport?.offsetTop||0)+$('transport').getBoundingClientRect().height+16;
 const bottom=Math.min((viewport?.offsetTop||0)+(viewport?.height||innerHeight),$('playerDock').getBoundingClientRect().top)-16;
 const available=bottom-top;if(available<40)return;
 const rects=el=>Array.from(el.getClientRects()).filter(r=>r.width>0&&r.height>0);
 let words=Array.from(document.querySelectorAll('.word.current')).filter(el=>rects(el).length);
 let boxes=words.flatMap(rects);
 const union=rs=>({top:Math.min(...rs.map(r=>r.top)),bottom:Math.max(...rs.map(r=>r.bottom))});
 if(!boxes.length){
  const cells=Array.from(document.querySelectorAll('.cell')).filter(el=>rects(el).length);
  const cell=cells.find(el=>el.classList.contains('active'))||cells.find(el=>+el.dataset.line===Math.max(0,lastLine))||cells[0];
  if(!cell)return;const r=cell.getBoundingClientRect();boxes=[{top:r.top,bottom:Math.min(r.bottom,r.top+available)}];
 }
 let target=union(boxes);
 // Show both parallel highlights whenever they fit. On a narrow phone, an
 // oversized pair follows the Original column; landscape provides two columns.
 if(target.bottom-target.top>available&&words.length){
  const primary=words.filter(el=>el.closest('.original'));
  if(primary.length)words=primary;
  boxes=words.flatMap(rects);target=union(boxes);
  if(target.bottom-target.top>available){
   const word=words[0],rs=rects(word),ids=word.dataset.cues.split(',').map(Number);
   const timed=passageFor(shown)?.lines.flatMap(l=>l.tokens).filter(t=>ids.includes(t.cue_id))||[];
   const first=timed[0]?.start??audio.currentTime,last=timed.at(-1)?.end??first+1;
   const fraction=Math.max(0,Math.min(.999,(audio.currentTime-first)/Math.max(.01,last-first)));
   target=rs[Math.floor(fraction*rs.length)]||boxes[0];
  }
 }
 const heading=$('heading').getBoundingClientRect();
 if(lastLine<=0&&heading.top<target.top&&target.top-heading.top<180&&target.bottom-heading.top<available)target={top:heading.top,bottom:target.bottom};
 if(!force&&target.top>=top&&target.bottom<=bottom)return;
 const margin=Math.min(48,Math.max(0,(available-(target.bottom-target.top))/3));
 const currentScroll=window.scrollY||0;
 const headerEnd=$('masthead').getBoundingClientRect().bottom+currentScroll;
 const nextScroll=Math.max(headerEnd,currentScroll+target.top-top-margin);
 window.scrollBy({top:nextScroll-currentScroll,behavior:'instant'});
}
function meanings(){const m=shown>0?chapter?.meanings?.[shown-1]:null;const available=!!m;$('ml').disabled=$('en').disabled=shown<0||!chapter?.meanings?.length;
 $('meaningAvailability').textContent=shown<0?'Meanings for the opening prayers are not yet included.':chapter?.meanings?.length?'Explanatory drafts, awaiting scholarly review.':'Meanings for this chapter are not yet included.';
 $('meanings').hidden=!available||!(preferences.ml||preferences.en);$('meaningMl').hidden=!preferences.ml;$('meaningEn').hidden=!preferences.en;
 $('meaningTitle').textContent=available?'Dasakam '+chapter.dasakam+' · Verse '+shown:'';$('meaningMl').textContent=m?.ml||'';$('meaningEn').textContent=m?.en||'';
}
function render(force=false){if(!chapter)return;const scene=sceneAt(audio.currentTime),n=scene?.verse||0;if(n===shown&&!force){highlight();return}shown=n;lastLine=-1;$('verse').value=n;$('pairs').replaceChildren();$('reader').hidden=!n;$('opening').hidden=!!n;$('heading').textContent=n<0?'Dasakam '+chapter.dasakam+' · '+passageFor(n).title:n?'Dasakam '+chapter.dasakam+' · Verse '+n+' of '+chapter.verses.length:'';
 applyMissing();$('opening').textContent=audio.currentTime>=chapter.scenes.at(-1).display_end?'Closing recitation · സമർപ്പണം':chapter.opening_prayers?.length?'Opening invocation · പ്രാരംഭ പ്രാർത്ഥനകൾ':'Opening recitation · Select Verse 1 to begin the text.';meanings();if(!n)return;
 passageFor(n).lines.forEach((l,i)=>{const pair=document.createElement('div');pair.className='pair';for(const type of n<0?['recital']:['original','recital']){if(type==='recital'&&passageFor(n).source_missing)continue;const b=document.createElement('button');b.className='cell '+type;b.dataset.line=i;b.lang=SCRIPTS[preferences.script].lang;b.title='Replay line '+(i+1);b.onclick=()=>seek(l.start_seconds,true);const label=document.createElement('span');label.className='lineno';label.textContent='Line '+(i+1);label.dataset.label=n<0?'Opening prayer':type==='original'?'Original':'Recital aid';label.lang='en';b.append(label);
 const script=SCRIPTS[preferences.script];const parts=l[type==='original'?script.original:script.recital];for(const p of parts){const ids=p.cue_ids??(p.cue_id===undefined?[]:[p.cue_id]);if(!ids.length)b.append(document.createTextNode(p.text));else{const w=document.createElement('span');w.className='word';w.textContent=p.text;w.dataset.cues=ids.join(',');b.append(w)}}pair.append(b)}$('pairs').append(pair)});highlight();
}
function start(){if(!ready)return;audio.play().catch(()=>status('Tap Play at the bottom to begin.'))}
function seek(t,play=false){if(!ready)return;audio.currentTime=Math.max(0,t);render(true);scheduleFollow(true);if(play)start()}
function formatTime(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function updateTimeline(){
 const duration=Number.isFinite(audio.duration)?audio.duration:chapter?.duration_seconds||0;
 $('seek').max=duration||1;$('seek').value=audio.currentTime||0;$('seek').disabled=!ready||!duration;
 $('elapsed').textContent=formatTime(audio.currentTime);$('duration').textContent=formatTime(duration);
 $('seek').setAttribute('aria-valuetext',formatTime(audio.currentTime)+' of '+formatTime(duration));
}
function enablePlayback(enabled){ready=enabled;for(const id of ['verse','play','previous','replay','next'])$(id).disabled=!enabled;updateTimeline()}
async function load(n,position=0){
 const id=++loadId;requestedChapter=n;audio.pause();audio.removeAttribute('src');audio.load();chapter=null;shown=-1;enablePlayback(false);
 $('retry').hidden=true;$('reader').hidden=$('meanings').hidden=true;$('opening').hidden=false;$('opening').textContent='Loading Dasakam '+n+'…';status('');
 try{
  const r=await fetch('chapters/'+String(n).padStart(2,'0')+'.json');if(!r.ok)throw Error('Chapter unavailable');const d=await r.json();if(id!==loadId)return;
  chapter=d;$('chapter').value=n;$('verse').replaceChildren();
  for(const [value,text] of [[0,'Start / end'],...(d.opening_prayers||[]).map(p=>[p.verse,'Prayer '+p.prayer]),...d.scenes.map(s=>[s.verse,'Verse '+s.verse])]){const o=document.createElement('option');o.value=value;o.textContent=text;$('verse').append(o)}
  if(position){audio.addEventListener('loadedmetadata',()=>{if(id===loadId)seek(Math.min(position,Math.max(0,audio.duration-.2)))},{once:true})}
  audio.src=d.audio;enablePlayback(true);render(true);
  if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:'Narayaneeyam · Dasakam '+n,artist:'A Narayana Iyer',album:'Parayana Sahayi',artwork:[{src:'assets/portrait.png',sizes:'512x512',type:'image/png'}]})}
 }catch(e){if(id===loadId){$('opening').textContent='This chapter could not be opened.';status('Check your internet connection and try again.');$('retry').hidden=false;enablePlayback(false)}}
}
function selectMarking(value){
 preferences.marking=value==='highlight'?'highlight':'underline';
 $('reader').dataset.marking=preferences.marking;
 for(const style of ['underline','highlight'])$(style).setAttribute('aria-pressed',style===preferences.marking);
 savePreferences();
}
for(const style of ['underline','highlight'])$(style).onclick=()=>selectMarking(style);
selectMarking(preferences.marking);
for(const m of ['original','recital','both'])$(m).onclick=()=>selectMode(m);selectMode(['original','recital','both'].includes(preferences.mode)?preferences.mode:'both');
preferences.size=Math.max(24,Math.min(64,Number(preferences.size)||28));$('reader').style.setProperty('--size',preferences.size+'px');
for(const [id,delta]of [['smaller',-4],['larger',4]])$(id).onclick=()=>{preferences.size=Math.max(24,Math.min(64,preferences.size+delta));$('reader').style.setProperty('--size',preferences.size+'px');savePreferences();scheduleFollow()};
for(const id of ['follow','ml','en']){$(id).checked=preferences[id];$(id).onchange=()=>{preferences[id]=$(id).checked;savePreferences();meanings();if(id==='follow')scheduleFollow(true)}}
$('chapter').onchange=()=>load(+$('chapter').value);$('verse').onchange=()=>seek(playbackScenes().find(s=>s.verse===+$('verse').value)?.chant_start||0);
$('play').onclick=()=>audio.paused?start():audio.pause();$('replay').onclick=()=>seek(playbackScenes().find(s=>s.verse===shown)?.chant_start||0,true);
function stepPassage(delta){if(!chapter)return;const scenes=playbackScenes();let i=scenes.findIndex(s=>s.verse===shown);if(i<0)i=audio.currentTime>=scenes.at(-1).display_end?scenes.length:-1;seek(scenes[Math.max(0,Math.min(scenes.length-1,i+delta))].chant_start,!audio.paused)}
$('previous').onclick=()=>stepPassage(-1);$('next').onclick=()=>stepPassage(1);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('For more space, open from your home-screen icon and turn the phone sideways.')}catch{status('Turn the phone sideways for a wider reading view.')}};
$('seek').oninput=()=>{if(ready){seek(Number($('seek').value));updateTimeline()}};
$('retry').onclick=()=>catalog.length?load(requestedChapter,chapter?audio.currentTime:0):setup();
audio.ontimeupdate=()=>{updateTimeline();render();if(chapter){try{localStorage.setItem('nar-streaming-position',JSON.stringify({dasakam:chapter.dasakam,time:audio.currentTime}))}catch{}}};audio.onseeked=()=>{updateTimeline();render();scheduleFollow(true)};audio.onloadedmetadata=()=>{updateTimeline();render(true)};audio.ondurationchange=updateTimeline;audio.onplay=()=>{$('play').textContent='❚❚ Pause';status('');$('retry').hidden=true;scheduleFollow(true)};audio.onpause=()=>{$('play').textContent='▶ Play'};audio.onerror=()=>{if(!chapter)return;status('The recording could not play. Check your internet connection and try again.');$('retry').hidden=false};
window.addEventListener('resize',()=>scheduleFollow());
window.visualViewport?.addEventListener('resize',()=>scheduleFollow());
document.fonts?.ready.then(()=>scheduleFollow());

function syncPlayerSpace(){document.documentElement.style.setProperty('--dock-space',($('playerDock').getBoundingClientRect().height+16)+'px')}
$('openOptions').onclick=()=>{$('options').showModal();document.body.classList.add('options-open')};
$('closeOptions').onclick=()=>$('options').close();
$('options').addEventListener('close',()=>{document.body.classList.remove('options-open');scheduleFollow()});
const replayVerse=$('replay').onclick;
$('replay').onclick=()=>{$('options').close();replayVerse()};
const enterFullscreen=$('fullscreen').onclick;
$('fullscreen').onclick=()=>{$('options').close();return enterFullscreen()};
function showTextSize(){$('textSize').textContent=preferences.size+' px'}
showTextSize();for(const id of ['smaller','larger']){const resizeText=$(id).onclick;$(id).onclick=()=>{resizeText();showTextSize()}};
syncPlayerSpace();window.addEventListener('resize',syncPlayerSpace);
if('ResizeObserver'in window)new ResizeObserver(syncPlayerSpace).observe($('playerDock'));

$('copyLink').onclick=async()=>{const url=new URL('.',location.href).href;try{await navigator.clipboard.writeText(url);$('shareStatus').textContent=location.hostname==='127.0.0.1'||location.hostname==='localhost'?'Local preview link copied. It opens on this computer only.':'Link copied — ready to paste.'}catch{$('shareStatus').textContent=url}};
if('mediaSession'in navigator){for(const [name,handler]of Object.entries({play:start,pause:()=>audio.pause(),seekbackward:d=>seek(audio.currentTime-(d.seekOffset||10)),seekforward:d=>seek(audio.currentTime+(d.seekOffset||10)),seekto:d=>seek(d.seekTime)})){try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}}
async function setup(){
 $('retry').hidden=true;
 try{
  const r=await fetch('catalog.json');if(!r.ok)throw Error();catalog=(await r.json()).chapters;
  $('chapter').replaceChildren();for(const c of catalog){const o=document.createElement('option');o.value=c.dasakam;o.textContent=String(c.dasakam);$('chapter').append(o)}$('chapter').disabled=false;
  let saved=null;try{saved=JSON.parse(localStorage.getItem('nar-streaming-position'))}catch{}
  const valid=catalog.some(c=>c.dasakam===saved?.dasakam);await load(valid?saved.dasakam:1,valid?Math.max(0,Number(saved.time)||0):0);
 }catch{$('opening').textContent='The player could not load.';status('Check your internet connection and try again.');$('retry').hidden=false}
}
// Add another script by defining its text keys here and including matching
// per-line tokens and a font in the build. Playback always uses the same cues.
const SCRIPTS={
 ml:{name:'Malayalam',lang:'sa-Mlym',title:'നാരായണീയം',original:'original_tokens',recital:'tokens'},
 deva:{name:'Devanagari',lang:'sa-Deva',title:'नारायणीयम्',original:'devanagari_original_tokens',recital:'devanagari_tokens'}
};
function selectScript(value){
 const key=Object.hasOwn(SCRIPTS,value)?value:'ml',script=SCRIPTS[key];
 preferences.script=key;
 for(const id of ['script','scriptOptions'])$(id).value=key;
 $('reader').dataset.script=key;
 $('originalHeading').textContent='Original Sanskrit · '+script.name+' script';
 $('bookTitle').textContent=script.title;$('bookTitle').lang=script.lang;$('bookTitle').className=key;
 savePreferences();render(true);scheduleFollow();
}
for(const id of ['script','scriptOptions']){
 for(const [value,script]of Object.entries(SCRIPTS)){const option=document.createElement('option');option.value=value;option.textContent=script.name;$(id).append(option)}
 $(id).onchange=()=>selectScript($(id).value);
}
selectScript(preferences.script);

setup();
