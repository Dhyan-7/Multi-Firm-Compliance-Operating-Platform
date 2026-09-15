'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './layout/AppLayout';

export default function NotificationBell() {
  const { token, unreadCount, setUnreadCount } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? data.unread ?? 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'read_all' }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!token) return;
    if (!n.is_read) {
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'mark_read', id: n.id }),
        });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: 1 } : item));
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch (err) {
        console.error('Mark notification read error:', err);
      }
    }

    setIsOpen(false);
    if (n.entity_id) {
      if (n.entity_type === 'task' || (!n.entity_type && n.type?.includes('task'))) {
        router.push(`/tasks/${n.entity_id}`);
      } else if (n.entity_type === 'firm') {
        router.push(`/firms/${n.entity_id}`);
      } else if (n.entity_type === 'document') {
        router.push('/documents');
      } else {
        router.push('/tasks');
      }
    } else {
      router.push('/notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type?.includes('overdue') || type?.includes('critical')) return '⚠️';
    if (type?.includes('approved') || type?.includes('completed')) return '✅';
    if (type?.includes('rejected') || type?.includes('changes')) return '🔄';
    if (type?.includes('assigned')) return '📋';
    if (type?.includes('rescheduled')) return '📅';
    if (type?.includes('comment')) return '💬';
    return '🔔';
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? '#E2E8F0' : '#F1F5F9',
          border: 'none',
          borderRadius: 8,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          fontSize: 16,
          transition: 'all 0.15s ease',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#EF4444',
              color: '#FFF',
              borderRadius: '50%',
              width: 18,
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFF',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 380,
            maxHeight: 480,
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E2E8F0',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 340 }}>
            {loading ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>All caught up!</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>No notifications at this time</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    background: n.is_read ? '#FFFFFF' : '#F0F9FF',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = n.is_read ? '#F8FAFC' : '#E0F2FE')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.is_read ? '#FFFFFF' : '#F0F9FF')}
                >
                  <span style={{ fontSize: 18, marginTop: 2 }}>
                    {getNotificationIcon(n.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{n.title}</div>
                      {!n.is_read && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        {new Date(n.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })} IST
                      </span>
                      {n.entity_id && (
                        <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>
                          Open →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid #E2E8F0', textAlign: 'center', background: '#F8FAFC' }}>
            <a
              href="/notifications"
              style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
              onClick={() => setIsOpen(false)}
            >
              View all notifications in Notification Center →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
