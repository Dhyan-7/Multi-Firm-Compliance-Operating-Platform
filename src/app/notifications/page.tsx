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
  const [filter, setFilter] = useState<'all' | 'unread' | 'task' | 'overdue' | 'approval' | 'emails'>('all');
  const [search, setSearch] = useState('');

  // Email delivery logs state
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailStats, setEmailStats] = useState<any>({ total: 0, sent: 0, failed: 0, queued: 0 });
  const [emailLoading, setEmailLoading] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<any | null>(null);
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);

  // User notification preferences state
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<any>({
    email_enabled: 1,
    task_assigned: 1,
    task_reassigned: 1,
    due_date_reminder: 1,
    overdue_alert: 1,
    missed_alert: 1,
    task_review: 1,
    task_rejected: 1,
    changes_requested: 1,
    task_completed: 1,
    comment_added: 1,
    daily_summary: 0,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefNotice, setPrefNotice] = useState('');

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

  const fetchEmailLogs = async () => {
    if (!token) return;
    setEmailLoading(true);
    try {
      const res = await fetch('/api/notifications/emails', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.emails || []);
        setEmailStats(data.stats || { total: 0, sent: 0, failed: 0, queued: 0 });
      }
    } catch (err) {
      console.error('Fetch email logs error:', err);
    } finally {
      setEmailLoading(false);
    }
  };

  const fetchPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Fetch preferences error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchEmailLogs();
    fetchPreferences();
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
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Mark single read error:', err);
    }
  };

  const handleRetryEmail = async (emailId: string) => {
    if (!token) return;
    setRetryingEmailId(emailId);
    try {
      const res = await fetch('/api/notifications/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'retry', emailId }),
      });
      if (res.ok) {
        await fetchEmailLogs();
      }
    } catch (err) {
      console.error('Retry email error:', err);
    } finally {
      setRetryingEmailId(null);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingPreferences(true);
    setPrefNotice('');
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        setPrefNotice('Preferences updated successfully!');
        setTimeout(() => setPreferencesModalOpen(false), 900);
      } else {
        setPrefNotice('Failed to update preferences.');
      }
    } catch (err) {
      setPrefNotice('An error occurred.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'task' && !(n.type?.includes('task') || n.entity_type === 'task')) return false;
    if (filter === 'overdue' && !(n.type?.includes('overdue') || n.type?.includes('critical'))) return false;
    if (filter === 'approval' && !(n.type?.includes('approved') || n.type?.includes('rejected') || n.type?.includes('submitted'))) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEmails = emailLogs.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.recipient_email?.toLowerCase().includes(q) ||
      e.recipient_name?.toLowerCase().includes(q) ||
      e.event_type?.toLowerCase().includes(q)
    );
  });

  const unreadTotal = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            Notification & Communication Center
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            Unified statutory compliance alerts, supervisor review requests, and trackable email communications across BALAJI GROUPS.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setPreferencesModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#FFF',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <span>⚙️</span> Notification Preferences
          </button>

          <button
            onClick={markAllRead}
            disabled={unreadTotal === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: unreadTotal > 0 ? '#F1F5F9' : '#F8FAFC',
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

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'all', label: 'All Alerts', count: notifications.length },
            { key: 'unread', label: 'Unread Only', count: unreadTotal },
            { key: 'task', label: 'Task Assignments', count: notifications.filter(n => n.type?.includes('task') || n.entity_type === 'task').length },
            { key: 'overdue', label: 'Overdue & Critical', count: notifications.filter(n => n.type?.includes('overdue') || n.type?.includes('critical')).length },
            { key: 'approval', label: 'Approvals & Reviews', count: notifications.filter(n => n.type?.includes('approved') || n.type?.includes('rejected') || n.type?.includes('submitted')).length },
            { key: 'emails', label: '📧 Email Delivery Logs', count: emailLogs.length },
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

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={filter === 'emails' ? 'Search emails by subject, recipient...' : 'Search notifications...'}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            fontSize: 13,
            minWidth: 260,
            background: '#FFF',
          }}
        />
      </div>

      {/* Main Container */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {filter === 'emails' ? (
          /* Email Delivery Logs Tab View */
          <div>
            {/* Delivery Stats Ribbon */}
            <div style={{ display: 'flex', gap: 16, padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600 }}>
              <div style={{ color: '#0F172A' }}>Total Emails: <strong style={{ color: '#2563EB' }}>{emailStats.total || 0}</strong></div>
              <div style={{ color: '#166534' }}>Delivered / Sent: <strong>{emailStats.sent || 0}</strong></div>
              <div style={{ color: '#991B1B' }}>Failed: <strong>{emailStats.failed || 0}</strong></div>
              <div style={{ color: '#B45309' }}>Queued: <strong>{emailStats.queued || 0}</strong></div>
            </div>

            {emailLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: '#64748B', fontSize: 13 }}>Loading email logs...</div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No email delivery records found</div>
                <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                  Dispatched notifications will appear here with delivery timestamps and HTML preview.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Subject</th>
                      <th style={{ padding: '12px 16px' }}>Recipient</th>
                      <th style={{ padding: '12px 16px' }}>Event Type</th>
                      <th style={{ padding: '12px 16px' }}>Created (IST)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: e.status === 'sent' ? '#F0FDF4' : e.status === 'failed' ? '#FEF2F2' : '#EFF6FF',
                            color: e.status === 'sent' ? '#15803D' : e.status === 'failed' ? '#B91C1C' : '#2563EB',
                          }}>
                            {e.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                          <div style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.subject}
                          </div>
                          {e.error_message && (
                            <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.error_message}>
                              ⚠️ {e.error_message}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          <div>{e.recipient_name || 'Staff'}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{e.recipient_email}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12 }}>
                          {e.event_type}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatISTDateTime(e.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setPreviewEmail(e)}
                              style={{
                                padding: '4px 10px',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              View HTML 👁️
                            </button>

                            {e.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetryEmail(e.id)}
                                disabled={retryingEmailId === e.id}
                                style={{
                                  padding: '4px 10px',
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {retryingEmailId === e.id ? 'Retrying...' : 'Retry ↻'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* In-App Notifications List */
          <div>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: '#64748B', fontSize: 13 }}>Loading notifications...</div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No notifications found</div>
                <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                  {filter === 'unread' ? 'All alerts marked as read.' : 'You have no notifications matching this criteria.'}
                </div>
              </div>
            ) : (
              <div>
                {filteredNotifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 16,
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      background: n.is_read ? '#FFF' : '#F8FAFC',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: n.type?.includes('overdue') ? '#FEF2F2' :
                                 n.type?.includes('approved') ? '#F0FDF4' :
                                 n.type?.includes('rejected') ? '#FFFBEB' : '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      {n.type?.includes('overdue') ? '⚠️' :
                       n.type?.includes('approved') ? '✅' :
                       n.type?.includes('rejected') ? '✕' :
                       n.type?.includes('submitted') ? '📋' :
                       n.type?.includes('comment') ? '💬' : '🔔'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#2563EB' }} />
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 6 }}>
                        {n.message}
                      </div>

                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {formatISTDateTime(n.created_at)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {n.entity_id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (n.entity_type === 'task') router.push(`/tasks/${n.entity_id}`);
                            else if (n.entity_type === 'firm') router.push(`/firms/${n.entity_id}`);
                            else router.push('/tasks');
                          }}
                          style={{
                            padding: '6px 12px',
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
        )}
      </div>

      {/* User Notification Preferences Modal */}
      {preferencesModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setPreferencesModalOpen(false)}
        >
          <div
            style={{
              background: '#FFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: 24,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Notification Preferences</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>Configure email alerts for operational compliance events.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreferencesModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748B', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {prefNotice && (
              <div style={{ padding: '8px 12px', background: '#F0FDF4', color: '#15803D', borderRadius: 6, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
                {prefNotice}
              </div>
            )}

            <form onSubmit={handleSavePreferences}>
              {/* Master Email Toggle */}
              <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>Enable Email Notifications</strong>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Receive email alerts in addition to in-app notifications.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.email_enabled)}
                    onChange={e => setPreferences({ ...preferences, email_enabled: e.target.checked ? 1 : 0 })}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Event specific toggles */}
              <div style={{ opacity: preferences.email_enabled ? 1 : 0.4, pointerEvents: preferences.email_enabled ? 'auto' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                  Event Notification Channels
                </div>

                {[
                  { key: 'task_assigned', label: 'New Task Assigned', desc: 'When a compliance deliverable is assigned to you' },
                  { key: 'task_reassigned', label: 'Task Reassigned', desc: 'When responsibility for a task is transferred to you' },
                  { key: 'due_date_reminder', label: 'Due Date Reminders (7d, 3d, 1d, 0d)', desc: 'Automated statutory reminder countdowns' },
                  { key: 'overdue_alert', label: 'Overdue Compliance (Mandatory)', desc: 'When statutory deadline passes without filing' },
                  { key: 'task_review', label: 'Task Submitted for Review', desc: 'When an executive submits a task awaiting sign-off' },
                  { key: 'task_completed', label: 'Task Approved / Completed', desc: 'When your submission is approved by supervisor' },
                  { key: 'task_rejected', label: 'Task Rejected / Changes Requested', desc: 'When supervisor feedback requires task updates' },
                  { key: 'comment_added', label: 'Comments & Audit Discussions', desc: 'When team members post notes on assigned tasks' },
                  { key: 'daily_summary', label: 'Daily Operations Digest', desc: 'Morning briefing of active, overdue, and pending filings' },
                ].map(item => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(preferences[item.key])}
                      disabled={item.key === 'overdue_alert'}
                      onChange={e => setPreferences({ ...preferences, [item.key]: e.target.checked ? 1 : 0 })}
                      style={{ width: 16, height: 16, cursor: item.key === 'overdue_alert' ? 'not-allowed' : 'pointer' }}
                    />
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setPreferencesModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#F1F5F9', color: '#475569', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPreferences}
                  style={{ padding: '8px 20px', background: '#2563EB', color: '#FFF', borderRadius: 8, border: 'none', fontWeight: 600, cursor: savingPreferences ? 'not-allowed' : 'pointer' }}
                >
                  {savingPreferences ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email HTML Preview Modal */}
      {previewEmail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setPreviewEmail(null)}
        >
          <div
            style={{
              background: '#FFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 720,
              height: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '14px 20px', background: '#0F172A', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1 }}>BALAJI GROUPS &bull; CompliCal</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{previewEmail.subject}</div>
                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
                  To: {previewEmail.recipient_name} &lt;{previewEmail.recipient_email}&gt; &bull; Status: {previewEmail.status?.toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmail(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Delivery Error Notice if any */}
            {previewEmail.error_message && (
              <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '10px 20px', fontSize: 12, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span><strong>Delivery Diagnostic:</strong> {previewEmail.error_message}</span>
              </div>
            )}

            {/* Email Body Iframe */}
            <div style={{ flex: 1, background: '#F8FAFC' }}>
              <iframe
                srcDoc={previewEmail.body_html}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
