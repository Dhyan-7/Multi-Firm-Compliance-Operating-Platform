'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './layout/AppLayout';

interface SearchResult {
  id: string;
  type: string;
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
          // Map to standard SearchResult format
          const formatted: SearchResult[] = [];

          if (data.firms) {
            data.firms.forEach((f: any) => {
              formatted.push({
                id: f.id,
                type: 'firm',
                title: f.display_name,
                subtitle: `Legal: ${f.legal_name} | PAN: ${f.pan || 'N/A'}`,
                url: `/firms/${f.id}`,
              });
            });
          }

          if (data.tasks) {
            data.tasks.forEach((t: any) => {
              formatted.push({
                id: t.id,
                type: 'task',
                title: `${t.compliance_name} (${t.period || ''})`,
                subtitle: `Firm: ${t.firm_name} | Due: ${t.due_date}`,
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
                subtitle: `Category: ${c.category_name || ''} | Code: ${c.code}`,
                url: `/compliance/master`,
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
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
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
            placeholder="Search firms, tasks, compliances, PAN, GSTIN... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 16,
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
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '10px 12px' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Type a firm name, statutory compliance code, or period to search...
            </div>
          ) : results.length === 0 && !loading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              No matches found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((item) => (
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
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: item.type === 'firm' ? '#EFF6FF' : item.type === 'task' ? '#ECFDF5' : '#F5F3FF',
                    color: item.type === 'firm' ? '#2563EB' : item.type === 'task' ? '#059669' : '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {item.type === 'firm' ? '🏢' : item.type === 'task' ? '📋' : '📜'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.subtitle}
                  </div>
                </div>
                {item.status && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: item.status === 'completed' ? '#D1FAE5' : item.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                      color: item.status === 'completed' ? '#065F46' : item.status === 'overdue' ? '#991B1B' : '#92400E',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.status}
                  </span>
                )}
              </a>
            ))
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
            Search across <span style={{ fontWeight: 600, color: '#64748B' }}>Firms, Compliances, Tasks</span>
          </div>
          <div>ESC to close</div>
        </div>
      </div>
    </div>
  );
}
