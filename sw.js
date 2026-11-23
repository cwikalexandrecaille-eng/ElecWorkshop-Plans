/* ElecWorkshop Plans — worker d'installation.
   Ne met pas en cache les pages authentifiées, ni les PDF ou données Supabase. */
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
