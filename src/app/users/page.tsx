'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function UsersDirectoryPage() {
  const { token, user: authUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add User Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role_id: 'role_03',
    department_id: 'dept_08',
    designation: 'Staff',
  });
  const [saving, setSaving] = useState(false);

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Firm Access Modal
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [selectedUserForFirms, setSelectedUserForFirms] = useState<any>(null);
  const [firmList, setFirmList] = useState<any[]>([]);
  const [selectedFirmIds, setSelectedFirmIds] = useState<string[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const [savingFirms, setSavingFirms] = useState(false);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        const loadedRoles = data.roles || [];
        setRoles(loadedRoles);
        setDepartments(data.departments || []);
        if (loadedRoles.length > 0 && (!newUser.role_id || newUser.role_id === 'role_01')) {
          const defaultRole = loadedRoles.find((r: any) => r.id === 'role_03') || loadedRoles.find((r: any) => r.id === 'role_02') || loadedRoles[0];
          setNewUser(prev => ({ ...prev, role_id: defaultRole.id }));
        }
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setNotice(null);

    if (!newUser.name.trim() || newUser.name.trim().length < 2) {
      setNotice({ type: 'error', text: 'Full name is mandatory (min 2 characters)' });
      setSaving(false);
      return;
    }
    if (!newUser.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email.trim())) {
      setNotice({ type: 'error', text: 'A valid email address is mandatory' });
      setSaving(false);
      return;
    }
    if (!newUser.password || newUser.password.length < 6) {
      setNotice({ type: 'error', text: 'Password must be at least 6 characters' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        setNotice({ type: 'success', text: `User "${newUser.name}" created successfully!` });
        setNewUser({
          name: '',
          email: '',
          password: '',
          phone: '',
          role_id: roles[0]?.id || 'role_01',
          department_id: departments[0]?.id || 'dept_08',
          designation: 'Staff',
        });
        fetchUsers();
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to create user' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Error creating user' });
    } finally {
      setSaving(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: any) => {
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      department_id: user.department_id || departments[0]?.id,
      designation: user.designation || '',
      phone: user.phone || '',
      status: user.status || 'active',
      password: '', // optional password reset
    });
    setEditModalOpen(true);
  };

  // Save Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editUser) return;
    setSavingEdit(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editUser),
      });

      const data = await res.json();
      if (res.ok) {
        setEditModalOpen(false);
        setNotice({ type: 'success', text: `User "${editUser.name}" updated successfully!` });
        fetchUsers();
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to update user' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Error updating user' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: any) => {
    if (user.id === 'user_01' || user.id === authUser?.id) {
      alert('Cannot delete the root administrator or your active account session.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})? This action will revoke all permissions and firm access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', text: `User "${user.name}" has been deleted.` });
        fetchUsers();
      } else {
        setNotice({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Error deleting user' });
    }
  };

  // Open Firm Access Modal
  const handleOpenFirmAccess = async (user: any) => {
    setSelectedUserForFirms(user);
    setAccessModalOpen(true);
    setLoadingFirms(true);
    try {
      const res = await fetch(`/api/users/${user.id}/firms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const firms = data.firms || [];
        setFirmList(firms);
        const accessible = firms.filter((f: any) => f.has_access).map((f: any) => f.id);
        setSelectedFirmIds(accessible);
      }
    } catch (err) {
      console.error('Fetch user firms error:', err);
    } finally {
      setLoadingFirms(false);
    }
  };

  // Save Firm Access
  const handleSaveFirmAccess = async () => {
    if (!token || !selectedUserForFirms) return;
    setSavingFirms(true);
    try {
      const res = await fetch(`/api/users/${selectedUserForFirms.id}/firms`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firm_ids: selectedFirmIds }),
      });

      const data = await res.json();
      if (res.ok) {
        setAccessModalOpen(false);
        setNotice({ type: 'success', text: `Firm access for "${selectedUserForFirms.name}" updated successfully (${selectedFirmIds.length} firms assigned)!` });
      } else {
        alert(data.error || 'Failed to save firm access permissions');
      }
    } catch (err) {
      console.error('Save firm access error:', err);
    } finally {
      setSavingFirms(false);
    }
  };

  const toggleFirmSelect = (id: string) => {
    setSelectedFirmIds(prev =>
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFirms = () => {
    if (selectedFirmIds.length === firmList.length) {
      setSelectedFirmIds([]);
    } else {
      setSelectedFirmIds(firmList.map(f => f.id));
    }
  };

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role_id === roleFilter;
    const matchDept = deptFilter === 'all' || u.department_id === deptFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

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
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            User Directory & Access Controls
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Full administrator control to create, update, delete, configure permissions, and assign firm access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/users/roles"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🔐</span> RBAC Roles Matrix
          </a>
          <a
            href="/users/departments"
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🏛️</span> Departments
          </a>
          <button
            onClick={() => setModalOpen(true)}
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
            <span>+</span> Add New User
          </button>
        </div>
      </div>

      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 500,
            background: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: notice.type === 'success' ? '#065F46' : '#991B1B',
            border: notice.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{notice.type === 'success' ? '✓ ' : '⚠️ '}{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters & Search Row */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search by name, email, designation..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {(searchTerm || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setRoleFilter('all'); setDeptFilter('all'); setStatusFilter('all'); }}
            style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', padding: '7px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Users Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading users directory...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>No matching users found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try clearing search criteria or add a new user.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px 16px' }}>User & Identity</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Designation</th>
                <th style={{ padding: '12px 16px' }}>Phone</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Controls & Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: u.role_id === 'role_01' ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#0F172A',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {u.name}
                          {u.id === 'user_01' && (
                            <span style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ROOT</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {u.role_id === 'role_01' ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 10,
                          background: '#EDE9FE',
                          color: '#6D28D9',
                          fontWeight: 700,
                          border: '1px solid #DDD6FE',
                        }}
                      >
                        👑 Super Admin
                      </span>
                    ) : u.role_id === 'role_02' ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 10,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        🛡️ Admin
                      </span>
                    ) : u.role_id === 'role_03' ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 10,
                          background: '#F0FDF4',
                          color: '#166534',
                          fontWeight: 600,
                          border: '1px solid #BBF7D0',
                        }}
                      >
                        👤 User
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 10,
                          background: '#F1F5F9',
                          color: '#334155',
                          fontWeight: 600,
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {u.role_name || 'Staff'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{u.department_name || 'Administration'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{u.designation || 'Staff'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: u.status === 'active' ? '#ECFDF5' : '#FEF2F2',
                        color: u.status === 'active' ? '#065F46' : '#991B1B',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenFirmAccess(u)}
                        title="Manage Firm Access"
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          padding: '5px 9px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#334155',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🏢 Firms
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit User Details"
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          padding: '5px 9px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#2563EB',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        ✏️ Edit
                      </button>
                      {u.id !== 'user_01' && u.id !== authUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Delete User"
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            padding: '5px 9px',
                            borderRadius: 6,
                            fontSize: 12,
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
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
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Add New Staff User
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Ramesh"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@balajitransports.in"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Initial Password (min. 6 chars) *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Assigned Role *</label>
                    <select
                      value={newUser.role_id}
                      onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                    >
                      {roles.filter(r => r.id !== 'role_01').map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                      👑 Only 1 Super Admin allowed (Raghu G R). Assign Admin or User role.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department</label>
                    <select
                      value={newUser.department_id}
                      onChange={e => setNewUser({ ...newUser, department_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Designation</label>
                    <input
                      type="text"
                      value={newUser.designation}
                      onChange={e => setNewUser({ ...newUser, designation: e.target.value })}
                      placeholder="e.g. Compliance Officer"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Phone</label>
                    <input
                      type="text"
                      value={newUser.phone}
                      onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#F1F5F9', border: 'none', padding: '9px 16px', borderRadius: 6, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ background: '#2563EB', border: 'none', padding: '9px 20px', borderRadius: 6, color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {saving ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && editUser && (
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
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              maxWidth: 520,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Edit User: {editUser.name}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editUser.name}
                      onChange={e => setEditUser({ ...editUser, name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editUser.email}
                      onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Role</label>
                    {editUser.id === 'user_01' ? (
                      <div style={{ padding: '9px 12px', background: '#EDE9FE', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                        👑 Super Admin (Primary System Root)
                      </div>
                    ) : (
                      <select
                        value={editUser.role_id}
                        onChange={e => setEditUser({ ...editUser, role_id: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                      >
                        {roles.filter(r => r.id !== 'role_01').map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Department</label>
                    <select
                      value={editUser.department_id}
                      onChange={e => setEditUser({ ...editUser, department_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Designation</label>
                    <input
                      type="text"
                      value={editUser.designation}
                      onChange={e => setEditUser({ ...editUser, designation: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Phone</label>
                    <input
                      type="text"
                      value={editUser.phone}
                      onChange={e => setEditUser({ ...editUser, phone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Account Status</label>
                    <select
                      value={editUser.status}
                      onChange={e => setEditUser({ ...editUser, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Reset Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editUser.password || ''}
                      onChange={e => setEditUser({ ...editUser, password: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: '#F1F5F9', border: 'none', padding: '9px 16px', borderRadius: 6, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ background: '#2563EB', border: 'none', padding: '9px 20px', borderRadius: 6, color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingEdit ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Firm Access Permissions Modal */}
      {accessModalOpen && selectedUserForFirms && (
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
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              maxWidth: 560,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                  Assign Firm Access: {selectedUserForFirms.name}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
                  Control which organizations this staff member can view and manage compliances for.
                </p>
              </div>
              <button
                onClick={() => setAccessModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingFirms ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading registered firms...</div>
              ) : firmList.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                  No firms registered in the platform yet. Add firms to assign access.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      {selectedFirmIds.length} of {firmList.length} Firms Selected
                    </span>
                    <button
                      onClick={toggleSelectAllFirms}
                      style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {selectedFirmIds.length === firmList.length ? 'Deselect All' : 'Select All Firms'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {firmList.map((f: any) => {
                      const isChecked = selectedFirmIds.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: isChecked ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                            background: isChecked ? '#EFF6FF' : '#FFF',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFirmSelect(f.id)}
                            style={{ width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{f.display_name}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{f.legal_name} • {f.city}, {f.state}</div>
                          </div>
                          {isChecked && (
                            <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600 }}>Access Granted</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAccessModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', padding: '9px 16px', borderRadius: 6, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFirmAccess}
                disabled={savingFirms}
                style={{ background: '#2563EB', border: 'none', padding: '9px 20px', borderRadius: 6, color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
              >
                {savingFirms ? 'Saving Permissions...' : 'Save Firm Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
