'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AppLayout';
import NotificationBell from '../NotificationBell';

export default function Header({ onOpenSearch }: { onOpenSearch: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Derive title from pathname
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Compliance Overview';
    if (pathname.startsWith('/calendar')) return 'Compliance Calendar';
    if (pathname === '/firms/new') return 'Add New Firm Wizard';
    if (pathname.startsWith('/firms/')) return 'Firm Management';
    if (pathname === '/firms') return 'Registered Firms Directory';
    if (pathname.startsWith('/tasks/')) return 'Task Detail Workspace';
    if (pathname === '/tasks') return 'Statutory Compliance Tasks';
    if (pathname.startsWith('/compliance/categories')) return 'Compliance Categories';
    if (pathname.startsWith('/compliance/master')) return 'Master Compliance Library';
    if (pathname === '/documents') return 'Centralized Document Vault';
    if (pathname === '/reports') return 'Reports & Analytics Intelligence';
    if (pathname === '/users/roles') return 'Role & Access Control (RBAC)';
    if (pathname === '/users/departments') return 'Department Directory';
    if (pathname === '/users') return 'User Directory & Access';
    if (pathname === '/notifications') return 'Notification Center';
    if (pathname === '/audit') return 'Immutable Audit Trail';
    if (pathname === '/settings') return 'System Configuration';
    if (pathname === '/profile') return 'My Profile & Security Settings';
    return 'ComplianceOS Platform';
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: 64,
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Title & Breadcrumbs */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          {getPageTitle()}
        </h1>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Home</span>
          <span>/</span>
          <span style={{ color: '#3B82F6', fontWeight: 500 }}>{getPageTitle()}</span>
        </div>
      </div>

      {/* Actions & Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Universal Search Input button */}
        <button
          onClick={onOpenSearch}
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '7px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#64748B',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
        >
          <span>🔍</span>
          <span>Quick search...</span>
          <span
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              padding: '1px 5px',
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
            }}
          >
            ⌘K
          </span>
        </button>

        {/* Quick action: Add Firm button */}
        <a
          href="/firms/new"
          style={{
            background: '#3B82F6',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 1px 2px 0 rgba(59, 130, 246, 0.3)',
          }}
        >
          <span>+</span>
          <span>Add Firm</span>
        </a>

        {/* Notifications */}
        <NotificationBell />

        {/* User Profile */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span style={{ fontSize: 12, color: '#64748B' }}>▼</span>
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: 48,
                right: 0,
                width: 220,
                background: '#FFFFFF',
                borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                border: '1px solid #E2E8F0',
                padding: '8px 0',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{user?.email}</div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {user?.role_name}
                </span>
              </div>

              <a
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  color: '#334155',
                  fontSize: 13,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>👤</span>
                <span>Profile & Password</span>
              </a>

              <a
                href="/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  color: '#334155',
                  fontSize: 13,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>⚙️</span>
                <span>System Settings</span>
              </a>

              <a
                href="/audit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  color: '#334155',
                  fontSize: 13,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>🛡️</span>
                <span>Security & Audit</span>
              </a>

              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 4, paddingTop: 4 }}>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '8px 16px',
                    color: '#EF4444',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
