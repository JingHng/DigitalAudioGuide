import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/audio-logs';

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
      const response = await axios.post(API_BASE_URL, {
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
      
      await axios.put(`${API_BASE_URL}/${logId}`, {
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
      
      // Use sendBeacon for immediate cleanup if available
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          audioEnd: new Date().toISOString(),
          durationListened: meaningfulDuration,
          forceEnd: true
        });
        
        const success = navigator.sendBeacon(`${API_BASE_URL}/${logId}`, data);
        if (success) return;
      }
      
      // Fallback to regular axios call
      await this.endPlayback(logId, durationListened);
    } catch (error) {
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
      const response = await axios.get(API_BASE_URL, { params });
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

      const response = await axios.get(`${API_BASE_URL}/analytics`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  // Get playback logs for a specific user
  async getUserPlaybackLogs(userId: string, page: number = 1, limit: number = 10) {
    try {
      const response = await axios.get(`${API_BASE_URL}/user/${userId}`, {
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