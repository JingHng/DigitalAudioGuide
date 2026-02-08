import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import apiClient from "../../utils/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  RefreshCw,
  UserPlus,
  Activity,
  Headphones,
  Eye,
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

interface ExhibitionVisitorStats {
  exhibitionId: string;
  exhibitionTitle: string;
  uniqueVisitors: number;
  totalVisits: number;
  exhibitCount: number;
}

interface AllExhibitionsVisitorStats {
  exhibitions: ExhibitionVisitorStats[];
  dateRange: { from: string; to: string } | null;
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

  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Dashboard' }
  ];

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
  
  // Visitor statistics states
  const [visitorStats, setVisitorStats] = useState<AllExhibitionsVisitorStats | null>(null);
  const [visitorStatsLoading, setVisitorStatsLoading] = useState(false);
  const [selectedExhibitionIds, setSelectedExhibitionIds] = useState<string[]>([]);
  const [exhibitionDropdownOpen, setExhibitionDropdownOpen] = useState(false);
  
  // Separate date filters for visitor stats
  const [visitorFilterType, setVisitorFilterType] = useState<"period" | "dateRange">("period");
  const [visitorPeriod, setVisitorPeriod] = useState(0); // 0 = all time
  const [visitorDateFrom, setVisitorDateFrom] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  });
  const [visitorDateTo, setVisitorDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
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

      console.log("Making API calls to:", `/users/stats${queryParams}`, "/exhibitions/stats", "/audio-logs/analytics", "/audit-logs/stats"); // Debug log

      // PARALLEL FETCH: Fetch all dashboard stats simultaneously for much faster loading
      const [userResponse, exhibitResponse, audioResponse, auditResponse] = await Promise.allSettled([
        apiClient.get(`/users/stats${queryParams}`),
        apiClient.get("/exhibitions/stats"),
        apiClient.get("/audio-logs/analytics"),
        apiClient.get("/audit-logs/stats")
      ]);

      // Process user stats
      if (userResponse.status === "fulfilled" && userResponse.value.data) {
        console.log("User stats response:", userResponse.value.data); // Debug log
        setUserStats(userResponse.value.data);
      }

      // Process exhibit statistics
      if (exhibitResponse.status === "fulfilled" && exhibitResponse.value.data) {
        setExhibitStats({
          totalExhibits: exhibitResponse.value.data.totalExhibitions,
          popularExhibits: exhibitResponse.value.data.recentExhibitions
            .slice(0, 5)
            .map((exhibit: any) => ({
              id: exhibit.id,
              name: exhibit.name,
              visits: Math.floor(Math.random() * 1000) + 100, // Mock data for now
            })),
          exhibitViews: exhibitResponse.value.data.recentExhibitions
            .slice(0, 6)
            .map((exhibit: any) => ({
              name: exhibit.name,
              views: Math.floor(Math.random() * 500) + 50,
            })),
        });
      }

      // Process audio analytics
      if (audioResponse.status === "fulfilled" && audioResponse.value.data) {
        setAudioStats(audioResponse.value.data);
      } else {
        console.log("Audio analytics not available, using mock data");
        // Generate mock audio stats
        const mockExhibits = exhibitResponse.status === "fulfilled" && exhibitResponse.value.data
          ? exhibitResponse.value.data.recentExhibitions.slice(0, 5)
          : [];
        
        const mockAudioStats = {
          totalAudioPlays: Math.floor(Math.random() * 2000) + 500,
          audioByLanguage: [
            { language: "English", plays: Math.floor(Math.random() * 800) + 200 },
            { language: "Japanese", plays: Math.floor(Math.random() * 400) + 100 },
            { language: "Chinese", plays: Math.floor(Math.random() * 300) + 50 },
          ],
          averageListenTime: Math.floor(Math.random() * 300) + 120,
          topAudioContent: mockExhibits.map((exhibit: any) => ({
            exhibit: exhibit.name || `Exhibit ${exhibit.id}`,
            plays: Math.floor(Math.random() * 200) + 50,
            avgDuration: Math.floor(Math.random() * 240) + 60,
          })),
        };
        setAudioStats(mockAudioStats);
      }

      // Process audit log data
      if (auditResponse.status === "fulfilled" && auditResponse.value.data) {
        console.log("Audit response:", auditResponse.value.data); // Debug log
        setAuditStats({
          totalActions: auditResponse.value.data.totalLogs || 0,
          recentActions: (auditResponse.value.data.recentLogs || [])
            .slice(0, 5)
            .map((log: any) => ({
              action: log.action || "unknown",
              resource: log.resource || "system",
              adminUser: log.adminUser?.username || log.adminUser?.email || "System",
              targetUser: log.targetUser?.username || log.targetUser?.email || undefined,
              timestamp: log.timestamp || new Date().toISOString(),
            })),
        });
      } else {
        // Fallback to regular audit logs endpoint
        try {
          const fallbackResponse = await apiClient.get("/audit-logs?limit=5");
          if (fallbackResponse.data?.auditLogs) {
            setAuditStats({
              totalActions: fallbackResponse.data.pagination?.totalLogs || fallbackResponse.data.auditLogs.length,
              recentActions: fallbackResponse.data.auditLogs
                .slice(0, 5)
                .map((log: any) => ({
                  action: log.action || "unknown",
                  resource: log.resource || "system",
                  adminUser: log.adminUser?.username || log.adminUser?.email || "System",
                  targetUser: log.targetUser?.username || log.targetUser?.email || undefined,
                  timestamp: log.timestamp || new Date().toISOString(),
                })),
            });
          } else {
            throw new Error("No audit data available");
          }
        } catch (fallbackError) {
          console.log("Using mock audit data due to API unavailability");
          const now = Date.now();
          const mockAuditStats = {
            totalActions: Math.floor(Math.random() * 100) + 50,
            recentActions: [
              {
                action: "generate_tts",
                resource: "audio",
                adminUser: user?.username || "admin@museum.com",
                timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
              },
              {
                action: "create",
                resource: "audio",
                adminUser: user?.username || "admin@museum.com",
                timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
              },
              {
                action: "update",
                resource: "exhibit",
                adminUser: user?.username || "curator@museum.com",
                timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
              },
              {
                action: "create",
                resource: "user",
                adminUser: user?.username || "admin@museum.com",
                targetUser: "visitor@email.com",
                timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
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

  // Fetch all exhibitions for the dropdown
  // Fetch visitor statistics for ALL exhibitions
  const fetchVisitorStats = async () => {
    setVisitorStatsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Use visitor-specific filters
      if (visitorFilterType === "dateRange") {
        queryParams.append("dateFrom", visitorDateFrom);
        queryParams.append("dateTo", visitorDateTo);
        console.log('Visitor stats: Using custom date range', { dateFrom: visitorDateFrom, dateTo: visitorDateTo });
      } else if (visitorPeriod > 0) {
        // Apply period filter for specific months (1, 3, 6, 12)
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - visitorPeriod);
        queryParams.append("dateFrom", fromDate.toISOString().split("T")[0]);
        queryParams.append("dateTo", toDate.toISOString().split("T")[0]);
        console.log('Visitor stats: Using period filter', { months: visitorPeriod, fromDate: fromDate.toISOString().split("T")[0], toDate: toDate.toISOString().split("T")[0] });
      } else {
        // visitorPeriod === 0 means "Overall" - don't apply any date filter
        console.log('Visitor stats: Showing all-time data (no date filter)');
      }

      const url = `/exhibitions/visitor-stats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      console.log('Fetching all exhibitions visitor stats from:', url);
      const response = await apiClient.get(url);
      setVisitorStats(response.data);
      
      // Initialize selected exhibitions to all exhibitions on first load
      if (selectedExhibitionIds.length === 0 && response.data?.exhibitions) {
        setSelectedExhibitionIds(response.data.exhibitions.map((ex: ExhibitionVisitorStats) => ex.exhibitionId));
      }
      
      console.log('All exhibitions visitor stats response:', response.data);
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
      setVisitorStats(null);
    } finally {
      setVisitorStatsLoading(false);
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardStats();
    fetchVisitorStats();
  }, []);

  // Fetch visitor stats when date range changes
  useEffect(() => {
    fetchVisitorStats();
  }, [visitorDateFrom, visitorDateTo, visitorPeriod, visitorFilterType]);

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
    <AdminLayout currentPath="/admin/dashboard" breadcrumbs={breadcrumbs}>
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '24px', 
          marginBottom: '32px' 
        }}>
          {/* Total Users */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#e8f0fe',
              color: '#1a73e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={28} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>Total Users</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#202124', lineHeight: 1.2 }}>{stats.totalUsers.total}</div>
            </div>
          </div>

          {/* Total Active Tours */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#fef7e0',
              color: '#f9ab00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Eye size={28} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>Total Active Tours</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#202124', lineHeight: 1.2 }}>{stats.totalExhibits.total}</div>
            </div>
          </div>

          {/* Audio Plays */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#f3e8fd',
              color: '#9334e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Headphones size={28} />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#5f6368', fontWeight: 500, marginBottom: '4px' }}>Audio Plays</div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: '#202124', lineHeight: 1.2 }}>{stats.audioPlays.total}</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="dashboard-charts">
          <div className="chart-container visitor-stats-chart" style={{ width: '100%', marginBottom: '24px', background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e0e0e0' }}>
            <div className="chart-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', color: '#202124', margin: '0 0 4px 0', fontWeight: 500, fontFamily: "'Google Sans', sans-serif" }}>Total Visitors Per Exhibition (Tour)</h2>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>Unique visitor tracking across exhibitions</div>
              </div>

              <div className="chart-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* Exhibition Multi-Select Filter - Minimal Design */}
                {visitorStats && visitorStats.exhibitions.length > 0 && (
                  <div className="visitor-stats-filter" style={{ position: 'relative', minWidth: '220px' }}>
                    <button
                      onClick={() => setExhibitionDropdownOpen(!exhibitionDropdownOpen)}
                      disabled={visitorStatsLoading}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'white',
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#3c4043',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span>{selectedExhibitionIds.length} tours selected</span>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
                    </button>
                    
                    {exhibitionDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(60,64,67,0.15)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #f1f3f4', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedExhibitionIds(visitorStats.exhibitions.map(ex => ex.exhibitionId))}
                            style={{ flex: 1, padding: '6px 8px', fontSize: '12px', background: '#e8f0fe', color: '#1967d2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setSelectedExhibitionIds([])}
                            style={{ flex: 1, padding: '6px 8px', fontSize: '12px', background: '#f1f3f4', color: '#5f6368', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
                          >
                            Clear
                          </button>
                        </div>
                        
                        {visitorStats.exhibitions.map((exhibition) => (
                          <label
                            key={exhibition.exhibitionId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              borderBottom: '1px solid #f8f9fa',
                              color: '#3c4043'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <input
                              type="checkbox"
                              checked={selectedExhibitionIds.includes(exhibition.exhibitionId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExhibitionIds([...selectedExhibitionIds, exhibition.exhibitionId]);
                                } else {
                                  setSelectedExhibitionIds(selectedExhibitionIds.filter(id => id !== exhibition.exhibitionId));
                                }
                              }}
                              style={{ cursor: 'pointer', accentColor: '#1a73e8', width: '16px', height: '16px' }}
                            />
                            <span style={{ flex: 1 }}>{exhibition.exhibitionTitle}</span>
                            <span style={{ color: '#5f6368', fontSize: '11px', background: '#f1f3f4', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                              {exhibition.uniqueVisitors}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Date Filter Type Toggle - Minimal */}
                <div className="filter-type-selector" style={{ background: '#f1f3f4', padding: '4px', borderRadius: '8px', display: 'flex', gap: '2px' }}>
                  <button
                    onClick={() => setVisitorFilterType("period")}
                    disabled={visitorStatsLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '6px',
                      background: visitorFilterType === "period" ? 'white' : 'transparent',
                      color: visitorFilterType === "period" ? '#1a73e8' : '#5f6368',
                      boxShadow: visitorFilterType === "period" ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    Quick Periods
                  </button>
                  <button
                    onClick={() => setVisitorFilterType("dateRange")}
                    disabled={visitorStatsLoading}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: 'none',
                      borderRadius: '6px',
                      background: visitorFilterType === "dateRange" ? 'white' : 'transparent',
                      color: visitorFilterType === "dateRange" ? '#1a73e8' : '#5f6368',
                      boxShadow: visitorFilterType === "dateRange" ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    Custom Range
                  </button>
                </div>

                {/* Period Filter */}
                {visitorFilterType === "period" && (
                  <div className="visitor-stats-filter">
                    <select
                      id="visitorPeriodSelect"
                      value={visitorPeriod}
                      onChange={(e) => setVisitorPeriod(parseInt(e.target.value))}
                      disabled={visitorStatsLoading}
                      className="items-select"
                      style={{ padding: '8px 24px 8px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #dadce0', background: 'white', color: '#3c4043', outline: 'none' }}
                    >
                      <option value={0}>All Time</option>
                      <option value={1}>Last Month</option>
                      <option value={3}>Last 3 Months</option>
                      <option value={6}>Last 6 Months</option>
                      <option value={12}>Last Year</option>
                    </select>
                  </div>
                )}

                {/* Custom Date Range */}
                {visitorFilterType === "dateRange" && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={visitorDateFrom}
                      onChange={(e) => setVisitorDateFrom(e.target.value)}
                      disabled={visitorStatsLoading}
                      className="items-select"
                      style={{ width: '130px', padding: '7px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #dadce0', color: '#3c4043' }}
                    />
                    <span style={{color: '#9aa0a6', fontSize: '12px', fontWeight: 500}}>to</span>
                    <input
                      type="date"
                      value={visitorDateTo}
                      onChange={(e) => setVisitorDateTo(e.target.value)}
                      disabled={visitorStatsLoading}
                      className="items-select"
                      style={{ width: '130px', padding: '7px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #dadce0', color: '#3c4043' }}
                    />
                  </div>
                )}
              </div>
            </div>
            {visitorStatsLoading ? (
              <div className="chart-loading" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                <Activity className="loading-spinner" size={24} style={{ color: '#1a73e8' }} />
                <p style={{ fontSize: '13px', color: '#5f6368' }}>Loading visitor data...</p>
              </div>
            ) : !visitorStats || visitorStats.exhibitions.length === 0 ? (
              <div className="chart-no-data" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                <Users size={32} color="#dadce0" />
                <p style={{ color: '#5f6368', fontWeight: 500 }}>No visitor data available</p>
                <p className="text-sm" style={{ fontSize: '12px', marginTop: '4px', color: '#9aa0a6' }}>
                  Statistics are based on registered visitors who claimed badges
                </p>
              </div>
            ) : (
              <>
                {(() => {
                  // Filter exhibitions based on selected IDs
                  const filteredExhibitions = visitorStats.exhibitions.filter(ex => 
                    selectedExhibitionIds.includes(ex.exhibitionId)
                  );
                  
                  return (
                    <>
                      {filteredExhibitions.length === 0 ? (
                        <div className="chart-no-data" style={{ padding: '60px', textAlign: 'center' }}>
                          <Users size={40} color="#dadce0" style={{ margin: '0 auto 16px', display: 'block' }} />
                          <p style={{ color: '#5f6368', fontSize: '14px' }}>Please select at least one exhibition to compare</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={380}>
                          <BarChart
                            data={filteredExhibitions}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            barSize={60}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                            <XAxis 
                              dataKey="exhibitionTitle" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={0}
                              tick={{ fontSize: 12, fill: '#5f6368' }}
                              tickLine={false}
                              axisLine={{ stroke: '#dadce0' }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: '#9aa0a6' }}
                              dx={-10}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(232, 240, 254, 0.4)' }}
                              contentStyle={{ 
                                borderRadius: '8px', 
                                border: 'none', 
                                boxShadow: '0 4px 12px rgba(60,64,67,0.15)',
                                padding: '12px'
                              }}
                              itemStyle={{ fontSize: '13px', fontWeight: 500, padding: '2px 0' }}
                              formatter={(value: number, name: string) => {
                                if (name === "uniqueVisitors") return [value, "Unique Visitors"];
                                return [value, name];
                              }}
                              labelFormatter={(label) => <span style={{ color: '#5f6368', fontSize: '12px', marginBottom: '8px', display: 'block' }}>{label}</span>}
                            />
                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }} 
                                formatter={(value) => <span style={{ color: '#5f6368', fontSize: '13px', fontWeight: 500 }}>{value}</span>}
                            />
                            <Bar dataKey="uniqueVisitors" name="Unique Visitors" radius={[4, 4, 0, 0]}>
                              {filteredExhibitions.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </>
                  );
                })()}
              </>
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
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={85}
                        innerRadius={45}
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
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
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '20px' }}
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
                  <BarChart
                    data={audioStats.audioByLanguage}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="language" type="category" />
                    <Tooltip formatter={(value) => [`${value} plays`, "Plays"]} />
                    <Legend />
                    <Bar dataKey="plays" fill="#3b82f6" name="Audio Plays">
                      {audioStats.audioByLanguage.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
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
