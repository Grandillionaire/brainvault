// API Client for BrainVault Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, error.error || error.message || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or parsing error
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error');
  }
}

// Notes API
export const notesApi = {
  getAll: () => request<any[]>('/notes'),

  getById: (id: string) => request<any>(`/notes/${id}`),

  create: (data: {
    title: string;
    content?: string;
    tags?: string[];
    type?: string;
  }) => request<any>('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: Partial<any>) =>
    request<any>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/notes/${id}`, {
      method: 'DELETE',
    }),

  getDailyNote: (date?: string) => {
    const endpoint = date ? `/notes/daily/${date}` : '/notes/daily';
    return request<any>(endpoint);
  },
};

// Search API
export const searchApi = {
  search: (params: {
    q?: string;
    tags?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    return request<{ results: any[]; total: number }>(`/search?${queryString}`);
  },

  getTags: () => request<Array<{ name: string; count: number }>>('/search/tags'),

  getSuggestions: (q: string, type: 'all' | 'notes' | 'tags' = 'all') =>
    request<Array<{ type: string; value: string }>>(`/search/suggestions?q=${encodeURIComponent(q)}&type=${type}`),
};

// Settings API
export const settingsApi = {
  getAll: () => request<Record<string, string>>('/settings'),

  get: (key: string) => request<{ key: string; value: string }>(`/settings/${key}`),

  update: (key: string, value: string) =>
    request<{ key: string; value: string }>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  updateBulk: (settings: Record<string, string>) =>
    request<Record<string, string>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  reset: () =>
    request<Record<string, string>>('/settings/reset', {
      method: 'POST',
    }),
};

// AI API
export const aiApi = {
  checkStatus: () =>
    request<{ ollama: string; models: any[] }>('/ai/status'),

  chat: (data: {
    message: string;
    noteIds?: string[];
    model?: string;
  }) =>
    request<{ response: string; sources?: any[] }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  suggest: (content: string, type: 'tags' | 'links' = 'tags') =>
    request<{ suggestions: string[] }>('/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  summarize: (content: string) =>
    request<{ summary: string }>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

// Attachments API
export const attachmentsApi = {
  upload: (noteId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return fetch(`${API_URL}/attachments/${noteId}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok) {
        throw new ApiError(res.status, 'Upload failed');
      }
      return res.json();
    });
  },

  getByNoteId: (noteId: string) =>
    request<any[]>(`/attachments/${noteId}`),

  delete: (id: string) =>
    request<{ success: boolean }>(`/attachments/${id}`, {
      method: 'DELETE',
    }),
};

// Auth API (optional, for multi-user setup)
export const authApi = {
  register: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request<{ user: any | null }>('/auth/me'),
};

// Health check
export const healthApi = {
  check: () =>
    request<{ status: string; timestamp: string; version: string }>('/health'),
};

// WebSocket for real-time updates
export class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string = 'ws://localhost:3001/ws') {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = window.setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }
}

// Create singleton instance
export const realtimeClient = new RealtimeClient();

// Export everything
export default {
  notes: notesApi,
  search: searchApi,
  settings: settingsApi,
  ai: aiApi,
  attachments: attachmentsApi,
  auth: authApi,
  health: healthApi,
  realtime: realtimeClient,
};