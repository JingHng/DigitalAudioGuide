import { Form, useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useState, useEffect } from "react";
import type { PaginatedTaskResponse } from "./tasks.loaders";

interface User {
  id: number;
  email: string;
  profile?: {
    fullName?: string;
  };
}

export default function TasksPage() {
  const data = useLoaderData() as PaginatedTaskResponse;
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { tasks, pagination } = data;
  const currentPage = pagination.currentPage;
  const totalPages = pagination.totalPages;
  const tasksPerPage = pagination.itemsPerPage;

  const goToPage = (page: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('page', page.toString());
    navigate(`?${newSearchParams.toString()}`);
  };

  const goToNextPage = () => {
    if (pagination.hasNextPage) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (pagination.hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  };

  const handleTasksPerPageChange = (newTasksPerPage: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('limit', newTasksPerPage.toString());
    newSearchParams.set('page', '1'); // Reset to first page
    navigate(`?${newSearchParams.toString()}`);
  };
  
  // Fetch users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users?limit=100', {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}').accessToken}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setUsers(userData.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    fetchUsers();
  }, []);
  
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        {user && (
          <span className="text-sm text-slate-600">
            Welcome, <span className="font-medium text-slate-900">{user.username}</span>
          </span>
        )}
      </div>
      <Form method="post" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            name="title" 
            placeholder="New task" 
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              transition: 'all 0.2s',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ minWidth: '200px' }}>
          <select
            name="assignedToId"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              transition: 'all 0.2s',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: 'white'
            }}
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.profile?.fullName || u.email}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          type="submit" 
          style={{
            padding: '12px 24px',
            borderRadius: '6px',
            backgroundColor: '#1f2937',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: '500',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#374151'}
          onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1f2937'}
        >
          Add
        </button>
      </Form>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          {pagination.totalItems > 0 ? (
            <>Showing {((currentPage - 1) * tasksPerPage) + 1} to {Math.min(currentPage * tasksPerPage, pagination.totalItems)} of {pagination.totalItems} tasks</>
          ) : (
            <>No tasks found</>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Tasks per page:</label>
          <select
            value={tasksPerPage}
            onChange={(e) => handleTasksPerPageChange(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              outline: 'none',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      <ul className="divide-y divide-slate-200 bg-white rounded-md border">
        {tasks.map((t) => (
          <li key={t.id} className="p-4">
            {editingTask === t.id ? (
              // Edit mode
              <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="taskId" value={t.id} />
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    name="title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      flex: '1',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                    required
                  />
                  
                  <select
                    name="assignedToId"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      outline: 'none',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      minWidth: '150px'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.profile?.fullName || u.email}
                      </option>
                    ))}
                  </select>
                  
                  <input type="hidden" name="done" value={t.done.toString()} />
                  
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Save
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            ) : (
              // View mode
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">{t.title}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-slate-500">#{t.id}</span>
                    <span className="text-xs text-slate-500">
                      Created: {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                    {t.assignedTo && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Assigned to: {t.assignedTo.profile?.fullName || t.assignedTo.email}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Toggle done status */}
                  <Form method="post" style={{ display: 'inline-block' }}>
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="title" value={t.title} />
                    <input type="hidden" name="assignedToId" value={t.assignedToId || ''} />
                    <input type="hidden" name="done" value={(!t.done).toString()} />
                    
                    <button
                      type="submit"
                      style={{
                        padding: '4px 8px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        backgroundColor: t.done ? '#f3f4f6' : '#dcfce7',
                        color: t.done ? '#374151' : '#166534'
                      }}
                    >
                      {t.done ? 'Mark Pending' : 'Mark Done'}
                    </button>
                  </Form>
                  
                  {/* Edit button */}
                  <button
                    onClick={() => {
                      setEditingTask(t.id);
                      setEditTitle(t.title);
                      setEditAssignedTo(t.assignedToId?.toString() || '');
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Edit
                  </button>
                  
                  {/* Delete button */}
                  <Form method="post" style={{ display: 'inline-block' }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="taskId" value={t.id} />
                    
                    <button
                      type="submit"
                      onClick={(e) => {
                        if (!confirm(`Are you sure you want to delete "${t.title}"?`)) {
                          e.preventDefault();
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </Form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: currentPage === 1 ? '#f1f5f9' : 'white',
                color: currentPage === 1 ? '#94a3b8' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Previous
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: page === currentPage ? '#1e293b' : 'white',
                    color: page === currentPage ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: page === currentPage ? '600' : '500'
                  }}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: currentPage === totalPages ? '#f1f5f9' : 'white',
                color: currentPage === totalPages ? '#94a3b8' : '#374151',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
