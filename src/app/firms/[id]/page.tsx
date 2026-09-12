'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function FirmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [regenerating, setRegenerating] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  const fetchFirmData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/firms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const firmData = await res.json();
        setData(firmData);
      }
    } catch (err) {
      console.error('Firm detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmData();
  }, [id, token]);

  const handleRegenerateCalendar = async () => {
    if (!token) return;
    setRegenerating(true);
    setNotificationMsg('');
    try {
      const res = await fetch(`/api/firms/${id}/generate-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ financial_year: '2026-2027' }),
      });
      const resData = await res.json();
      if (res.ok) {
        setNotificationMsg(resData.message || 'Calendar generated successfully!');
        fetchFirmData();
      }
    } catch (err) {
      console.error('Regenerate calendar error:', err);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const firm = data?.firm || {};
  const stats = data?.stats || {};
  const compliances = data?.compliances || [];
  const tasks = data?.tasks || [];
  const contacts = data?.contacts || [];
  const activity = data?.activity || [];
  const health = stats.healthScore ?? 85;

  return (
    <div>
      {/* Top Firm Identity Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {firm.display_name}
              </h2>
              <span style={{ padding: '3px 10px', borderRadius: 12, background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600 }}>
                {firm.entity_type_name || 'Organization'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Legal: {firm.legal_name} • Industry: {firm.industry || 'General Commerce'}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              {firm.pan && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  PAN: <strong>{firm.pan}</strong>
                </span>
              )}
              {firm.gstin && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  GSTIN: <strong>{firm.gstin}</strong>
                </span>
              )}
              {(firm.cin || firm.cin_llpin) && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  CIN: <strong>{firm.cin || firm.cin_llpin}</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Compliance Health</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: health > 75 ? '#10B981' : health > 50 ? '#F59E0B' : '#EF4444' }}>
                {health}%
              </div>
            </div>

            <a
              href={`/calendar?firm_id=${firm.id}`}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '9px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                textDecoration: 'none',
              }}
            >
              📅 Firm Calendar
            </a>
          </div>
        </div>

        {notificationMsg && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: 13 }}>
            ✓ {notificationMsg}
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid #E2E8F0',
          marginBottom: 20,
        }}
      >
        {[
          { id: 'overview', label: 'Overview & KPIs' },
          { id: 'compliances', label: `Applicable Compliances (${compliances.length})` },
          { id: 'tasks', label: `Compliance Tasks (${tasks.length})` },
          { id: 'contacts', label: `Key Contacts (${contacts.length})` },
          { id: 'activity', label: 'Activity Log' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#2563EB' : '#64748B',
              borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>TOTAL TASKS</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{stats.total || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>COMPLETED</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>{stats.completed || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>PENDING</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>{stats.pending || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>IN PROGRESS</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6', marginTop: 4 }}>{stats.in_progress || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: stats.overdue > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>OVERDUE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginTop: 4 }}>{stats.overdue || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Recent Tasks */}
            <div style={{ background: '#FFF', padding: 20, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Upcoming Due Dates</h3>
                <button onClick={() => setActiveTab('tasks')} style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  View all ({tasks.length}) →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.slice(0, 6).map((t: any) => (
                  <a
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#F8FAFC',
                      textDecoration: 'none',
                      color: '#0F172A',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.compliance_name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Due: {t.due_date} • {t.period}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: t.status === 'completed' ? '#D1FAE5' : t.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: t.status === 'completed' ? '#065F46' : t.status === 'overdue' ? '#991B1B' : '#92400E',
                      }}
                    >
                      {t.status}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Address & Registered Info */}
            <div style={{ background: '#FFF', padding: 20, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Registered Premises</h3>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                <div>{firm.registered_address || firm.address_line1 || 'No address specified'}</div>
                <div>{firm.city} {firm.state && `, ${firm.state}`} {firm.pin_code || firm.pincode}</div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 16, paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>Headcount & Turnover:</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 4 }}>
                  {firm.employee_count || 0} Employees • {firm.turnover_band || 'Standard Turnover'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Compliances */}
      {activeTab === 'compliances' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Statutory Compliances Enabled</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>These regulations govern the recurring calendar task schedule.</p>
            </div>

            <button
              onClick={handleRegenerateCalendar}
              disabled={regenerating}
              style={{
                background: '#3B82F6',
                color: '#FFF',
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: regenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {regenerating ? 'Regenerating...' : '🔄 Regenerate FY Calendar'}
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Compliance</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Frequency</th>
                <th style={{ padding: '10px 12px' }}>Authority</th>
                <th style={{ padding: '10px 12px' }}>Priority</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {compliances.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.compliance_name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Code: {c.compliance_code}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#334155' }}>
                      {c.category_name}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{c.frequency}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.authority}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: c.priority === 'high' ? '#DC2626' : '#2563EB' }}>
                      {c.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 600 }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Compliance Tasks Directory</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Compliance</th>
                <th style={{ padding: '10px 12px' }}>Period</th>
                <th style={{ padding: '10px 12px' }}>Due Date</th>
                <th style={{ padding: '10px 12px' }}>Assignee</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{t.compliance_name}</td>
                  <td style={{ padding: '12px' }}>{t.period}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{t.due_date}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{t.assignee_name || 'Unassigned'}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: t.status === 'completed' ? '#D1FAE5' : t.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: t.status === 'completed' ? '#065F46' : t.status === 'overdue' ? '#991B1B' : '#92400E',
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/tasks/${t.id}`} style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                      Open Workspace →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Contacts */}
      {activeTab === 'contacts' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Organization Key Contacts</h3>
          {contacts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No contacts recorded.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {contacts.map((c: any) => (
                <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, background: '#F8FAFC' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{c.designation}</div>
                  <div style={{ marginTop: 12, fontSize: 13, color: '#334155' }}>
                    <div>✉️ {c.email || 'N/A'}</div>
                    <div style={{ marginTop: 4 }}>📞 {c.phone || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Activity */}
      {activeTab === 'activity' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Firm Audit Activity Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 18 }}>🛡️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                    {a.action} — {a.user_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{a.entity_name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {new Date(a.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
