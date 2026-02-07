import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { BarChart3, Download, RefreshCcw, TrendingDown, ArrowUpRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import {
  ReviewAnalyticsPayload,
  exportAnalyticsCsv,
  exportAnalyticsJson
} from '../../utils/reviewAnalytics';
import '../../css/AdminAnalytics.css';

interface ReviewAnalyticsDashboardProps {
  statusFilter: string;
}

const ReviewAnalyticsDashboard: React.FC<ReviewAnalyticsDashboardProps> = ({ statusFilter }) => {
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [analytics, setAnalytics] = useState<ReviewAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState('');
  const [minRating, setMinRating] = useState(1);
  const [maxRating, setMaxRating] = useState(5);

  const fetchAnalytics = async () => {
    const safeMin = Math.min(minRating, maxRating);
    const safeMax = Math.max(minRating, maxRating);
    if (safeMin !== minRating) setMinRating(safeMin);
    if (safeMax !== maxRating) setMaxRating(safeMax);
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (safeMin) params.append('min_rating', String(safeMin));
      if (safeMax) params.append('max_rating', String(safeMax));
      if (statusFilter) params.append('status', statusFilter);

      const res = await apiClient.get(`/reviews/analytics?${params.toString()}`);
      setAnalytics(res.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, minRating, maxRating, statusFilter]);

  const summaryCards = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        label: 'Total Reviews',
        value: analytics.summary.total_reviews,
        accent: '#0ea5e9'
      },
      {
        label: 'Average Rating',
        value: analytics.summary.average_rating.toFixed(2),
        accent: '#f97316'
      },
      {
        label: 'Response Rate',
        value: `${(analytics.summary.response_rate * 100).toFixed(1)}%`,
        accent: '#16a34a'
      },
      {
        label: 'Hidden vs Shown',
        value: `${analytics.summary.hidden_count} / ${analytics.summary.shown_count}`,
        accent: '#475569'
      }
    ];
  }, [analytics]);

  const lowestExhibit = useMemo(() => {
    if (!analytics || !analytics.categories || analytics.categories.length === 0) return null;
    return analytics.categories.reduce((lowest, current) => {
      if (!lowest) return current;
      if (current.review_count === 0) return lowest;
      return current.avg_rating < lowest.avg_rating ? current : lowest;
    }, analytics.categories[0]);
  }, [analytics]);

  const highestExhibit = useMemo(() => {
    if (!analytics || !analytics.categories || analytics.categories.length === 0) return null;
    return analytics.categories.reduce((highest, current) => {
      if (!highest) return current;
      if (current.review_count === 0) return highest;
      return current.avg_rating > highest.avg_rating ? current : highest;
    }, analytics.categories[0]);
  }, [analytics]);

  return (
    <section className="admin-analytics-card">
      <header className="admin-analytics-header">
        <div className="header-titles">
          <h2><BarChart3 size={18} /> Review Analytics</h2>
          <p>Aggregated insights across ratings, volume, sentiment, and visibility.</p>
        </div>
        <div className="header-actions">
          <button className="analytics-btn ghost" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            className="analytics-btn"
            onClick={() => analytics && exportAnalyticsCsv(analytics)}
            disabled={!analytics}
            title="Export CSV"
          >
            <Download size={14} /> CSV
          </button>
          <button
            className="analytics-btn"
            onClick={() => analytics && exportAnalyticsJson(analytics)}
            disabled={!analytics}
            title="Export JSON"
          >
            <Download size={14} /> JSON
          </button>
        </div>
      </header>

      <div className="analytics-filters">
        <div className="filter-group">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="filter-group compact">
          <label>Min rating</label>
          <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="filter-group compact">
          <label>Max rating</label>
          <select value={maxRating} onChange={(e) => setMaxRating(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="filter-group status-readonly" title="Synchronized with table status filter">
          <label>Status</label>
          <span className="status-pill">{statusFilter || 'all'}</span>
        </div>
      </div>

      {loading && <div className="analytics-loading">Loading analytics...</div>}
      {error && <div className="analytics-error">{error}</div>}

      {!loading && !error && analytics && (
        <>
          <div className="analytics-summary-grid">
            {summaryCards.map((card) => (
              <div className="summary-card" key={card.label} style={{ borderColor: card.accent }}>
                <p>{card.label}</p>
                <strong style={{ color: card.accent }}>{card.value}</strong>
              </div>
            ))}
          </div>

          <div className="analytics-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h4><BarChart3 size={14} /> Rating distribution</h4>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.rating_distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="rating" tickLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h4><ArrowUpRight size={14} /> Highest-rated exhibit</h4>
                <span className="muted">Across filtered data</span>
              </div>
              {highestExhibit ? (
                <div className="lowest-card">
                  <div className="lowest-title">{highestExhibit.exhibit_title}</div>
                  <div className="lowest-meta">
                    <span className="badge">{highestExhibit.review_count} reviews</span>
                    <span className="badge muted">Avg {highestExhibit.avg_rating.toFixed(2)}★</span>
                  </div>
                  <div className="lowest-bar">
                    <div
                      className="lowest-bar-fill"
                      style={{ width: `${(highestExhibit.avg_rating / 5) * 100}%`, background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                    ></div>
                  </div>
                  {highestExhibit.exhibit_id ? (
                    <a className="exhibit-link" href={`/exhibit/${highestExhibit.exhibit_id}`}>
                      Review exhibit <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <p className="muted">No exhibits found in current filter.</p>
                  )}
                </div>
              ) : (
                <p className="muted">No exhibits found in current filter.</p>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h4><TrendingDown size={14} /> Lowest-rated exhibit</h4>
                <span className="muted">Across filtered data</span>
              </div>
              {lowestExhibit ? (
                <div className="lowest-card">
                  <div className="lowest-title">{lowestExhibit.exhibit_title}</div>
                  <div className="lowest-meta">
                    <span className="badge">{lowestExhibit.review_count} reviews</span>
                    <span className="badge muted">Avg {lowestExhibit.avg_rating.toFixed(2)}★</span>
                  </div>
                  <div className="lowest-bar">
                    <div
                      className="lowest-bar-fill"
                      style={{ width: `${(lowestExhibit.avg_rating / 5) * 100}%` }}
                    ></div>
                  </div>
                  {lowestExhibit.exhibit_id ? (
                    <a className="exhibit-link" href={`/exhibit/${lowestExhibit.exhibit_id}`}>
                      Review exhibit <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <p className="muted">No exhibits found in current filter.</p>
                  )}
                </div>
              ) : (
                <p className="muted">No exhibits found in current filter.</p>
              )}
            </div>

            <div className="chart-card span-2">
              <div className="chart-header">
                <h4>Volume over time</h4>
                <span className="muted">Weekly buckets</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.timeline} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="bucket"
                    tickLine={false}
                    tickFormatter={(value) => (value ? new Date(value).toLocaleDateString() : '')}
                  />
                  <YAxis tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ReviewAnalyticsDashboard;
