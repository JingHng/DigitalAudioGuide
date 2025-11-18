import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  TrendingUp,
  RefreshCw,
  UserPlus,
  Activity,
  Headphones,
  Eye,
  Music,
} from "lucide-react";
import "../../css/AdminDashboard.css";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: { role: string; count: number; percentage: number }[];
  registrationTrend: { date: string; count: number }[];
  averageSessionTime: number;
}

interface ExhibitStats {
  totalExhibits: number;
  popularExhibits: { id: string; name: string; visits: number }[];
  exhibitViews: { name: string; views: number }[];
}

interface AudioStats {
  totalAudioPlays: number;
  audioByLanguage: { language: string; plays: number }[];
  averageListenTime: number;
  topAudioContent: { exhibit: string; plays: number; avgDuration: number }[];
}

interface AuditStats {
  totalActions: number;
  recentActions: {
    action: string;
    resource: string;
    adminUser: string;
    targetUser?: string;
    timestamp: string;
  }[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#FF6B6B",
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Registration trend filtering options
  const [filterType, setFilterType] = useState<"period" | "dateRange">(
    "period"
  );
  const [selectedPeriod, setSelectedPeriod] = useState(6);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });

  // Remove pagination and filtering states - show only last 5 actions

  // Audio analytics pagination
  const [audioCurrentPage, setAudioCurrentPage] = useState(1);
  const [audioItemsPerPage, setAudioItemsPerPage] = useState(5);
  const [audioSortBy, setAudioSortBy] = useState<"plays" | "duration" | "name">(
    "plays"
  );
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: [],
    registrationTrend: [],
    averageSessionTime: 0,
  });
  const [exhibitStats, setExhibitStats] = useState<ExhibitStats>({
    totalExhibits: 0,
    popularExhibits: [],
    exhibitViews: [],
  });
  const [audioStats, setAudioStats] = useState<AudioStats>({
    totalAudioPlays: 0,
    audioByLanguage: [],
    averageListenTime: 0,
    topAudioContent: [],
  });
  const [auditStats, setAuditStats] = useState<AuditStats>({
    totalActions: 0,
    recentActions: [],
  });

  // Function to validate date range
  const validateDateRange = (
    fromDate: string,
    toDate: string
  ): string | null => {
    console.log("Validating date range:", { fromDate, toDate }); // Debug log

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const now = new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return "Invalid date format";
    }

    if (from > to) {
      return "Start date cannot be after end date";
    }

    if (to > now) {
      return "End date cannot be in the future";
    }

    // Limit to maximum 5 years range
    const maxRange = new Date(from);
    maxRange.setFullYear(maxRange.getFullYear() + 5);

    if (to > maxRange) {
      return "Date range cannot exceed 5 years";
    }

    console.log("Date range validation passed"); // Debug log
    return null;
  };

  // Function to apply period filter
  const applyPeriodFilter = (months: number) => {
    setFilterType("period");
    setSelectedPeriod(months);
    fetchDashboardStats("period", months);
  };

  // Function to apply date range filter
  const applyDateRangeFilter = () => {
    console.log("Applying date range filter:", { dateFrom, dateTo }); // Debug log
    const validationError = validateDateRange(dateFrom, dateTo);
    if (validationError) {
      alert(validationError);
      return;
    }
    setFilterType("dateRange");
    fetchDashboardStats("dateRange", undefined, dateFrom, dateTo);
  };

  // Function to fetch dashboard statistics
  const fetchDashboardStats = async (
    type = filterType,
    period = selectedPeriod,
    fromDate = dateFrom,
    toDate = dateTo
  ) => {
    console.log("fetchDashboardStats called with:", {
      type,
      period,
      fromDate,
      toDate,
    }); // Debug log
    setIsLoading(true);
    try {
      // Determine query parameters based on filter type
      let queryParams = "";
      if (type === "period") {
        queryParams = `?period=${period}`;
      } else {
        queryParams = `?dateFrom=${fromDate}&dateTo=${toDate}`;
      }

      console.log("Making API call to:", `/users/stats${queryParams}`); // Debug log

      // Fetch user statistics with appropriate parameters
      const userResponse = await apiClient.get(`/users/stats${queryParams}`);
      console.log("User stats response:", userResponse.data); // Debug log

      if (userResponse.data) {
        setUserStats(userResponse.data);
      }

      // Fetch exhibit statistics
      const exhibitResponse = await apiClient.get("/exhibitions");
      if (exhibitResponse.data) {
        setExhibitStats({
          totalExhibits: exhibitResponse.data.length,
          popularExhibits: exhibitResponse.data
            .slice(0, 5)
            .map((exhibit: any) => ({
              id: exhibit.exhibitId,
              name: exhibit.title,
              visits: Math.floor(Math.random() * 1000) + 100, // Mock data for now
            })),
          exhibitViews: exhibitResponse.data
            .slice(0, 6)
            .map((exhibit: any) => ({
              name: exhibit.title,
              views: Math.floor(Math.random() * 500) + 50,
            })),
        });
      }

      // Fetch audio analytics
      try {
        const audioResponse = await apiClient.get("/audio-logs/analytics");
        if (audioResponse.data) {
          setAudioStats(audioResponse.data);
        }
      } catch (audioError) {
        console.log(
          "Audio analytics not available, using mock data based on exhibits:",
          audioError
        );
        // Generate mock audio stats based on available exhibits for better demo
        const mockAudioStats = {
          totalAudioPlays: Math.floor(Math.random() * 2000) + 500,
          audioByLanguage: [
            {
              language: "English",
              plays: Math.floor(Math.random() * 800) + 200,
            },
            {
              language: "Japanese",
              plays: Math.floor(Math.random() * 400) + 100,
            },
            {
              language: "Chinese",
              plays: Math.floor(Math.random() * 300) + 50,
            },
          ],
          averageListenTime: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
          topAudioContent: exhibitStats.popularExhibits.map((exhibit) => ({
            exhibit: exhibit.name || `Exhibit ${exhibit.id}`,
            plays: Math.floor(Math.random() * 200) + 50,
            avgDuration: Math.floor(Math.random() * 240) + 60, // 1-5 minutes
          })),
        };
        setAudioStats(mockAudioStats);
      }

      // Fetch audit log data with better error handling and response mapping
      try {
        const auditResponse = await apiClient.get("/audit-logs/stats");
        console.log("Audit response:", auditResponse.data); // Debug log

        if (auditResponse.data) {
          setAuditStats({
            totalActions: auditResponse.data.totalLogs || 0,
            recentActions: (auditResponse.data.recentLogs || [])
              .slice(0, 5)
              .map((log: any) => ({
                action: log.action || "unknown",
                resource: log.resource || "system",
                adminUser:
                  log.adminUser?.username || log.adminUser?.email || "System",
                targetUser:
                  log.targetUser?.username ||
                  log.targetUser?.email ||
                  undefined,
                timestamp: log.timestamp || new Date().toISOString(),
              })),
          });
        }
      } catch (auditError: any) {
        console.error("Audit stats error details:", auditError);

        // Try to get recent audit logs from regular endpoint as fallback
        try {
          const fallbackResponse = await apiClient.get("/audit-logs?limit=5");
          if (fallbackResponse.data?.auditLogs) {
            setAuditStats({
              totalActions:
                fallbackResponse.data.pagination?.totalLogs ||
                fallbackResponse.data.auditLogs.length,
              recentActions: fallbackResponse.data.auditLogs
                .slice(0, 5)
                .map((log: any) => ({
                  action: log.action || "unknown",
                  resource: log.resource || "system",
                  adminUser:
                    log.adminUser?.username || log.adminUser?.email || "System",
                  targetUser:
                    log.targetUser?.username ||
                    log.targetUser?.email ||
                    undefined,
                  timestamp: log.timestamp || new Date().toISOString(),
                })),
            });
          } else {
            throw new Error("No audit data available");
          }
        } catch (fallbackError) {
          console.log("Using mock audit data due to API unavailability");
          // Generate realistic mock audit data based on current time
          const now = Date.now();
          const mockAuditStats = {
            totalActions: Math.floor(Math.random() * 100) + 50,
            recentActions: [
              {
                action: "generate_tts",
                resource: "audio",
                adminUser: user?.username || "admin@museum.com",
                timestamp: new Date(now - 1000 * 60 * 5).toISOString(), // 5 min ago
              },
              {
                action: "create",
                resource: "audio",
                adminUser: user?.username || "admin@museum.com",
                timestamp: new Date(now - 1000 * 60 * 15).toISOString(), // 15 min ago
              },
              {
                action: "update",
                resource: "exhibit",
                adminUser: user?.username || "curator@museum.com",
                timestamp: new Date(now - 1000 * 60 * 45).toISOString(), // 45 min ago
              },
              {
                action: "create",
                resource: "user",
                adminUser: user?.username || "admin@museum.com",
                targetUser: "visitor@email.com",
                timestamp: new Date(now - 1000 * 60 * 120).toISOString(), // 2 hours ago
              },
              {
                action: "upload",
                resource: "audio",
                adminUser: user?.username || "admin@museum.com",
                timestamp: new Date(now - 1000 * 60 * 180).toISOString(), // 3 hours ago
              },
            ],
          };
          setAuditStats(mockAuditStats);
        }
      }
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);

      // Handle specific error messages from backend
      if (error.response?.data?.error) {
        console.error("Backend error:", error.response.data.error);
        alert(`Filter error: ${error.response.data.error}`);
      } else {
        console.log("Using mock data due to API unavailability");
      }

      // Set mock data for demo purposes
      setUserStats({
        totalUsers: 156,
        activeUsers: 89,
        usersByRole: [
          { role: "visitor", count: 134, percentage: 86 },
          { role: "admin", count: 12, percentage: 8 },
          { role: "super_admin", count: 10, percentage: 6 },
        ],
        registrationTrend: [
          { date: "Jan", count: 12 },
          { date: "Feb", count: 19 },
          { date: "Mar", count: 23 },
          { date: "Apr", count: 31 },
          { date: "May", count: 28 },
          { date: "Jun", count: 43 },
        ],
        averageSessionTime: 1847, // seconds
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Update dates when switching to period filter (only when actually switching TO period)
  useEffect(() => {
    if (filterType === "period") {
      const toDate = new Date();
      const fromDate = new Date();
      if (selectedPeriod > 0) {
        fromDate.setMonth(fromDate.getMonth() - selectedPeriod);
      } else {
        // For "Overall", set a far back date
        fromDate.setFullYear(fromDate.getFullYear() - 10);
      }
      setDateFrom(fromDate.toISOString().split("T")[0]);
      setDateTo(toDate.toISOString().split("T")[0]);
    }
  }, [selectedPeriod]); // Removed filterType dependency to prevent interference

  // KPI stats based on real user data
  const stats = {
    totalUsers: {
      total: userStats.totalUsers,
      trend: "Total registered users",
      isPositive: true,
    },
    activeUsers: {
      total: userStats.activeUsers,
      trend: `${
        userStats.totalUsers > 0
          ? Math.round((userStats.activeUsers / userStats.totalUsers) * 100)
          : 0
      }% of total users`,
      isPositive: true,
    },
    totalExhibits: {
      total: exhibitStats.totalExhibits,
      trend: "Available exhibits",
      isPositive: true,
    },
    audioPlays: {
      total: audioStats.totalAudioPlays,
      trend: `${Math.round(audioStats.averageListenTime / 60)}m avg duration`,
      isPositive: true,
    },
  };

  return (
    <AdminLayout currentPath="/admin">
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="dashboard-filters">
            <button
              className={`refresh-btn ${isLoading ? "loading" : ""}`}
              onClick={() => {
                fetchDashboardStats();
              }}
              disabled={isLoading}
              aria-label="Refresh data"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-icon visitors">
              <Users size={24} />
            </div>
            <div className="kpi-content">
              <h3>Total Users</h3>
              <div className="kpi-value">
                <span className="value">{stats.totalUsers.total}</span>
                <span
                  className={`trend ${
                    stats.totalUsers.isPositive ? "positive" : "negative"
                  }`}
                >
                  {stats.totalUsers.trend}
                </span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon sales">
              <UserPlus size={24} />
            </div>
            <div className="kpi-content">
              <h3>Active Users</h3>
              <div className="kpi-value">
                <span className="value">{stats.activeUsers.total}</span>
                <span
                  className={`trend ${
                    stats.activeUsers.isPositive ? "positive" : "negative"
                  }`}
                >
                  {stats.activeUsers.trend}
                </span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon exhibits">
              <Eye size={24} />
            </div>
            <div className="kpi-content">
              <h3>Total Exhibitions</h3>
              <div className="kpi-value">
                <span className="value">{stats.totalExhibits.total}</span>
                <span
                  className={`trend ${
                    stats.totalExhibits.isPositive ? "positive" : "negative"
                  }`}
                >
                  {stats.totalExhibits.trend}
                </span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon events">
              <Headphones size={24} />
            </div>
            <div className="kpi-content">
              <h3>Audio Plays</h3>
              <div className="kpi-value">
                <span className="value">{stats.audioPlays.total}</span>
                <span
                  className={`trend ${
                    stats.audioPlays.isPositive ? "positive" : "negative"
                  }`}
                >
                  {stats.audioPlays.trend}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="dashboard-charts">
          <div className="chart-container users-chart">
            <div className="chart-header">
              <h2>User Registration Trend</h2>
              <div className="chart-controls">
                {/* Filter Type Toggle */}
                <div className="filter-type-selector">
                  <button
                    className={`filter-type-btn ${
                      filterType === "period" ? "active" : ""
                    }`}
                    onClick={() => setFilterType("period")}
                    disabled={isLoading}
                  >
                    Quick Periods
                  </button>
                  <button
                    className={`filter-type-btn ${
                      filterType === "dateRange" ? "active" : ""
                    }`}
                    onClick={() => setFilterType("dateRange")}
                    disabled={isLoading}
                  >
                    Custom Range
                  </button>
                </div>

                {/* Period Dropdown */}
                {filterType === "period" ? (
                  <div className="period-filter-dropdown">
                    <label htmlFor="periodSelect">Time Period:</label>
                    <select
                      id="periodSelect"
                      value={selectedPeriod}
                      onChange={(e) =>
                        applyPeriodFilter(parseInt(e.target.value))
                      }
                      className="period-select-dropdown"
                      disabled={isLoading}
                    >
                      <option value={1}>Last 1 month</option>
                      <option value={3}>Last 3 months</option>
                      <option value={6}>Last 6 months</option>
                      <option value={12}>Last 12 months</option>
                      <option value={24}>Last 24 months</option>
                      <option value={0}>Overall (All time)</option>
                    </select>
                  </div>
                ) : (
                  /* Date Range Inputs */
                  <div className="date-range-filters">
                    <div className="date-input-group">
                      <label htmlFor="dateFrom">From:</label>
                      <input
                        type="date"
                        id="dateFrom"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="date-input"
                        disabled={isLoading}
                        max={dateTo}
                      />
                    </div>
                    <div className="date-input-group">
                      <label htmlFor="dateTo">To:</label>
                      <input
                        type="date"
                        id="dateTo"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="date-input"
                        disabled={isLoading}
                        min={dateFrom}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <button
                      onClick={applyDateRangeFilter}
                      className="apply-filter-btn"
                      disabled={isLoading}
                    >
                      Apply Filter
                    </button>
                  </div>
                )}

                <div className="chart-stats">
                  <div className="chart-stat">
                    <span className="chart-stat-label">Period:</span>
                    <span className="chart-stat-value">
                      {filterType === "period"
                        ? selectedPeriod === 0
                          ? "All time"
                          : `Last ${selectedPeriod} month${
                              selectedPeriod > 1 ? "s" : ""
                            }`
                        : `${dateFrom} to ${dateTo}`}
                    </span>
                  </div>
                  <div className="chart-stat">
                    <span className="chart-stat-label">Total:</span>
                    <span className="chart-stat-value">
                      {userStats.totalUsers} users
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="chart-loading">
                <Activity className="loading-spinner" size={32} />
                <p>Loading data...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={userStats.registrationTrend}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="charts-row">
            <div className="chart-container exhibit-popularity-chart">
              <div className="chart-header">
                <h2>Popular Exhibits by Audio Plays</h2>
                <div className="chart-badge">Audio Analytics</div>
              </div>
              {isLoading ? (
                <div className="chart-loading">
                  <Activity className="loading-spinner" size={32} />
                  <p>Loading data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  {audioStats.topAudioContent.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={audioStats.topAudioContent
                          .slice(0, 6)
                          .map((item) => ({
                            name: item.exhibit,
                            value: item.plays,
                            duration: item.avgDuration,
                          }))}
                        cx="38%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {audioStats.topAudioContent
                          .slice(0, 6)
                          .map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} plays`, name]}
                      />
                    </PieChart>
                  ) : (
                    <div className="chart-no-data">
                      <Headphones size={48} color="#ccc" />
                      <p>No audio playback data available yet</p>
                      <p>
                        Start playing audio guides to see exhibit popularity
                      </p>
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-container admin-activity-chart">
              <div className="chart-header">
                <h2>Recent Admin Actions</h2>
                <div className="chart-stats">
                  <div className="chart-stat">
                    <Activity size={14} />
                    <span className="chart-stat-value">Last 24 hours</span>
                  </div>
                </div>
              </div>
              {isLoading ? (
                <div className="chart-loading">
                  <Activity className="loading-spinner" size={32} />
                  <p>Loading data...</p>
                </div>
              ) : (
                <div className="admin-activity-list">
                  {auditStats.recentActions.length > 0 ? (
                    auditStats.recentActions.map((action, index) => (
                      <div key={index} className="admin-activity-item">
                        <div className={`admin-activity-icon ${action.action}`}>
                          {action.action === "create" && <UserPlus size={16} />}
                          {action.action === "update" && <Activity size={16} />}
                          {action.action === "delete" && <Users size={16} />}
                        </div>
                        <div className="admin-activity-content">
                          <div className="admin-activity-text">
                            {action.adminUser || "System"} {action.action}d{" "}
                            {action.resource}
                            {action.targetUser && ` for ${action.targetUser}`}
                          </div>
                          <div className="admin-activity-meta">
                            <span className="admin-activity-time">
                              {new Date(action.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="chart-no-data">
                      <Activity size={48} color="#ccc" />
                      <p>No recent admin activity</p>
                      <p>Actions will appear here as they occur</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Analytics Section */}
        {audioStats.totalAudioPlays > 0 && (
          <div className="audio-analytics">
            <div className="section-header">
              <h2>Audio Analytics</h2>
              <div className="analytics-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Plays:</span>
                  <span className="summary-value">
                    {audioStats.totalAudioPlays}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Avg Listen Time:</span>
                  <span className="summary-value">
                    {Math.round(audioStats.averageListenTime / 60)}m
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Languages:</span>
                  <span className="summary-value">
                    {audioStats.audioByLanguage.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="analytics-charts-grid">
              {/* Audio by Language */}
              <div className="chart-container">
                <div className="chart-header">
                  <h3>Audio Plays by Language</h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={audioStats.audioByLanguage}
                      cx="38%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="plays"
                      label={({ language, plays }) => `${language}: ${plays}`}
                    >
                      {audioStats.audioByLanguage.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}`, "Plays"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Audio Content */}
              <div className="chart-container">
                <div className="chart-header">
                  <h3>Top Audio Content</h3>
                  <div className="audio-content-controls">
                    <select
                      value={audioSortBy}
                      onChange={(e) =>
                        setAudioSortBy(
                          e.target.value as "plays" | "duration" | "name"
                        )
                      }
                      className="sort-select"
                    >
                      <option value="plays">Sort by Plays</option>
                      <option value="duration">Sort by Duration</option>
                      <option value="name">Sort by Name</option>
                    </select>

                    <select
                      value={audioItemsPerPage}
                      onChange={(e) => {
                        setAudioItemsPerPage(parseInt(e.target.value));
                        setAudioCurrentPage(1);
                      }}
                      className="items-select"
                    >
                      <option value={5}>5 items</option>
                      <option value={10}>10 items</option>
                      <option value={15}>15 items</option>
                    </select>
                  </div>
                </div>

                <div className="content-table">
                  {(() => {
                    // Sort audio content
                    let sortedContent = [...audioStats.topAudioContent];
                    switch (audioSortBy) {
                      case "plays":
                        sortedContent.sort((a, b) => b.plays - a.plays);
                        break;
                      case "duration":
                        sortedContent.sort(
                          (a, b) => b.avgDuration - a.avgDuration
                        );
                        break;
                      case "name":
                        sortedContent.sort((a, b) =>
                          a.exhibit.localeCompare(b.exhibit)
                        );
                        break;
                    }

                    // Paginate content
                    const startIndex =
                      (audioCurrentPage - 1) * audioItemsPerPage;
                    const endIndex = startIndex + audioItemsPerPage;
                    const paginatedContent = sortedContent.slice(
                      startIndex,
                      endIndex
                    );
                    const totalPages = Math.ceil(
                      sortedContent.length / audioItemsPerPage
                    );

                    return (
                      <>
                        {paginatedContent.map((content, index) => (
                          <div key={startIndex + index} className="content-row">
                            <div className="rank">
                              #{startIndex + index + 1}
                            </div>
                            <div className="content-info">
                              <span className="content-name">
                                {content.exhibit}
                              </span>
                              <span className="play-count">
                                {content.plays} plays
                              </span>
                            </div>
                            <div className="duration">
                              {Math.round(content.avgDuration / 60)}m avg
                            </div>
                          </div>
                        ))}

                        {/* Audio Pagination */}
                        {totalPages > 1 && (
                          <div className="audio-pagination">
                            <div className="pagination-info">
                              Showing {paginatedContent.length} of{" "}
                              {sortedContent.length} items
                            </div>
                            <div className="pagination-controls">
                              <button
                                disabled={audioCurrentPage === 1}
                                onClick={() =>
                                  setAudioCurrentPage(audioCurrentPage - 1)
                                }
                                className="pagination-btn"
                              >
                                Previous
                              </button>

                              {Array.from(
                                { length: Math.min(totalPages, 3) },
                                (_, i) => {
                                  let pageNum;
                                  if (totalPages <= 3) {
                                    pageNum = i + 1;
                                  } else if (audioCurrentPage <= 2) {
                                    pageNum = i + 1;
                                  } else if (
                                    audioCurrentPage >=
                                    totalPages - 1
                                  ) {
                                    pageNum = totalPages - 2 + i;
                                  } else {
                                    pageNum = audioCurrentPage - 1 + i;
                                  }

                                  return (
                                    <button
                                      key={pageNum}
                                      className={`pagination-btn ${
                                        audioCurrentPage === pageNum
                                          ? "active"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setAudioCurrentPage(pageNum)
                                      }
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                }
                              )}

                              <button
                                disabled={audioCurrentPage === totalPages}
                                onClick={() =>
                                  setAudioCurrentPage(audioCurrentPage + 1)
                                }
                                className="pagination-btn"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
