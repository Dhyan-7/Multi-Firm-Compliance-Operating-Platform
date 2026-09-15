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
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');

  // Add / Edit Compliance Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [compForm, setCompForm] = useState({
    id: '',
    name: '',
    code: '',
    category_id: 'cat_01',
    authority: 'CBIC',
    frequency: 'Monthly',
    due_day: 20,
    due_date_rule: '20th of next month',
    grace_period_days: 0,
    priority: 'high',
    regulatory_reference: '',
    notes: '',
    description: '',
    status: 'active',
  });
  const [savingComp, setSavingComp] = useState(false);
  const [notice, setNotice] = useState('');

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

  const openAddModal = () => {
    setCompForm({
      id: '',
      name: '',
      code: '',
      category_id: categories[0]?.id || 'cat_01',
      authority: 'CBIC',
      frequency: 'Monthly',
      due_day: 20,
      due_date_rule: '20th of next month',
      grace_period_days: 0,
      priority: 'high',
      regulatory_reference: '',
      notes: '',
      description: '',
      status: 'active',
    });
    setModalMode('add');
  };

  const openEditModal = (c: any) => {
    setCompForm({
      id: c.id,
      name: c.name || '',
      code: c.code || '',
      category_id: c.category_id || (categories[0]?.id || 'cat_01'),
      authority: c.authority || '',
      frequency: c.frequency || 'Monthly',
      due_day: c.due_day || 20,
      due_date_rule: c.due_date_rule || '',
      grace_period_days: c.grace_period_days || 0,
      priority: c.priority || 'medium',
      regulatory_reference: c.regulatory_reference || '',
      notes: c.notes || '',
      description: c.description || '',
      status: c.status || 'active',
    });
    setModalMode('edit');
  };

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingComp(true);
    setNotice('');
    try {
      const url = '/api/compliances';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(compForm),
      });

      const data = await res.json();
      if (res.ok) {
        setNotice(modalMode === 'edit' ? 'Compliance updated successfully' : 'Compliance added to library');
        setModalMode(null);
        fetchCompliances();
      } else {
        alert(data.error || 'Failed to save compliance');
      }
    } catch (err) {
      console.error('Save compliance error:', err);
    } finally {
      setSavingComp(false);
    }
  };

  const handleToggleStatus = async (c: any) => {
    if (!token) return;
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/compliances', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: c.id, status: newStatus }),
      });
      if (res.ok) {
        setCompliances(prev =>
          prev.map(item => (item.id === c.id ? { ...item, status: newStatus } : item))
        );
        setNotice(`Compliance "${c.name}" marked as ${newStatus}.`);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleDeleteCompliance = async (c: any) => {
    if (!token) return;
    const confirmed = window.confirm(`Are you sure you want to delete or deactivate compliance "${c.name}" (${c.code})?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/compliances?id=${c.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(data.message || 'Compliance deleted/deactivated.');
        fetchCompliances();
      } else {
        alert(data.error || 'Failed to delete compliance');
      }
    } catch (err) {
      console.error('Delete compliance error:', err);
    }
  };

  const filtered = compliances.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.authority && c.authority.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || c.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesFrequency = frequencyFilter === 'all' || c.frequency?.toLowerCase() === frequencyFilter.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus && matchesFrequency;
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
            onClick={openAddModal}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563EB',
              color: '#FFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span> Add New Compliance
          </button>
        </div>

        {notice && (
          <div style={{ width: '100%', marginTop: 8, padding: '8px 14px', background: '#ECFDF5', color: '#065F46', borderRadius: 8, fontSize: 13, border: '1px solid #A7F3D0' }}>
            ✓ {notice}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by compliance name, form code, or regulatory authority..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        />

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={frequencyFilter}
          onChange={e => setFrequencyFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Frequencies</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="half-yearly">Half-Yearly</option>
          <option value="annual">Annual</option>
          <option value="one-time">One-Time</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Library Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading statutory master library...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No compliances match filters</div>
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
                <th style={{ padding: '12px' }}>Due Day</th>
                <th style={{ padding: '12px' }}>Priority</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isActive = c.status === 'active';
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', background: isActive ? '#FFFFFF' : '#FAFAFA' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>{c.code}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.name}</div>
                      {c.regulatory_reference && (
                        <div style={{ fontSize: 11, color: '#64748B' }}>{c.regulatory_reference}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, color: '#334155' }}>
                        {c.category_name || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{c.authority || '—'}</td>
                    <td style={{ padding: '12px' }}>{c.frequency}</td>
                    <td style={{ padding: '12px', color: '#64748B' }}>
                      {c.due_day ? `Day ${c.due_day}` : c.due_date_rule || '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: c.priority === 'critical' ? '#991B1B' : c.priority === 'high' ? '#DC2626' : '#2563EB' }}>
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        title="Click to toggle status"
                        style={{
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: isActive ? '#ECFDF5' : '#F1F5F9',
                          color: isActive ? '#065F46' : '#64748B',
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {isActive ? '✓ Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openEditModal(c)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#EFF6FF',
                            color: '#2563EB',
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCompliance(c)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Compliance Modal */}
      {modalMode && (
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
              maxWidth: 580,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {modalMode === 'edit' ? 'Edit Statutory Compliance Template' : 'Add New Statutory Compliance'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
              Define regulatory filing parameters, schedule formulas, and statutory penalties.
            </p>

            <form onSubmit={handleSaveCompliance}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Compliance Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={compForm.name}
                    onChange={e => setCompForm({ ...compForm, name: e.target.value })}
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
                    value={compForm.code}
                    onChange={e => setCompForm({ ...compForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. GSTR-3B"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Category *
                  </label>
                  <select
                    value={compForm.category_id}
                    onChange={e => setCompForm({ ...compForm, category_id: e.target.value })}
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
                    value={compForm.authority}
                    onChange={e => setCompForm({ ...compForm, authority: e.target.value })}
                    placeholder="e.g. CBIC, CBDT, MCA"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Filing Frequency
                  </label>
                  <select
                    value={compForm.frequency}
                    onChange={e => setCompForm({ ...compForm, frequency: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annual">Annual</option>
                    <option value="One-Time">One-Time</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Statutory Due Day (1 - 31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={compForm.due_day}
                    onChange={e => setCompForm({ ...compForm, due_day: Number(e.target.value) })}
                    placeholder="20"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={compForm.priority}
                    onChange={e => setCompForm({ ...compForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={compForm.grace_period_days}
                    onChange={e => setCompForm({ ...compForm, grace_period_days: Number(e.target.value) })}
                    placeholder="0"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Template Status
                  </label>
                  <select
                    value={compForm.status}
                    onChange={e => setCompForm({ ...compForm, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Regulatory / Act Reference
                  </label>
                  <input
                    type="text"
                    value={compForm.regulatory_reference}
                    onChange={e => setCompForm({ ...compForm, regulatory_reference: e.target.value })}
                    placeholder="e.g. Section 39(1) of CGST Act, 2017"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Penalties & Non-Compliance Notes
                  </label>
                  <textarea
                    rows={2}
                    value={compForm.notes}
                    onChange={e => setCompForm({ ...compForm, notes: e.target.value })}
                    placeholder="e.g. Late fee ₹50/day (₹20 for Nil return) up to ₹5,000 + 18% interest per annum"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingComp}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    cursor: savingComp ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingComp ? 'Saving...' : modalMode === 'edit' ? 'Update Compliance' : 'Add to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
