'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function ComplianceCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Category Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', code: '', description: '', color: '#3B82F6', icon: '📋' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/compliance-categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/compliance-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newCat),
      });
      if (res.ok) {
        setModalOpen(false);
        setNewCat({ name: '', code: '', description: '', color: '#3B82F6', icon: '📋' });
        fetchCategories();
      }
    } catch (err) {
      console.error('Create category error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
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
            Compliance Categories ({categories.length})
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Configure statutory domains, color palettes, and filing classification taxonomies.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#3B82F6',
            color: '#FFF',
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          + Add Category
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading categories...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{cat.icon || '📋'}</span>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{cat.name}</h3>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Code: {cat.code}</div>
                  </div>
                </div>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color || '#3B82F6' }} />
              </div>

              <div style={{ fontSize: 12, color: '#64748B', minHeight: 36 }}>{cat.description || 'Statutory domain'}</div>

              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                  {cat.compliance_count || 0} Compliances
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#065F46', fontWeight: 600 }}>
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modalOpen && (
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
          <div style={{ width: '100%', maxWidth: 440, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Add Category</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Name *</label>
                <input
                  type="text"
                  required
                  value={newCat.name}
                  onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                  placeholder="e.g. Environmental / Pollution"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Code *</label>
                  <input
                    type="text"
                    required
                    value={newCat.code}
                    onChange={e => setNewCat({ ...newCat, code: e.target.value.toUpperCase() })}
                    placeholder="ENV"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Icon</label>
                  <input
                    type="text"
                    value={newCat.icon}
                    onChange={e => setNewCat({ ...newCat, icon: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Color</label>
                <input
                  type="color"
                  value={newCat.color}
                  onChange={e => setNewCat({ ...newCat, color: e.target.value })}
                  style={{ width: '100%', height: 40, padding: '2px 4px', borderRadius: 8, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: '#3B82F6', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
