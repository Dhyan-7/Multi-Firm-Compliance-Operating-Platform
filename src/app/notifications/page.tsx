'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AppLayout';
import { formatISTDateTime } from '@/lib/dateUtils';

export default function NotificationsPage() {
  const { token, unreadCount, setUnreadCount } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'task' | 'overdue' | 'approval'>('all');
  const [search, setSearch] = useState('');

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

  const markSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleNavigate = async (n: any) => {
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
        console.error('Error:', err);
      }
    }

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
    }
  };

  const getIcon = (type: string) => {
    if (type?.includes('overdue') || type?.includes('critical')) return '⚠️';
    if (type?.includes('approved') || type?.includes('completed')) return '✅';
    if (type?.includes('rejected') || type?.includes('changes')) return '🔄';
    if (type?.includes('assigned')) return '📋';
    if (type?.includes('rescheduled')) return '📅';
    if (type?.includes('comment')) return '💬';
    return '🔔';
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'task' && !n.type?.includes('task') && n.entity_type !== 'task') return false;
    if (filter === 'overdue' && !n.type?.includes('overdue') && !n.type?.includes('critical')) return false;
    if (filter === 'approval' && !n.type?.includes('approved') && !n.type?.includes('rejected')) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const msgMatch = (n.message || '').toLowerCase().includes(q);
      return titleMatch || msgMatch;
    }
    return true;
  });

  const unreadTotal = notifications.filter(n => !n.is_read).length;

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
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Notification Center
            </h2>
            {unreadTotal > 0 && (
              <span style={{ fontSize: 12, background: '#DBEAFE', color: '#1E40AF', padding: '2px 10px', borderRadius: 12, fontWeight: 700 }}>
                {unreadTotal} Unread
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Actionable statutory alerts, upcoming deadlines, audit notes, reviewer rejections, and schedule changes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              width: 220,
            }}
          />

          <button
            onClick={markAllRead}
            disabled={unreadTotal === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: unreadTotal > 0 ? '#F8FAFC' : '#F1F5F9',
              color: unreadTotal > 0 ? '#1E293B' : '#94A3B8',
              fontSize: 13,
              fontWeight: 600,
              cursor: unreadTotal > 0 ? 'pointer' : 'default',
            }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all', label: 'All Alerts', count: notifications.length },
          { key: 'unread', label: 'Unread Only', count: unreadTotal },
          { key: 'task', label: 'Task Assignments', count: notifications.filter(n => n.type?.includes('task') || n.entity_type === 'task').length },
          { key: 'overdue', label: 'Overdue & Critical', count: notifications.filter(n => n.type?.includes('overdue') || n.type?.includes('critical')).length },
          { key: 'approval', label: 'Approvals & Reviews', count: notifications.filter(n => n.type?.includes('approved') || n.type?.includes('rejected')).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: filter === tab.key ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: filter === tab.key ? '#EFF6FF' : '#FFF',
              color: filter === tab.key ? '#1D4ED8' : '#64748B',
              fontSize: 12,
              fontWeight: filter === tab.key ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            <span style={{ fontSize: 11, background: filter === tab.key ? '#DBEAFE' : '#F1F5F9', color: filter === tab.key ? '#1D4ED8' : '#475569', padding: '1px 6px', borderRadius: 8 }}>
              {tab.count}
            </span>
          </button>
        ))}
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
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔕</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No notifications found</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              {filter !== 'all' ? 'Try changing your filter settings.' : 'All system events and reminders are clear.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map(n => (
              <div
                key={n.id}
                onClick={() => handleNavigate(n)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid #F1F5F9',
                  background: n.is_read ? '#FFFFFF' : '#F0F9FF',
                  cursor: n.entity_id ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  if (n.entity_id) e.currentTarget.style.background = n.is_read ? '#F8FAFC' : '#E0F2FE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = n.is_read ? '#FFFFFF' : '#F0F9FF';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                  <span style={{ fontSize: 24, marginTop: 2 }}>
                    {getIcon(n.type)}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{n.title}</span>
                      {!n.is_read && (
                        <span style={{ fontSize: 10, background: '#2563EB', color: '#FFF', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>
                        {formatISTDateTime(n.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      {n.entity_type && (
                        <>
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{n.entity_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  {n.entity_id && (
                    <button
                      type="button"
                      style={{
                        padding: '7px 14px',
                        background: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      Open {n.entity_type === 'task' ? 'Workspace' : 'Details'} →
                    </button>
                  )}

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => markSingleRead(e, n.id)}
                      title="Mark as read"
                      style={{
                        padding: '6px 10px',
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        color: '#64748B',
                        fontWeight: 500,
                      }}
                    >
                      Mark Read
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
