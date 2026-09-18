'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './layout/AppLayout';

interface SearchResult {
  id: string;
  type: 'firm' | 'task' | 'compliance' | 'user' | 'department' | 'document';
  title: string;
  subtitle: string;
  status?: string;
  url: string;
}

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim() || !token) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const formatted: SearchResult[] = [];

          if (data.firms) {
            data.firms.forEach((f: any) => {
              formatted.push({
                id: f.id,
                type: 'firm',
                title: f.display_name,
                subtitle: `Legal: ${f.legal_name} | PAN: ${f.pan || 'N/A'} | GSTIN: ${f.gstin || 'N/A'}`,
                url: `/firms/${f.id}`,
              });
            });
          }

          if (data.tasks) {
            data.tasks.forEach((t: any) => {
              formatted.push({
                id: t.id,
                type: 'task',
                title: `${t.task_number}: ${t.compliance_name} (${t.period || ''})`,
                subtitle: `Firm: ${t.firm_name} | Due: ${t.due_date} | Assignee: ${t.assignee_name || 'Unassigned'}`,
                status: t.status,
                url: `/tasks/${t.id}`,
              });
            });
          }

          if (data.compliances) {
            data.compliances.forEach((c: any) => {
              formatted.push({
                id: c.id,
                type: 'compliance',
                title: c.name,
                subtitle: `Category: ${c.category_name || ''} | Code: ${c.code} | Authority: ${c.authority || 'N/A'}`,
                url: `/compliance/master`,
              });
            });
          }

          if (data.users) {
            data.users.forEach((u: any) => {
              formatted.push({
                id: u.id,
                type: 'user',
                title: u.name,
                subtitle: `Email: ${u.email} | Dept: ${u.department_name || 'General'} | Role: ${u.role_name || 'Staff'}`,
                url: `/users`,
              });
            });
          }

          if (data.departments) {
            data.departments.forEach((d: any) => {
              formatted.push({
                id: d.id,
                type: 'department',
                title: d.name,
                subtitle: `Department Head: ${d.head_name || 'Not assigned'}`,
                url: `/departments`,
              });
            });
          }

          if (data.documents) {
            data.documents.forEach((doc: any) => {
              formatted.push({
                id: doc.id,
                type: 'document',
                title: doc.file_name,
                subtitle: `Type: ${doc.document_type} | Firm: ${doc.firm_name || 'Organization Document'}`,
                url: `/documents`,
              });
            });
          }

          setResults(formatted);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, token]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'firm':
        return '🏢';
      case 'task':
        return '📋';
      case 'compliance':
        return '📜';
      case 'user':
        return '👤';
      case 'department':
        return '🏛️';
      case 'document':
        return '📁';
      default:
        return '🔍';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'firm':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'Organization' };
      case 'task':
        return { bg: '#ECFDF5', text: '#059669', label: 'Task' };
      case 'compliance':
        return { bg: '#F5F3FF', text: '#7C3AED', label: 'Statutory' };
      case 'user':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Staff' };
      case 'department':
        return { bg: '#F3E8FF', text: '#6B21A8', label: 'Department' };
      case 'document':
        return { bg: '#F1F5F9', text: '#334155', label: 'Document' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: 'Item' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search organizations, tasks, compliances, staff, documents... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#0F172A',
              fontWeight: 500,
            }}
          />
          {loading && (
            <div
              style={{
                width: 18,
                height: 18,
                border: '2px solid #E2E8F0',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '10px 12px' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Type an organization name, task #, compliance act, staff member, or document...
            </div>
          ) : results.length === 0 && !loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No matches found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((item) => {
              const badge = getTypeBadgeColor(item.type);
              return (
                <a
                  key={`${item.type}-${item.id}`}
                  href={item.url}
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#0F172A',
                    transition: 'background 0.15s',
                    marginBottom: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: badge.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {getTypeIcon(item.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.title}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: badge.bg,
                          color: badge.text,
                          textTransform: 'uppercase',
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                      {item.subtitle}
                    </div>
                  </div>
                  {item.status && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: item.status === 'completed' ? '#D1FAE5' : item.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: item.status === 'completed' ? '#065F46' : item.status === 'overdue' ? '#991B1B' : '#92400E',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {item.status}
                    </span>
                  )}
                </a>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #F1F5F9',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#94A3B8',
          }}
        >
          <div>
            Search across <span style={{ fontWeight: 600, color: '#64748B' }}>Firms, Tasks, Compliances, Users, Departments, Documents</span>
          </div>
          <div>ESC to close</div>
        </div>
      </div>
    </div>
  );
}
