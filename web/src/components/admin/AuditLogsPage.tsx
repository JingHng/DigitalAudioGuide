import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileText, Filter, RefreshCw, Clock, User, Shield } from 'lucide-react';
import AdminLayout from './AdminLayout';
import apiClient from '../../utils/apiClient';
import '../../css/AdminTable.css';
import '../../css/AdminComponents.css';
import '../../css/AdminForms.css';
import '../../css/AdminModals.css';
import '../../css/AuditLogs.css';

interface AuditLog {
  auditLogId: string;
  adminUser: {
    userId: string;
    username: string;
    email: string;
  } | null;
  targetUser: {
    userId: string;
    username: string;
    email: string;
  } | null;
  resource: string;
  action: string;
  changes: any;
  metadata: any;
  timestamp: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const AuditLogsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Audit Logs' }
  ];

  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    resource: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await apiClient.get(`/audit-logs?${queryParams}`);
      const data = response.data;
      
      setAuditLogs(data.auditLogs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };


  const getActionBadgeColor = (action: string) => {
    if (!action) return 'admin-table-status';
    
    switch (action.toLowerCase()) {
      case 'create':
        return 'admin-table-status active';
      case 'update':
        return 'admin-table-status pending';
      case 'delete':
        return 'admin-table-status inactive';
      case 'assign':
        return 'admin-table-status success';
      case 'unassign':
        return 'admin-table-status warning';
      case 'backup':
        return 'admin-table-status info';
      case 'role_assign':
        return 'admin-table-status success';
      default:
        return 'admin-table-status';
    }
  };

  const getResourceBadgeColor = (resource: string) => {
    if (!resource) return 'admin-badge';
    
    switch (resource.toLowerCase()) {
      case 'user':
        return 'admin-badge user';
      case 'exhibit':
        return 'admin-badge exhibit';
      case 'permission':
        return 'admin-badge permission';
      case 'role':
        return 'admin-badge role';
      default:
        return 'admin-badge';
    }
  };

  const openLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowViewModal(true);
  };


  return (
    <AdminLayout currentPath="/admin/audit-logs" breadcrumbs={breadcrumbs}>
      <main className="admin-content">
        <div className="admin-table-container">
          <div className="admin-table-header">
            <div className="admin-table-title-section">
              <h2 className="admin-table-title">
                <Shield size={24} />
                Audit Logs
              </h2>
              <p className="admin-table-subtitle">Monitor and track all system activities</p>
            </div>
            <div className="admin-table-actions">
              <button 
                className="admin-form-btn-outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button 
                className="admin-form-btn-outline"
                onClick={fetchAuditLogs}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="admin-table-filters enhanced-filters">
            <div className="admin-table-filter">
              <label>Resource</label>
              <select value={filters.resource} onChange={(e) => handleFilterChange('resource', e.target.value)}>
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="exhibit">Exhibit</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
                <option value="permission">Permission</option>
                <option value="role">Role</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="admin-table-filter">
              <label>Action</label>
              <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)}>
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="assign">Assign</option>
                <option value="unassign">Unassign</option>
                <option value="backup">Backup</option>
                <option value="role_assign">Role Assign</option>
              </select>
            </div>
            <div className="admin-table-filter">
              <label>Per Page</label>
              <select value={filters.limit} onChange={(e) => handleFilterChange('limit', e.target.value)}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              Loading audit logs...
            </div>
          ) : error ? (
            <div className="status-message status-error">{error}</div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th><Clock size={16} /> Timestamp</th>
                    <th><FileText size={16} /> Resource</th>
                    <th><Shield size={16} /> Action</th>
                    <th><User size={16} /> Admin User</th>
                    <th><User size={16} /> Target User</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#666' }}>
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.auditLogId}>
                        <td>
                          <div className="timestamp-cell">
                            <div className="timestamp-date">{new Date(log.timestamp).toLocaleDateString()}</div>
                            <div className="timestamp-time">{new Date(log.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`resource-badge ${getResourceBadgeColor(log.resource)}`}>
                            {log.resource ? log.resource.charAt(0).toUpperCase() + log.resource.slice(1) : 'System'}
                          </span>
                        </td>
                        <td>
                          <span className={`action-badge ${getActionBadgeColor(log.action)}`}>
                            {log.action ? log.action.charAt(0).toUpperCase() + log.action.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td>
                          {log.adminUser ? (
                            <div className="user-info">
                              <div className="user-name">{log.adminUser.username}</div>
                              <div className="user-email">{log.adminUser.email}</div>
                            </div>
                          ) : (
                            <span className="system-badge">System</span>
                          )}
                        </td>
                        <td>
                          {log.targetUser ? (
                            <div className="user-info">
                              <div className="user-name">{log.targetUser.username}</div>
                              <div className="user-email">{log.targetUser.email}</div>
                            </div>
                          ) : (
                            <span className="na-badge">N/A</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-table-cell-actions">
                            <button 
                              className="admin-table-action-btn view"
                              onClick={() => openLogDetails(log)}
                              title="View Changes"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="admin-table-pagination">
                <div className="admin-table-pagination-info">
                  Showing {auditLogs.length} of {pagination.totalLogs} audit logs (Page {pagination.currentPage} of {pagination.totalPages})
                </div>
                <div className="admin-table-pagination-controls">
                  <button 
                    className="admin-table-pagination-btn"
                    disabled={pagination.currentPage === 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`admin-table-pagination-btn ${pagination.currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button 
                    className="admin-table-pagination-btn"
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* View Changes Modal */}
      {showViewModal && selectedLog && (
        <div className="admin-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Audit Log Changes</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              {selectedLog.changes ? (
                <div className="admin-view-details">
                  <div className="admin-view-group">
                    <div className="admin-view-label">Changes Details</div>
                    <div className="admin-view-value">
                      <pre className="admin-view-code">
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-changes-message">
                  <p>No changes were recorded for this audit log entry.</p>
                </div>
              )}
              <div className="admin-form-actions">
                <button className="admin-form-btn-outline" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AuditLogsPage;