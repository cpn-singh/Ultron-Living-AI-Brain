/**
 * ULTRON Chat History & PostgreSQL Database Sync Service
 * Seamlessly synchronizes conversation threads between Web & Electron .exe
 */

import { getBackendUrl, getCurrentUser, isLocalEnvironment, fetchWithTimeout } from './authService';

export async function fetchUserChatHistory(userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';

  if (!isLocalEnvironment() && !localStorage.getItem('ultron_backend_url')) {
    try {
      const local = localStorage.getItem('ultron_chat_history');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return null;
  }

  const backendUrl = getBackendUrl();

  try {
    const res = await fetchWithTimeout(`${backendUrl}/api/chat/history?email=${encodeURIComponent(email)}&limit=300`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, 2000);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        return data.messages;
      }
    }
  } catch (err) {
    console.warn('[ChatHistoryService] Fetch error (using local storage fallback):', err.message);
  }

  // Fallback to local storage
  try {
    const local = localStorage.getItem('ultron_chat_history');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return null;
}

export async function saveMessageToDatabase(messageObj, userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';

  if (!isLocalEnvironment() && !localStorage.getItem('ultron_backend_url')) {
    return null;
  }

  const backendUrl = getBackendUrl();

  try {
    const payload = {
      userEmail: email,
      sender: messageObj.sender || 'User',
      botId: messageObj.botId || 'orchestrator',
      botName: messageObj.botName || 'ULTRON',
      text: messageObj.text || '',
      mode: messageObj.mode || 'chat',
      metadata: messageObj.metadata || {}
    };

    const res = await fetchWithTimeout(`${backendUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 2000);

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[ChatHistoryService] Save message error (using local cache):', err.message);
  }

  return null;
}

export async function syncChatHistoryWithDatabase(clientMessages, userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return { success: true, messages: [] };
  }

  if (!isLocalEnvironment() && !localStorage.getItem('ultron_backend_url')) {
    return { success: true, messages: clientMessages };
  }

  const backendUrl = getBackendUrl();

  try {
    const res = await fetchWithTimeout(`${backendUrl}/api/chat/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: email,
        messages: clientMessages
      })
    }, 2500);

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        // Cache synced messages to local storage
        localStorage.setItem('ultron_chat_history', JSON.stringify(data.messages));
        return data;
      }
    }
  } catch (err) {
    console.warn('[ChatHistoryService] Sync error:', err.message);
  }

  return { success: false, messages: clientMessages };
}

export async function clearUserChatHistory(userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';

  if (isLocalEnvironment() || localStorage.getItem('ultron_backend_url')) {
    const backendUrl = getBackendUrl();
    try {
      await fetchWithTimeout(`${backendUrl}/api/chat/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email })
      }, 1500);
    } catch (e) {}
  }

  localStorage.removeItem('ultron_chat_history');
  return { success: true };
}
