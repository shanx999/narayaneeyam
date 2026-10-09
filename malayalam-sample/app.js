/* Retired edition: the streaming reader is the only active player. */
(()=>{
 const base=new URL('.',document.currentScript?.src||location.href);
 const destination=new URL('../listen/',base).href;
 if('serviceWorker'in navigator&&location.protocol==='https:'){
  navigator.serviceWorker.register(new URL('sw.js',base).href,{scope:base.href,updateViaCache:'none'}).catch(()=>{});
 }
 location.replace(destination);
})();
