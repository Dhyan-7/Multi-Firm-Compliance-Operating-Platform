'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from './AppLayout';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, unreadCount } = useAuth();

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Calendar', path: '/calendar', icon: '📅' },
        { label: 'Firms', path: '/firms', icon: '🏢' },
        { label: 'Tasks', path: '/tasks', icon: '✅' },
      ],
    },
    {
      title: 'COMPLIANCE & REPOSITORY',
      items: [
        { label: 'Compliance Master', path: '/compliance/master', icon: '📜' },
        { label: 'Document Vault', path: '/documents', icon: '📁' },
        { label: 'Reports & Analytics', path: '/reports', icon: '📈' },
      ],
    },
    {
      title: 'ORGANIZATION & ACCESS',
      items: [
        { label: 'User Directory', path: '/users', icon: '👥' },
        { label: 'Roles & RBAC', path: '/users/roles', icon: '🔐' },
        { label: 'Departments', path: '/users/departments', icon: '🏛️' },
      ],
    },
    {
      title: 'SYSTEM & GOVERNANCE',
      items: [
        { label: 'Notifications', path: '/notifications', icon: '🔔', badge: unreadCount },
        { label: 'Audit Trail', path: '/audit', icon: '🛡️' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 80 : 260,
        background: '#0F172A',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        borderRight: '1px solid #1E293B',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #1E293B',
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', color: '#FFF' }}>
                ComplianceOS
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>MULTI-FIRM ENTERPRISE</div>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            C
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Links */}
      <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: 20 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748B',
                  letterSpacing: '0.8px',
                  padding: '4px 12px 8px',
                }}
              >
                {group.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map((item) => {
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/') || (item.path === '/users/departments' && (pathname === '/departments' || pathname.startsWith('/departments/')));
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: collapsed ? '10px 0' : '10px 12px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#FFFFFF' : '#94A3B8',
                      background: isActive ? '#1E293B' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 13,
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          background: '#EF4444',
                          color: '#FFF',
                          borderRadius: 12,
                          padding: '1px 7px',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Info Footer */}
      <a
        href="/profile"
        title="My Profile & Security Settings"
        style={{
          padding: '16px',
          borderTop: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#1E293B')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            color: '#FFF',
            flexShrink: 0,
          }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.role_name || 'Super Admin'} • Profile ⚙️
            </div>
            <div style={{ fontSize: 9, color: '#64748B', marginTop: 3, whiteSpace: 'nowrap' }}>
              All Rights Reserved © 2026 DHYAN
            </div>
          </div>
        )}
      </a>
    </aside>
  );
}
