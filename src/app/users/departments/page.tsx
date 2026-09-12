'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function DepartmentsPage() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Dept Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head_user_id: '' });
  const [saving, setSaving] = useState(false);

  // Edit Dept Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', head_user_id: '' });
  const [editSaving, setEditSaving] = useState(false);

  const fetchDepartments = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    if (token) {
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(d => setUsers(d.users || []))
        .catch(console.error);
    }
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newDept),
      });
      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        setNewDept({ name: '', head_user_id: '' });
        setFeedback({ type: 'success', message: 'Department created successfully' });
        fetchDepartments();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create department' });
      }
    } catch (err) {
      console.error('Create dept error:', err);
      setFeedback({ type: 'error', message: 'Network error creating department' });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (dept: any) => {
    setEditingDept(dept);
    setEditForm({
      name: dept.name,
      head_user_id: dept.head_user_id || '',
    });
    setEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingDept) return;
    setEditSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setEditModalOpen(false);
        setEditingDept(null);
        setFeedback({ type: 'success', message: 'Department updated successfully' });
        fetchDepartments();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update department' });
      }
    } catch (err) {
      console.error('Update dept error:', err);
      setFeedback({ type: 'error', message: 'Network error updating department' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (dept: any) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;
    if (!token) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Department deleted successfully' });
        fetchDepartments();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete department' });
      }
    } catch (err) {
      console.error('Delete dept error:', err);
      setFeedback({ type: 'error', message: 'Network error deleting department' });
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
            Organizational Departments ({departments.length})
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Structure operational units, designate department heads, and manage functional compliance hierarchies.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#2563EB',
            color: '#FFF',
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
          }}
        >
          + Add Department
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
            background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading departments...</div>
        </div>
      ) : departments.length === 0 ? (
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px dashed #CBD5E1', padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#334155', margin: '0 0 8px' }}>No Departments Configured</p>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>Click &quot;+ Add Department&quot; above to establish your organization&apos;s internal structure.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {departments.map(d => (
            <div
              key={d.id}
              style={{
                background: '#FFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{d.name}</h3>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#ECFDF5', color: '#065F46', fontWeight: 600 }}>
                    Active
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                  Department Head: <strong style={{ color: '#0F172A' }}>{d.head_name || 'Unassigned'}</strong>
                </div>

                <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #F1F5F9', paddingTop: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{d.member_count || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Assigned Staff</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2563EB' }}>{d.task_count || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Department Tasks</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                <button
                  onClick={() => openEditModal(d)}
                  style={{
                    flex: 1,
                    background: '#F8FAFC',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(d)}
                  style={{
                    background: '#FFF',
                    color: '#EF4444',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
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
          <div style={{ width: '100%', maxWidth: 460, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Add Department</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDept.name}
                  onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="e.g. Legal & Compliance"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department Head</label>
                <select
                  value={newDept.head_user_id}
                  onChange={e => setNewDept({ ...newDept, head_user_id: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                >
                  <option value="">Select User...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.designation || u.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ background: '#2563EB', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingDept && (
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
          <div style={{ width: '100%', maxWidth: 460, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Edit Department</h3>
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department Head</label>
                <select
                  value={editForm.head_user_id}
                  onChange={e => setEditForm({ ...editForm, head_user_id: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.designation || u.email})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setEditModalOpen(false); setEditingDept(null); }} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} style={{ background: '#2563EB', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
