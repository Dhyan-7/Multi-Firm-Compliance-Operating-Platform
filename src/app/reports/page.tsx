'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function ReportsPage() {
  const { token } = useAuth();
  const [reportType, setReportType] = useState('compliance');
  const [firmFilter, setFirmFilter] = useState('all');
  const [firmsList, setFirmsList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'compliance', label: '1. Monthly Compliance Report', desc: 'Monthly filing status across all entities' },
    { id: 'firm', label: '2. Firm-wise Performance Report', desc: 'Health score and comparative firm performance' },
    { id: 'department', label: '3. Department Performance Report', desc: 'Workload and completion rates by department' },
    { id: 'user', label: '4. User & Executive Productivity', desc: 'Task counts, timeliness, and user performance' },
    { id: 'overdue', label: '5. Overdue Compliance Audit', desc: 'All overdue filings requiring immediate remediation' },
    { id: 'missed', label: '6. Missed Compliance Exposure', desc: 'Statutory filings past grace period with risk ratings' },
    { id: 'completed', label: '7. Completed Filings Register', desc: 'Historical record of filed returns and challans' },
    { id: 'pending', label: '8. Pending Upcoming Filings', desc: 'Upcoming pipeline of obligations across entities' },
    { id: 'category', label: '9. Category-wise Analysis', desc: 'Distribution across GST, TDS, Income Tax, MCA' },
    { id: 'documents', label: '10. Document Submission Audit', desc: 'Verification of supporting receipts and challans' },
  ];

  useEffect(() => {
    if (!token) return;
    fetch('/api/firms', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setFirmsList(d.firms || []))
      .catch(console.error);
  }, [token]);

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        type: reportType,
        firm_id: firmFilter,
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
  }, [token, reportType, firmFilter]);

  const handleDownload = (format: 'xlsx' | 'pdf' | 'csv') => {
    if (!token) return;
    const url = `/api/reports/export?format=${format}&type=${reportType}&firm_id=${firmFilter}`;
    window.open(url, '_blank');
  };

  const rows = reportData?.data || [];
  const summary = reportData?.summary || {};

  return (
    <div>
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Compliance Intelligence & Statutory Reports
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Generate 10 multi-dimensional statutory compliance reports with export to Excel, PDF, and CSV.
          </p>
        </div>

        {/* Real Export Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
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
            📊 Export to Excel (.xlsx)
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
            📑 Export to PDF
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
            📋 CSV
          </button>
        </div>
      </div>

      {/* Main Layout: Left Report Selector, Right Report Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left Report Menu */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
            AVAILABLE REPORT TEMPLATES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reportTypes.map(r => (
              <button
                key={r.id}
                onClick={() => setReportType(r.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: reportType === r.id ? '#EFF6FF' : 'transparent',
                  color: reportType === r.id ? '#2563EB' : '#334155',
                  cursor: 'pointer',
                  borderLeft: reportType === r.id ? '3px solid #2563EB' : '3px solid transparent',
                }}
              >
                <div style={{ fontWeight: reportType === r.id ? 700 : 600, fontSize: 13 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{r.desc}</div>
              </button>
            ))}
          </div>

          {/* Firm Filter inside sidebar */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Filter by Organization:
            </label>
            <select
              value={firmFilter}
              onChange={e => setFirmFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
            >
              <option value="all">All Organizations</option>
              {firmsList.map(f => (
                <option key={f.id} value={f.id}>{f.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Report Content */}
        <div>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#FFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Scope Records</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{summary.total || rows.length}</div>
            </div>

            <div style={{ background: '#FFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>{summary.completed || 0}</div>
            </div>

            <div style={{ background: '#FFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase' }}>Pending / In Progress</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>{summary.pending || 0}</div>
            </div>

            <div style={{ background: '#FFF', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, textTransform: 'uppercase' }}>Overdue & Missed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginTop: 4 }}>{summary.overdue || 0}</div>
            </div>
          </div>

          {/* Report Data Table */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: '#64748B', fontSize: 13 }}>Compiling report analytics...</div>
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No report records found</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '12px' }}>Organization</th>
                    <th style={{ padding: '12px' }}>Statutory Obligation</th>
                    <th style={{ padding: '12px' }}>Period</th>
                    <th style={{ padding: '12px' }}>Due Date</th>
                    <th style={{ padding: '12px' }}>Responsible</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{r.firm_name || r.name}</td>
                      <td style={{ padding: '12px' }}>{r.compliance_name || r.title || r.code}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{r.period || 'Annual'}</td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{r.due_date || 'N/A'}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{r.assignee_name || 'Staff'}</td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background:
                              r.status === 'completed'
                                ? '#D1FAE5'
                                : r.status === 'overdue'
                                ? '#FEE2E2'
                                : '#FEF3C7',
                            color:
                              r.status === 'completed'
                                ? '#065F46'
                                : r.status === 'overdue'
                                ? '#991B1B'
                                : '#92400E',
                          }}
                        >
                          {r.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
