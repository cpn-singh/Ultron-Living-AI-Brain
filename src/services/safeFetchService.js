/**
 * Safe fetch wrapper for Web Browsers, Electron, and Mobile clients.
 * Safely posts JSON payloads without triggering W3C browser unsafe header restrictions.
 * Includes a resilient timeout to prevent API hangs.
 */
export async function safeFetchPost(url, payload, customHeaders = {}, timeoutMs = 4500) {
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, timeoutMs);

  try {
    return await fetch(url, {
      method: 'POST',
      headers,
      body: jsonString,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
