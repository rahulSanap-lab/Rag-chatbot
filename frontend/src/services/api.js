import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const documentApi = {
  upload: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  list: async () => api.get('/documents'),
  get: async (id) => api.get(`/documents/${id}`),
  delete: async (id) => api.delete(`/documents/${id}`),
  rename: async (id, filename) => api.patch(`/documents/${id}/rename`, { filename }),
  getSummary: async (id) => api.get(`/documents/${id}/summary`),
};

export const chatApi = {
  createSession: async (title = 'New Chat') => api.post('/chat/sessions', { title }),
  listSessions: async () => api.get('/chat/sessions'),
  getSession: async (id) => api.get(`/chat/sessions/${id}`),
  renameSession: async (id, title) => api.patch(`/chat/sessions/${id}`, { title }),
  deleteSession: async (id) => api.delete(`/chat/sessions/${id}`),
  sendQuery: async (sessionId, message, documentIds = null) =>
    api.post('/chat/query', { session_id: sessionId, message, document_ids: documentIds }),
  getExportPdfUrl: (sessionId) => `${API_BASE_URL}/chat/sessions/${sessionId}/export-pdf`,
};

export const dashboardApi = {
  getStats: async () => api.get('/dashboard/stats'),
};

export const settingsApi = {
  get: async () => api.get('/settings'),
  update: async (settingsData) => api.put('/settings', settingsData),
};

export default api;
