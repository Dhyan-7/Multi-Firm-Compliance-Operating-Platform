'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';
import { formatISTDateTime } from '@/lib/dateUtils';

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
        setLogs(data.auditLogs || data.logs || []);
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
      (l.entity_name && l.entity_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.entity_type && l.entity_type.toLowerCase().includes(search.toLowerCase()));

    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  const formatJson = (data: any) => {
    if (!data) return 'None (Initial State)';
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REJECT')) return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
    if (action.includes('CREATE') || action.includes('APPROVED')) return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
    if (action.includes('RESCHEDULE') || action.includes('DATE')) return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
    if (action.includes('REASSIGN') || action.includes('TRANSFER')) return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
    return { bg: '#F8FAFC', text: '#334155', border: '#E2E8F0' };
  };

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Immutable Regulatory Audit Trail
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Chronological, non-repudiable audit ledger recording all statutory filings, status changes, reschedules, reassignments, and administrative actions with IST timestamps.
          </p>
        </div>

        <div style={{ fontSize: 12, color: '#475569', background: '#F1F5F9', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
          Timezone: Indian Standard Time (IST)
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by user, action code, or entity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 260, padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        />

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Action Types ({logs.length})</option>
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
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No audit records match filters</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Adjust your search query or action filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp (IST)</th>
                  <th style={{ padding: '12px 16px' }}>Acting User</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                  <th style={{ padding: '12px 16px' }}>Target Entity</th>
                  <th style={{ padding: '12px 16px' }}>Entity Details</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Audit Diff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const badge = getActionBadgeColor(l.action);
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatISTDateTime(l.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>
                        {l.user_name || 'System Engine'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontWeight: 700,
                            display: 'inline-block',
                          }}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>
                        {l.entity_type}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.entity_name || l.entity_id || 'System Event'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedLog(l)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            background: '#F8FAFC',
                            fontSize: 12,
                            cursor: 'pointer',
                            color: '#2563EB',
                            fontWeight: 600,
                          }}
                        >
                          Inspect Diff →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          <div style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Audit Entry Inspection
                </h3>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Action: <strong style={{ color: '#0F172A' }}>{selectedLog.action}</strong> • User: <strong style={{ color: '#0F172A' }}>{selectedLog.user_name || 'System'}</strong> • IST: <strong>{formatISTDateTime(selectedLog.created_at)}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                  Previous / Old State Data:
                </div>
                <pre style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, fontSize: 12, overflowX: 'auto', border: '1px solid #E2E8F0', color: '#334155', maxHeight: 180 }}>
                  {formatJson(selectedLog.old_data)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                  New State / Modification Data:
                </div>
                <pre style={{ background: '#F0FDF4', padding: 14, borderRadius: 8, fontSize: 12, overflowX: 'auto', border: '1px solid #BBF7D0', color: '#166534', maxHeight: 220 }}>
                  {formatJson(selectedLog.new_data)}
                </pre>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: '#0F172A', color: '#FFF', padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
