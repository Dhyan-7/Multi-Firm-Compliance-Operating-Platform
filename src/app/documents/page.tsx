'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function DocumentsVaultPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFirm, setSelectedFirm] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  const fetchDocuments = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedFirm !== 'all') query.set('firm_id', selectedFirm);
      if (selectedCategory !== 'all') query.set('category_id', selectedCategory);
      if (search) query.set('search', search);

      const res = await fetch(`/api/documents?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setFirms(data.firms || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token, selectedFirm, selectedCategory, search]);

  return (
    <div>
      {/* Header bar */}
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
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Centralized Statutory Document Vault
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Permanent repository of tax challans, acknowledgement receipts, and signed regulatory filings.
          </p>
        </div>
      </div>

      {/* Main Layout: Left Folder Tree, Right Documents Grid/Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Left Organization Tree Filter */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 18, height: 'fit-content' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
            ORGANIZATIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setSelectedFirm('all')}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: selectedFirm === 'all' ? '#EFF6FF' : 'transparent',
                color: selectedFirm === 'all' ? '#2563EB' : '#334155',
                fontWeight: selectedFirm === 'all' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🏢 All Organizations
            </button>

            {firms.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFirm(f.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: selectedFirm === f.id ? '#EFF6FF' : 'transparent',
                  color: selectedFirm === f.id ? '#2563EB' : '#334155',
                  fontWeight: selectedFirm === f.id ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                📁 {f.display_name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '20px 0 12px' }}>
            CATEGORIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                textAlign: 'left',
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: selectedCategory === 'all' ? '#EFF6FF' : 'transparent',
                color: selectedCategory === 'all' ? '#2563EB' : '#334155',
                fontWeight: selectedCategory === 'all' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              All Categories
            </button>

            {categories.slice(0, 8).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: selectedCategory === c.id ? '#EFF6FF' : 'transparent',
                  color: selectedCategory === c.id ? '#2563EB' : '#334155',
                  fontWeight: selectedCategory === c.id ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {c.icon || '🏷️'} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Documents List */}
        <div>
          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search documents by filename, challan reference, or compliance..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: '#64748B', fontSize: 13 }}>Loading documents...</div>
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
                <h3 style={{ fontSize: 16, color: '#0F172A', margin: 0 }}>No documents found</h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0' }}>
                  Upload challans or filings through the Task Detail Workspace.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '12px' }}>Document Name</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Organization</th>
                    <th style={{ padding: '12px' }}>Compliance & Period</th>
                    <th style={{ padding: '12px' }}>Size</th>
                    <th style={{ padding: '12px' }}>Uploaded By</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <span style={{ fontWeight: 600, color: '#0F172A' }}>{d.file_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, color: '#334155' }}>
                          {d.document_type || 'Filing'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{d.firm_name}</td>
                      <td style={{ padding: '12px' }}>
                        <div>{d.compliance_name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{d.period}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{(d.file_size / 1024).toFixed(1)} KB</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{d.uploader_name || 'Staff'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <a
                          href={`/api/documents/${d.id}/download`}
                          style={{
                            padding: '5px 12px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Download ⬇
                        </a>
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
