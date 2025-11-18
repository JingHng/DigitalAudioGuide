import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Search, Eye, RotateCcw } from "lucide-react";
import apiClient from "../../utils/apiClient";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import "../../css/AdminTable.css";
import "../../css/AdminComponents.css";
import "../../css/AdminForms.css";
import "../../css/AdminModals.css";

interface User {
  userId: string;
  username: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    feedbackCount: number;
    sessionCount: number;
    playbackCount: number;
  };
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  statusId: number;
  roleIds: number[];
}

interface Role {
  roleId: number;
  roleName: string;
  description?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    statusId: 1,
    roleIds: [],
  });

  // Available roles
  const [roles, setRoles] = useState<Role[]>([]);

  const breadcrumbs = [{ label: "Admin", path: "/admin/dashboard" }, { label: "Users" }];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        status: statusFilter,
        role: roleFilter,
        emailVerified: emailVerifiedFilter,
        sortBy,
        sortOrder,
      });

      const response = await apiClient.get(`/users?${params}`);
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
      setTotalUsers(response.data.pagination.totalUsers);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [currentPage, searchQuery, statusFilter, roleFilter, emailVerifiedFilter, sortBy, sortOrder, itemsPerPage]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#add-user') {
        openCreateModal();
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get("/roles");
      setRoles(response.data.roles);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token'); 

    await axios.post('http://localhost:3000/api/users', formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setShowCreateModal(false);
    setFormData({ username: '', email: '', password: '', statusId: 1, roleIds: [] });
    fetchUsers();
  } catch (err) {
    console.error('Error creating user:', err);
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      alert(err.response.data.error);
    } else if (axios.isAxiosError(err) && err.response?.status === 401) {
      alert('Unauthorized: You must be logged in as admin.');
    } else {
      alert('Failed to create user. Please check the console for details.');
    }
  }
};


 const handleEditUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedUser) return;

  try {
    const token = localStorage.getItem('token');

    await axios.put(
      `http://localhost:3000/api/users/${selectedUser.userId}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setShowEditModal(false);
    setSelectedUser(null);
    setFormData({ username: '', email: '', password: '', statusId: 1, roleIds: [] });
    fetchUsers();
  } catch (err) {
    console.error('Error updating user:', err);
    alert('Failed to update user. Please check the console for details.');
  }
};


const handleDeleteUser = async (userId: string, username: string) => {
  if (window.confirm(`Are you sure you want to suspend the user "${username}"? This will prevent them from logging in but preserve their data.`)) {
    try {
      await apiClient.delete(`/users/${userId}`);
      fetchUsers();
      alert('User suspended successfully. They can be reactivated later if needed.');
    } catch (err: any) {
      console.error('Error suspending user:', err);
      const errorMessage = err.response?.data?.error || 'Failed to suspend user';
      alert(`Error: ${errorMessage}`);
    }
  }
};

const handleReactivateUser = async (userId: string, username: string) => {
  if (window.confirm(`Are you sure you want to reactivate the user "${username}"? This will allow them to log in again.`)) {
    try {
      await apiClient.patch(`/users/${userId}/reactivate`);
      fetchUsers();
      alert('User reactivated successfully.');
    } catch (err: any) {
      console.error('Error reactivating user:', err);
      const errorMessage = err.response?.data?.error || 'Failed to reactivate user';
      alert(`Error: ${errorMessage}`);
    }
  }
};


  const openEditModal = (user: User) => {
    setSelectedUser(user);

    // Extract role IDs from user's role names
    const userRoleIds = roles
      .filter((role) => user.roles.includes(role.roleName))
      .map((role) => role.roleId);

    setFormData({
      username: user.username,
      email: user.email,
      password: "", // Empty for security
      statusId: user.status?.toLowerCase() === "active" ? 1 : 2,
      roleIds: userRoleIds,
    });
    setShowEditModal(true);
  };

  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Prepare and open Create User modal with active status
  const openCreateModal = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      statusId: 1,
      roleIds: [],
    });
    setShowCreateModal(true);
    // Clear the hash after modal is opened to prevent reopening on refresh
    // Use replaceState to avoid adding to browser history
    if (window.location.hash === '#add-user') {
      history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  };

  return (
    <AdminLayout currentPath="/admin/users" breadcrumbs={breadcrumbs}>
      <main className="admin-content">
        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2 className="admin-table-title">
              <Users size={24} />
              Users Management
            </h2>
            <div className="admin-table-actions">
              <div className="admin-table-search">
                <Search className="admin-table-search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={() => window.location.hash = 'add-user'}>
                <Plus size={16} />
                Add User
              </button>
            </div>
          </div>

          <div className="admin-table-filters">
            <div className="admin-table-filter">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="admin-table-filter">
              <label>Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.roleId} value={role.roleName}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-table-filter">
              <label>Items per page</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            
            <div className="admin-table-filter">
              <label>Email Verified</label>
              <select
                value={emailVerifiedFilter}
                onChange={(e) => setEmailVerifiedFilter(e.target.value)}
              >
                <option value="">All Users</option>
                <option value="true">Email Verified</option>
                <option value="false">Email Not Verified</option>
              </select>
            </div>
          </div>


          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              Loading users...
            </div>
          ) : error ? (
            <div className="status-message status-error">{error}</div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable ${
                        sortBy === "username" ? `sort-${sortOrder}` : ""
                      }`}
                      onClick={() => handleSort("username")}
                    >
                      Username
                    </th>
                    <th
                      className={`sortable ${
                        sortBy === "email" ? `sort-${sortOrder}` : ""
                      }`}
                      onClick={() => handleSort("email")}
                    >
                      Email
                    </th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th
                      className={`sortable ${
                        sortBy === "lastLoginAt" ? `sort-${sortOrder}` : ""
                      }`}
                      onClick={() => handleSort("lastLoginAt")}
                    >
                      Last Login
                    </th>
                    <th
                      className={`sortable ${
                        sortBy === "createdAt" ? `sort-${sortOrder}` : ""
                      }`}
                      onClick={() => handleSort("createdAt")}
                    >
                      Created
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`admin-table-status ${user.status}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>{user.roles.join(", ")}</td>
                      <td>
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="admin-table-cell-actions">
                          <button
                            className="admin-table-action-btn view"
                            onClick={() => openViewModal(user)}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            className="admin-table-action-btn edit"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          {user.status.toLowerCase() === 'suspended' ? (
                            <button
                              className="admin-table-action-btn reactivate"
                              onClick={() => handleReactivateUser(user.userId, user.username)}
                            >
                              <RotateCcw size={14} />
                              Reactivate
                            </button>
                          ) : (
                            <button
                              className="admin-table-action-btn delete"
                              onClick={() => handleDeleteUser(user.userId, user.username)}
                            >
                              <Trash2 size={14} />
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="admin-table-pagination">
                <div className="admin-table-pagination-info">
                  Showing {users.length} of {totalUsers} users ({Math.ceil((currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, totalUsers)})
                </div>
                <div className="admin-table-pagination-controls">
                  <button
                    className="admin-table-pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        className={`admin-table-pagination-btn ${
                          currentPage === page ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create New User</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleCreateUser} className="admin-form">
                <div className="admin-form-group">
                  <label className="admin-form-label required">Username</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Email</label>
                  <input
                    type="email"
                    className="admin-form-input"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Password</label>
                  <input
                    type="password"
                    className="admin-form-input"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Role</label>
                  <select
                    className="admin-form-select"
                    value={formData.roleIds[0] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roleIds: e.target.value
                          ? [parseInt(e.target.value)]
                          : [],
                      })
                    }
                    required
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.roleId} value={role.roleId}>
                        {role.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-form-btn-outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="admin-form-btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowEditModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit User</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleEditUser} className="admin-form">
                <div className="admin-form-group">
                  <label className="admin-form-label required">Username</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Email</label>
                  <input
                    type="email"
                    className="admin-form-input"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    className="admin-form-input"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Role</label>
                  <select
                    className="admin-form-select"
                    value={formData.roleIds[0] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roleIds: e.target.value
                          ? [parseInt(e.target.value)]
                          : [],
                      })
                    }
                    required
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.roleId} value={role.roleId}>
                        {role.roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label required">Status</label>
                  <select
                    className="admin-form-select"
                    value={formData.statusId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statusId: parseInt(e.target.value),
                      })
                    }
                    required
                  >
                    <option value={1}>active</option>
                    <option value={2}>inactive</option>
                    <option value={3}>suspended</option>
                  </select>
                </div>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-form-btn-outline"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="admin-form-btn-primary">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">View User Details</h3>
              <button
                className="admin-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-view-details">
                <div className="admin-view-group">
                  <div className="admin-view-label">Username</div>
                  <div className="admin-view-value">
                    {selectedUser.username}
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Email</div>
                  <div className="admin-view-value">{selectedUser.email}</div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Status</div>
                  <div className="admin-view-value">
                    <span
                      className={`admin-status-badge ${selectedUser.status}`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Roles</div>
                  <div className="admin-view-value">
                    {selectedUser.roles.map((role, index) => (
                      <span key={index} className="admin-badge">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Permissions</div>
                  <div className="admin-view-value">
                    {selectedUser.permissions.map((permission, index) => (
                      <span key={index} className="admin-badge permission">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Last Login</div>
                  <div className="admin-view-value">
                    {selectedUser.lastLoginAt
                      ? new Date(selectedUser.lastLoginAt).toLocaleString()
                      : "Never"}
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Created At</div>
                  <div className="admin-view-value">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="admin-view-group">
                  <div className="admin-view-label">Activity</div>
                  <div className="admin-view-stats">
                    <div className="admin-view-stat">
                      <span className="admin-view-stat-value">
                        {selectedUser.stats.feedbackCount}
                      </span>
                      <span className="admin-view-stat-label">Feedbacks</span>
                    </div>
                    <div className="admin-view-stat">
                      <span className="admin-view-stat-value">
                        {selectedUser.stats.sessionCount}
                      </span>
                      <span className="admin-view-stat-label">Sessions</span>
                    </div>
                    <div className="admin-view-stat">
                      <span className="admin-view-stat-value">
                        {selectedUser.stats.playbackCount}
                      </span>
                      <span className="admin-view-stat-label">Audio Plays</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-form-actions">
                <button
                  className="admin-form-btn-outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
                <button
                  className="admin-form-btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedUser);
                  }}
                >
                  <Edit size={14} /> Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UsersPage;
