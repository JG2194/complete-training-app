// Imported by the generated worker. Only a booting page may request activation;
// another open app tab keeps its worker and cached assets until it closes.
self.addEventListener('message', event => {
  if (event.data?.type !== 'CT_STARTUP_ACTIVATE') return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const requester = event.source?.id;
    const inScope = windows.filter(client => client.url.startsWith(self.registration.scope));
    const allowed = Boolean(requester) && inScope.some(client => client.id === requester)
      && inScope.every(client => client.id === requester)
      && Number.isFinite(event.data.expiresAt) && Date.now() < event.data.expiresAt;
    if (allowed) await self.skipWaiting();
    event.ports[0]?.postMessage({ allowed });
  })());
});
