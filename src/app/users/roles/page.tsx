'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function RolesRbacPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('role_01'); // Super Admin
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Role Modal
  const [newRoleModal, setNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [cloneFromId, setCloneFromId] = useState('role_01');
  const [creatingRole, setCreatingRole] = useState(false);

  // Edit Role Modal
  const [editRoleModal, setEditRoleModal] = useState(false);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [savingEditRole, setSavingEditRole] = useState(false);

  // Fetch roles
  const fetchRoles = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/roles', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        const loadedRoles = d.roles || [];
        setRoles(loadedRoles);
        if (loadedRoles.length > 0 && !loadedRoles.some((r: any) => r.id === selectedRoleId)) {
          setSelectedRoleId(loadedRoles[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [token]);

  // Fetch role permissions when selectedRoleId changes
  const fetchRolePermissions = async () => {
    if (!token || !selectedRoleId) return;
    setLoading(true);
    setSaveNotice(null);
    try {
      const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllPermissions(data.allPermissions || []);
        setAssignedIds(data.assignedIds || []);
      }
    } catch (err) {
      console.error('Fetch permissions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolePermissions();
  }, [selectedRoleId, token]);

  const togglePermission = (permId: string) => {
    if (selectedRoleId === 'role_01') return; // Super admin has all immutable
    setAssignedIds(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (module: string) => {
    if (selectedRoleId === 'role_01') return;
    const modulePermIds = allPermissions.filter(p => p.module === module).map(p => p.id);
    const allSelected = modulePermIds.every(id => assignedIds.includes(id));

    if (allSelected) {
      setAssignedIds(prev => prev.filter(id => !modulePermIds.includes(id)));
    } else {
      setAssignedIds(prev => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleSavePermissions = async () => {
    if (!token || !selectedRoleId) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permission_ids: assignedIds }),
      });

      if (res.ok) {
        setSaveNotice({ type: 'success', text: 'Role permissions saved successfully to database!' });
      } else {
        const d = await res.json();
        setSaveNotice({ type: 'error', text: d.error || 'Failed to update permissions.' });
      }
    } catch (err: any) {
      setSaveNotice({ type: 'error', text: err?.message || 'Error saving permissions' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreatingRole(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          clone_from_role_id: cloneFromId,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setNewRoleModal(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setSaveNotice({ type: 'success', text: `Role "${newRoleName}" created successfully!` });
        await fetchRoles();
        if (d.id) setSelectedRoleId(d.id);
      } else {
        alert(d.error || 'Failed to create role');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleOpenEditRole = () => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setEditRoleModal(true);
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRoleId) return;
    setSavingEditRole(true);
    try {
      const res = await fetch(`/api/roles/${selectedRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDesc.trim(),
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setEditRoleModal(false);
        setSaveNotice({ type: 'success', text: 'Role details updated successfully!' });
        fetchRoles();
      } else {
        alert(d.error || 'Failed to update role');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating role');
    } finally {
      setSavingEditRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (selectedRoleId === 'role_01' || selectedRoleId === 'role_02' || selectedRoleId === 'role_03') {
      alert('System roles (Super Admin, Admin, and User) are permanent and cannot be deleted.');
      return;
    }
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;

    if (!confirm(`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/roles/${selectedRoleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const d = await res.json();
      if (res.ok) {
        setSaveNotice({ type: 'success', text: `Role "${role.name}" was deleted.` });
        setSelectedRoleId('role_01');
        fetchRoles();
      } else {
        alert(d.error || 'Failed to delete role');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting role');
    }
  };

  // Group permissions by module
  const modules = Array.from(new Set(allPermissions.map(p => p.module)));
  const selectedRole = roles.find(r => r.id === selectedRoleId);

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
            Role-Based Access Control (RBAC) Matrix
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Super Admin (Dhyan) and Admins can configure and assign modular permissions for Users and custom staff roles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setNewRoleModal(true)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span> Add New Role
          </button>
          <button
            onClick={handleSavePermissions}
            disabled={saving || selectedRoleId === 'role_01'}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: selectedRoleId === 'role_01' ? '#94A3B8' : '#2563EB',
              color: '#FFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedRoleId === 'role_01' ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : selectedRoleId === 'role_01' ? 'Immutable (Root Role)' : 'Save Permissions'}
          </button>
        </div>
      </div>

      {saveNotice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 500,
            background: saveNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: saveNotice.type === 'success' ? '#065F46' : '#991B1B',
            border: saveNotice.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
          }}
        >
          {saveNotice.type === 'success' ? '✓ ' : '⚠️ '}{saveNotice.text}
        </div>
      )}

      {/* Main Split Layout: Roles list on Left, Permissions Matrix on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Left Column: Roles Selector */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 10, padding: '4px 8px' }}>
            System & Custom Roles ({roles.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {roles.map(r => {
              const isSelected = selectedRoleId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    color: isSelected ? '#1E40AF' : '#334155',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13 }}>{r.name}</span>
                    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 10, background: isSelected ? '#DBEAFE' : '#F1F5F9', color: isSelected ? '#1E40AF' : '#64748B', fontWeight: 600 }}>
                      {r.user_count || 0} staff
                    </span>
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {r.description}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={() => setNewRoleModal(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                color: '#2563EB',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create Custom Role
            </button>
          </div>
        </div>

        {/* Right Column: Role Details & Permissions Matrix */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
          {selectedRole && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {selectedRole.name}
                  </h3>
                  {selectedRole.id === 'role_01' ? (
                    <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #DDD6FE' }}>
                      👑 ROOT SUPER ADMIN (1 USER: DHYAN)
                    </span>
                  ) : selectedRole.id === 'role_02' ? (
                    <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #BFDBFE' }}>
                      🛡️ SYSTEM ADMINISTRATOR
                    </span>
                  ) : selectedRole.id === 'role_03' ? (
                    <span style={{ background: '#F0FDF4', color: '#166534', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1px solid #BBF7D0' }}>
                      👤 STANDARD USER ROLE
                    </span>
                  ) : (
                    <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #E2E8F0' }}>
                      CUSTOM ROLE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                  {selectedRole.description || 'No description provided.'}
                </p>
              </div>

              {selectedRole.id !== 'role_01' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleOpenEditRole}
                    style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                  >
                    ✏️ Edit Details
                  </button>
                  {selectedRole.id !== 'role_02' && selectedRole.id !== 'role_03' && (
                    <button
                      onClick={handleDeleteRole}
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}
                    >
                      🗑️ Delete Role
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>Loading permissions matrix...</div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  Granular Module Permissions ({assignedIds.length} of {allPermissions.length} Granted)
                </span>
                {selectedRoleId === 'role_01' && (
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                    🔒 Super Admin inherently holds all permissions
                  </span>
                )}
              </div>

              {/* Module Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {modules.map(module => {
                  const modulePerms = allPermissions.filter(p => p.module === module);
                  const grantedInModule = modulePerms.filter(p => assignedIds.includes(p.id)).length;
                  const allModuleGranted = grantedInModule === modulePerms.length;

                  return (
                    <div
                      key={module}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: 16,
                        background: '#FAFAFA',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>
                            {module}
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#E2E8F0', color: '#475569', fontWeight: 600 }}>
                            {grantedInModule}/{modulePerms.length}
                          </span>
                        </div>

                        {selectedRoleId !== 'role_01' && (
                          <button
                            onClick={() => toggleModulePermissions(module)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563EB',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {allModuleGranted ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        {modulePerms.map(p => {
                          const isAssigned = assignedIds.includes(p.id) || selectedRoleId === 'role_01';
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: isAssigned ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                background: isAssigned ? '#EFF6FF' : '#FFF',
                                cursor: selectedRoleId === 'role_01' ? 'default' : 'pointer',
                                fontSize: 12,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                disabled={selectedRoleId === 'role_01'}
                                onChange={() => togglePermission(p.id)}
                              />
                              <span style={{ fontWeight: isAssigned ? 600 : 400, color: isAssigned ? '#1E40AF' : '#64748B', textTransform: 'capitalize' }}>
                                {p.action}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {newRoleModal && (
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
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Create Custom Role
              </h3>
              <button
                onClick={() => setNewRoleModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Role Name *</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="e.g. Compliance Reviewer"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={3}
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="e.g. Reviews and verifies submitted tax and ROC returns before final closure."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Clone Permissions From</label>
                  <select
                    value={cloneFromId}
                    onChange={e => setCloneFromId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF', boxSizing: 'border-box' }}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setNewRoleModal(false)}
                  style={{ background: '#F1F5F9', border: 'none', padding: '9px 16px', borderRadius: 6, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRole}
                  style={{ background: '#2563EB', border: 'none', padding: '9px 20px', borderRadius: 6, color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {creatingRole ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModal && (
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
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Edit Role Details
              </h3>
              <button
                onClick={() => setEditRoleModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRole}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Role Name *</label>
                  <input
                    type="text"
                    required
                    value={editRoleName}
                    onChange={e => setEditRoleName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Description</label>
                  <textarea
                    rows={3}
                    value={editRoleDesc}
                    onChange={e => setEditRoleDesc(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setEditRoleModal(false)}
                  style={{ background: '#F1F5F9', border: 'none', padding: '9px 16px', borderRadius: 6, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditRole}
                  style={{ background: '#2563EB', border: 'none', padding: '9px 20px', borderRadius: 6, color: '#FFF', fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingEditRole ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
