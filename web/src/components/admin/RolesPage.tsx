import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, Search, Users, Key, Filter, Calendar } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import AdminLayout from './AdminLayout';
import '../../css/AdminTable.css';
import '../../css/AdminComponents.css';
import '../../css/AdminForms.css';
import '../../css/AdminModals.css';

interface Role {
  roleId: number;
  roleName: string;
  description: string;
  permissions: Array<{
    permissionId: number;
    permissionName: string;
    description: string;
  }>;
  users: Array<{
    userId: string;
    username: string;
    email: string;
    status: string;
    assignedAt: string;
  }>;
  userCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RoleFormData {
  roleName: string;
  description: string;
  permissionIds: number[];
}

interface Permission {
  permissionId: number;
  permissionName: string;
  description?: string;
}

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUsersFilter, setHasUsersFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    description: '',
    permissionIds: []
  });

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch all permissions for create/edit forms
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        // Removed the limit to fetch all available permissions
        const response = await apiClient.get('/permissions?limit=100');
        setPermissions(response.data.permissions);
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        setPermissionsLoading(false);
      }
    };
    fetchPermissions();
  }, []);
  
  // Check for URL fragments for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#add-role') {
        setFormData({
          roleName: '',
          description: '',
          permissionIds: []
        });
        setShowCreateModal(true);
        // Clear the hash after modal is opened to prevent reopening on refresh
        // Use replaceState to avoid adding to browser history
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Add listener for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Toggle permission in formData.permissionIds
  const togglePermission = (permissionId: number) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const breadcrumbs = [
    { label: 'Admin', path: '/admin/dashboard' },
    { label: 'Roles' }
  ];

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        hasUsers: hasUsersFilter,
        dateFrom: dateFromFilter,
        dateTo: dateToFilter,
        sortBy,
        sortOrder
      });

      const response = await apiClient.get(`/roles?${params}`);
      setRoles(response.data.roles);
      setTotalPages(response.data.pagination.totalPages);
      setTotalRoles(response.data.pagination.totalRoles);
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, searchQuery, hasUsersFilter, dateFromFilter, dateToFilter, sortBy, sortOrder, itemsPerPage]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/roles', formData);
      setShowCreateModal(false);
      setFormData({ roleName: '', description: '', permissionIds: [] });
      fetchRoles();
    } catch (err) {
      console.error('Error creating role:', err);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    try {
      await apiClient.put(`/roles/${selectedRole.roleId}`, formData);
      setShowEditModal(false);
      setSelectedRole(null);
      setFormData({ roleName: '', description: '', permissionIds: [] });
      fetchRoles();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const handleDeleteRole = async (roleId: number, userCount: number) => {
    if (userCount > 0) {
      alert(`Cannot delete role. It is assigned to ${userCount} user(s).`);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }
    try {
      await apiClient.delete(`/roles/${roleId}`);
      fetchRoles();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      if (err.response?.data?.error) {
        alert(err.response.data.error);
      } else {
        alert('Failed to delete role. Please try again.');
      }
    }
  };    

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      roleName: role.roleName,
      description: role.description,
      permissionIds: role.permissions.map(p => p.permissionId)
    });
    setShowEditModal(true);
  };

  const openViewModal = (role: Role) => {
    setSelectedRole(role);
    setShowViewModal(true);
  };

  return (
    <AdminLayout currentPath="/admin/roles" breadcrumbs={breadcrumbs}>
      <main className="admin-content">
          <div className="admin-table-container">
            <div className="admin-table-header">
              <h2 className="admin-table-title">
                <Shield size={24} />
                Roles Management
              </h2>
              <div className="admin-table-actions">
                <div className="admin-table-search">
                  <Search className="admin-table-search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.hash = 'add-role'}
                >
                  <Plus size={16} />
                  Add Role
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                Loading roles...
              </div>
            ) : error ? (
              <div className="status-message status-error">{error}</div>
            ) : (
              <>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th 
                        className={`sortable ${sortBy === 'roleName' ? `sort-${sortOrder}` : ''}`}
                        onClick={() => handleSort('roleName')}
                      >
                        Role Name
                      </th>
                      <th>Description</th>
                      <th>Users</th>
                      <th>Permissions</th>
                      <th 
                        className={`sortable ${sortBy === 'createdAt' ? `sort-${sortOrder}` : ''}`}
                        onClick={() => handleSort('createdAt')}
                      >
                        Created
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.roleId}>
                        <td>
                          <strong>{role.roleName}</strong>
                        </td>
                        <td>{role.description || 'No description'}</td>
                        <td>
                          <div className="admin-stat-badge">
                            <Users size={14} />
                            {role.userCount}
                          </div>
                        </td>
                        <td>
                          <div className="admin-stat-badge">
                            <Key size={14} />
                            {role.permissionCount}
                          </div>
                        </td>
                        <td>{new Date(role.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="admin-table-cell-actions">
                            <button 
                              className="admin-table-action-btn view"
                              onClick={() => openViewModal(role)}
                            >
                              View
                            </button>
                            <button 
                              className="admin-table-action-btn edit"
                              onClick={() => openEditModal(role)}
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button 
                              className="admin-table-action-btn delete"
                              onClick={() => handleDeleteRole(role.roleId, role.userCount)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="admin-table-pagination">
                  <div className="admin-table-pagination-info">
                    Showing {roles.length} roles
                  </div>
                  <div className="admin-table-pagination-controls">
                    <button 
                      className="admin-table-pagination-btn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`admin-table-pagination-btn ${currentPage === page ? 'active' : ''}`}
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
            )}
          </div>
        </main>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create New Role</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleCreateRole} className="admin-form">
                <div className="admin-form-group">
                  <label className="admin-form-label required">Role Name</label>
                  <input
                    type="text"
                    className="admin-form-input" placeholder="Enter role name"
                    value={formData.roleName}
                    onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    className="admin-form-input admin-form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Optional role description"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Permissions</label>
                  {permissionsLoading ? (
                    <p>Loading permissions...</p>
                  ) : (
                    <>
                      <div className="admin-form-checkbox">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={formData.permissionIds.length > 0 && formData.permissionIds.length === permissions.length}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              permissionIds: prev.permissionIds.length === permissions.length
                                ? []
                                : permissions.map(p => p.permissionId)
                            }));
                          }}
                        />
                        <label htmlFor="select-all">All Permissions</label>
                      </div>
                      {permissions.map(permission => (
                        <div key={permission.permissionId} className="admin-form-checkbox">
                          <input
                            type="checkbox"
                            id={`create-${permission.permissionId}`}
                            checked={formData.permissionIds.includes(permission.permissionId)}
                            onChange={() => togglePermission(permission.permissionId)}
                          />
                          <label htmlFor={`create-${permission.permissionId}`}>{permission.permissionName}</label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-form-btn-outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-form-btn-primary">
                    Create Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="admin-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit Role: {selectedRole.roleName}</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleEditRole} className="admin-form">
                <div className="admin-form-group">
                  <label className="admin-form-label required">Role Name</label>
                  <input
                    type="text"
                    className="admin-form-input" placeholder="Enter role name"
                    value={formData.roleName}
                    onChange={(e) => setFormData({...formData, roleName: e.target.value})}
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    className="admin-form-input admin-form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Optional role description"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Assigned Permissions</label>
                  {permissionsLoading ? (
                    <p>Loading permissions...</p>
                  ) : (
                    <>
                      {permissions
                        .filter(p => formData.permissionIds.includes(p.permissionId))
                        .map(permission => (
                          <div key={permission.permissionId} className="admin-form-checkbox">
                            <input
                              type="checkbox"
                              id={`assigned-${permission.permissionId}`}
                              checked
                              onChange={() => togglePermission(permission.permissionId)}
                            />
                            <label htmlFor={`assigned-${permission.permissionId}`}>{permission.permissionName}</label>
                          </div>
                        ))}
                      {formData.permissionIds.length === 0 && <p>No permissions assigned</p>}
                    </>
                  )}
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Available Permissions</label>
                  {permissionsLoading ? (
                    <p>Loading permissions...</p>
                  ) : (
                    <>
                      {permissions
                        .filter(p => !formData.permissionIds.includes(p.permissionId))
                        .map(permission => (
                          <div key={permission.permissionId} className="admin-form-checkbox">
                            <input
                              type="checkbox"
                              id={`available-${permission.permissionId}`}
                              checked={false}
                              onChange={() => togglePermission(permission.permissionId)}
                            />
                            <label htmlFor={`available-${permission.permissionId}`}>{permission.permissionName}</label>
                          </div>
                        ))}
                      {permissions.filter(p => !formData.permissionIds.includes(p.permissionId)).length === 0 && <p>No available permissions</p>}
                    </>
                  )}
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-form-btn-outline" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="admin-form-btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <div className="admin-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Role Details: {selectedRole.roleName}</h3>
              <button 
                className="admin-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-card">
                <h4>Role Information</h4>
                <p><strong>Name:</strong> {selectedRole.roleName}</p>
                <p><strong>Description:</strong> {selectedRole.description || 'No description'}</p>
                <p><strong>Created:</strong> {new Date(selectedRole.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div className="admin-card">
                <h4>Permissions ({selectedRole.permissions.length})</h4>
                {selectedRole.permissions.length > 0 ? (
                  <ul>
                    {selectedRole.permissions.map(permission => (
                      <li key={permission.permissionId}>
                        <strong>{permission.permissionName}</strong>
                        {permission.description && <span> - {permission.description}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No permissions assigned</p>
                )}
              </div>

              <div className="admin-card">
                <h4>Users ({selectedRole.users.length})</h4>
                {selectedRole.users.length > 0 ? (
                  <ul>
                    {selectedRole.users.map(user => (
                      <li key={user.userId}>
                        <strong>{user.username}</strong> ({user.email})
                        <span className={`admin-table-status ${user.status}`}>
                          {user.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No users assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default RolesPage;
