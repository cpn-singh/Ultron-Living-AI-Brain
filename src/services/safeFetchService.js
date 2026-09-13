/**
 * Safe fetch wrapper for Web Browsers, Electron, and Mobile clients.
 * Safely posts JSON payloads without triggering W3C browser unsafe header restrictions.
 */
export async function safeFetchPost(url, payload, customHeaders = {}) {
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  return fetch(url, {
    method: 'POST',
    headers,
    body: jsonString,
  });
}
