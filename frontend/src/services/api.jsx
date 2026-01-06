const API_BASE = 'http://localhost:8080';

async function send(path, options) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options,
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || errorData.details || text || 'Request failed');
      } catch {
        throw new Error(text || `Request failed with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  } catch (err) {
    console.error(`API error for ${path}:`, err);
    throw err;
  }
}

export const register = (body) => send('/auth/register', { method: 'POST', body: JSON.stringify(body) });
export const login = (body) => send('/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const getProfile = (id) => send(`/users/${id}`, { method: 'GET' });
export const updateProfile = (id, body) => send(`/users/${id}/profile`, { method: 'PUT', body: JSON.stringify(body) });
export const createLog = (body) => send('/logs', { method: 'POST', body: JSON.stringify(body) });
export const fetchLogs = (uid) => {
  if (!uid) {
    return Promise.reject(new Error('User ID is required'));
  }
  return send(`/logs/${uid}`, { method: 'GET' });
};
export const updateLog = (id, body) => send(`/logs/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteLog = (id) => send(`/logs/${id}`, { method: 'DELETE' });
export const getNotifications = (uid) => send(`/notifications/${uid}`, { method: 'GET' });
export const setNotifications = (body) =>
  send('/notifications/preferences', { method: 'POST', body: JSON.stringify(body) });

export const createMessage = (body, token) =>
  send('/messages', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: token }
  });

export const getMessages = (channel, limit = 50) =>
  send(`/messages/${channel}?limit=${limit}`, { method: 'GET' });

export const getBooks = (query = '') => send(`/books?q=${encodeURIComponent(query)}`, { method: 'GET' });
export const createBook = (body) =>
  send('/books', {
    method: 'POST',
    body: JSON.stringify(body)
  });
export const getReviews = (bookId) => send(`/books/${bookId}/reviews`, { method: 'GET' });
export const createReview = (body) =>
  send('/reviews', {
    method: 'POST',
    body: JSON.stringify(body)
  });
export const getUserReviews = (userId) => send(`/users/${userId}/reviews`, { method: 'GET' });

