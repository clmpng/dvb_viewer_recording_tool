import axios from 'axios';

// API base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common errors
    if (error.response?.status === 404) {
      console.warn('Resource not found');
    } else if (error.response?.status >= 500) {
      console.error('Server error occurred');
    }
    
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Health check
  async checkHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  },

  // EPG services
  async getChannels() {
    try {
      const response = await api.get('/epg/channels');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load channels: ${error.message}`);
    }
  },

  async getEPG(channelId, day = 0, timeday = 'ganztags') {
    try {
      const response = await api.get(`/epg/${channelId}/${day}`, {
        params: { timeday }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load EPG: ${error.message}`);
    }
  },

//   async getProgramDetails(broadcastId) {
//     try {
//       const response = await api.get(`/epg/program/${broadcastId}`);
//       return response.data;
//     } catch (error) {
//       throw new Error(`Failed to load program details: ${error.message}`);
//     }
//   },

  async searchEPG(searchParams) {
    try {
      const response = await api.post('/epg/search', searchParams);
      return response.data;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  async getTodayEPG(channelId = null, timeday = 'ganztags') {
    try {
      const url = channelId ? `/epg/today/${channelId}` : '/epg/today';
      const response = await api.get(url, {
        params: { timeday }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load today's EPG: ${error.message}`);
    }
  },

  // Timer services
  async createTimer(timerData) {
    try {
      const response = await api.post('/timer', timerData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to create timer: ${message}`);
    }
  },

  async createQuickTimer(program, options = {}) {
    try {
      const response = await api.post('/timer/quick', {
        program,
        ...options
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to create quick timer: ${message}`);
    }
  },

  async testDVBConnection() {
    try {
      const response = await api.get('/timer/test');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.details?.error || error.message;
      throw new Error(`DVB connection test failed: ${message}`);
    }
  },

  async validateTimer(params) {
    try {
      const response = await api.get('/timer/validate', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Timer validation failed: ${error.message}`);
    }
  },

  // Task services
  async getTasks() {
    try {
      const response = await api.get('/tasks');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load tasks: ${error.message}`);
    }
  },

  async createTask(taskData) {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to create task: ${message}`);
    }
  },

  async updateTask(taskId, updates) {
    try {
      const response = await api.put(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to update task: ${message}`);
    }
  },

  async deleteTask(taskId) {
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete task: ${message}`);
    }
  },

  async executeTask(taskId) {
    try {
      const response = await api.post(`/tasks/${taskId}/execute`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to execute task: ${message}`);
    }
  },

  async toggleTask(taskId) {
    try {
      const response = await api.post(`/tasks/${taskId}/toggle`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to toggle task: ${message}`);
    }
  },

  async getTaskTypes() {
    try {
      const response = await api.get('/tasks/types');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to load task types: ${error.message}`);
    }
  },

  async getSchedulerStatus() {
    try {
      const response = await api.get('/tasks/scheduler/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get scheduler status: ${error.message}`);
    }
  },

  // Cache services
  async clearEPGCache() {
    try {
      const response = await api.delete('/epg/cache');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  },

  async getCacheStats() {
    try {
      const response = await api.get('/epg/cache/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get cache stats: ${error.message}`);
    }
  }
};

// Helper functions for data formatting
export const formatters = {
  /**
   * Format date for German locale
   */
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('de-DE');
  },

  /**
   * Format time for German locale
   */
  formatTime(time) {
    if (!time) return '';
    if (typeof time === 'string' && time.includes(':')) {
      return time; // Already formatted as HH:MM
    }
    return new Date(time).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format date and time together
   */
  formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('de-DE');
  },

  /**
   * Get day name for day offset
   */
  getDayName(dayOffset) {
    const days = [
      'Heute', 'Morgen', 'Übermorgen',
      'in 3 Tagen', 'in 4 Tagen', 'in 5 Tagen',
      'in 6 Tagen', 'in 7 Tagen'
    ];
    return days[dayOffset] || `Tag +${dayOffset}`;
  },

  /**
   * Get full date for day offset
   */
  getDateForDay(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Format date for DVB Viewer (DD.MM.YYYY)
   */
  formatDateForDVB(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  },

  /**
   * Get genre badge color
   */
  getGenreBadgeColor(genre) {
    if (!genre) return 'gray';
    
    const lowerGenre = genre.toLowerCase();
    
    if (lowerGenre.includes('nachrichten') || lowerGenre.includes('information')) {
      return 'blue';
    }
    if (lowerGenre.includes('spielfilm') || lowerGenre.includes('film')) {
      return 'green';
    }
    if (lowerGenre.includes('serie')) {
      return 'yellow';
    }
    if (lowerGenre.includes('sport')) {
      return 'red';
    }
    if (lowerGenre.includes('musik')) {
      return 'purple';
    }
    
    return 'gray';
  },

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
};

// Error handling utilities
export const errorHandler = {
  /**
   * Extract error message from various error formats
   */
  extractMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.message) return error.message;
    return 'Ein unbekannter Fehler ist aufgetreten';
  },

  /**
   * Check if error is a network error
   */
  isNetworkError(error) {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('Network Error') ||
           error?.response?.status === undefined;
  },

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(error) {
    return error?.response?.status >= 500;
  },

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(error) {
    const status = error?.response?.status;
    return status >= 400 && status < 500;
  }
};

export default api;