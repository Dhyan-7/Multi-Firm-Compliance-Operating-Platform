'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function TasksPage() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // all, my, pending, in_progress, submitted, overdue, missed, completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // all, statutory, custom
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // Metadata for filters
  const [firmsList, setFirmsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  // Create Custom Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firm_id: '',
    task_name: '',
    task_description: '',
    department_id: '',
    assignee_id: '',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selection & Bulk Actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkModal, setBulkModal] = useState<'assign' | 'status' | 'reschedule' | null>(null);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkDept, setBulkDept] = useState('');
  const [bulkStatus, setBulkStatus] = useState('in_progress');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkReason, setBulkReason] = useState('Bulk administrative adjustment');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const fetchTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (activeTab === 'my' && user?.id) query.set('assignee_id', user.id);
      else if (activeTab !== 'all') query.set('status', activeTab);

      if (firmFilter !== 'all') query.set('firm_id', firmFilter);
      if (priorityFilter !== 'all') query.set('priority', priorityFilter);
      if (taskTypeFilter !== 'all') query.set('task_type', taskTypeFilter);
      if (departmentFilter !== 'all') query.set('department_id', departmentFilter);
      if (assigneeFilter !== 'all') query.set('assignee_id', assigneeFilter);
      if (dueDateFrom) query.set('due_date_from', dueDateFrom);
      if (dueDateTo) query.set('due_date_to', dueDateTo);
      if (search) query.set('search', search);

      const res = await fetch(`/api/tasks?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, activeTab, firmFilter, priorityFilter, taskTypeFilter, departmentFilter, assigneeFilter, dueDateFrom, dueDateTo, search]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/firms', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => {
        setFirmsList(d.firms || []);
        if (d.firms?.length > 0 && !createForm.firm_id) {
          setCreateForm(prev => ({ ...prev, firm_id: d.firms[0].id }));
        }
      })
      .catch(console.error);

    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setUsersList(d.users || []))
      .catch(console.error);

    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setDepartmentsList(d.departments || []))
      .catch(console.error);
  }, [token]);

  // Handle Create Custom Task
  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.task_name.trim()) {
      setCreateError('Task name is required.');
      return;
    }
    if (!createForm.firm_id) {
      setCreateError('Please select a firm.');
      return;
    }
    if (!createForm.due_date) {
      setCreateError('Due date is required.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_type: 'custom',
          task_name: createForm.task_name.trim(),
          task_description: createForm.task_description.trim(),
          firm_id: createForm.firm_id,
          department_id: createForm.department_id || undefined,
          assignee_id: createForm.assignee_id || undefined,
          priority: createForm.priority,
          due_date: createForm.due_date,
          status: createForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create task');
      } else {
        setActionNotice(`Task "${createForm.task_name}" created successfully!`);
        setShowCreateModal(false);
        setCreateForm({
          firm_id: firmsList[0]?.id || '',
          task_name: '',
          task_description: '',
          department_id: '',
          assignee_id: '',
          priority: 'medium',
          due_date: new Date().toISOString().split('T')[0],
          status: 'pending',
        });
        fetchTasks();
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error creating task');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Quick Priority Change
  const handleUpdatePriority = async (taskId: string, newPriority: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'update_priority',
          priority: newPriority,
        }),
      });
      if (res.ok) {
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, priority: newPriority } : t))
        );
      }
    } catch (err) {
      console.error('Priority update error:', err);
    }
  };

  // Handle Select All
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map(t => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(prev => [...prev, id]);
    } else {
      setSelectedTaskIds(prev => prev.filter(item => item !== id));
    }
  };

  // Execute Bulk Action
  const executeBulkAction = async () => {
    if (!token || selectedTaskIds.length === 0 || !bulkModal) return;
    setBulkProcessing(true);
    setActionNotice('');

    try {
      const payload: any = { task_ids: selectedTaskIds };
      if (bulkModal === 'assign') {
        payload.action = 'assign';
        payload.assignee_id = bulkAssignee || undefined;
        payload.department_id = bulkDept || undefined;
      } else if (bulkModal === 'status') {
        payload.action = 'status';
        payload.status = bulkStatus;
      } else if (bulkModal === 'reschedule') {
        payload.action = 'reschedule';
        payload.due_date = bulkDueDate;
        payload.reason = bulkReason;
      }

      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setActionNotice(data.message || 'Bulk operation completed.');
        setSelectedTaskIds([]);
        setBulkModal(null);
        fetchTasks();
      } else {
        alert(data.error || 'Bulk operation failed.');
      }
    } catch (err) {
      console.error('Bulk action error:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

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
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Compliance Tasks & Filings Workspace
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Monitor statutory deliverables, assign responsibility, track execution stages, and execute bulk operations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
        >
          <span>+</span> Create Custom Task
        </button>

        {actionNotice && (
          <div style={{ width: '100%', marginTop: 8, padding: '8px 14px', background: '#ECFDF5', color: '#065F46', borderRadius: 8, fontSize: 13, border: '1px solid #A7F3D0' }}>
            ✓ {actionNotice}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', marginBottom: 18, overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'my', label: 'My Assigned Tasks' },
          { id: 'pending', label: 'Pending' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'submitted', label: 'Awaiting Review' },
          { id: 'overdue', label: '⚠️ Overdue' },
          { id: 'missed', label: '✕ Missed' },
          { id: 'completed', label: '✓ Completed' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? (tab.id === 'overdue' ? '#DC2626' : '#2563EB') : '#64748B',
              borderBottom: activeTab === tab.id ? `2px solid ${tab.id === 'overdue' ? '#DC2626' : '#2563EB'}` : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search task, firm, or statutory code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
        />

        <select
          value={firmFilter}
          onChange={e => setFirmFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Firms</option>
          {firmsList.map(f => (
            <option key={f.id} value={f.id}>{f.display_name}</option>
          ))}
        </select>

        <select
          value={taskTypeFilter}
          onChange={e => setTaskTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Task Types</option>
          <option value="statutory">Statutory Compliance</option>
          <option value="custom">Custom Tasks</option>
        </select>

        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Departments</option>
          {departmentsList.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Assignees</option>
          {usersList.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} {u.department_name ? `(${u.department_name})` : ''}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Due:</span>
          <input
            type="date"
            value={dueDateFrom}
            onChange={e => setDueDateFrom(e.target.value)}
            title="Due Date From"
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: '#64748B' }}>to</span>
          <input
            type="date"
            value={dueDateTo}
            onChange={e => setDueDateTo(e.target.value)}
            title="Due Date To"
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
          />
          {(dueDateFrom || dueDateTo) && (
            <button
              onClick={() => { setDueDateFrom(''); setDueDateTo(''); }}
              style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
              title="Clear date filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Floating Bar */}
      {selectedTaskIds.length > 0 && (
        <div
          style={{
            background: '#0F172A',
            color: '#FFF',
            padding: '12px 20px',
            borderRadius: 10,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 600 }}>
            <span>✓ {selectedTaskIds.length} tasks selected</span>
            <button
              onClick={() => setSelectedTaskIds([])}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Deselect All
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setBulkModal('assign')}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#3B82F6', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Bulk Assign
            </button>
            <button
              onClick={() => setBulkModal('status')}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#10B981', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Bulk Change Status
            </button>
            <button
              onClick={() => setBulkModal('reschedule')}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#F59E0B', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Bulk Reschedule
            </button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No compliance tasks found</div>
            <div style={{ fontSize: 12 }}>No tasks match current filter criteria.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '12px', width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                    onChange={e => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ padding: '12px' }}>Organization</th>
                <th style={{ padding: '12px' }}>Task / Compliance Item</th>
                <th style={{ padding: '12px' }}>Period</th>
                <th style={{ padding: '12px' }}>Due Date</th>
                <th style={{ padding: '12px' }}>Assignee</th>
                <th style={{ padding: '12px' }}>Priority</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Workspace</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const isOverdue = t.status === 'overdue';
                const isSelected = selectedTaskIds.includes(t.id);
                const isCustom = t.task_type === 'custom';
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isSelected ? '#EFF6FF' : isOverdue ? '#FFFBFB' : '#FFFFFF',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => handleSelectRow(t.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>
                      {t.firm_name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {isCustom ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#EDE9FE', color: '#6D28D9' }}>
                            CUSTOM
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#E0F2FE', color: '#0369A1' }}>
                            STATUTORY
                          </span>
                        )}
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>
                          {isCustom ? (t.task_name || 'Untitled Custom Task') : t.compliance_name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {isCustom ? (
                          t.task_description ? (t.task_description.length > 50 ? t.task_description.substring(0, 50) + '...' : t.task_description) : 'Non-statutory task'
                        ) : (
                          <>Code: {t.compliance_code || 'N/A'} {t.category_name ? `• ${t.category_name}` : ''}</>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{t.period || '—'}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: isOverdue ? '#DC2626' : '#0F172A' }}>
                      {t.due_date} {isOverdue && '⚠️'}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {t.assignee_name ? (
                        <div>
                          <div>{t.assignee_name}</div>
                          {t.department_name && <div style={{ fontSize: 10, color: '#94A3B8' }}>({t.department_name})</div>}
                        </div>
                      ) : (
                        <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={t.priority || 'medium'}
                        onChange={e => handleUpdatePriority(t.id, e.target.value)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          background:
                            t.priority === 'critical'
                              ? '#FEE2E2'
                              : t.priority === 'high'
                              ? '#FFEDD5'
                              : t.priority === 'medium'
                              ? '#EFF6FF'
                              : '#F8FAFC',
                          color:
                            t.priority === 'critical'
                              ? '#991B1B'
                              : t.priority === 'high'
                              ? '#C2410C'
                              : t.priority === 'medium'
                              ? '#1D4ED8'
                              : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background:
                            t.status === 'completed'
                              ? '#D1FAE5'
                              : t.status === 'overdue'
                              ? '#FEE2E2'
                              : t.status === 'submitted'
                              ? '#EDE9FE'
                              : '#FEF3C7',
                          color:
                            t.status === 'completed'
                              ? '#065F46'
                              : t.status === 'overdue'
                              ? '#991B1B'
                              : t.status === 'submitted'
                              ? '#5B21B6'
                              : '#92400E',
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <a
                        href={`/tasks/${t.id}`}
                        style={{
                          background: '#EFF6FF',
                          color: '#2563EB',
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Open Workspace →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Custom Task Modal */}
      {showCreateModal && (
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
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Create Custom Task
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 13, border: '1px solid #FCA5A5' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Internal Audit Reconciliation Q3"
                    value={createForm.task_name}
                    onChange={e => setCreateForm({ ...createForm, task_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Description / Scope
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of task deliverables and expectations..."
                    value={createForm.task_description}
                    onChange={e => setCreateForm({ ...createForm, task_description: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Firm *
                  </label>
                  <select
                    required
                    value={createForm.firm_id}
                    onChange={e => setCreateForm({ ...createForm, firm_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select Firm...</option>
                    {firmsList.map(f => (
                      <option key={f.id} value={f.id}>{f.display_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Department
                    </label>
                    <select
                      value={createForm.department_id}
                      onChange={e => setCreateForm({ ...createForm, department_id: e.target.value, assignee_id: '' })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">All / Any Department</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Assignee User
                    </label>
                    <select
                      value={createForm.assignee_id}
                      onChange={e => setCreateForm({ ...createForm, assignee_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">Unassigned</option>
                      {usersList
                        .filter(u => !createForm.department_id || u.department_id === createForm.department_id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.department_name ? `(${u.department_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Priority
                    </label>
                    <select
                      value={createForm.priority}
                      onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.due_date}
                      onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Initial Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={e => setCreateForm({ ...createForm, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    cursor: createSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {createSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Modals */}
      {bulkModal && (
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
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              {bulkModal === 'assign' && `Bulk Assign ${selectedTaskIds.length} Tasks`}
              {bulkModal === 'status' && `Update Status for ${selectedTaskIds.length} Tasks`}
              {bulkModal === 'reschedule' && `Bulk Reschedule ${selectedTaskIds.length} Tasks`}
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
              Action applies immediately to all checked compliance items.
            </p>

            {bulkModal === 'assign' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Assignee User
                  </label>
                  <select
                    value={bulkAssignee}
                    onChange={e => setBulkAssignee(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select Assignee User...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role_name || u.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Department
                  </label>
                  <select
                    value={bulkDept}
                    onChange={e => setBulkDept(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select Department...</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {bulkModal === 'status' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  New Task Status
                </label>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted (Awaiting Review)</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}

            {bulkModal === 'reschedule' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    New Statutory Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bulkDueDate}
                    onChange={e => setBulkDueDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Reason for Bulk Reschedule
                  </label>
                  <textarea
                    rows={2}
                    value={bulkReason}
                    onChange={e => setBulkReason(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setBulkModal(null)}
                style={{ background: '#F1F5F9', color: '#475569', padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                disabled={bulkProcessing}
                style={{
                  background: '#3B82F6',
                  color: '#FFF',
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkProcessing ? 'Processing...' : 'Apply Bulk Operation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
