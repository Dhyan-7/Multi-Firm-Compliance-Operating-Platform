'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalSearch from '../GlobalSearch';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  department_id: string;
  department_name?: string;
  organization_id: string;
  organization_name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
  unreadCount: number;
  setUnreadCount: (c: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  permissions: [],
  hasPermission: () => false,
  logout: () => {},
  refreshUser: async () => {},
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isPublicPage = pathname === '/' || pathname === '/login';

  const fetchUserData = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPermissions(data.permissions || []);

        // Also fetch unread notifications count
        const notifRes = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (notifRes.ok) {
          const nData = await notifRes.json();
          setUnreadCount(nData.unreadCount || 0);
        }
      } else {
        localStorage.removeItem('compliance_token');
        if (!isPublicPage) {
          router.push('/login');
        }
      }
    } catch {
      localStorage.removeItem('compliance_token');
      if (!isPublicPage) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPublicPage) {
      // Navigating to public Home or Login completely terminates active session
      localStorage.removeItem('compliance_token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
      setUser(null);
      setToken(null);
      setPermissions([]);
      setLoading(false);
      try {
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      } catch {}
      return;
    }

    const savedToken = localStorage.getItem('compliance_token');
    if (!savedToken) {
      router.replace('/login');
      return;
    }

    setToken(savedToken);
    fetchUserData(savedToken);
  }, [pathname, isPublicPage, router]);

  // Handle browser back-forward cache (bfcache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        const savedToken = localStorage.getItem('compliance_token');
        if (!savedToken && !isPublicPage) {
          window.location.replace('/login');
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [isPublicPage]);

  // Keyboard shortcut for universal search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('compliance_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
    setUser(null);
    setToken(null);
    setPermissions([]);
    window.location.replace('/login');
  };

  const hasPermission = (perm: string) => {
    if (user?.role_id === 'role_01') return true; // Super admin has all permissions
    return permissions.includes(perm);
  };

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('compliance_token');
    if (savedToken) await fetchUserData(savedToken);
  };

  if (loading && !isPublicPage) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 500 }}>Loading CompliCal...</p>
        </div>
      </div>
    );
  }

  // Render public landing or login page without the internal sidebar/header shell
  if (isPublicPage) {
    return (
      <AuthContext.Provider value={{ user, token, permissions, hasPermission, logout, refreshUser, unreadCount, setUnreadCount }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Protected Platform App Shell
  return (
    <AuthContext.Provider value={{ user, token, permissions, hasPermission, logout, refreshUser, unreadCount, setUnreadCount }}>
      <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header onOpenSearch={() => setIsSearchOpen(true)} />
          <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>

      {isSearchOpen && <GlobalSearch onClose={() => setIsSearchOpen(false)} />}
    </AuthContext.Provider>
  );
}
