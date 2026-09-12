'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function NotificationsPage() {
  const { token, setUnreadCount } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'read_all' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const markSingleRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      fetchNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const filtered = notifications.filter(n => (filter === 'unread' ? !n.is_read : true));

  return (
    <div>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '18px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Notification Center
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Alerts on statutory assignments, upcoming deadlines, reviewer approvals, and overdue tasks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: filter === 'all' ? '#3B82F6' : '#FFF',
                color: filter === 'all' ? '#FFF' : '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: filter === 'unread' ? '#3B82F6' : '#FFF',
                color: filter === 'unread' ? '#FFF' : '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Unread
            </button>
          </div>

          <button
            onClick={markAllRead}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading notifications...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No notifications to display</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(n => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F1F5F9',
                  background: n.is_read ? '#FFFFFF' : '#F0F9FF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22 }}>
                    {n.type === 'task_overdue' ? '⚠️' : n.type === 'task_approved' ? '✅' : '🔔'}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{n.title}</span>
                      {!n.is_read && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  {n.entity_id && (
                    <a
                      href={n.entity_type === 'task' ? `/tasks/${n.entity_id}` : `/firms/${n.entity_id}`}
                      style={{
                        padding: '6px 12px',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      View Entity →
                    </a>
                  )}

                  {!n.is_read && (
                    <button
                      onClick={() => markSingleRead(n.id)}
                      style={{
                        padding: '6px 10px',
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
