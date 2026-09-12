'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function FirmsPage() {
  const { token } = useAuth();
  const [firms, setFirms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const fetchFirms = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/firms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFirms(data.firms || []);
      }
    } catch (err) {
      console.error('Fetch firms error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirms();
  }, [token]);

  const filteredFirms = firms.filter((f) => {
    const matchesSearch =
      f.display_name.toLowerCase().includes(search.toLowerCase()) ||
      f.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.pan && f.pan.toLowerCase().includes(search.toLowerCase())) ||
      (f.gstin && f.gstin.toLowerCase().includes(search.toLowerCase()));

    const matchesEntity =
      entityFilter === 'all' || f.entity_type_code === entityFilter || f.entity_type_name === entityFilter;

    return matchesSearch && matchesEntity;
  });

  return (
    <div>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: '#FFFFFF',
          padding: '18px 24px',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Registered Firms & Entities
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Manage entity profiles, statutory registrations, compliance applicability, and calendars.
          </p>
        </div>

        <a
          href="/firms/new"
          style={{
            background: '#3B82F6',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
          }}
        >
          <span>+</span>
          <span>Add New Firm (5-Step Wizard)</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by firm name, PAN, GSTIN, or CIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 14,
              color: '#0F172A',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 14,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Entity Types</option>
          <option value="pvt_ltd">Private Limited</option>
          <option value="llp">LLP</option>
          <option value="proprietorship">Proprietorship</option>
          <option value="pub_ltd">Public Limited</option>
        </select>
      </div>

      {/* Firms Grid */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading firms...</div>
        </div>
      ) : filteredFirms.length === 0 ? (
        <div style={{ background: '#FFF', padding: 48, textAlign: 'center', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
          <h3 style={{ fontSize: 16, color: '#0F172A', margin: 0 }}>No firms found</h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 18px' }}>
            No registered organizations match your search or filter.
          </p>
          <a
            href="/firms/new"
            style={{
              background: '#3B82F6',
              color: '#FFF',
              padding: '8px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Create First Firm
          </a>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {filteredFirms.map((firm) => {
            const health = firm.stats?.healthScore ?? 85;
            return (
              <div
                key={firm.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                <div>
                  {/* Top row: Title & Entity Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        {firm.display_name}
                      </h3>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{firm.legal_name}</div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: '#EFF6FF',
                        color: '#2563EB',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {firm.entity_type_name || 'Organization'}
                    </span>
                  </div>

                  {/* Registrations pill row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 16px' }}>
                    {firm.pan && (
                      <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
                        PAN: <strong>{firm.pan}</strong>
                      </span>
                    )}
                    {firm.gstin && (
                      <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
                        GSTIN: <strong>{firm.gstin}</strong>
                      </span>
                    )}
                    {firm.cin_llpin && (
                      <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
                        CIN: <strong>{firm.cin_llpin}</strong>
                      </span>
                    )}
                  </div>

                  {/* Health score progress */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>Compliance Health</span>
                      <span style={{ fontWeight: 700, color: health > 75 ? '#059669' : health > 50 ? '#D97706' : '#DC2626' }}>
                        {health}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${health}%`,
                          height: '100%',
                          background: health > 75 ? '#10B981' : health > 50 ? '#F59E0B' : '#EF4444',
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      background: '#F8FAFC',
                      padding: '10px 8px',
                      borderRadius: 8,
                      textAlign: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{firm.stats?.total || 0}</div>
                      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Total</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>{firm.stats?.completed || 0}</div>
                      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Done</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{firm.stats?.pending || 0}</div>
                      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Pending</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: (firm.stats?.overdue || 0) > 0 ? '#EF4444' : '#64748B' }}>
                        {firm.stats?.overdue || 0}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase' }}>Overdue</div>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                  <a
                    href={`/firms/${firm.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '8px 0',
                      borderRadius: 6,
                      background: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Manage Firm →
                  </a>
                  <a
                    href={`/calendar?firm_id=${firm.id}`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#F8FAFC',
                      color: '#475569',
                      fontSize: 13,
                      border: '1px solid #E2E8F0',
                      textDecoration: 'none',
                    }}
                    title="View Firm Calendar"
                  >
                    📅
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
