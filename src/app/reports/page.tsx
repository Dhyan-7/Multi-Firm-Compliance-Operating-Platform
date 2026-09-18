'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';
import Link from 'next/link';

export default function ReportsPage() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('compliance');
  const [firmFilter, setFirmFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const [firmsList, setFirmsList] = useState<any[]>([]);
  const [deptList, setDeptList] = useState<any[]>([]);
  const [catList, setCatList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deadlineTab, setDeadlineTab] = useState<'today' | 'soon' | 'overdue' | 'missed'>('today');

  const reportTypes = [
    { id: 'compliance', label: '1. Compliance Master Overview', desc: 'Overall health & status breakdown by entity' },
    { id: 'firm', label: '2. Organization Performance', desc: 'Entity-level compliance scores & task status' },
    { id: 'department', label: '3. Department Workload & Performance', desc: 'Task counts & completion rates by department' },
    { id: 'user', label: '4. User & Executive Productivity', desc: 'Staff workload, assigned filings & resolution rate' },
    { id: 'overdue', label: '5. Overdue Filings Audit', desc: 'All statutory filings past due date' },
    { id: 'missed', label: '6. Missed Compliance Exposure', desc: 'Statutory filings past grace period with risk ratings' },
    { id: 'completed', label: '7. Completed Filings Register', desc: 'Historical archive of submitted returns & challans' },
    { id: 'pending', label: '8. Upcoming Pipeline', desc: 'Pending & in-progress filings pipeline' },
    { id: 'category', label: '9. Category-wise Analysis', desc: 'Distribution across GST, TDS, Income Tax, MCA' },
    { id: 'documents', label: '10. Document Submission Audit', desc: 'Verification of supporting receipts and challans' },
  ];

  useEffect(() => {
    if (!token) return;
    fetch('/api/firms', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setFirmsList(d.firms || []))
      .catch(console.error);

    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setDeptList(d.departments || []))
      .catch(console.error);

    fetch('/api/compliance-categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setCatList(d.categories || []))
      .catch(console.error);
  }, [token]);

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        type: reportType,
        firm_id: firmFilter,
        department_id: deptFilter,
        category_id: catFilter,
      });

      const res = await fetch(`/api/reports?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token, reportType, firmFilter, deptFilter, catFilter]);

  const handleDownload = (format: 'xlsx' | 'pdf' | 'csv') => {
    if (!token) return;
    const url = `/api/reports/export?format=${format}&type=${reportType}&firm_id=${firmFilter}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  const rows = reportData?.data || [];
  const summary = reportData?.summary || { total: 0, completed: 0, pending: 0, overdue: 0, missed: 0, healthScore: 0 };
  const upcoming = reportData?.upcomingDeadlines || { dueToday: [], dueSoon: [], overdue: [], missed: [] };

  const currentDeadlines =
    deadlineTab === 'today'
      ? upcoming.dueToday
      : deadlineTab === 'soon'
      ? upcoming.dueSoon
      : deadlineTab === 'overdue'
      ? upcoming.overdue
      : upcoming.missed;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Compliance Intelligence & Statutory Reports
            </h2>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            Real-time regulatory analytics, organization performance, upcoming statutory deadlines, and multi-format exports.
          </p>
        </div>

        {/* Real Export Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDownload('xlsx')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #10B981',
              background: '#ECFDF5',
              color: '#065F46',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📊 Export Excel (.xlsx)
          </button>

          <button
            onClick={() => handleDownload('pdf')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #EF4444',
              background: '#FEF2F2',
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📑 Export PDF
          </button>

          <button
            onClick={() => handleDownload('csv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📋 Export CSV
          </button>
        </div>
      </div>

      {/* Interactive KPI Cards (Clickable - links to Tasks with tab filtered) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <Link
          href="/tasks?tab=all"
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Scope Tasks
            </span>
            <span style={{ fontSize: 16 }}>📋</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 8 }}>{summary.total}</div>
          <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, marginTop: 4 }}>Click to view all tasks →</div>
        </Link>

        <Link
          href="/tasks?tab=completed"
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #10B981',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Completed Filings
            </span>
            <span style={{ fontSize: 16 }}>✅</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#10B981', marginTop: 8 }}>{summary.completed}</div>
          <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 4 }}>
            {summary.total > 0 ? `${Math.round((summary.completed / summary.total) * 100)}% filed` : '0% filed'} →
          </div>
        </Link>

        <Link
          href="/tasks?tab=pending"
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #F59E0B',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending / In Progress
            </span>
            <span style={{ fontSize: 16 }}>⏳</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B', marginTop: 8 }}>{summary.pending}</div>
          <div style={{ fontSize: 11, color: '#D97706', fontWeight: 600, marginTop: 4 }}>Click to view pending →</div>
        </Link>

        <Link
          href="/tasks?tab=overdue"
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #EF4444',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overdue Filings
            </span>
            <span style={{ fontSize: 16 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#EF4444', marginTop: 8 }}>{summary.overdue}</div>
          <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>Needs immediate attention →</div>
        </Link>

        <Link
          href="/tasks?tab=missed"
          style={{
            background: '#FFFFFF',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            borderLeft: '4px solid #881337',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9F1239', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Missed Past Grace
            </span>
            <span style={{ fontSize: 16 }}>🚨</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#881337', marginTop: 8 }}>{summary.missed}</div>
          <div style={{ fontSize: 11, color: '#9F1239', fontWeight: 600, marginTop: 4 }}>High statutory exposure →</div>
        </Link>
      </div>

      {/* Upcoming Statutory Deadlines Section */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              📅 Upcoming Statutory Deadlines & Critical Watchlist
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
              Proactively identify obligations due today, upcoming in 7 days, or breached.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, background: '#F1F5F9', padding: 4, borderRadius: 8 }}>
            <button
              onClick={() => setDeadlineTab('today')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: deadlineTab === 'today' ? '#FFFFFF' : 'transparent',
                color: deadlineTab === 'today' ? '#0F172A' : '#64748B',
                fontWeight: deadlineTab === 'today' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: deadlineTab === 'today' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Due Today ({upcoming.dueToday?.length || 0})
            </button>
            <button
              onClick={() => setDeadlineTab('soon')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: deadlineTab === 'soon' ? '#FFFFFF' : 'transparent',
                color: deadlineTab === 'soon' ? '#0F172A' : '#64748B',
                fontWeight: deadlineTab === 'soon' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: deadlineTab === 'soon' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Due in Next 7 Days ({upcoming.dueSoon?.length || 0})
            </button>
            <button
              onClick={() => setDeadlineTab('overdue')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: deadlineTab === 'overdue' ? '#FFFFFF' : 'transparent',
                color: deadlineTab === 'overdue' ? '#DC2626' : '#64748B',
                fontWeight: deadlineTab === 'overdue' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: deadlineTab === 'overdue' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Overdue Watchlist ({upcoming.overdue?.length || 0})
            </button>
            <button
              onClick={() => setDeadlineTab('missed')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: deadlineTab === 'missed' ? '#FFFFFF' : 'transparent',
                color: deadlineTab === 'missed' ? '#881337' : '#64748B',
                fontWeight: deadlineTab === 'missed' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: deadlineTab === 'missed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Missed ({upcoming.missed?.length || 0})
            </button>
          </div>
        </div>

        {currentDeadlines.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 8, color: '#64748B', fontSize: 13 }}>
            ✓ No deadlines found in this category. All systems clear.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px 12px' }}>Task #</th>
                  <th style={{ padding: '10px 12px' }}>Organization</th>
                  <th style={{ padding: '10px 12px' }}>Statutory Obligation</th>
                  <th style={{ padding: '10px 12px' }}>Due Date</th>
                  <th style={{ padding: '10px 12px' }}>Assignee (Dept)</th>
                  <th style={{ padding: '10px 12px' }}>Priority</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentDeadlines.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563EB' }}>
                      <Link href={`/tasks/${t.id}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                        {t.task_number}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{t.firm_name}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{t.compliance_name}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: deadlineTab === 'overdue' || deadlineTab === 'missed' ? '#DC2626' : '#0F172A' }}>
                      {t.due_date}
                      {t.days_overdue !== undefined && (
                        <span style={{ fontSize: 10, color: '#DC2626', marginLeft: 6 }}>({t.days_overdue}d overdue)</span>
                      )}
                      {t.days_remaining !== undefined && (
                        <span style={{ fontSize: 10, color: '#D97706', marginLeft: 6 }}>({t.days_remaining}d left)</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {t.assignee_name} <span style={{ color: '#94A3B8' }}>({t.department_name})</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          background: t.priority === 'critical' ? '#FEE2E2' : t.priority === 'high' ? '#FEF3C7' : '#F1F5F9',
                          color: t.priority === 'critical' ? '#991B1B' : t.priority === 'high' ? '#92400E' : '#475569',
                        }}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <Link
                        href={`/tasks/${t.id}`}
                        style={{
                          background: '#EFF6FF',
                          color: '#2563EB',
                          padding: '4px 10px',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Open Workspace →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Layout: Left Report Selector, Right Report Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Left Report Menu & Multi-Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
              AVAILABLE REPORT TEMPLATES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {reportTypes.map(r => (
                <button
                  key={r.id}
                  onClick={() => setReportType(r.id)}
                  style={{
                    textAlign: 'left',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: reportType === r.id ? '#EFF6FF' : 'transparent',
                    color: reportType === r.id ? '#2563EB' : '#334155',
                    cursor: 'pointer',
                    borderLeft: reportType === r.id ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ fontWeight: reportType === r.id ? 700 : 600, fontSize: 13 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Multi-Filters Card */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
              REPORT FILTERS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Organization:
                </label>
                <select
                  value={firmFilter}
                  onChange={e => setFirmFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFF' }}
                >
                  <option value="all">All Organizations</option>
                  {firmsList.map(f => (
                    <option key={f.id} value={f.id}>{f.display_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Department:
                </label>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFF' }}
                >
                  <option value="all">All Departments</option>
                  {deptList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Statutory Category:
                </label>
                <select
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFF' }}
                >
                  <option value="all">All Categories</option>
                  {catList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {(firmFilter !== 'all' || deptFilter !== 'all' || catFilter !== 'all') && (
                <button
                  onClick={() => {
                    setFirmFilter('all');
                    setDeptFilter('all');
                    setCatFilter('all');
                  }}
                  style={{
                    marginTop: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#64748B',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Report Content */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {reportTypes.find(r => r.id === reportType)?.label}
              </h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                Showing {rows.length} records matching current criteria.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ color: '#64748B', fontSize: 13 }}>Compiling report analytics...</div>
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No report records found</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Try adjusting your filters or selecting another template.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Dynamic Table Rendering based on Report Type */}
              {(reportType === 'compliance' || reportType === 'firm') && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px' }}>Organization</th>
                      <th style={{ padding: '12px 16px' }}>PAN / GSTIN</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Tasks</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Health Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <Link href={`/firms/${r.id}`} style={{ color: '#0F172A', textDecoration: 'none' }}>
                            {r.firm_name}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12 }}>
                          {r.pan ? `PAN: ${r.pan}` : ''} {r.gstin ? `| GSTIN: ${r.gstin}` : ''}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{r.total}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{r.completed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#F59E0B', fontWeight: 700 }}>{r.pending}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: r.overdue > 0 ? '#EF4444' : '#64748B', fontWeight: 700 }}>{r.overdue}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: (r.health || 0) >= 80 ? '#ECFDF5' : (r.health || 0) >= 50 ? '#FEF3C7' : '#FEF2F2',
                              color: (r.health || 0) >= 80 ? '#065F46' : (r.health || 0) >= 50 ? '#92400E' : '#991B1B',
                            }}
                          >
                            {r.health || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'department' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px' }}>Department</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Filings</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{r.department_name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{r.total}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{r.completed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#F59E0B', fontWeight: 700 }}>{r.pending}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: r.overdue > 0 ? '#EF4444' : '#64748B', fontWeight: 700 }}>{r.overdue}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: (r.completion_rate || 0) >= 80 ? '#ECFDF5' : '#FEF3C7',
                              color: (r.completion_rate || 0) >= 80 ? '#065F46' : '#92400E',
                            }}
                          >
                            {r.completion_rate || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'user' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px' }}>User</th>
                      <th style={{ padding: '12px 16px' }}>Department</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Assigned Filings</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{r.user_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.department_name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{r.total}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{r.completed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#F59E0B', fontWeight: 700 }}>{r.pending}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: r.overdue > 0 ? '#EF4444' : '#64748B', fontWeight: 700 }}>{r.overdue}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: (r.completion_rate || 0) >= 80 ? '#ECFDF5' : '#FEF3C7',
                              color: (r.completion_rate || 0) >= 80 ? '#065F46' : '#92400E',
                            }}
                          >
                            {r.completion_rate || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'category' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Obligation Tasks</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overdue</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                          <span style={{ marginRight: 8 }}>{r.icon || '📋'}</span>
                          {r.name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{r.total}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{r.completed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#F59E0B', fontWeight: 700 }}>{r.pending}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: r.overdue > 0 ? '#EF4444' : '#64748B', fontWeight: 700 }}>{r.overdue}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 700,
                              background: (r.completion_rate || 0) >= 80 ? '#ECFDF5' : '#FEF3C7',
                              color: (r.completion_rate || 0) >= 80 ? '#065F46' : '#92400E',
                            }}
                          >
                            {r.completion_rate || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Task-level reports: overdue, missed, completed, pending, documents */}
              {['overdue', 'missed', 'completed', 'pending', 'documents'].includes(reportType) && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '12px 16px' }}>Task #</th>
                      <th style={{ padding: '12px 16px' }}>Organization</th>
                      <th style={{ padding: '12px 16px' }}>Statutory Obligation</th>
                      <th style={{ padding: '12px 16px' }}>Period</th>
                      <th style={{ padding: '12px 16px' }}>Due Date</th>
                      <th style={{ padding: '12px 16px' }}>Assignee (Dept)</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563EB' }}>
                          <Link href={`/tasks/${r.id}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                            {r.task_number}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{r.firm_name}</td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          {r.compliance_name} {r.code ? `(${r.code})` : ''}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.period || 'Annual'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: r.days_overdue ? '#DC2626' : '#0F172A' }}>
                          {r.due_date}
                          {r.days_overdue !== undefined && (
                            <span style={{ fontSize: 11, color: '#DC2626', marginLeft: 4 }}>({r.days_overdue}d late)</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {r.assignee_name} <span style={{ color: '#94A3B8' }}>({r.department_name})</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 12,
                              textTransform: 'uppercase',
                              background:
                                r.status === 'completed'
                                  ? '#D1FAE5'
                                  : r.status === 'overdue' || r.days_overdue
                                  ? '#FEE2E2'
                                  : '#FEF3C7',
                              color:
                                r.status === 'completed'
                                  ? '#065F46'
                                  : r.status === 'overdue' || r.days_overdue
                                  ? '#991B1B'
                                  : '#92400E',
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Link
                            href={`/tasks/${r.id}`}
                            style={{
                              background: '#EFF6FF',
                              color: '#2563EB',
                              padding: '5px 12px',
                              borderRadius: 6,
                              textDecoration: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
