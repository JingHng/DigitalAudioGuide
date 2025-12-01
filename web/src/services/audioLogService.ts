import apiClient from '../utils/apiClient';

export interface AudioPlaybackLog {
  audioLogsId?: number;
  userId: string;
  audioId: string;
  audioStart?: string;
  audioEnd?: string;
  durationListened?: number;
}

export interface AudioLogAnalytics {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalPlays: number;
    uniqueUsers: number;
    totalDuration: number;
    averageDuration: number;
  };
  popularAudio: Array<{
    audioId: number;
    playCount: number;
    totalDuration: number;
    audio?: {
      title: string;
      description?: string;
      exhibit?: {
        exhibitId: string;
        title: string;
      };
    };
  }>;
  dailyStats: Array<{
    date: string;
    plays: number;
    total_duration: number;
    unique_users: number;
  }>;
}

class AudioLogService {
  // Create a new playback log entry when audio starts
  async startPlayback(userId: string, audioId: string): Promise<{ logId: number }> {
    try {
      const response = await apiClient.post('/audio-logs', {
        userId,
        audioId,
        audioStart: new Date().toISOString()
      });
      return { logId: response.data.log.audioLogsId };
    } catch (error) {
      console.error('Error starting playback log:', error);
      throw error;
    }
  }

  // Update playback log when audio ends
  async endPlayback(logId: number, durationListened: number): Promise<void> {
    try {
      // Only log if duration is meaningful (at least 1 second)
      const meaningfulDuration = Math.max(0, Math.round(durationListened));
      
      await apiClient.put(`/audio-logs/${logId}`, {
        audioEnd: new Date().toISOString(),
        durationListened: meaningfulDuration
      });
    } catch (error) {
      console.error('Error ending playback log:', error);
      throw error;
    }
  }

  // Force end playback for instant closes or page unloads
  async forceEndPlayback(logId: number, durationListened: number): Promise<void> {
    try {
      const meaningfulDuration = Math.max(0, Math.round(durationListened));
      
      // Use synchronous XMLHttpRequest for page unload (more reliable than sendBeacon for PUT)
      if (typeof XMLHttpRequest !== 'undefined') {
        const baseURL = apiClient.defaults.baseURL || '/api';
        const fullURL = `${baseURL}/audio-logs/${logId}`;
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', fullURL, false); // Synchronous request for page unload
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        const data = JSON.stringify({
          audioEnd: new Date().toISOString(),
          durationListened: meaningfulDuration,
          forceEnd: true
        });
        
        try {
          xhr.send(data);
          if (xhr.status >= 200 && xhr.status < 300) {
            return; // Success
          }
        } catch (e) {
          // Ignore errors in synchronous XHR during page unload
        }
      }
      
      // Fallback to regular axios call (may not complete during page unload)
      await this.endPlayback(logId, durationListened);
    } catch (error) {
      // Silently fail during page unload
      console.error('Error force ending playback log:', error);
    }
  }

  // Get all playback logs with pagination and filtering
  async getPlaybackLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    audioId?: string;
    exhibitId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    try {
      const response = await apiClient.get('/audio-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching playback logs:', error);
      throw error;
    }
  }

  // Get analytics data
  async getAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d', userId?: string, audioId?: string, exhibitId?: string): Promise<AudioLogAnalytics> {
    try {
      const params: any = { period };
      if (userId) params.userId = userId;
      if (audioId) params.audioId = audioId;
      if (exhibitId) params.exhibitId = exhibitId;

      const response = await apiClient.get('/audio-logs/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  // Get playback logs for a specific user
  async getUserPlaybackLogs(userId: string, page: number = 1, limit: number = 10) {
    try {
      const response = await apiClient.get(`/audio-logs/user/${userId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user playback logs:', error);
      throw error;
    }
  }
}

export default new AudioLogService();