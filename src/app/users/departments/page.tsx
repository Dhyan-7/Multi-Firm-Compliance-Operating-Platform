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

  // View Members Modal
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [activeDeptForMembers, setActiveDeptForMembers] = useState<any>(null);
  const [deptMembers, setDeptMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [reassigningUserId, setReassigningUserId] = useState<string | null>(null);
  const [targetDeptForUser, setTargetDeptForUser] = useState('');

  // Delete with Transfer Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<any>(null);
  const [transferTargetDeptId, setTransferTargetDeptId] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setUsers(d.users || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
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

  // Open members modal
  const openMembersModal = async (dept: any) => {
    setActiveDeptForMembers(dept);
    setMembersModalOpen(true);
    setLoadingMembers(true);
    setSelectedAddUserId('');
    setReassigningUserId(null);
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeptMembers(data.members || []);
      }
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Add/transfer user to active department
  const handleAddUserToDept = async () => {
    if (!token || !activeDeptForMembers || !selectedAddUserId) return;
    try {
      const res = await fetch(`/api/departments/${activeDeptForMembers.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reassign_user_ids: [selectedAddUserId] }),
      });
      if (res.ok) {
        setSelectedAddUserId('');
        // Refresh members & dept counts
        openMembersModal(activeDeptForMembers);
        fetchDepartments();
        fetchUsers();
        setFeedback({ type: 'success', message: 'Staff member added to department successfully' });
      } else {
        const d = await res.json();
        setFeedback({ type: 'error', message: d.error || 'Failed to assign user' });
      }
    } catch (err) {
      console.error('Add user error:', err);
    }
  };

  // Reassign single user to another department
  const handleReassignUser = async (userId: string, newDeptId: string) => {
    if (!token || !newDeptId) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ department_id: newDeptId }),
      });
      if (res.ok) {
        setReassigningUserId(null);
        openMembersModal(activeDeptForMembers);
        fetchDepartments();
        fetchUsers();
        setFeedback({ type: 'success', message: 'Staff member reassigned successfully' });
      } else {
        const d = await res.json();
        setFeedback({ type: 'error', message: d.error || 'Failed to reassign staff' });
      }
    } catch (err) {
      console.error('Reassign user error:', err);
    }
  };

  const initiateDelete = (dept: any) => {
    setDeptToDelete(dept);
    if (dept.member_count > 0) {
      // Find default other department
      const other = departments.find(d => d.id !== dept.id);
      setTransferTargetDeptId(other ? other.id : '');
      setDeleteModalOpen(true);
    } else {
      if (confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
        performDelete(dept.id);
      }
    }
  };

  const performDelete = async (deptId: string, transferTo?: string) => {
    if (!token) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const url = transferTo ? `/api/departments/${deptId}?transfer_to=${transferTo}` : `/api/departments/${deptId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteModalOpen(false);
        setDeptToDelete(null);
        setFeedback({ type: 'success', message: 'Department deleted successfully' });
        fetchDepartments();
        fetchUsers();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete department' });
      }
    } catch (err) {
      console.error('Delete dept error:', err);
      setFeedback({ type: 'error', message: 'Network error deleting department' });
    } finally {
      setDeleting(false);
    }
  };

  // Users not currently in active department
  const eligibleUsersToAdd = users.filter(u => !deptMembers.some(m => m.id === u.id));

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
            Structure operational units, designate department heads, manage staff assignments, and track department compliance workload.
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{d.member_count || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Assigned Staff</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{d.task_count || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Department Tasks</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                <button
                  onClick={() => openMembersModal(d)}
                  style={{
                    flex: 1.5,
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    borderRadius: 6,
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5
                  }}
                >
                  👥 Manage Staff ({d.member_count || 0})
                </button>
                <button
                  onClick={() => openEditModal(d)}
                  style={{
                    background: '#F8FAFC',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => initiateDelete(d)}
                  style={{
                    background: '#FFF',
                    color: '#EF4444',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    padding: '7px 12px',
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

      {/* Add Dept Modal */}
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

      {/* Edit Dept Modal */}
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

      {/* Department Staff & Members Drawer/Modal */}
      {membersModalOpen && activeDeptForMembers && (
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
          <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: 14, border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {activeDeptForMembers.name} — Staff Roster
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                  Manage and reassign employees assigned to this organizational department.
                </p>
              </div>
              <button
                onClick={() => setMembersModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={selectedAddUserId}
                onChange={e => setSelectedAddUserId(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', fontSize: 13 }}
              >
                <option value="">Select staff member to assign to {activeDeptForMembers.name}...</option>
                {eligibleUsersToAdd.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.department_name || 'No Dept'} • {u.role_name || 'User'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddUserToDept}
                disabled={!selectedAddUserId}
                style={{
                  background: selectedAddUserId ? '#2563EB' : '#94A3B8',
                  color: '#FFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: selectedAddUserId ? 'pointer' : 'not-allowed',
                }}
              >
                + Add Member
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {loadingMembers ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading staff members...</div>
              ) : deptMembers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748B', border: '1px dashed #CBD5E1', borderRadius: 8 }}>
                  No staff members currently assigned to {activeDeptForMembers.name}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {deptMembers.map(m => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#FFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.name}
                          {activeDeptForMembers.head_user_id === m.id && (
                            <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              HEAD
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {m.email} • {m.designation || m.role_name || 'Staff'}
                        </div>
                      </div>

                      <div>
                        {reassigningUserId === m.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              value={targetDeptForUser}
                              onChange={e => setTargetDeptForUser(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFF' }}
                            >
                              <option value="">Move to...</option>
                              {departments.filter(d => d.id !== activeDeptForMembers.id).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReassignUser(m.id, targetDeptForUser)}
                              disabled={!targetDeptForUser}
                              style={{ background: '#2563EB', color: '#FFF', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: targetDeptForUser ? 'pointer' : 'not-allowed' }}
                            >
                              Move
                            </button>
                            <button
                              onClick={() => setReassigningUserId(null)}
                              style={{ background: '#F1F5F9', color: '#475569', border: 'none', padding: '6px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReassigningUserId(m.id); setTargetDeptForUser(''); }}
                            style={{
                              background: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '5px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reassign Dept
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMembersModalOpen(false)}
                style={{ background: '#2563EB', color: '#FFF', padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete with Transfer Confirmation Modal */}
      {deleteModalOpen && deptToDelete && (
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
          <div style={{ width: '100%', maxWidth: 480, background: '#FFF', borderRadius: 14, padding: 28, border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#991B1B', margin: '0 0 12px' }}>
              Delete Department &quot;{deptToDelete.name}&quot;
            </h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
              This department currently has <strong>{deptToDelete.member_count} staff member(s)</strong> assigned. To preserve data integrity and operational continuity, please select a destination department to transfer these staff members and their associated tasks before deletion:
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Transfer Staff & Tasks To: *
              </label>
              <select
                value={transferTargetDeptId}
                onChange={e => setTransferTargetDeptId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', fontSize: 13 }}
              >
                <option value="">Select destination department...</option>
                {departments.filter(d => d.id !== deptToDelete.id).map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.member_count || 0} members)</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setDeptToDelete(null); }}
                style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!transferTargetDeptId || deleting}
                onClick={() => performDelete(deptToDelete.id, transferTargetDeptId)}
                style={{
                  background: transferTargetDeptId && !deleting ? '#DC2626' : '#94A3B8',
                  color: '#FFF',
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  cursor: transferTargetDeptId && !deleting ? 'pointer' : 'not-allowed'
                }}
              >
                {deleting ? 'Transferring & Deleting...' : 'Transfer & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
