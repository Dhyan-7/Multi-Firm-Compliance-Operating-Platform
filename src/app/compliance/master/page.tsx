'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function ComplianceMasterPage() {
  const { token } = useAuth();
  const [compliances, setCompliances] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Add Compliance Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newComp, setNewComp] = useState({
    name: '',
    code: '',
    category_id: 'cat_01',
    authority: 'CBIC',
    frequency: 'Monthly',
    due_date_rule: '20th of next month',
    priority: 'high',
    description: '',
  });
  const [savingComp, setSavingComp] = useState(false);

  const fetchCompliances = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/compliances', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompliances(data.compliances || []);
      }
    } catch (err) {
      console.error('Fetch compliances error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliances();
    if (token) {
      fetch('/api/compliance-categories', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(d => setCategories(d.categories || []))
        .catch(console.error);
    }
  }, [token]);

  const handleCreateCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingComp(true);
    try {
      const res = await fetch('/api/compliances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newComp),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setNewComp({
          name: '',
          code: '',
          category_id: 'cat_01',
          authority: 'CBIC',
          frequency: 'Monthly',
          due_date_rule: '20th of next month',
          priority: 'high',
          description: '',
        });
        fetchCompliances();
      }
    } catch (err) {
      console.error('Create compliance error:', err);
    } finally {
      setSavingComp(false);
    }
  };

  const filtered = compliances.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.authority && c.authority.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || c.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
            Master Compliance Library ({compliances.length})
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Comprehensive database of Indian statutory regulations across GST, Direct Tax, MCA, Labour, and Governance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/compliance/categories"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              textDecoration: 'none',
            }}
          >
            🏷️ Categories
          </a>
          <button
            onClick={() => setAddModalOpen(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#3B82F6',
              color: '#FFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add New Compliance
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by compliance name, form code, or regulatory authority..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        />

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Library Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading statutory master library...</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px' }}>Code</th>
                <th style={{ padding: '12px' }}>Statutory Compliance</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>Authority</th>
                <th style={{ padding: '12px' }}>Frequency</th>
                <th style={{ padding: '12px' }}>Due Date Formula</th>
                <th style={{ padding: '12px' }}>Priority</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>{c.code}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, color: '#334155' }}>
                      {c.category_name}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{c.authority}</td>
                  <td style={{ padding: '12px' }}>{c.frequency}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.due_date_rule}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', color: c.priority === 'high' ? '#DC2626' : '#2563EB' }}>
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
        )}
      </div>

      {/* Add Compliance Modal */}
      {addModalOpen && (
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
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              Add New Statutory Compliance
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
              Define regulatory filing parameters and recurring schedule formula.
            </p>

            <form onSubmit={handleCreateCompliance}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Compliance Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newComp.name}
                    onChange={e => setNewComp({ ...newComp, name: e.target.value })}
                    placeholder="e.g. GSTR-3B Summary Return"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Statutory Form / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newComp.code}
                    onChange={e => setNewComp({ ...newComp, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. GSTR-3B"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={newComp.category_id}
                    onChange={e => setNewComp({ ...newComp, category_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Regulatory Authority
                  </label>
                  <input
                    type="text"
                    value={newComp.authority}
                    onChange={e => setNewComp({ ...newComp, authority: e.target.value })}
                    placeholder="e.g. CBIC, CBDT, MCA"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Filing Frequency
                  </label>
                  <select
                    value={newComp.frequency}
                    onChange={e => setNewComp({ ...newComp, frequency: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Due Date Rule Description
                  </label>
                  <input
                    type="text"
                    value={newComp.due_date_rule}
                    onChange={e => setNewComp({ ...newComp, due_date_rule: e.target.value })}
                    placeholder="e.g. 20th of the following month"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingComp}
                  style={{
                    background: '#3B82F6',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    cursor: savingComp ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingComp ? 'Saving...' : 'Add to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
