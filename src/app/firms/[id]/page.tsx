'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AppLayout';
import { formatISTDateTime } from '@/lib/dateUtils';

export default function FirmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [regenerating, setRegenerating] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Section 2.1: Edit Firm Details State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Section 2.2: Firm-Level Compliance Management State
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [masterCompliances, setMasterCompliances] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [complianceSearch, setComplianceSearch] = useState('');
  const [complianceCategoryFilter, setComplianceCategoryFilter] = useState('ALL');
  const [complianceForm, setComplianceForm] = useState<{
    compliance_id: string;
    override_frequency: string;
    override_due_day: string;
    default_department_id: string;
    default_assignee_id: string;
    notes: string;
  }>({
    compliance_id: '',
    override_frequency: '',
    override_due_day: '',
    default_department_id: '',
    default_assignee_id: '',
    notes: '',
  });
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState('');

  // Remove Compliance Confirmation
  const [complianceToDelete, setComplianceToDelete] = useState<any | null>(null);
  const [removingCompliance, setRemovingCompliance] = useState(false);

  // Section 2.3: Delete Firm State & Multi-Step Confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletingFirm, setDeletingFirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isAdmin = user?.role_name === 'Super Admin' || user?.role_name === 'Admin' || user?.role_id === 'role_01' || user?.role_id === 'role_02';

  const fetchFirmData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/firms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const firmData = await res.json();
        setData(firmData);
        setEditForm({
          display_name: firmData.firm?.display_name || '',
          legal_name: firmData.firm?.legal_name || '',
          pan: firmData.firm?.pan || '',
          gstin: firmData.firm?.gstin || '',
          cin: firmData.firm?.cin || firmData.firm?.cin_llpin || '',
          industry: firmData.firm?.industry || '',
          registered_address: firmData.firm?.registered_address || '',
          city: firmData.firm?.city || '',
          state: firmData.firm?.state || '',
          pin_code: firmData.firm?.pin_code || firmData.firm?.pincode || '',
        });
      }
    } catch (err) {
      console.error('Firm detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmData();
  }, [id, token]);

  // Fetch Master Compliances, Departments, and Users for compliance management
  const fetchAuxiliaryData = async () => {
    if (!token) return;
    try {
      const [compRes, deptRes, userRes] = await Promise.all([
        fetch('/api/compliances', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (compRes.ok) {
        const compData = await compRes.json();
        setMasterCompliances(compData.compliances || []);
      }
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartmentsList(deptData.departments || []);
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsersList(userData.users || []);
      }
    } catch (err) {
      console.error('Aux data error:', err);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, [token]);

  const handleRegenerateCalendar = async () => {
    if (!token) return;
    setRegenerating(true);
    setNotificationMsg('');
    try {
      const res = await fetch(`/api/firms/${id}/generate-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ financial_year: '2026-2027' }),
      });
      const resData = await res.json();
      if (res.ok) {
        setNotificationMsg(resData.message || 'Calendar generated successfully!');
        fetchFirmData();
      }
    } catch (err) {
      console.error('Regenerate calendar error:', err);
    } finally {
      setRegenerating(false);
    }
  };

  // Section 2.1: Save Firm Edit
  const handleSaveFirmEdit = async () => {
    if (!token) return;
    setEditSaving(true);
    setEditError('');

    // Validation
    if (editForm.pan) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(editForm.pan.trim().toUpperCase())) {
        setEditError('Invalid PAN format (e.g. ABCDE1234F)');
        setEditSaving(false);
        return;
      }
    }
    if (editForm.gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(editForm.gstin.trim().toUpperCase())) {
        setEditError('Invalid GSTIN format (15 characters alphanumeric)');
        setEditSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/firms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setEditError(resData.error || 'Failed to update firm');
      } else {
        setShowEditModal(false);
        setNotificationMsg('Firm details updated successfully');
        fetchFirmData();
      }
    } catch (err: any) {
      setEditError(err.message || 'Network error');
    } finally {
      setEditSaving(false);
    }
  };

  // Section 2.2: Save Firm Compliance
  const handleSaveCompliance = async () => {
    if (!token || !complianceForm.compliance_id) {
      setComplianceError('Please select a statutory compliance');
      return;
    }
    setSavingCompliance(true);
    setComplianceError('');

    try {
      const res = await fetch(`/api/firms/${id}/compliances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(complianceForm),
      });

      const resData = await res.json();
      if (!res.ok) {
        setComplianceError(resData.error || 'Failed to configure compliance');
      } else {
        setShowComplianceModal(false);
        setNotificationMsg('Compliance configuration saved for this firm');
        fetchFirmData();
      }
    } catch (err: any) {
      setComplianceError(err.message || 'Network error');
    } finally {
      setSavingCompliance(false);
    }
  };

  // Section 2.2: Remove Compliance from Firm
  const handleRemoveCompliance = async () => {
    if (!token || !complianceToDelete) return;
    setRemovingCompliance(true);

    try {
      const res = await fetch(`/api/firms/${id}/compliances`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ compliance_id: complianceToDelete.compliance_id }),
      });

      if (res.ok) {
        setComplianceToDelete(null);
        setNotificationMsg('Compliance removed from firm');
        fetchFirmData();
      }
    } catch (err) {
      console.error('Remove compliance error:', err);
    } finally {
      setRemovingCompliance(false);
    }
  };

  // Section 2.3: Permanently Remove Firm
  const handleDeleteFirm = async () => {
    if (!token || !isAdmin) return;
    setDeletingFirm(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/firms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();
      if (!res.ok) {
        setDeleteError(resData.error || 'Failed to delete firm');
        setDeletingFirm(false);
      } else {
        setShowDeleteModal(false);
        router.push('/firms');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Network error occurred');
      setDeletingFirm(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const firm = data?.firm || {};
  const stats = data?.stats || {};
  const compliances = data?.compliances || [];
  const tasks = data?.tasks || [];
  const contacts = data?.contacts || [];
  const activity = data?.activity || [];
  const health = stats.healthScore ?? 85;

  const filteredMasterCompliances = masterCompliances.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(complianceSearch.toLowerCase()) ||
                          c.code?.toLowerCase().includes(complianceSearch.toLowerCase());
    const matchesCat = complianceCategoryFilter === 'ALL' || c.category_id === complianceCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      {/* Top Firm Identity Banner */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {firm.display_name}
              </h2>
              <span style={{ padding: '3px 10px', borderRadius: 12, background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600 }}>
                {firm.entity_type_name || 'Organization'}
              </span>
              {/* Section 2.1: Edit Firm Button */}
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✏️ Edit Firm
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Legal: {firm.legal_name} • Industry: {firm.industry || 'General Commerce'}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              {firm.pan && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  PAN: <strong>{firm.pan}</strong>
                </span>
              )}
              {firm.gstin && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  GSTIN: <strong>{firm.gstin}</strong>
                </span>
              )}
              {(firm.cin || firm.cin_llpin) && (
                <span style={{ fontSize: 12, background: '#F1F5F9', padding: '3px 10px', borderRadius: 6, color: '#334155' }}>
                  CIN: <strong>{firm.cin || firm.cin_llpin}</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Compliance Health</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: health > 75 ? '#10B981' : health > 50 ? '#F59E0B' : '#EF4444' }}>
                {health}%
              </div>
            </div>

            <a
              href={`/calendar?firm_id=${firm.id}`}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '9px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                textDecoration: 'none',
              }}
            >
              📅 Firm Calendar
            </a>

            {/* Section 2.3: Permanently Remove Firm Button */}
            {isAdmin && (
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteStep(1);
                  setDeleteConfirmInput('');
                  setDeleteError('');
                }}
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '9px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#DC2626',
                  cursor: 'pointer',
                }}
                title="Permanently remove firm with multi-step confirmation"
              >
                🗑️ Delete Firm
              </button>
            )}
          </div>
        </div>

        {notificationMsg && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: 13 }}>
            ✓ {notificationMsg}
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid #E2E8F0',
          marginBottom: 20,
        }}
      >
        {[
          { id: 'overview', label: 'Overview & KPIs' },
          { id: 'compliances', label: `Applicable Compliances (${compliances.length})` },
          { id: 'tasks', label: `Compliance Tasks (${tasks.length})` },
          { id: 'contacts', label: `Key Contacts (${contacts.length})` },
          { id: 'activity', label: 'Activity Log' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#2563EB' : '#64748B',
              borderBottom: activeTab === t.id ? '2px solid #2563EB' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>TOTAL TASKS</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{stats.total || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>COMPLETED</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginTop: 4 }}>{stats.completed || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>PENDING</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginTop: 4 }}>{stats.pending || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>IN PROGRESS</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6', marginTop: 4 }}>{stats.in_progress || 0}</div>
            </div>
            <div style={{ background: '#FFF', padding: 18, borderRadius: 10, border: stats.overdue > 0 ? '1px solid #FCA5A5' : '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>OVERDUE</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', marginTop: 4 }}>{stats.overdue || 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Recent Tasks */}
            <div style={{ background: '#FFF', padding: 20, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Upcoming Due Dates</h3>
                <button onClick={() => setActiveTab('tasks')} style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  View all ({tasks.length}) →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.slice(0, 6).map((t: any) => (
                  <a
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: '#F8FAFC',
                      textDecoration: 'none',
                      color: '#0F172A',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.compliance_name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Due: {t.due_date} • {t.period}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: t.status === 'completed' ? '#D1FAE5' : t.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: t.status === 'completed' ? '#065F46' : t.status === 'overdue' ? '#991B1B' : '#92400E',
                      }}
                    >
                      {t.status}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Address & Registered Info */}
            <div style={{ background: '#FFF', padding: 20, borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Registered Premises</h3>
                <button onClick={() => setShowEditModal(true)} style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                <div>{firm.registered_address || firm.address_line1 || 'No address specified'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2.2: Tab Content Compliances */}
      {activeTab === 'compliances' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Statutory Compliances Configured for this Firm</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>
                Add, modify or remove compliances specifically for this firm without impacting others.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setComplianceForm({
                    compliance_id: '',
                    override_frequency: '',
                    override_due_day: '',
                    default_department_id: '',
                    default_assignee_id: '',
                    notes: '',
                  });
                  setComplianceError('');
                  setShowComplianceModal(true);
                }}
                style={{
                  background: '#2563EB',
                  color: '#FFF',
                  padding: '8px 16px',
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
                ➕ Add Compliance
              </button>
              <button
                onClick={handleRegenerateCalendar}
                disabled={regenerating}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                }}
              >
                {regenerating ? 'Regenerating...' : '🔄 Regenerate FY Schedule'}
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Compliance</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Frequency</th>
                <th style={{ padding: '10px 12px' }}>Department</th>
                <th style={{ padding: '10px 12px' }}>Assignee</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {compliances.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.compliance_name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>
                      Code: {c.compliance_code} {c.override_due_day ? `• Day: ${c.override_due_day}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#334155' }}>
                      {c.category_name || 'Statutory'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                    {c.override_frequency || c.frequency}
                    {c.override_frequency && (
                      <span style={{ fontSize: 10, color: '#2563EB', marginLeft: 4, fontWeight: 600 }}>(override)</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.department_name || '—'}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.assignee_name || 'Unassigned'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, background: c.enabled === 0 ? '#F1F5F9' : '#ECFDF5', color: c.enabled === 0 ? '#64748B' : '#065F46', fontSize: 11, fontWeight: 600 }}>
                      {c.enabled === 0 ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setComplianceForm({
                          compliance_id: c.compliance_id,
                          override_frequency: c.override_frequency || '',
                          override_due_day: c.override_due_day?.toString() || '',
                          default_department_id: c.override_department_id || c.default_department_id || '',
                          default_assignee_id: c.override_assignee_id || c.default_assignee_id || '',
                          notes: c.notes || '',
                        });
                        setComplianceError('');
                        setShowComplianceModal(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Config
                    </button>
                    <button
                      onClick={() => setComplianceToDelete(c)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid #FECACA',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Compliance Tasks Directory</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Compliance</th>
                <th style={{ padding: '10px 12px' }}>Period</th>
                <th style={{ padding: '10px 12px' }}>Due Date</th>
                <th style={{ padding: '10px 12px' }}>Assignee</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{t.compliance_name}</td>
                  <td style={{ padding: '12px' }}>{t.period}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{t.due_date}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{t.assignee_name || 'Unassigned'}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: t.status === 'completed' ? '#D1FAE5' : t.status === 'overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: t.status === 'completed' ? '#065F46' : t.status === 'overdue' ? '#991B1B' : '#92400E',
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/tasks/${t.id}`} style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                      Open Workspace →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Contacts */}
      {activeTab === 'contacts' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Organization Key Contacts</h3>
          {contacts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No contacts recorded.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {contacts.map((c: any) => (
                <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, background: '#F8FAFC' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{c.designation}</div>
                  <div style={{ marginTop: 12, fontSize: 13, color: '#334155' }}>
                    <div>✉️ {c.email || 'N/A'}</div>
                    <div style={{ marginTop: 4 }}>📞 {c.phone || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Activity */}
      {activeTab === 'activity' && (
        <div style={{ background: '#FFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Firm Audit Activity Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map((a: any) => (
              <div key={a.id} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 18 }}>🛡️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                    {a.action} — {a.user_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{a.entity_name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {formatISTDateTime(a.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2.1: Edit Firm Details Modal */}
      {showEditModal && (
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
              width: '100%',
              maxWidth: 650,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Edit Firm Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {editError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Display Name *</label>
                <input
                  type="text"
                  value={editForm.display_name || ''}
                  onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Legal Name</label>
                <input
                  type="text"
                  value={editForm.legal_name || ''}
                  onChange={e => setEditForm({ ...editForm, legal_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>PAN Number (10 chars)</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={editForm.pan || ''}
                  onChange={e => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>GSTIN (15 chars)</label>
                <input
                  type="text"
                  placeholder="27ABCDE1234F1Z5"
                  value={editForm.gstin || ''}
                  onChange={e => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>CIN / LLPIN</label>
                <input
                  type="text"
                  value={editForm.cin || ''}
                  onChange={e => setEditForm({ ...editForm, cin: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Industry</label>
                <input
                  type="text"
                  value={editForm.industry || ''}
                  onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>



              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Registered Address</label>
                <input
                  type="text"
                  value={editForm.registered_address || ''}
                  onChange={e => setEditForm({ ...editForm, registered_address: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>City</label>
                <input
                  type="text"
                  value={editForm.city || ''}
                  onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>State</label>
                <input
                  type="text"
                  value={editForm.state || ''}
                  onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFirmEdit}
                disabled={editSaving}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: editSaving ? 'not-allowed' : 'pointer' }}
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2.2: Add / Edit Firm Compliance Modal */}
      {showComplianceModal && (
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
              width: '100%',
              maxWidth: 620,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Configure Firm Compliance</h3>
              <button onClick={() => setShowComplianceModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {complianceError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {complianceError}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Statutory Compliance from Master Library *
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Search catalog by name or code..."
                  value={complianceSearch}
                  onChange={e => setComplianceSearch(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />
              </div>

              <select
                value={complianceForm.compliance_id}
                onChange={e => {
                  const selComp = masterCompliances.find(m => m.id === e.target.value);
                  setComplianceForm({
                    ...complianceForm,
                    compliance_id: e.target.value,
                    override_frequency: selComp?.frequency || '',
                    override_due_day: selComp?.due_day?.toString() || '',
                    default_department_id: selComp?.default_department_id || '',
                  });
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
              >
                <option value="">-- Choose a Compliance --</option>
                {filteredMasterCompliances.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) • {c.frequency}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Frequency Override</label>
                <select
                  value={complianceForm.override_frequency}
                  onChange={e => setComplianceForm({ ...complianceForm, override_frequency: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value="">Default from Library</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half-Yearly</option>
                  <option value="annual">Annual</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Due Day Override (Day of Month)</label>
                <input
                  type="number"
                  placeholder="e.g. 7, 11, 20"
                  value={complianceForm.override_due_day}
                  onChange={e => setComplianceForm({ ...complianceForm, override_due_day: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Department</label>
                <select
                  value={complianceForm.default_department_id}
                  onChange={e => setComplianceForm({ ...complianceForm, default_department_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value="">-- Select Department --</option>
                  {departmentsList.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Assigned User</label>
                <select
                  value={complianceForm.default_assignee_id}
                  onChange={e => setComplianceForm({ ...complianceForm, default_assignee_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value="">-- Select Assignee --</option>
                  {usersList
                    .filter(u => !complianceForm.default_department_id || u.department_id === complianceForm.default_department_id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.department_name || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Notes & Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Firm-specific compliance handling instructions..."
                  value={complianceForm.notes}
                  onChange={e => setComplianceForm({ ...complianceForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setShowComplianceModal(false)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompliance}
                disabled={savingCompliance}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, cursor: savingCompliance ? 'not-allowed' : 'pointer' }}
              >
                {savingCompliance ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Compliance Confirmation Modal */}
      {complianceToDelete && (
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
              width: '100%',
              maxWidth: 450,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Remove Compliance</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
              Are you sure you want to remove <strong>{complianceToDelete.compliance_name}</strong> from this firm?
              Future recurring tasks will not be generated for this compliance.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setComplianceToDelete(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveCompliance}
                disabled={removingCompliance}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#DC2626', color: '#FFF', fontWeight: 600, cursor: removingCompliance ? 'not-allowed' : 'pointer' }}
              >
                {removingCompliance ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2.3: Delete Firm Multi-Step Strong Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#991B1B' }}>
                  Permanently Delete Firm
                </h3>
                <div style={{ fontSize: 12, color: '#64748B' }}>Irreversible destructive administrative action</div>
              </div>
            </div>

            {deleteError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {deleteError}
              </div>
            )}

            {deleteStep === 1 ? (
              <div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 14, borderRadius: 8, fontSize: 13, color: '#92400E', lineHeight: 1.5, marginBottom: 18 }}>
                  <strong>Warning:</strong> Deleting <strong>{firm.display_name}</strong> will:
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    <li>Immediately cancel all scheduled compliance tasks</li>
                    <li>Deactivate all firm compliance configurations</li>
                    <li>Remove the firm from active dashboard and calendar views</li>
                    <li>Record a permanent audit trail entry in the system log</li>
                  </ul>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    To confirm deletion, type the exact firm name <span style={{ color: '#DC2626' }}>{firm.display_name}</span>:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={e => setDeleteConfirmInput(e.target.value)}
                    placeholder="Enter exact firm name"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    disabled={deleteConfirmInput.trim() !== (firm.display_name || '').trim()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: deleteConfirmInput.trim() === (firm.display_name || '').trim() ? '#DC2626' : '#E2E8F0',
                      color: deleteConfirmInput.trim() === (firm.display_name || '').trim() ? '#FFF' : '#94A3B8',
                      fontWeight: 700,
                      cursor: deleteConfirmInput.trim() === (firm.display_name || '').trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continue to Final Confirmation →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, marginBottom: 20 }}>
                  Are you absolutely certain you want to proceed? This will permanently remove <strong>{firm.display_name}</strong>. This operation cannot be undone.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={() => setDeleteStep(1)}
                    style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleDeleteFirm}
                    disabled={deletingFirm}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#991B1B',
                      color: '#FFF',
                      fontWeight: 700,
                      cursor: deletingFirm ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deletingFirm ? 'Deleting Permanently...' : 'Yes, Permanently Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
