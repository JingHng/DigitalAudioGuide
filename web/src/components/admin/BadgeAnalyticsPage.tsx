import { useEffect, useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import apiClient from "../../utils/apiClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Award,
  Users,
  TrendingUp,
  Hash,
  RefreshCw,
  Activity,
} from "lucide-react";
import "../../css/AdminDashboard.css";

type RangeKey = "7d" | "30d" | "90d" | "1y";

interface ExhibitionOption {
  exhibitionId: string;
  title: string;
}

interface BadgeEarnRow {
  badgeId: string;
  name: string;
  style: string;
  earned: number | string; // Defensive typing: backend may return a string.
}

interface EarnedByStyleRow {
  style: string;
  earned: number | string;
}

interface TimelineRow {
  date: string; // "YYYY-MM-DD"
  earned: number | string;
}

interface BadgeDashboardResponse {
  filters: {
    range: string;
    interval: string;
    exhibitionId: string;
    from: string;
    to: string;
  };
  kpis: {
    totalBadges: number | string;
    totalEarned: number | string;
    usersEarned: number | string;
    avgEarnsPerDay: number | string;
  };
  topBadges: BadgeEarnRow[];
  bottomBadges: BadgeEarnRow[];
  earnedByStyle: EarnedByStyleRow[];
  timeline: TimelineRow[];
}

/** Converts an unknown value into a safe number. Falls back to 0 when invalid. */
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Formats an ISO date string as dd/mm/yyyy (independent of browser locale). */
const formatDateDMY = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const BadgeAnalyticsPage = () => {
  const breadcrumbs = [
    { label: "Admin", path: "/admin/dashboard" },
    { label: "Badge Analytics" },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedPeriod, setSelectedPeriod] = useState<RangeKey>("30d");
  const [selectedExhibition, setSelectedExhibition] = useState<string>("all");
  const [exhibitions, setExhibitions] = useState<ExhibitionOption[]>([]);
  const [dashboard, setDashboard] = useState<BadgeDashboardResponse | null>(
    null,
  );

  /** Fetches the exhibition list used by the exhibition filter dropdown. */
  const fetchExhibitions = async () => {
    try {
      const res = await apiClient.get("/badges/stats/exhibitions");
      setExhibitions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch exhibitions:", e);
      setExhibitions([]);
    }
  };

  /** Fetches the dashboard analytics based on the selected period and exhibition. */
  const fetchBadgeDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/badges/stats/dashboard", {
        params: { range: selectedPeriod, exhibitionId: selectedExhibition },
      });
      setDashboard(res.data);
    } catch (e: any) {
      console.error("Failed to fetch badge dashboard:", e);
      setError("Failed to fetch badge analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExhibitions();
  }, []);

  useEffect(() => {
    fetchBadgeDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedExhibition]);

  const exhibitionLabel = useMemo(() => {
    if (selectedExhibition === "all") {
      return "All Exhibitions";
    }

    const found = exhibitions.find(
      (ex) => ex.exhibitionId === selectedExhibition,
    );

    return found ? found.title : "Unknown Exhibition";
  }, [selectedExhibition, exhibitions]);

  /** Builds the window label in dd/mm/yyyy to avoid locale-dependent formatting. */
  const timeWindowLabel = useMemo(() => {
    if (!dashboard?.filters?.from || !dashboard?.filters?.to) return "";
    const from = formatDateDMY(dashboard.filters.from);
    const to = formatDateDMY(dashboard.filters.to);
    return `${from} → ${to} (${dashboard.filters.interval})`;
  }, [dashboard]);

  /** Normalizes KPI values into safe numbers for display. */
  const kpi = useMemo(() => {
    if (!dashboard) {
      return {
        totalBadges: 0,
        totalEarned: 0,
        usersEarned: 0,
        avgEarnsPerDay: 0,
      };
    }
    return {
      totalBadges: toNumber(dashboard.kpis.totalBadges),
      totalEarned: toNumber(dashboard.kpis.totalEarned),
      usersEarned: toNumber(dashboard.kpis.usersEarned),
      avgEarnsPerDay: toNumber(dashboard.kpis.avgEarnsPerDay),
    };
  }, [dashboard]);

  /** Normalizes timeline values into the shape expected by Recharts. */
  const timelineData = useMemo(() => {
    const raw = dashboard?.timeline;
    if (!Array.isArray(raw)) return [];
    return raw.map((t) => ({
      date: t.date,
      earned: toNumber(t.earned),
    }));
  }, [dashboard]);

  /**
   * Critical fix:
   * Recharts may pass data fields into SVG props. If a data item contains `style: "..."`,
   * it can be interpreted as the React `style` prop, which must be an object, causing a crash.
   * Therefore, we rename `style` to a non-reserved field name when building chart datasets.
   */

  /** Builds chart data for "Earned by Style" and renames `style` to `styleName`. */
  const styleChartData = useMemo(() => {
    const raw = dashboard?.earnedByStyle;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s) => ({
        styleName: String(s.style || "unknown").trim() || "unknown",
        earned: toNumber(s.earned),
      }))
      .filter((x) => x.styleName.length > 0);
  }, [dashboard]);

  /** Builds chart data for "Top Badges" and renames `style` to `badgeStyle`. */
  const topBadgesChartData = useMemo(() => {
    const raw = dashboard?.topBadges;
    if (!Array.isArray(raw)) return [];
    return raw.map((b) => {
      const fullName = b.name || "(Unnamed)";
      return {
        name: fullName.length > 14 ? fullName.slice(0, 14) + "…" : fullName,
        fullName,
        earned: toNumber(b.earned),
        badgeId: b.badgeId,
        badgeStyle: b.style || "unknown",
      };
    });
  }, [dashboard]);

  return (
    <AdminLayout currentPath="/admin/badge-analytics" breadcrumbs={breadcrumbs}>
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>
            Badge Analytics{" "}
            <span style={{ fontWeight: 400, color: "#6b7280" }}>
              — {exhibitionLabel}
            </span>
          </h1>

          {/* Filter controls are left-aligned to improve scanability. */}
          <div
            className="dashboard-filters dashboard-filters-left"
            style={{ gap: 12 }}
          >
            <div className="period-filter-dropdown">
              <label htmlFor="badgePeriod">Period:</label>
              <select
                id="badgePeriod"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as RangeKey)}
                className="period-select-dropdown"
                disabled={isLoading}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>

            <div className="period-filter-dropdown">
              <label htmlFor="exhibitionSelect">Exhibition:</label>
              <select
                id="exhibitionSelect"
                value={selectedExhibition}
                onChange={(e) => setSelectedExhibition(e.target.value)}
                className="period-select-dropdown"
                disabled={isLoading}
              >
                <option value="all">All Exhibitions</option>
                {exhibitions.map((ex) => (
                  <option key={ex.exhibitionId} value={ex.exhibitionId}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={`refresh-btn ${isLoading ? "loading" : ""}`}
              onClick={fetchBadgeDashboard}
              disabled={isLoading}
              aria-label="Refresh data"
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {dashboard && (
          <div className="chart-stats" style={{ marginBottom: 12 }}>
            <div className="chart-stat">
              <span className="chart-stat-label">Window:</span>
              <span className="chart-stat-value">{timeWindowLabel}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Total Earned:</span>
              <span className="chart-stat-value">{kpi.totalEarned}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Users:</span>
              <span className="chart-stat-value">{kpi.usersEarned}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="chart-no-data" style={{ marginBottom: 12 }}>
            <p style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {dashboard && (
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-icon-wrapper warning-bg">
                <div className="kpi-icon exhibits">
                  <Hash size={24} />
                </div>
              </div>
              <div className="kpi-content">
                <h3>Total Badges</h3>
                <div className="kpi-value">
                  <span className="value">{kpi.totalBadges}</span>
                </div>
                <span className="kpi-trend info">
                  Badges available in scope
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper purple-bg">
                <div className="kpi-icon events">
                  <Award size={24} />
                </div>
              </div>
              <div className="kpi-content">
                <h3>Total Earned</h3>
                <div className="kpi-value">
                  <span className="value">{kpi.totalEarned}</span>
                </div>
                <span className="kpi-trend positive">
                  Total user badge claims
                </span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper visitors-bg">
                <div className="kpi-icon visitors">
                  <Users size={24} />
                </div>
              </div>
              <div className="kpi-content">
                <h3>Users Earned</h3>
                <div className="kpi-value">
                  <span className="value">{kpi.usersEarned}</span>
                </div>
                <span className="kpi-trend info">Unique users who earned</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-wrapper success-bg">
                <div className="kpi-icon sales">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="kpi-content">
                <h3>Avg Earns / Day</h3>
                <div className="kpi-value">
                  <span className="value">{kpi.avgEarnsPerDay}</span>
                </div>
                <span className="kpi-trend positive">
                  Average by selected period
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="dashboard-charts">
          <div className="chart-container users-chart">
            <div className="chart-header">
              <h2>Badges Earned Timeline</h2>
              <div className="chart-stats">
                <div className="chart-stat">
                  <Activity size={14} />
                  <span className="chart-stat-value">
                    {dashboard?.filters?.interval === "week"
                      ? "Weekly"
                      : "Daily"}
                  </span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="chart-loading">
                <Activity className="loading-spinner" size={32} />
                <p>Loading data...</p>
              </div>
            ) : timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={timelineData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="earned"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Earned"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-no-data">
                <Award size={48} color="#ccc" />
                <p>No earned badges data in this window</p>
                <p>Try changing period or exhibition filter</p>
              </div>
            )}
          </div>

          <div className="charts-row">
            <div className="chart-container exhibit-popularity-chart">
              <div className="chart-header">
                <h2>Earned by Style</h2>
                <div className="chart-stats">
                  <div className="chart-stat">
                    <span className="chart-stat-label">Styles:</span>
                    <span className="chart-stat-value">
                      {styleChartData.length}
                    </span>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="chart-loading">
                  <Activity className="loading-spinner" size={32} />
                  <p>Loading data...</p>
                </div>
              ) : styleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={styleChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="styleName" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="earned" name="Earned" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-no-data">
                  <Award size={48} color="#ccc" />
                  <p>No style breakdown available</p>
                  <p>Badges might have no earns in this window</p>
                </div>
              )}
            </div>

            <div className="chart-container admin-activity-chart">
              <div className="chart-header">
                <h2>Top Badges</h2>
                <div className="chart-stats">
                  <div className="chart-stat">
                    <Award size={14} />
                    <span className="chart-stat-value">Top 10</span>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="chart-loading">
                  <Activity className="loading-spinner" size={32} />
                  <p>Loading data...</p>
                </div>
              ) : topBadgesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topBadgesChartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any, _n: any, ctx: any) => {
                        const p = ctx?.payload;
                        const title = p?.fullName ? `: ${p.fullName}` : "";
                        const badgeStyle = p?.badgeStyle
                          ? ` (${p.badgeStyle})`
                          : "";
                        return [
                          `${value} earned${badgeStyle}${title}`,
                          "Earned",
                        ];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="earned" name="Earned" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-no-data">
                  <Award size={48} color="#ccc" />
                  <p>No top badges data</p>
                  <p>Try a larger time window</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {dashboard && (
          <div className="audio-analytics">
            <div className="section-header">
              <h2>Badge Rankings</h2>
              <div className="analytics-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Badges:</span>
                  <span className="summary-value">{kpi.totalBadges}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Earned:</span>
                  <span className="summary-value">{kpi.totalEarned}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Users Earned:</span>
                  <span className="summary-value">{kpi.usersEarned}</span>
                </div>
              </div>
            </div>

            <div className="analytics-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>Top Badges (Table)</h3>
                </div>

                <div className="content-table">
                  {Array.isArray(dashboard.topBadges) &&
                  dashboard.topBadges.length > 0 ? (
                    dashboard.topBadges.map((b, idx) => (
                      <div key={b.badgeId} className="content-row">
                        <div className="rank">#{idx + 1}</div>

                        {/* Two-column alignment for name + earned */}
                        <div className="content-info badge-table-main">
                          <span className="content-name">
                            {b.name || "(Unnamed)"}
                          </span>
                          <span className="badge-earned">
                            {toNumber(b.earned)} earned
                          </span>
                        </div>

                        {/* Preserves the original style appearance */}
                        <div className="duration">{b.style || "unknown"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="chart-no-data">
                      <p>No badge data</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Bottom Badges (Includes 0)</h3>
                </div>

                <div className="content-table">
                  {Array.isArray(dashboard.bottomBadges) &&
                  dashboard.bottomBadges.length > 0 ? (
                    dashboard.bottomBadges.map((b, idx) => (
                      <div key={b.badgeId} className="content-row">
                        <div className="rank">#{idx + 1}</div>

                        {/* Two-column alignment for name + earned */}
                        <div className="content-info badge-table-main">
                          <span className="content-name">
                            {b.name || "(Unnamed)"}
                          </span>
                          <span className="badge-earned">
                            {toNumber(b.earned)} earned
                          </span>
                        </div>

                        {/* Preserves the original style appearance */}
                        <div className="duration">{b.style || "unknown"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="chart-no-data">
                      <p>No badge data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Local CSS overrides are kept within this file as requested. */}
        <style>{`
          /* Ensures filter controls are left-aligned and do not stretch across the header. */
          .dashboard-filters-left {
            display: flex;
            justify-content: flex-start;
            align-items: flex-end;
            flex-wrap: wrap;
          }

          /*
            Aligns the badge ranking content into consistent columns inside each row:
            - Column 1: Badge name (flexible)
            - Column 2: Earned count (fixed, right-aligned)
            Note: The style label remains outside this grid, using the original \`.duration\` class.
          */
          .badge-table-main {
            display: grid;
            grid-template-columns: 1fr 140px; /* name | earned */
            align-items: center;
            gap: 16px;
            width: 100%;
          }

          /* Ensures the earned count is visually separated and aligned in a single column. */
          .badge-earned {
            text-align: right;
            font-weight: 600;
          }

          /* Ensures the inner grid can occupy available width within the row. */
          .content-info {
            width: 100%;
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default BadgeAnalyticsPage;
