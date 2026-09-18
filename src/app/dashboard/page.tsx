'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const firmSummary = data?.firmSummary || [];
  const todayTasks = data?.todayTasks || [];
  const upcomingTasks = data?.upcomingTasks || [];
  const monthlyTrend = data?.monthlyTrend || [];
  const categoryDist = data?.categoryDist || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getHealthScore = (firm: any) => {
    if (!firm.total) return 100;
    const score = Math.round(((firm.completed - (firm.overdue * 2)) / firm.total) * 100);
    return Math.max(0, Math.min(100, score));
  };

  return (
    <div>
      {/* Top Banner Greeting */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {getGreeting()}, {user?.name || 'Administrator'} 👋
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Monitor compliance status, statutory deadlines, and regulatory obligations across all organizations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/calendar"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            📅 View Calendar
          </a>
          <a
            href="/firms/new"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: '#3B82F6',
              color: '#FFF',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Add New Firm
          </a>
        </div>
      </div>

      {/* Interactive Task Summary Grid — 8 Clickable Categories + Firm Overview */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Statutory Task Execution & SLA Summary
        </h3>
        <span style={{ fontSize: 12, color: '#64748B' }}>Click any category to view and manage filtered tasks</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1. All Tasks */}
        <a
          href="/tasks?tab=all"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>All Tasks</div>
            <span style={{ fontSize: 13, color: '#3B82F6' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', marginTop: 6 }}>{kpis.totalTasks || 0}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: 500 }}>Total statutory & custom tasks</div>
        </a>

        {/* 2. My Assigned Tasks */}
        <a
          href="/tasks?tab=my"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textTransform: 'uppercase' }}>My Assigned Tasks</div>
            <span style={{ fontSize: 13, color: '#2563EB' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#2563EB', marginTop: 6 }}>{kpis.myAssigned || 0}</div>
          <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 4, fontWeight: 500 }}>Allocated directly to you</div>
        </a>

        {/* 3. Pending */}
        <a
          href="/tasks?tab=pending"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase' }}>Pending ●</div>
            <span style={{ fontSize: 13, color: '#F59E0B' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#F59E0B', marginTop: 6 }}>{kpis.pending || 0}</div>
          <div style={{ fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: 500 }}>Scheduled & assigned</div>
        </a>

        {/* 4. In Progress */}
        <a
          href="/tasks?tab=in_progress"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0284C7'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#0284C7', fontWeight: 600, textTransform: 'uppercase' }}>In Progress ◐</div>
            <span style={{ fontSize: 13, color: '#0284C7' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#0284C7', marginTop: 6 }}>{kpis.inProgress || 0}</div>
          <div style={{ fontSize: 11, color: '#0369A1', marginTop: 4, fontWeight: 500 }}>Execution in progress</div>
        </a>

        {/* 5. Awaiting Review */}
        <a
          href="/tasks?tab=submitted"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600, textTransform: 'uppercase' }}>Awaiting Review</div>
            <span style={{ fontSize: 13, color: '#8B5CF6' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#8B5CF6', marginTop: 6 }}>{kpis.submitted || 0}</div>
          <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 4, fontWeight: 500 }}>Submitted for four-eye approval</div>
        </a>

        {/* 6. Overdue */}
        <a
          href="/tasks?tab=overdue"
          style={{
            background: kpis.overdue > 0 ? '#FEF2F2' : '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: kpis.overdue > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#DC2626'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = kpis.overdue > 0 ? '#FCA5A5' : '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>⚠️ Overdue</div>
            <span style={{ fontSize: 13, color: '#DC2626' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#DC2626', marginTop: 6 }}>{kpis.overdue || 0}</div>
          <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 4, fontWeight: 600 }}>Past statutory due date</div>
        </a>

        {/* 7. Missed */}
        <a
          href="/tasks?tab=missed"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#881337'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(136, 19, 55, 0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#881337', fontWeight: 600, textTransform: 'uppercase' }}>✕ Missed</div>
            <span style={{ fontSize: 13, color: '#881337' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#881337', marginTop: 6 }}>{kpis.missed || 0}</div>
          <div style={{ fontSize: 11, color: '#9F1239', marginTop: 4, fontWeight: 500 }}>Grace period passed</div>
        </a>

        {/* 8. Completed */}
        <a
          href="/tasks?tab=completed"
          style={{
            background: '#FFF',
            padding: '18px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, textTransform: 'uppercase' }}>✓ Completed</div>
            <span style={{ fontSize: 13, color: '#10B981' }}>➔</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#10B981', marginTop: 6 }}>{kpis.completed || 0}</div>
          <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 500 }}>
            {kpis.totalTasks ? Math.round((kpis.completed / kpis.totalTasks) * 100) : 0}% completion rate
          </div>
        </a>
      </div>

      {/* Row: Firm Health Table & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Firm Summary & Health Score */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Firm Compliance Health Overview
            </h3>
            <a href="/firms" style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              View all firms →
            </a>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Organization</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Done</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Pending</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Overdue</th>
                <th style={{ padding: '10px 12px' }}>Health Score</th>
              </tr>
            </thead>
            <tbody>
              {firmSummary.map((firm: any) => {
                const health = getHealthScore(firm);
                return (
                  <tr key={firm.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px' }}>
                      <a href={`/firms/${firm.id}`} style={{ fontWeight: 600, color: '#0F172A', textDecoration: 'none' }}>
                        {firm.name}
                      </a>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{firm.legal_name}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{firm.total}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{firm.completed}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#F59E0B', fontWeight: 600 }}>{firm.pending}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: firm.overdue > 0 ? '#EF4444' : '#64748B', fontWeight: 600 }}>
                      {firm.overdue}
                    </td>
                    <td style={{ padding: '12px', width: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${health}%`,
                              height: '100%',
                              background: health > 75 ? '#10B981' : health > 50 ? '#F59E0B' : '#EF4444',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: health > 75 ? '#059669' : health > 50 ? '#D97706' : '#DC2626' }}>
                          {health}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Category Distribution */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>
            Compliance Categories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryDist.slice(0, 7).map((cat: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || '#3B82F6' }} />
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{cat.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{cat.count} tasks</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Today's Tasks & Upcoming Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Today's Tasks */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Due Today
            </h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>{todayTasks.length} tasks</span>
          </div>

          {todayTasks.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 13 }}>No statutory filings due today!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map((t: any) => (
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
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.compliance_name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{t.firm_name} • {t.period}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#FEF3C7', color: '#92400E' }}>
                    {t.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Tasks (Next 7 Days) */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Upcoming (Next 7 Days)
            </h3>
            <a href="/tasks" style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              View all tasks →
            </a>
          </div>

          {upcomingTasks.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🗓️</div>
              <div style={{ fontSize: 13 }}>No upcoming tasks for the next 7 days.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingTasks.slice(0, 5).map((t: any) => (
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
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.compliance_name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{t.firm_name} • Due: {t.due_date}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#EFF6FF', color: '#1D4ED8' }}>
                    {t.period || 'Upcoming'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
