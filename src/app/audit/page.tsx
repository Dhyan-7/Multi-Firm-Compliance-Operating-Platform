'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchAuditLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  const filtered = logs.filter(l => {
    const matchesSearch =
      (l.user_name && l.user_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.action && l.action.toLowerCase().includes(search.toLowerCase())) ||
      (l.entity_name && l.entity_name.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  return (
    <div>
      {/* Top Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '18px 24px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Immutable Regulatory Audit Trail
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
          Chronological, non-repudiable audit ledger recording all user logins, status modifications, reschedules, and filing approvals.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by user, action code, or entity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        />

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Action Types</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Audit Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading audit ledger...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No audit records match filters</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px' }}>Timestamp</th>
                <th style={{ padding: '12px' }}>Acting User</th>
                <th style={{ padding: '12px' }}>Action</th>
                <th style={{ padding: '12px' }}>Entity Type</th>
                <th style={{ padding: '12px' }}>Entity Details</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', color: '#64748B', fontSize: 12 }}>
                    {new Date(l.created_at).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                    {l.user_name || 'System Engine'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 11, background: '#F1F5F9', padding: '3px 8px', borderRadius: 4, fontWeight: 600, color: '#1E293B' }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'capitalize', color: '#475569' }}>
                    {l.entity_type}
                  </td>
                  <td style={{ padding: '12px', color: '#334155' }}>
                    {l.entity_name || l.entity_id || 'System Event'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedLog(l)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: '#2563EB',
                        fontWeight: 600,
                      }}
                    >
                      Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ width: '100%', maxWidth: 540, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              Audit Entry Inspection
            </h3>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
              Action: <strong>{selectedLog.action}</strong> • User: <strong>{selectedLog.user_name}</strong>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Old State Data:</div>
              <pre style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto', border: '1px solid #E2E8F0' }}>
                {selectedLog.old_data || 'null (Newly created)'}
              </pre>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>New State Data:</div>
              <pre style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto', border: '1px solid #E2E8F0' }}>
                {selectedLog.new_data || 'null'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: '#0F172A', color: '#FFF', padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
