'use strict';
// A legacy worker at the existing collection can return its cached front page
// for a new nested address. A scoped, network-only worker keeps this edition
// online and leaves every existing edition's offline recordings intact.
async function openStreaming(){
 const correctPage=!!document.getElementById('streamingEdition');
 if(!correctPage){const message=document.createElement('p');message.textContent='Opening the reading player…';message.setAttribute('role','status');document.body.replaceChildren(message)}
 if('serviceWorker'in navigator&&location.protocol==='https:'){
  try{
   const registration=await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});
   const worker=registration.installing||registration.waiting||registration.active;
   if(!worker)throw Error('Worker unavailable');
   if(worker.state!=='activated')await new Promise((resolve,reject)=>{
    worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(Error('Activation interrupted'))});
   });
   if(!correctPage){location.reload();return}
  }catch{
   if(!correctPage){
    const message=document.createElement('p');message.textContent='Connect to the internet and reload to open the reading player.';message.setAttribute('role','status');document.body.replaceChildren(message);return;
   }
   // With no legacy-page conflict, online playback can also run without a worker.
  }
 }
 if(!correctPage)return;
 const script=document.createElement('script');script.src='reader.js';document.head.append(script);
}
openStreaming();
