/**
 * ULTRON Chat History & PostgreSQL Database Sync Service
 * Seamlessly synchronizes conversation threads between Web & Electron .exe
 */

import { getBackendUrl, getCurrentUser } from './authService';

export async function fetchUserChatHistory(userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';
  const backendUrl = getBackendUrl();

  try {
    const res = await fetch(`${backendUrl}/api/chat/history?email=${encodeURIComponent(email)}&limit=300`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
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
  const backendUrl = getBackendUrl();

  try {
    const payload = {
      userEmail: email,
      sender: messageObj.sender || 'User',
      botId: messageObj.botId || 'orchestrator',
      botName: messageObj.botName || 'ULTRON',
      message: messageObj.text || '',
      extraProps: {
        isWelcome: Boolean(messageObj.isWelcome),
        id: messageObj.id
      }
    };

    const res = await fetch(`${backendUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[ChatHistoryService] Save message to DB warning:', err.message);
  }
  return null;
}

export async function syncChatHistoryWithDatabase(clientMessages, userOverride = null) {
  const user = userOverride || getCurrentUser();
  const email = user?.email || 'guest@ultron.ai';
  const backendUrl = getBackendUrl();

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return { success: true, messages: [] };
  }

  try {
    const res = await fetch(`${backendUrl}/api/chat/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: email,
        messages: clientMessages
      })
    });

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
  const backendUrl = getBackendUrl();

  try {
    await fetch(`${backendUrl}/api/chat/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: email })
    });
  } catch (e) {}

  localStorage.removeItem('ultron_chat_history');
  return { success: true };
}
