import React, { useState, useEffect } from "react";
import { Users, Plus, Search, EyeOff, RotateCcw, ShieldAlert } from "lucide-react";
import apiClient from "../../utils/apiClient";
import AdminLayout from "./AdminLayout";
import ReviewAnalyticsDashboard from "./ReviewAnalyticsDashboard";
import { normalizeReview, NormalizedReview } from "../../utils/reviewAnalytics";
import { useAuth } from "../../contexts/AuthContext";
import "../../css/AdminTable.css";
import "../../css/AdminComponents.css";
import "../../css/AdminForms.css";
import "../../css/AdminModals.css";


type Review = NormalizedReview;

interface ReviewFormData {
  username: string;
  exhibitName: string;
  rating: number;
  description: string;
  status: string;
}

const AdminReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { user } = useAuth();
  const isAdmin = !!user?.roles?.includes("admin");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    username: "",
    exhibitName: "",
    rating: 1,
    description: "",
    status: "shown",
  });

  const breadcrumbs = [
    { label: "Admin", path: "/admin/dashboard" },
    { label: "Reviews" },
  ];

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const sortFieldMap: Record<string, string> = {
        username: "username",
        exhibitName: "exhibitName",
        rating: "rating",
        createdAt: "created_at"
      };
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        status: statusFilter,
        sort_by: sortFieldMap[sortBy] || "created_at",
        sort_order: sortOrder,
      });
      const response = await apiClient.get(`/reviews?${params}`);
      const reviewsArr = response.data.data.reviews;
      const normalized = reviewsArr.map((r: any) => normalizeReview(r));
      setReviews(normalized);
      setTotalPages(response.data.data.pagination.total_pages);
      setTotalReviews(response.data.data.pagination.total_count);
    } catch (err) {
      setError("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };
  // Toggle is_hidden for a review
  const handleToggleHidden = async (review: Review) => {
    try {
      await apiClient.patch(`/reviews/${review.feedback_id}/toggle-hidden`);
      fetchReviews();
    } catch (err) {
      alert("Failed to toggle review hidden status.");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchReviews();
    // eslint-disable-next-line
  }, [currentPage, searchQuery, statusFilter, sortBy, sortOrder, itemsPerPage, isAdmin]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const openViewModal = (review: Review) => {
    setSelectedReview(review);
    setShowViewModal(true);
  };

  const openEditModal = (review: Review) => {
    setSelectedReview(review);
    setFormData({
      username: review.user?.username || review.username || "",
      exhibitName: review.exhibit?.title || review.exhibitName || "",
      rating: review.rating,
      description: review.comment || review.description || "",
      status: review.is_hidden ? "hidden" : "shown",
    });
    setShowEditModal(true);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/reviews", formData);
      setShowCreateModal(false);
      setFormData({
        username: "",
        exhibitName: "",
        rating: 1,
        description: "",
        status: "shown",
      });
      fetchReviews();
    } catch (err) {
      alert("Failed to create review.");
    }
  };

  const handleEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    try {
      await apiClient.put(`/reviews/${selectedReview.feedback_id}`, formData);
      setShowEditModal(false);
      setSelectedReview(null);
      fetchReviews();
    } catch (err) {
      alert("Failed to update review.");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to hide this review?")) return;
    try {
      await apiClient.delete(`/reviews/${reviewId}`);
      fetchReviews();
    } catch (err) {
      alert("Failed to hide review.");
    }
  };

  const handleReactivateReview = async (reviewId: string) => {
    try {
      await apiClient.post(`/reviews/${reviewId}/show`);
      fetchReviews();
    } catch (err) {
      alert("Failed to show review.");
    }
  };

  if (!user) {
    return (
      <div className="admin-guard">
        <ShieldAlert size={20} />
        <div>
          <strong>Authentication required</strong>
          <p>Please sign in to manage reviews.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-guard">
        <ShieldAlert size={20} />
        <div>
          <strong>Admin access only</strong>
          <p>You need admin privileges to view analytics and manage reviews.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout currentPath="/admin/reviews" breadcrumbs={breadcrumbs}>
      <div className="admin-page-wrapper">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <Users size={24} /> Reviews Management
          </h1>
          <div className="admin-page-actions">
            <div className="admin-table-search">
              <Search className="admin-table-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              Add Review
            </button>
          </div>
        </div>

          <ReviewAnalyticsDashboard statusFilter={statusFilter} />

        <div className="admin-table-filters">
          <div className="admin-table-filter">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="shown">Shown</option>
              <option value="hidden">Hidden</option>
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
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            Loading reviews...
          </div>
        ) : error ? (
          <div className="status-message status-error">{error}</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th
                    className={`sortable ${sortBy === "username" ? `sort-${sortOrder}` : ""}`}
                    onClick={() => handleSort("username")}
                  >
                    Username
                  </th>
                  <th
                    className={`sortable ${sortBy === "exhibitName" ? `sort-${sortOrder}` : ""}`}
                    onClick={() => handleSort("exhibitName")}
                  >
                    Exhibit Name
                  </th>
                  <th
                    className={`sortable ${sortBy === "rating" ? `sort-${sortOrder}` : ""}`}
                    onClick={() => handleSort("rating")}
                  >
                    Rating
                  </th>
                  <th>Description</th>
                  <th
                    className={`sortable ${sortBy === "createdAt" ? `sort-${sortOrder}` : ""}`}
                    onClick={() => handleSort("createdAt")}
                  >
                    Created
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.feedback_id}>
                    <td>{review.user?.username || "-"}</td>
                    <td>{review.exhibit?.title || "-"}</td>
                    <td>{review.rating}</td>
                    <td>{review.comment}</td>
                    <td>{new Date(review.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`admin-table-status ${review.is_hidden ? "hidden" : "shown"}`}>
                        {review.is_hidden ? "Hidden" : "Shown"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-table-action-btn ${review.is_hidden ? "reactivate" : "hide"}`}
                        onClick={() => handleToggleHidden(review)}
                        title={review.is_hidden ? "Show review" : "Hide review"}
                      >
                        {review.is_hidden ? <RotateCcw size={14} /> : <EyeOff size={14} />}
                        {review.is_hidden ? " Show" : " Hide"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-table-pagination">
              <div className="admin-table-pagination-info">
                Showing {reviews.length} of {totalReviews} reviews ({Math.ceil((currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, totalReviews)})
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
                      className={`admin-table-pagination-btn ${currentPage === page ? "active" : ""}`}
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

        {/* Create Review Modal */}
        {showCreateModal && (
          <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">Create New Review</h3>
                <button className="admin-modal-close" onClick={() => setShowCreateModal(false)}>
                  ×
                </button>
              </div>
              <div className="admin-modal-body">
                <form onSubmit={handleCreateReview} className="admin-form">
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Username</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Exhibit Name</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.exhibitName}
                      onChange={(e) => setFormData({ ...formData, exhibitName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Rating</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={formData.rating}
                      min={1}
                      max={5}
                      onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Description</label>
                    <textarea
                      className="admin-form-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Status</label>
                    <select
                      className="admin-form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="shown">Shown</option>
                      <option value="hidden">Hidden</option>
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
                      Create Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Review Modal */}
        {showEditModal && selectedReview && (
          <div className="admin-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">Edit Review</h3>
                <button className="admin-modal-close" onClick={() => setShowEditModal(false)}>
                  ×
                </button>
              </div>
              <div className="admin-modal-body">
                <form onSubmit={handleEditReview} className="admin-form">
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Username</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Exhibit Name</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.exhibitName}
                      onChange={(e) => setFormData({ ...formData, exhibitName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Rating</label>
                    <input
                      type="number"
                      className="admin-form-input"
                      value={formData.rating}
                      min={1}
                      max={5}
                      onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Description</label>
                    <textarea
                      className="admin-form-input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label required">Status</label>
                    <select
                      className="admin-form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      required
                    >
                      <option value="shown">Shown</option>
                      <option value="hidden">Hidden</option>
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
                      Update Review
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Review Modal */}
        {showViewModal && selectedReview && (
          <div className="admin-modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3 className="admin-modal-title">View Review Details</h3>
                <button className="admin-modal-close" onClick={() => setShowViewModal(false)}>
                  ×
                </button>
              </div>
              <div className="admin-modal-body">
                <div className="admin-view-details">
                  <div className="admin-view-group">
                    <div className="admin-view-label">Username</div>
                    <div className="admin-view-value">{selectedReview.user?.username || selectedReview.username}</div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Exhibit Name</div>
                    <div className="admin-view-value">{selectedReview.exhibit?.title || selectedReview.exhibitName}</div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Rating</div>
                    <div className="admin-view-value">{selectedReview.rating}</div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Description</div>
                    <div className="admin-view-value">{selectedReview.comment || selectedReview.description}</div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Status</div>
                    <div className="admin-view-value">
                      <span className={`admin-status-badge ${selectedReview.is_hidden ? "hidden" : "shown"}`}>
                        {selectedReview.is_hidden ? "hidden" : "shown"}
                      </span>
                    </div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Created At</div>
                    <div className="admin-view-value">
                      {selectedReview.created_at ? new Date(selectedReview.created_at).toLocaleString() : "-"}
                    </div>
                  </div>
                  <div className="admin-view-group">
                    <div className="admin-view-label">Updated At</div>
                    <div className="admin-view-value">
                      {selectedReview.updated_at ? new Date(selectedReview.updated_at).toLocaleString() : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReviewsPage;
