export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[DokitaAI PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[DokitaAI PWA] Service Worker registration failed:', err);
        });
    });
  }
};
