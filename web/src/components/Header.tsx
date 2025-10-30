import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { useState, useEffect } from "react";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Check if we're on authentication pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  console.log('Header render - isAuthenticated:', isAuthenticated, 'user:', user);

  const link = "px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100 transition";
  const active = "bg-slate-900 text-white hover:bg-slate-800";

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-[1000px]" style={{ padding: '12px 16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-slate-900">CI/CD Demo</div>
            {isAuthenticated && user && (
              <span className="hidden sm:inline-block text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {user.email}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          {isDesktop && (
            <nav className="flex items-center nav-spacing">
            {isAuthenticated ? (
              <>
                <NavLink 
                  to="/" 
                  end 
                  className={({isActive}) => `${link} ${isActive ? active : "text-slate-700"}`}
                >
                  Tasks
                </NavLink>
                <NavLink 
                  to="/admin/users" 
                  className={({isActive}) => `${link} ${isActive ? active : "text-slate-700"}`}
                >
                  Users
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Logout
                </button>
              </>
            ) : !isAuthPage && (
              <NavLink 
                to="/login" 
                className={({isActive}) => `${link} ${isActive ? active : "text-slate-700"}`}
              >
                Login
              </NavLink>
            )}
            </nav>
          )}

          {/* Mobile Menu Button */}
          {!isDesktop && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              <div style={{ width: '24px', height: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                {mobileMenuOpen ? (
                  <div style={{ color: '#374151', fontSize: '20px', fontWeight: 'bold' }}>✕</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#374151', borderRadius: '2px' }}></div>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#374151', borderRadius: '2px' }}></div>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#374151', borderRadius: '2px' }}></div>
                  </div>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Mobile Navigation */}
        {!isDesktop && mobileMenuOpen && (
          <nav className="mt-4 pt-4 border-t border-slate-200 space-y-2 pb-4">
            {isAuthenticated ? (
              <>
                {user && (
                  <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded">
                    {user.email}
                  </div>
                )}
                <NavLink 
                  to="/" 
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={({isActive}) => `block px-4 py-3 rounded-md text-sm font-medium hover:bg-slate-100 transition mx-2 ${isActive ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700"}`}
                >
                  Tasks
                </NavLink>
                <NavLink 
                  to="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({isActive}) => `block px-4 py-3 rounded-md text-sm font-medium hover:bg-slate-100 transition mx-2 ${isActive ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700"}`}
                >
                  Users
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition mx-2"
                >
                  Logout
                </button>
              </>
            ) : !isAuthPage && (
              <NavLink 
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={({isActive}) => `block px-4 py-3 rounded-md text-sm font-medium hover:bg-slate-100 transition mx-2 ${isActive ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700"}`}
              >
                Login
              </NavLink>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
