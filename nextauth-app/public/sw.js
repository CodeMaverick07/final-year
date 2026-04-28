const CACHE_NAME = "sanskriti-v6";
const PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const MATCH_OPTS = { ignoreVary: true };

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sanskriti — Offline</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh;
    background: radial-gradient(circle at 50% 0%, rgba(201,169,110,0.12), transparent 60%), #0F0E0C;
    color: #F0EBE1;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center; padding: 2rem;
  }
  .card {
    max-width: 28rem; width: 100%; text-align: center;
    border: 1px solid rgba(201,169,110,0.2);
    background: rgba(255,255,255,0.02);
    border-radius: 1rem; padding: 2.5rem 2rem;
  }
  .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
  h1 { color: #C9A96E; font-size: 1.5rem; margin: 0 0 0.5rem; font-weight: 600; }
  p { color: #9A938A; line-height: 1.6; margin: 0 0 1.5rem; font-size: 0.95rem; }
  button {
    appearance: none; border: 0; background: #C9A96E; color: #0F0E0C;
    font-weight: 600; padding: 0.6rem 1.25rem; border-radius: 0.6rem;
    cursor: pointer; font-size: 0.9rem;
  }
  .hint { margin-top: 1.25rem; font-size: 0.8rem; color: #6B655E; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">📜</div>
    <h1>You're offline</h1>
    <p>Sanskriti can't reach the network. The cached landing page wasn't available.</p>
    <button onclick="location.reload()">Retry</button>
    <div class="hint">SW fallback · empty cache</div>
  </div>
</body>
</html>`;

// Strip Vary header and store. `responseClone` MUST already be a clone — the
// caller is responsible for cloning synchronously before consuming the body.
async function storeStripped(request, responseClone) {
  if (!responseClone || !responseClone.ok || responseClone.type === "opaque") return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const headers = new Headers(responseClone.headers);
    headers.delete("Vary");
    const body = await responseClone.blob();
    const stripped = new Response(body, {
      status: responseClone.status,
      statusText: responseClone.statusText,
      headers,
    });
    await cache.put(request, stripped);
    return true;
  } catch (err) {
    console.warn("[SW] cache.put failed for", request.url || request, err);
    return false;
  }
}

async function precacheUrl(cache, url) {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-cache" });
    if (!res.ok) throw new Error("status " + res.status);
    const ok = await storeStripped(new Request(url), res.clone());
    return ok ? "ok" : "put-failed";
  } catch (err) {
    return "fail: " + (err && err.message);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const results = await Promise.all(
        PRECACHE.map(async (u) => [u, await precacheUrl(cache, u)])
      );
      console.log("[SW] precache results:", results);
      try {
        await cache.put(
          "/__sw-offline",
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      } catch {}
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
      // Warm-cache "/" again post-activation as belt-and-suspenders.
      try {
        const res = await fetch("/", { credentials: "same-origin", cache: "no-cache" });
        if (res.ok) await storeStripped(new Request("/"), res.clone());
      } catch (err) {
        console.warn("[SW] warm-cache / failed:", err);
      }
      console.log("[SW] activated cache:", CACHE_NAME);
    })()
  );
});

function offlineHtmlResponse() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs") ||
    url.pathname.includes("hot-update") ||
    url.pathname === "/sw.js"
  ) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ error: "Offline" }), {
            headers: { "Content-Type": "application/json" },
            status: 503,
          })
      )
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request, MATCH_OPTS).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          // Synchronous clone before returning
          const copy = res.clone();
          event.waitUntil(storeStripped(request, copy));
          return res;
        });
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // CRITICAL: clone synchronously before returning the original.
          const copy = fresh.clone();
          event.waitUntil(storeStripped(request, copy));
          return fresh;
        } catch {
          const cached =
            (await caches.match(request, MATCH_OPTS)) ||
            (await caches.match(url.pathname, MATCH_OPTS)) ||
            (await caches.match("/", MATCH_OPTS)) ||
            (await caches.match("/offline.html", MATCH_OPTS)) ||
            (await caches.match("/__sw-offline", MATCH_OPTS));
          if (cached) {
            console.log("[SW] navigation served from cache:", request.url);
          } else {
            console.warn("[SW] navigation: NO cache match, using inline offline:", request.url);
          }
          return cached || offlineHtmlResponse();
        }
      })()
    );
    return;
  }

  // Other same-origin GETs: stale-while-revalidate.
  event.respondWith(
    caches.match(request, MATCH_OPTS).then((cached) => {
      const networkPromise = fetch(request)
        .then((res) => {
          const copy = res.clone();
          event.waitUntil(storeStripped(request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })
  );
});

// Debug helper: postMessage({type: "sw-cache-list"}) to log cache contents.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "sw-cache-list") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const reqs = await cache.keys();
        const list = reqs.map((r) => r.url);
        console.log("[SW] cache contents (" + list.length + "):", list);
        if (event.source) event.source.postMessage({ type: "sw-cache-list", list });
      })
    );
  }
});
