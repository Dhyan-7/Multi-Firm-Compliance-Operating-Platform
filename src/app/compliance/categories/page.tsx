'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function ComplianceCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Add / Edit Category Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [catForm, setCatForm] = useState({ id: '', name: '', code: '', description: '', color: '#3B82F6', icon: '📋' });
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

  const openAddModal = () => {
    setCatForm({ id: '', name: '', code: '', description: '', color: '#3B82F6', icon: '📋' });
    setModalMode('add');
  };

  const openEditModal = (cat: any) => {
    setCatForm({
      id: cat.id,
      name: cat.name || '',
      code: cat.code || '',
      description: cat.description || '',
      color: cat.color || '#3B82F6',
      icon: cat.icon || '📋',
    });
    setModalMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setNotice('');
    try {
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch('/api/compliance-categories', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(catForm),
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(modalMode === 'edit' ? 'Category updated successfully.' : 'Category created successfully.');
        setModalMode(null);
        fetchCategories();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Save category error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    if (!token) return;
    if (cat.compliance_count > 0) {
      alert(`Cannot delete category "${cat.name}". It is associated with ${cat.compliance_count} statutory compliance templates.`);
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently delete category "${cat.name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/compliance-categories?id=${cat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(data.message || 'Category deleted.');
        fetchCategories();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Delete category error:', err);
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
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <a href="/compliance/master" style={{ color: '#2563EB', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              ← Master Library
            </a>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Compliance Categories ({categories.length})
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Configure statutory domains, color palettes, and filing classification taxonomies.
          </p>
        </div>

        <button
          onClick={openAddModal}
          style={{
            background: '#2563EB',
            color: '#FFF',
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>+</span> Add Category
        </button>

        {notice && (
          <div style={{ width: '100%', marginTop: 8, padding: '8px 14px', background: '#ECFDF5', color: '#065F46', borderRadius: 8, fontSize: 13, border: '1px solid #A7F3D0' }}>
            ✓ {notice}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading categories...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
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

                <div style={{ fontSize: 12, color: '#64748B', minHeight: 36 }}>{cat.description || 'Statutory domain classification'}</div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 14, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                  {cat.compliance_count || 0} Compliances
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openEditModal(cat)}
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
                    onClick={() => handleDelete(cat)}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
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
          <div style={{ width: '100%', maxWidth: 440, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {modalMode === 'edit' ? 'Edit Category' : 'Add Category'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Name *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
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
                    value={catForm.code}
                    onChange={e => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                    placeholder="ENV"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Icon</label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Description</label>
                <input
                  type="text"
                  value={catForm.description}
                  onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Description of statutory scope"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Color Palette</label>
                <input
                  type="color"
                  value={catForm.color}
                  onChange={e => setCatForm({ ...catForm, color: e.target.value })}
                  style={{ width: '100%', height: 40, padding: '2px 4px', borderRadius: 8, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalMode(null)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: '#2563EB', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : modalMode === 'edit' ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

