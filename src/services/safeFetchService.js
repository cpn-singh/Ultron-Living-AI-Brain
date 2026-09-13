/**
 * Safe fetch wrapper for Electron / Chromium localhost POST requests.
 * Encodes JSON body into a fixed Uint8Array with explicit Content-Length header,
 * preventing Chromium's ChunkedDataPipeUploadDataStream IPC error (Error: -2).
 */
export async function safeFetchPost(url, payload, customHeaders = {}) {
  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const bodyBytes = new TextEncoder().encode(jsonString);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bodyBytes.byteLength.toString(),
      ...customHeaders,
    },
    body: bodyBytes,
  });
}
