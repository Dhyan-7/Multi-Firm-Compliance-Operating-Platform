'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function CalendarPage() {
  const { token } = useAuth();
  const [tasksByDate, setTasksByDate] = useState<Record<string, any[]>>({});
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9); // September

  // Filters
  const [firmFilter, setFirmFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [firmsList, setFirmsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Selected Task Action Menu (Popup)
  const [selectedTaskMenu, setSelectedTaskMenu] = useState<any | null>(null);

  // Reschedule Modal
  const [rescheduleTask, setRescheduleTask] = useState<any | null>(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Fetch Filters Options
  useEffect(() => {
    if (!token) return;
    fetch('/api/firms', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setFirmsList(data.firms || []))
      .catch(console.error);

    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDepartmentsList(data.departments || []))
      .catch(console.error);

    fetch('/api/compliance-categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCategoriesList(data.categories || []))
      .catch(console.error);
  }, [token]);

  const fetchCalendarTasks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        firm_id: firmFilter,
        department_id: departmentFilter,
        status: statusFilter,
        category_id: categoryFilter,
      });

      const res = await fetch(`/api/calendar?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTasksByDate(data.byDate || {});
        setTasksList(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch calendar error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarTasks();
  }, [token, year, month, firmFilter, departmentFilter, statusFilter, categoryFilter]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calendar Grid Generation
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: '✓', label: 'Completed' };
      case 'in_progress':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', icon: '⏳', label: 'In Progress' };
      case 'submitted':
      case 'in_review':
        return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', icon: '📤', label: 'Submitted' };
      case 'overdue':
      case 'missed':
      case 'critical':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: '⚠️', label: 'Overdue' };
      case 'pending':
      case 'not_started':
      default:
        return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', icon: '●', label: 'Pending' };
    }
  };

  const openReschedule = (task: any) => {
    setSelectedTaskMenu(null);
    setRescheduleTask(task);
    setNewDate(task.due_date || '');
    setRescheduleReason(task.reschedule_reason || '');
    setRescheduleError('');
  };

  const handleSaveReschedule = async () => {
    if (!token || !rescheduleTask || !newDate) return;
    if (!rescheduleReason.trim()) {
      setRescheduleError('Reason for rescheduling is required');
      return;
    }
    setSavingReschedule(true);
    setRescheduleError('');
    try {
      const res = await fetch('/api/calendar', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_id: rescheduleTask.id,
          new_date: newDate,
          reason: rescheduleReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || 'Failed to reschedule task');
      } else {
        setRescheduleTask(null);
        fetchCalendarTasks();
      }
    } catch (err: any) {
      setRescheduleError(err.message || 'Network error occurred');
    } finally {
      setSavingReschedule(false);
    }
  };

  return (
    <div>
      {/* Top Controls Header */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '16px 24px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handlePrevMonth}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ←
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', minWidth: 180, margin: 0, textAlign: 'center' }}>
            {monthNames[month - 1]} {year}
          </h2>
          <button
            onClick={handleNextMonth}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            →
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Firm Filter */}
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Firms</option>
            {firmsList.map(f => (
              <option key={f.id} value={f.id}>{f.display_name || f.legal_name}</option>
            ))}
          </select>

          {/* Department Filter (Section 1.2) */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Departments</option>
            {departmentsList.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Pending / Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted / In Review</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
          >
            <option value="all">All Categories</option>
            {categoriesList.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: viewMode === 'month' ? '#3B82F6' : '#FFF',
                color: viewMode === 'month' ? '#FFF' : '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: viewMode === 'list' ? '#3B82F6' : '#FFF',
                color: viewMode === 'list' ? '#FFF' : '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              List View ({tasksList.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#64748B', fontSize: 13 }}>Loading statutory calendar...</div>
        </div>
      ) : viewMode === 'month' ? (
        /* Month Grid */
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, color: '#64748B' }}>
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 680 }}>
            {/* Empty prefix cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} style={{ background: '#F8FAFC', borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', opacity: 0.5 }} />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const paddedMonth = month.toString().padStart(2, '0');
              const paddedDay = dayNum.toString().padStart(2, '0');
              const dateKey = `${year}-${paddedMonth}-${paddedDay}`;
              const dayTasks = tasksByDate[dateKey] || [];

              return (
                <div
                  key={dayNum}
                  style={{
                    borderRight: '1px solid #F1F5F9',
                    borderBottom: '1px solid #F1F5F9',
                    padding: '8px',
                    minHeight: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    background: dayTasks.length > 0 ? '#FFFFFF' : '#FAFAFA',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{dayNum}</span>
                    {dayTasks.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB' }}>
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Day Tasks List with Status Colors (Section 1.1) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                    {dayTasks.map(t => {
                      const st = getStatusColor(t.status);
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskMenu(t)}
                          title={`${t.compliance_name} (${t.firm_name}) - ${st.label}`}
                          style={{
                            padding: '4px 6px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: st.bg,
                            color: st.text,
                            border: `1px solid ${st.border}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ marginRight: 4 }}>{st.icon}</span>
                          {t.compliance_name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left', color: '#64748B' }}>
                <th style={{ padding: '10px 12px' }}>Due Date</th>
                <th style={{ padding: '10px 12px' }}>Organization</th>
                <th style={{ padding: '10px 12px' }}>Statutory Compliance</th>
                <th style={{ padding: '10px 12px' }}>Department</th>
                <th style={{ padding: '10px 12px' }}>Assignee</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasksList.map(t => {
                const st = getStatusColor(t.status);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {t.due_date}
                      {t.original_due_date && t.original_due_date !== t.due_date && (
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400 }}>
                          orig: {t.original_due_date}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{t.firm_name}</td>
                    <td style={{ padding: '12px' }}>
                      <div>{t.compliance_name}</div>
                      {t.period && <div style={{ fontSize: 11, color: '#64748B' }}>{t.period}</div>}
                    </td>
                    <td style={{ padding: '12px', color: '#64748B' }}>{t.department_name || '—'}</td>
                    <td style={{ padding: '12px', color: '#64748B' }}>{t.assignee_name || 'Unassigned'}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: st.bg,
                          color: st.text,
                          border: `1px solid ${st.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openReschedule(t)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          background: '#F8FAFC',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Reschedule
                      </button>
                      <a
                        href={`/tasks/${t.id}`}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#EFF6FF',
                          color: '#2563EB',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Task Detail →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 1.3: Calendar Action Menu on Click */}
      {selectedTaskMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedTaskMenu(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E2E8F0',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: getStatusColor(selectedTaskMenu.status).bg,
                    color: getStatusColor(selectedTaskMenu.status).text,
                    border: `1px solid ${getStatusColor(selectedTaskMenu.status).border}`,
                  }}
                >
                  {getStatusColor(selectedTaskMenu.status).label}
                </span>
                <h3 style={{ margin: '8px 0 2px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                  {selectedTaskMenu.compliance_name}
                </h3>
                <div style={{ fontSize: 13, color: '#64748B' }}>{selectedTaskMenu.firm_name}</div>
              </div>
              <button
                onClick={() => setSelectedTaskMenu(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#94A3B8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, fontSize: 12, color: '#475569', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>Due Date:</span>
                <span>{selectedTaskMenu.due_date}</span>
              </div>
              {selectedTaskMenu.department_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Department:</span>
                  <span>{selectedTaskMenu.department_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Assignee:</span>
                <span>{selectedTaskMenu.assignee_name || 'Unassigned'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={`/tasks/${selectedTaskMenu.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#2563EB',
                  color: '#FFF',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                📋 View Task Detail / Workspace
              </a>
              <button
                onClick={() => openReschedule(selectedTaskMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#F1F5F9',
                  color: '#1E293B',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📅 Reschedule Due Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 1.4: Reschedule Modal with Previous Due Date & Mandatory Audit */}
      {rescheduleTask && (
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
              maxWidth: 500,
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
              Reschedule Statutory Due Date
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
              All reschedule actions are logged in the audit trail with IST timestamp and notified to the assignee.
            </p>

            {rescheduleError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {rescheduleError}
              </div>
            )}

            {/* Task Context & Previous Due Date Display (Section 1.4) */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: 14, borderRadius: 8, marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{rescheduleTask.compliance_name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{rescheduleTask.firm_name}</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Previous Due Date:</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>{rescheduleTask.due_date}</span>
              </div>
              {rescheduleTask.original_due_date && rescheduleTask.original_due_date !== rescheduleTask.due_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: '#94A3B8' }}>
                  <span>Original Statutory Due Date:</span>
                  <span>{rescheduleTask.original_due_date}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                New Due Date *
              </label>
              <input
                type="date"
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', fontSize: 14 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Reason for Rescheduling * <span style={{ color: '#EF4444' }}>(Mandatory)</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g., Extension granted by MCA, pending client documentation, auditor review"
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRescheduleTask(null)}
                style={{ background: '#F1F5F9', color: '#475569', padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReschedule}
                disabled={savingReschedule}
                style={{
                  background: '#2563EB',
                  color: '#FFF',
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  cursor: savingReschedule ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                {savingReschedule ? 'Recording in Audit...' : 'Confirm & Log Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
