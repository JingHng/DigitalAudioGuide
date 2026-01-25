import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { History, Trash, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import '../css/AIAssistant.css';

const API_BASE = '/api/assistant';

interface Conversation {
  conversationId: string;
  title: string | null;
  statusId: number;
  createdAt: string;
  modifiedAt: string;
}

interface PaginationData {
  conversationList: Conversation[];
  pageCount: number;
  currentPage: number;
  pageSize: number;
  total: number;
}

// Helper function to format date to relative time
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

export default function AssistantHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [currentPage, pageSize]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          pageSize: pageSize,
          sortBy: 'modifiedAt',
          order: 'desc',
        },
      });
      
      setConversations(response.data.data.conversationList || []);
      setPageCount(response.data.data.pageCount || 1);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setError(error.response?.data?.message || 'Failed to load conversation history');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Delete this conversation? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh the conversation list
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pageCount) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value);
    if (!isNaN(newSize) && newSize > 0) {
      setPageSize(newSize);
      setCurrentPage(1); // Reset to first page when changing page size
    }
  };

  const navigateToConversation = (conversationId: string) => {
    window.location.href = `/admin/assistant?conversationId=${conversationId}`;
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(pageCount, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-btn"
      >
        <ChevronLeft size={16} />
      </button>
    );

    // First page
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="pagination-btn"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Last page
    if (endPage < pageCount) {
      if (endPage < pageCount - 1) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={pageCount}
          onClick={() => handlePageChange(pageCount)}
          className="pagination-btn"
        >
          {pageCount}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === pageCount}
        className="pagination-btn"
      >
        <ChevronRight size={16} />
      </button>
    );

    return buttons;
  };

  return (
    <AdminLayout currentPath="/admin/assistant/history">
      <motion.div
        className="history-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="history-header">
          <div className="history-header-left">
            <History size={28} className="text-blue-500" />
            <h1 className="history-title">Conversation History</h1>
          </div>
          
          <div className="history-pagination-controls">
            <div className="pagination-buttons">
              {renderPaginationButtons()}
            </div>
            
            <div className="page-size-control">
              <label htmlFor="pageSize">Items per page:</label>
              <input
                id="pageSize"
                type="number"
                min="1"
                value={pageSize}
                onChange={handlePageSizeChange}
                className="page-size-input"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="history-content">
          {isLoading ? (
            <div className="history-loading">
              <div className="loading-spinner"></div>
              <p>Loading conversation history...</p>
            </div>
          ) : error ? (
            <div className="history-error">
              <p className="error-message">{error}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="history-empty">
              <MessageCircle size={48} className="text-gray-400" />
              <h3>No conversation history found</h3>
              <p>Start a new conversation to see it appear here</p>
              <a href="/admin/assistant" className="btn-new-conversation">
                Start New Conversation
              </a>
            </div>
          ) : (
            <div className="history-list">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.conversationId}
                  className="history-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => navigateToConversation(conv.conversationId)}
                >
                  <div className="history-item-content">
                    <h3 className="history-item-title">
                      {conv.title || 'Untitled Conversation'}
                    </h3>
                    <p className="history-item-id">{conv.conversationId}</p>
                    <p className="history-item-date">
                      Created {formatDistanceToNow(new Date(conv.createdAt))}
                    </p>
                  </div>
                  
                  <button
                    className="history-item-delete"
                    onClick={(e) => deleteConversation(conv.conversationId, e)}
                    title="Delete conversation"
                  >
                    <Trash size={18} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {!isLoading && conversations.length > 0 && (
          <div className="history-footer">
            <div className="pagination-info">
              Showing page {currentPage} of {pageCount}
            </div>
            <div className="pagination-buttons">
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
}
