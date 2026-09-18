'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/layout/AppLayout';
import { formatISTShort, formatISTDate } from '@/lib/dateUtils';

function TasksContent() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Category Counts from Database
  const [counts, setCounts] = useState({
    all: 0,
    my: 0,
    pending: 0,
    in_progress: 0,
    submitted: 0,
    overdue: 0,
    missed: 0,
    completed: 0,
  });

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // all, my, pending, in_progress, submitted, overdue, missed, completed
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('all');
  const [complianceFilter, setComplianceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all'); // all, statutory, custom
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // Metadata for filters
  const [firmsList, setFirmsList] = useState<any[]>([]);
  const [compliancesList, setCompliancesList] = useState<any[]>([]);
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
  const [bulkMode, setBulkMode] = useState<'direct' | 'dept'>('direct');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkDept, setBulkDept] = useState('');
  const [bulkStatus, setBulkStatus] = useState('in_progress');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkReason, setBulkReason] = useState('Bulk administrative adjustment');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  // Sync with searchParams on initial load or URL change
  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('status');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    const compParam = searchParams.get('compliance_id') || searchParams.get('compliance');
    if (compParam) {
      setComplianceFilter(compParam);
    }
    const firmParam = searchParams.get('firm_id') || searchParams.get('firm');
    if (firmParam) {
      setFirmFilter(firmParam);
    }
  }, [searchParams]);

  const fetchTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (activeTab === 'my') {
        query.set('status', 'my');
      } else if (activeTab !== 'all') {
        query.set('status', activeTab);
      }

      if (firmFilter !== 'all') query.set('firm_id', firmFilter);
      if (complianceFilter !== 'all') query.set('compliance_id', complianceFilter);
      if (priorityFilter !== 'all') query.set('priority', priorityFilter);
      if (taskTypeFilter !== 'all') query.set('task_type', taskTypeFilter);
      if (departmentFilter !== 'all') query.set('department_id', departmentFilter);
      if (assigneeFilter !== 'all') query.set('assignee_id', assigneeFilter);
      if (dueDateFrom) query.set('due_date_from', dueDateFrom);
      if (dueDateTo) query.set('due_date_to', dueDateTo);
      if (search.trim()) query.set('search', search.trim());

      const res = await fetch(`/api/tasks?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, activeTab, firmFilter, complianceFilter, priorityFilter, taskTypeFilter, departmentFilter, assigneeFilter, dueDateFrom, dueDateTo, search]);

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

    fetch('/api/compliances', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setCompliancesList(d.compliances || []))
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
      setCreateError('Please select an organization/firm.');
      return;
    }
    if (!createForm.due_date) {
      setCreateError('Valid statutory/internal due date is required.');
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

  // Filtered users for bulk assign: Option A vs Option B
  const assignableUsers = useMemo(() => {
    if (bulkMode === 'dept' && bulkDept) {
      return usersList.filter(u => u.department_id === bulkDept);
    }
    return usersList;
  }, [bulkMode, bulkDept, usersList]);

  // Execute Bulk Action
  const executeBulkAction = async () => {
    if (!token || selectedTaskIds.length === 0 || !bulkModal) return;

    if (bulkModal === 'assign') {
      if (!bulkAssignee) {
        alert('Please select a specific employee to assign the selected tasks to.');
        return;
      }
    }

    setBulkProcessing(true);
    setActionNotice('');

    try {
      const payload: any = { task_ids: selectedTaskIds };
      if (bulkModal === 'assign') {
        payload.action = 'assign';
        payload.assignee_id = bulkAssignee;
        const selectedUser = usersList.find(u => u.id === bulkAssignee);
        payload.department_id = bulkDept || selectedUser?.department_id || undefined;
      } else if (bulkModal === 'status') {
        payload.action = 'status';
        payload.status = bulkStatus;
      } else if (bulkModal === 'reschedule') {
        if (!bulkDueDate) {
          alert('Please enter a valid rescheduled due date.');
          setBulkProcessing(false);
          return;
        }
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
        setBulkAssignee('');
        setBulkDept('');
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

  const clearAllFilters = () => {
    setSearch('');
    setActiveTab('all');
    setFirmFilter('all');
    setComplianceFilter('all');
    setPriorityFilter('all');
    setTaskTypeFilter('all');
    setDepartmentFilter('all');
    setAssigneeFilter('all');
    setDueDateFrom('');
    setDueDateTo('');
  };

  const isAnyFilterActive = search || activeTab !== 'all' || firmFilter !== 'all' || complianceFilter !== 'all' || priorityFilter !== 'all' || taskTypeFilter !== 'all' || departmentFilter !== 'all' || assigneeFilter !== 'all' || dueDateFrom || dueDateTo;

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

      {/* 8 Clickable Category Tabs with Dynamic Live Database Counts */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #E2E8F0', marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { id: 'all', label: `All Tasks — ${counts.all}`, color: '#2563EB' },
          { id: 'my', label: `My Assigned Tasks — ${counts.my}`, color: '#2563EB' },
          { id: 'pending', label: `Pending — ${counts.pending}`, color: '#F59E0B' },
          { id: 'in_progress', label: `In Progress — ${counts.in_progress}`, color: '#0284C7' },
          { id: 'submitted', label: `Awaiting Review — ${counts.submitted}`, color: '#8B5CF6' },
          { id: 'overdue', label: `⚠️ Overdue — ${counts.overdue}`, color: '#DC2626' },
          { id: 'missed', label: `✕ Missed — ${counts.missed}`, color: '#881337' },
          { id: 'completed', label: `✓ Completed — ${counts.completed}`, color: '#10B981' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: activeTab === tab.id ? '#F8FAFC' : 'transparent',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? tab.color : '#64748B',
              borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Real Multi-field Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Search task name, compliance, firm, assignee, department, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 34px 9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 14 }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Firm Filter */}
        <select
          value={firmFilter}
          onChange={e => setFirmFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Organizations / Firms</option>
          {firmsList.map(f => (
            <option key={f.id} value={f.id}>{f.display_name}</option>
          ))}
        </select>

        {/* Dynamic Compliance Filter */}
        <select
          value={complianceFilter}
          onChange={e => setComplianceFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF', maxWidth: 220 }}
          title="Filter by Statutory Compliance"
        >
          <option value="all">All Compliances (Master)</option>
          {compliancesList.map(c => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code} — ` : ''}{c.name}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Departments</option>
          {departmentsList.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Assignee Filter formatted as Username (Department) */}
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Assignees</option>
          {usersList.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.department_name || 'General'})
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Task Type Filter */}
        <select
          value={taskTypeFilter}
          onChange={e => setTaskTypeFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
        >
          <option value="all">All Task Types</option>
          <option value="statutory">Statutory Compliance</option>
          <option value="custom">Custom Tasks</option>
        </select>

        {/* Due Date Range */}
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

        {/* Clear All Filters Button */}
        {isAnyFilterActive && (
          <button
            onClick={clearAllFilters}
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#475569',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕ Reset Filters
          </button>
        )}
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
              onClick={() => { setBulkModal('assign'); setBulkMode('direct'); }}
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
            <div style={{ color: '#64748B', fontSize: 13 }}>Loading tasks from CompliCal engine...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No results found</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              {search ? `No compliance tasks match "${search}". Try checking for spelling or clear search filters.` : 'No tasks match current filter criteria.'}
            </div>
            {isAnyFilterActive && (
              <button
                onClick={clearAllFilters}
                style={{
                  marginTop: 16,
                  padding: '8px 16px',
                  background: '#2563EB',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset All Filters
              </button>
            )}
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
              {tasks.map((task: any) => {
                const isSelected = selectedTaskIds.includes(task.id);
                return (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: isSelected ? '#F0F9FF' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => handleSelectRow(task.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{task.firm_name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{task.task_number || task.id}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{task.compliance_name}</div>
                      <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        {task.category_name && (
                          <span style={{ color: task.category_color || '#3B82F6', fontWeight: 600 }}>
                            {task.category_name}
                          </span>
                        )}
                        {task.compliance_code && <span>• {task.compliance_code}</span>}
                        {task.task_type === 'custom' && (
                          <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                            CUSTOM
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {task.period || 'Annual / FY 26-27'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: task.status !== 'completed' && task.due_date < new Date().toISOString().split('T')[0] ? '#DC2626' : '#0F172A' }}>
                        {formatISTDate(task.due_date)}
                      </div>
                      {task.status !== 'completed' && task.due_date < new Date().toISOString().split('T')[0] && (
                        <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>OVERDUE</div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {task.assignee_name ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{task.assignee_name}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{task.department_name || 'General'}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={task.priority || 'medium'}
                        onChange={e => handleUpdatePriority(task.id, e.target.value)}
                        style={{
                          padding: '3px 6px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          border: '1px solid #CBD5E1',
                          background: task.priority === 'critical' ? '#FEE2E2' : task.priority === 'high' ? '#FFEDD5' : task.priority === 'medium' ? '#FEF3C7' : '#F1F5F9',
                          color: task.priority === 'critical' ? '#991B1B' : task.priority === 'high' ? '#C2410C' : task.priority === 'medium' ? '#B45309' : '#475569',
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
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background:
                            task.status === 'completed' ? '#DCFCE7' :
                            task.status === 'submitted' ? '#EDE9FE' :
                            task.status === 'in_progress' ? '#E0F2FE' :
                            task.status === 'overdue' || (task.status !== 'completed' && task.due_date < new Date().toISOString().split('T')[0]) ? '#FEE2E2' :
                            task.status === 'missed' ? '#FFE4E6' : '#FEF3C7',
                          color:
                            task.status === 'completed' ? '#166534' :
                            task.status === 'submitted' ? '#5B21B6' :
                            task.status === 'in_progress' ? '#0369A1' :
                            task.status === 'overdue' || (task.status !== 'completed' && task.due_date < new Date().toISOString().split('T')[0]) ? '#991B1B' :
                            task.status === 'missed' ? '#881337' : '#B45309',
                        }}
                      >
                        {task.status === 'submitted' ? 'Awaiting Review' : task.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <a
                        href={`/tasks/${task.id}`}
                        style={{
                          background: '#EFF6FF',
                          color: '#2563EB',
                          padding: '5px 12px',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-block',
                          border: '1px solid #BFDBFE',
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
              maxWidth: 520,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              Create Custom Compliance Task
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>
              Schedule ad-hoc regulatory assignments, internal reviews, or operational deadlines.
            </p>

            {createError && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Organization / Firm *
                  </label>
                  <select
                    required
                    value={createForm.firm_id}
                    onChange={e => setCreateForm({ ...createForm, firm_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    {firmsList.map(f => (
                      <option key={f.id} value={f.id}>{f.display_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quarterly Board Resolution for Banking"
                    value={createForm.task_name}
                    onChange={e => setCreateForm({ ...createForm, task_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Description & Statutory Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detailed compliance requirement or internal instructions..."
                    value={createForm.task_description}
                    onChange={e => setCreateForm({ ...createForm, task_description: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Department
                    </label>
                    <select
                      value={createForm.department_id}
                      onChange={e => setCreateForm({ ...createForm, department_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">Select Department...</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Assignee Employee
                    </label>
                    <select
                      value={createForm.assignee_id}
                      onChange={e => setCreateForm({ ...createForm, assignee_id: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">Select Assignee...</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.department_name || 'General'})
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

      {/* Bulk Operations Modal */}
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
              maxWidth: 520,
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

            {/* Bulk Assign: Option A (Direct User) vs Option B (Department -> User) */}
            {bulkModal === 'assign' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {/* Workflow Selector */}
                <div style={{ display: 'flex', gap: 10, background: '#F8FAFC', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: bulkMode === 'direct' ? '#2563EB' : '#64748B', flex: 1 }}>
                    <input
                      type="radio"
                      name="bulkAssignMode"
                      checked={bulkMode === 'direct'}
                      onChange={() => { setBulkMode('direct'); setBulkDept(''); }}
                    />
                    Option A — Direct User
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: bulkMode === 'dept' ? '#2563EB' : '#64748B', flex: 1 }}>
                    <input
                      type="radio"
                      name="bulkAssignMode"
                      checked={bulkMode === 'dept'}
                      onChange={() => { setBulkMode('dept'); setBulkAssignee(''); }}
                    />
                    Option B — Department → User
                  </label>
                </div>

                {bulkMode === 'dept' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      1. Select Department *
                    </label>
                    <select
                      value={bulkDept}
                      onChange={e => {
                        setBulkDept(e.target.value);
                        setBulkAssignee(''); // reset user selection so specific employee is chosen
                      }}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">Choose Department...</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    {bulkMode === 'dept' ? '2. Select Specific Employee from Department *' : 'Select Assignee User *'}
                  </label>
                  <select
                    value={bulkAssignee}
                    onChange={e => setBulkAssignee(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select Assignee Employee...</option>
                    {assignableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.department_name || 'General'})
                      </option>
                    ))}
                  </select>
                  {bulkMode === 'dept' && bulkDept && assignableUsers.length === 0 && (
                    <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>
                      ⚠️ No employees currently assigned to this department.
                    </div>
                  )}
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
                    Reason for Bulk Reschedule *
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

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: '#64748B', fontSize: 13 }}>Initializing workspace...</div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  );
}
