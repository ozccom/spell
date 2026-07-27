const CACHE = 'wordvoice-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // TTS proxy: Edge TTS
  if (url.pathname.startsWith('/tts/edge/')) {
    const parts = url.pathname.replace('/tts/edge/', '').split('/');
    const lang = parts[0]; // en or zh
    const text = decodeURIComponent(parts.slice(1).join('/'));
    const voice = lang === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-JennyNeural';
    const xmlLang = lang === 'zh' ? 'zh-CN' : 'en-US';
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${xmlLang}"><voice name="${voice}">${safe}</voice></speak>`;
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3' },
        body: ssml,
      }).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // TTS proxy: Google TTS
  if (url.pathname.startsWith('/tts/google/')) {
    const parts = url.pathname.replace('/tts/google/', '').split('/');
    const lang = parts[0];
    const text = parts.slice(1).join('/');
    const ttsUrl = lang === 'zh'
      ? `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=${encodeURIComponent(text)}`
      : `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(ttsUrl).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Default: network-first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
