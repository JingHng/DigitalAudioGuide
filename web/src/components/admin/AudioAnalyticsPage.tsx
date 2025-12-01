import React, { useState, useEffect } from "react";
import {
  Play,
  Users,
  Clock,
  TrendingUp,
  Headphones,
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import audioLogService from "../../services/audioLogService";
import type { AudioLogAnalytics } from "../../services/audioLogService";
import apiClient from "../../utils/apiClient";
import "../../css/AdminTable.css";
import "../../css/AdminComponents.css";
import "../../css/AdminDashboard.css";

interface AudioLog {
  audioLogsId: string | number;
  userId: string;
  audioId: number | null;
  audioStart: string;
  audioEnd: string | null;
  durationListened: number | null;
  createdAt: string;
  totalPlays?: number; // For aggregated data
  user: {
    userId: string;
    username: string;
    email: string;
  } | null;
  audio: {
    audioId: number | null;
    title: string;
    description?: string;
    exhibit: {
      exhibitId: string;
      title: string;
    } | null;
  } | null;
}

const AudioAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AudioLogAnalytics | null>(null);
  const [logs, setLogs] = useState<AudioLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "1y"
  >("30d");
  const [selectedExhibit, setSelectedExhibit] = useState("");
  const [exhibits, setExhibits] = useState<{exhibitId: string; title: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const breadcrumbs = [
    { label: "Admin", path: "/admin/dashboard" },
    { label: "Audio Analytics" },
  ];

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await audioLogService.getAnalytics(
        selectedPeriod,
        undefined,
        undefined,
        selectedExhibit || undefined
      );
      setAnalytics(data);
    } catch (err) {
      setError("Failed to fetch analytics data");
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaybackLogs = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      
      if (selectedExhibit) {
        params.exhibitId = selectedExhibit;
      }
      
      const response = await audioLogService.getPlaybackLogs(params);
      setLogs(response.logs);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      console.error("Error fetching playback logs:", err);
    }
  };

  const fetchExhibits = async () => {
    try {
      const response = await apiClient.get("/exhibits");
      setExhibits(response.data);
    } catch (err) {
      console.error("Error fetching exhibits:", err);
      setExhibits([]);
    }
  };

  useEffect(() => {
    fetchExhibits();
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchPlaybackLogs();
  }, [selectedPeriod, selectedExhibit, currentPage]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && !analytics) {
    return (
      <AdminLayout
        currentPath="/admin/audio-analytics"
        breadcrumbs={breadcrumbs}
      >
        <div className="loading-container">
          <div className="loading-spinner"></div>
          Loading analytics...
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout
        currentPath="/admin/audio-analytics"
        breadcrumbs={breadcrumbs}
      >
        <div className="status-message status-error">{error}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPath="/admin/audio-analytics" breadcrumbs={breadcrumbs}>
      <main className="admin-content">
        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2 className="admin-table-title">
              <Headphones size={24} />
              Audio Playback Analytics
            </h2>
            <div className="admin-table-actions">
              <div className="admin-table-filter">
                <label>Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) =>
                    setSelectedPeriod(e.target.value as typeof selectedPeriod)
                  }
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>
              <div className="admin-table-filter">
                <label>Exhibit</label>
                <select
                  value={selectedExhibit}
                  onChange={(e) => setSelectedExhibit(e.target.value)}
                >
                  <option value="">All Exhibits</option>
                  {exhibits.map((exhibit) => (
                    <option key={exhibit.exhibitId} value={exhibit.exhibitId}>
                      {exhibit.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {analytics && (
            <>
              {/* KPI Cards */}
              <div className="kpi-cards">
                <div className="kpi-card">
                  <div className="kpi-icon visitors">
                    <Play size={24} />
                  </div>
                  <div className="kpi-content">
                    <h3>Total Plays</h3>
                    <div className="kpi-value">
                      <span className="value">
                        {analytics.summary.totalPlays}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon sales">
                    <Users size={24} />
                  </div>
                  <div className="kpi-content">
                    <h3>Unique Users</h3>
                    <div className="kpi-value">
                      <span className="value">
                        {analytics.summary.uniqueUsers}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon exhibits">
                    <Clock size={24} />
                  </div>
                  <div className="kpi-content">
                    <h3>Total Duration</h3>
                    <div className="kpi-value">
                      <span className="value">
                        {formatDuration(analytics.summary.totalDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon events">
                    <TrendingUp size={24} />
                  </div>
                  <div className="kpi-content">
                    <h3>Avg Duration</h3>
                    <div className="kpi-value">
                      <span className="value">
                        {formatDuration(analytics.summary.averageDuration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Recent Playback Logs */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">User Activity by Exhibit</h3>
              <div className="analytics-note">
                <small>Shows aggregated listening activity per user per exhibit. Multiple audio plays are combined.</small>
              </div>
            </div>
            <div className="admin-card-content">
              {logs.length > 0 ? (
                <>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Exhibit</th>
                        <th>Total Plays</th>
                        <th>Total Duration</th>
                        <th>First Play</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.audioLogsId}>
                          <td>
                            <div className="user-info">
                              <strong>
                                {log.user?.username || "Unknown User"}
                              </strong>
                              <div className="user-email">
                                {log.user?.email}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="exhibit-info">
                              <strong>
                                {log.audio?.exhibit?.title || "No Exhibit"}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <span className="plays-badge">
                              {log.totalPlays || 1} play{(log.totalPlays || 1) !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>
                            <span className={`duration-badge ${
                              log.durationListened === 0 ? "zero-duration" : ""
                            }`}>
                              {log.durationListened && log.durationListened > 0
                                ? formatDuration(log.durationListened)
                                : log.durationListened === 0 
                                  ? "No listening"
                                  : "N/A"}
                            </span>
                          </td>
                          <td>{formatDateTime(log.audioStart)}</td>
                          <td>
                            {log.audioEnd ? formatDateTime(log.audioEnd) : "In Progress"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="admin-table-pagination">
                    <div className="admin-table-pagination-info">
                      Showing {logs.length} recent logs
                    </div>
                    <div className="admin-table-pagination-controls">
                      <button
                        className="admin-table-pagination-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </button>
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => i + 1
                      ).map((page) => (
                        <button
                          key={page}
                          className={`admin-table-pagination-btn ${
                            currentPage === page ? "active" : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="admin-table-pagination-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p>No playback logs available</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
};

export default AudioAnalyticsPage;
