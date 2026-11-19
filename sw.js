const CACHE="ks-education-shell-v1";
const SHELL=["/","/index.html","/style.css","/config.js","/app.js","/business-suite.js","/lms.js","/homework.js","/notifications.js","/language.js","/certificates.js","/admin-tools.js","/portal-accounts.js","/id-cards.js","/calendar.js","/pwa.js","/public-feed.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/.netlify/functions/")||url.pathname.startsWith("/rest/")||url.pathname.startsWith("/auth/"))return;
 if(req.mode==="navigate"){event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put("/index.html",copy));return res}).catch(()=>caches.match("/index.html")));return}
 if(SHELL.includes(url.pathname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));return}
});
