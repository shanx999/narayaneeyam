'use strict';
// Visitors with an older main-player worker may initially receive its cached
// HTML for this new path. Install the pilot's own scoped worker and reopen it.
async function openPilot(){
 if(document.getElementById('script')){
  const script=document.createElement('script');script.src='reader.js';document.head.append(script);return;
 }
 const message=document.createElement('p');message.textContent='Opening the Devanagari player…';message.setAttribute('role','status');document.body.replaceChildren(message);
 try{
  const registration=await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});
  const worker=registration.installing||registration.waiting||registration.active;
  if(!worker)throw Error('Player worker unavailable');
  if(worker.state!=='activated')await new Promise((resolve,reject)=>{
   worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(Error('Installation interrupted'))});
  });
  location.reload();
 }catch{
  message.textContent='Connect to the internet and reload this page to open the Devanagari player.';
 }
}
openPilot();
