import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import type { PaginatedUserResponse } from "./users.loaders";

export default function UsersPage() {
  const data = useLoaderData() as PaginatedUserResponse;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { users, pagination } = data;
  const currentPage = pagination.currentPage;
  const totalPages = pagination.totalPages;
  const usersPerPage = pagination.itemsPerPage;

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

  const handleUsersPerPageChange = (newUsersPerPage: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('limit', newUsersPerPage.toString());
    newSearchParams.set('page', '1'); // Reset to first page
    navigate(`?${newSearchParams.toString()}`);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        {user && (
          <span className="text-sm text-slate-600">
            Welcome, <span className="font-medium text-slate-900">{user.username}</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600">
          {pagination.totalItems > 0 ? (
            <>Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, pagination.totalItems)} of {pagination.totalItems} users</>
          ) : (
            <>No users found</>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Users per page:</label>
          <select
            value={usersPerPage}
            onChange={(e) => handleUsersPerPageChange(Number(e.target.value))}
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

      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: '#374151', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, index) => (
              <tr 
                key={u.id} 
                style={{ 
                  backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc',
                  borderTop: index === 0 ? 'none' : '1px solid #e2e8f0'
                }}
              >
                <td style={{ padding: '12px' }}>{u.email}</td>
                <td style={{ padding: '12px' }}>{u.profile?.fullName ?? "—"}</td>
                <td style={{ padding: '12px' }}>{u.roles.map(r => r.role.name).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
