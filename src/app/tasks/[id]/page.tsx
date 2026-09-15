'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/components/layout/AppLayout';

export default function TaskWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // MIS State
  const [mis, setMis] = useState({
    filing_date: '',
    acknowledgement_number: '',
    tax_amount: '',
    challan_number: '',
    bank_name: '',
    payment_date: '',
  });
  const [savingMis, setSavingMis] = useState(false);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Tax Challan / Receipt');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Comment State
  const [newComment, setNewComment] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  // Rejection & Approval Modal
  const [actionModal, setActionModal] = useState<'reject' | 'approve' | 'reschedule' | 'reassign' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [reassignUserId, setReassignUserId] = useState('');
  const [rejectReassignUserId, setRejectReassignUserId] = useState('');
  const [rejectReassignDeptId, setRejectReassignDeptId] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [actionProcessing, setActionProcessing] = useState(false);

  const fetchTask = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const taskData = await res.json();
        setData(taskData);

        // Populate MIS from records if present
        if (taskData.mis && Array.isArray(taskData.mis)) {
          const mapped: any = {};
          taskData.mis.forEach((m: any) => {
            mapped[m.field_name] = m.field_value;
          });
          setMis(prev => ({ ...prev, ...mapped }));
        }
      }
    } catch (err) {
      console.error('Fetch task error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setUsersList(d.users || []))
      .catch(console.error);

    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => setDepartmentsList(d.departments || []))
      .catch(console.error);
  }, [token]);

  // Execute workflow action
  const handleWorkflowAction = async (action: string, payload: any = {}) => {
    if (!token) return;

    if (action === 'submit') {
      // Mandatory MIS validation for statutory compliance
      const isCustom = task.task_type === 'custom';
      if (!isCustom) {
        if (!mis.filing_date?.trim()) {
          alert('Mandatory Statutory Requirement: Please provide and save the Filing Date in the MIS section before submitting for review.');
          return;
        }
        if (!mis.acknowledgement_number?.trim()) {
          alert('Mandatory Statutory Requirement: Please provide and save the Acknowledgement / Filing Reference Number before submitting for review.');
          return;
        }
      }
    }

    setActionProcessing(true);
    setNotice('');
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });

      const resData = await res.json();
      if (res.ok) {
        setNotice(resData.message || 'Action completed.');
        setActionModal(null);
        fetchTask();
      } else {
        alert(resData.error || 'Action failed');
      }
    } catch (err) {
      console.error('Workflow action error:', err);
    } finally {
      setActionProcessing(false);
    }
  };

  // Save MIS Data
  const handleSaveMis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!mis.filing_date) {
      alert('Statutory Filing Date is mandatory to record an official filing.');
      return;
    }
    setSavingMis(true);
    setNotice('');
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'save_mis',
          mis,
          updateStatus: true,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setNotice('MIS filing information saved successfully.');
        fetchTask();
      } else {
        alert(resData.error || 'Failed to save MIS filing');
      }
    } catch (err) {
      console.error('Save MIS error:', err);
    } finally {
      setSavingMis(false);
    }
  };

  // Upload Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!uploadFile) {
      alert('Please select a file to upload.');
      return;
    }
    if (uploadFile.size > 25 * 1024 * 1024) {
      alert('File exceeds the maximum allowed size of 25MB.');
      return;
    }
    setUploadingDoc(true);
    setNotice('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('task_id', id);
      formData.append('document_type', docType);

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setNotice('Document uploaded successfully.');
        setUploadFile(null);
        fetchTask();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Document upload error:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle Comment Attachment Pick
  const handleCommentAttachmentPick = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('Image/Attachment exceeds 10MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCommentAttachment({
        name: file.name,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || (!newComment.trim() && !commentAttachment)) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add_comment',
          comment: newComment.trim(),
          attachment_url: commentAttachment?.dataUrl || null,
          attachment_name: commentAttachment?.name || null,
        }),
      });

      if (res.ok) {
        setNewComment('');
        setCommentAttachment(null);
        fetchTask();
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const task = data?.task || {};
  const documents = data?.documents || [];
  const comments = data?.comments || [];
  const activity = data?.activity || [];

  // Workflow Stages
  const stages = [
    { key: 'not_started', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'completed', label: 'Approved & Completed' },
  ];

  const getStageIndex = (status: string) => {
    if (status === 'completed') return 3;
    if (status === 'submitted') return 2;
    if (status === 'in_progress') return 1;
    return 0;
  };

  const currentStageIdx = getStageIndex(task.status);
  const isCustom = task.task_type === 'custom';

  return (
    <div>
      {/* Navigation Back Button */}
      <div style={{ marginBottom: 14 }}>
        <a
          href="/tasks"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#2563EB',
            textDecoration: 'none',
            background: '#FFFFFF',
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          ← Back to Tasks Workspace
        </a>
      </div>

      {/* Top Task Header Banner */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, background: isCustom ? '#EDE9FE' : '#F1F5F9', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: isCustom ? '#6D28D9' : '#475569' }}>
                {isCustom ? 'CUSTOM TASK' : (task.compliance_code || 'COMPLIANCE')}
              </span>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {isCustom ? (task.task_name || 'Custom Task') : task.compliance_name}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background:
                    task.status === 'completed'
                      ? '#D1FAE5'
                      : task.status === 'overdue'
                      ? '#FEE2E2'
                      : task.status === 'submitted'
                      ? '#EDE9FE'
                      : '#FEF3C7',
                  color:
                    task.status === 'completed'
                      ? '#065F46'
                      : task.status === 'overdue'
                      ? '#991B1B'
                      : task.status === 'submitted'
                      ? '#5B21B6'
                      : '#92400E',
                  textTransform: 'uppercase',
                }}
              >
                {task.status}
              </span>
            </div>

            {isCustom && task.task_description && (
              <p style={{ fontSize: 13, color: '#475569', margin: '8px 0 0', background: '#F8FAFC', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                {task.task_description}
              </p>
            )}

            <div style={{ fontSize: 13, color: '#64748B', marginTop: 8 }}>
              Organization: <strong style={{ color: '#0F172A' }}>{task.firm_name}</strong> • Period: <strong>{task.period || '—'}</strong> • Due Date: <strong style={{ color: task.status === 'overdue' ? '#DC2626' : '#0F172A' }}>{task.due_date}</strong>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {task.status !== 'completed' && task.status !== 'submitted' && (
              <button
                onClick={() => handleWorkflowAction('submit')}
                style={{
                  background: '#3B82F6',
                  color: '#FFF',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                📤 Submit for Review
              </button>
            )}

            {task.status === 'submitted' && (
              <>
                <button
                  onClick={() => setActionModal('approve')}
                  style={{
                    background: '#10B981',
                    color: '#FFF',
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Approve Filing
                </button>
                <button
                  onClick={() => setActionModal('reject')}
                  style={{
                    background: '#EF4444',
                    color: '#FFF',
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Request Changes
                </button>
              </>
            )}

            <button
              onClick={() => {
                setNewDate(task.due_date);
                setActionModal('reschedule');
              }}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#334155',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📅 Reschedule
            </button>

            <button
              onClick={() => setActionModal('reassign')}
              style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                color: '#334155',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              👤 Reassign
            </button>
          </div>
        </div>

        {notice && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, fontSize: 13 }}>
            ✓ {notice}
          </div>
        )}

        {/* 8-Stage Workflow Progress Stepper */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {stages.map((stage, idx) => {
              const isPast = idx <= currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: isPast ? '#10B981' : '#F1F5F9',
                      color: isPast ? '#FFF' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                      border: isCurrent ? '3px solid #93C5FD' : 'none',
                    }}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0F172A' : '#64748B', marginTop: 6, textAlign: 'center' }}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Left = MIS & Docs; Right = Meta, Comments, Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 20 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Section 1: MIS Submission Form */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Statutory MIS & Filing Data
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '3px 0 0' }}>
                  Record acknowledgement numbers, tax payments, and challan references.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMis}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Filing Date
                  </label>
                  <input
                    type="date"
                    value={mis.filing_date}
                    onChange={e => setMis({ ...mis, filing_date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Acknowledgement / Filing Ref No
                  </label>
                  <input
                    type="text"
                    value={mis.acknowledgement_number}
                    onChange={e => setMis({ ...mis, acknowledgement_number: e.target.value })}
                    placeholder="e.g. ACK-2026-987654"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Tax / Statutory Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={mis.tax_amount}
                    onChange={e => setMis({ ...mis, tax_amount: e.target.value })}
                    placeholder="₹ 0.00"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Challan Number / CIN
                  </label>
                  <input
                    type="text"
                    value={mis.challan_number}
                    onChange={e => setMis({ ...mis, challan_number: e.target.value })}
                    placeholder="e.g. CHN-88765"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Remittance Bank Name
                  </label>
                  <input
                    type="text"
                    value={mis.bank_name}
                    onChange={e => setMis({ ...mis, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank Ltd"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={mis.payment_date}
                    onChange={e => setMis({ ...mis, payment_date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={savingMis}
                  style={{
                    background: '#0F172A',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: savingMis ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingMis ? 'Saving MIS...' : '💾 Save MIS Data'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Real Document Upload & Repository */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
              Supporting Documents & Receipts ({documents.length})
            </h3>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px' }}>
              Upload statutory acknowledgements, tax challans, and approved returns.
            </p>

            {/* Upload form */}
            <form onSubmit={handleUploadDocument} style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
              >
                <option value="Statutory Return">Statutory Return</option>
                <option value="Tax Challan / Receipt">Tax Challan / Receipt</option>
                <option value="Filing Acknowledgement">Filing Acknowledgement</option>
                <option value="Audited Computation">Audited Computation</option>
              </select>

              <input
                type="file"
                required
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                style={{ flex: 1, padding: '6px', fontSize: 13 }}
              />

              <button
                type="submit"
                disabled={uploadingDoc || !uploadFile}
                style={{
                  background: '#3B82F6',
                  color: '#FFF',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: uploadingDoc || !uploadFile ? 'not-allowed' : 'pointer',
                }}
              >
                {uploadingDoc ? 'Uploading...' : 'Upload File'}
              </button>
            </form>

            {/* Document list */}
            {documents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', border: '1px dashed #E2E8F0', borderRadius: 8 }}>
                No documents uploaded yet. Upload challans or return PDFs above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {documents.map((d: any) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#F8FAFC',
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{d.file_name}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {d.document_type} • {(d.file_size / 1024).toFixed(1)} KB • Uploaded by {d.uploader_name || 'Staff'}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/api/documents/${d.id}/download`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#EFF6FF',
                        color: '#2563EB',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Download ⬇
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Meta Info, Comments, Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Assignment Details Card */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Assignment & Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Primary Assignee:</span>
                <strong style={{ color: '#0F172A' }}>{task.assignee_name || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Reviewer / QA:</span>
                <strong style={{ color: '#0F172A' }}>{task.reviewer_name || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Department:</span>
                <strong style={{ color: '#0F172A' }}>{task.department_name || 'Finance & Accounts'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Statutory Frequency:</span>
                <strong style={{ color: '#0F172A' }}>Monthly</strong>
              </div>
            </div>
          </div>

          {/* Comments Discussion Section */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Discussion & Audit Notes</h3>

            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {comments.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', padding: 12 }}>
                  No comments yet.
                </div>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} style={{ background: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                      <strong style={{ color: '#0F172A' }}>{c.user_name || 'Staff'}</strong>
                      <span>{new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap' }}>{c.comment}</div>

                    {c.attachment_url && (
                      <div style={{ marginTop: 8 }}>
                        {c.attachment_url.startsWith('data:image/') ? (
                          <a href={c.attachment_url} target="_blank" rel="noreferrer">
                            <img
                              src={c.attachment_url}
                              alt={c.attachment_name || 'Attachment'}
                              style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, border: '1px solid #CBD5E1', objectFit: 'contain', display: 'block' }}
                            />
                            <span style={{ fontSize: 11, color: '#2563EB', marginTop: 2, display: 'inline-block' }}>🔍 View Full Image</span>
                          </a>
                        ) : (
                          <a
                            href={c.attachment_url}
                            download={c.attachment_name || 'attachment'}
                            style={{ fontSize: 12, color: '#2563EB', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            📎 {c.attachment_name || 'Download Attachment'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment}>
              {commentAttachment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#EFF6FF', borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: '#1D4ED8', fontWeight: 600 }}>📎 {commentAttachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setCommentAttachment(null)}
                    style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Write a comment or audit note..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13 }}
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                  title="Attach screenshot or document"
                >
                  📎
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files?.[0]) handleCommentAttachmentPick(e.target.files[0]);
                    }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={postingComment || (!newComment.trim() && !commentAttachment)}
                  style={{
                    background: '#3B82F6',
                    color: '#FFF',
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: postingComment || (!newComment.trim() && !commentAttachment) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Post
                </button>
              </div>
            </form>
          </div>

          {/* Activity Timeline */}
          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 14px' }}>Task Activity Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
              {activity.map((a: any) => (
                <div key={a.id} style={{ fontSize: 12, borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{a.action}</div>
                  <div style={{ color: '#64748B', marginTop: 2 }}>By: {a.user_name} • {new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal && (
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
              {actionModal === 'approve' && 'Approve Compliance Filing'}
              {actionModal === 'reject' && 'Reject / Request Changes'}
              {actionModal === 'reschedule' && 'Reschedule Statutory Due Date'}
              {actionModal === 'reassign' && 'Reassign Task Responsibility'}
            </h3>

            {actionModal === 'approve' && (
              <div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
                  Approving this task marks it as <strong>Completed</strong>, notifies the assignee, and updates firm compliance health score.
                </p>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Approval Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={actionComment}
                    onChange={e => setActionComment(e.target.value)}
                    placeholder="Challan verified and reconciled with return."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setActionModal(null)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWorkflowAction('approve', { comment: actionComment })}
                    disabled={actionProcessing}
                    style={{ background: '#10B981', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Confirm Approval
                  </button>
                </div>
              </div>
            )}

            {actionModal === 'reject' && (
              <div>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>
                  Task will be moved back to <strong>In Progress</strong> with changes required recorded in audit logs.
                </p>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Reason for Rejection / Requested Changes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionComment}
                    onChange={e => setActionComment(e.target.value)}
                    placeholder="e.g. Challan amount does not match GSTR-3B tax payable table 6.1"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Reassign Dept (Optional)
                    </label>
                    <select
                      value={rejectReassignDeptId}
                      onChange={e => {
                        setRejectReassignDeptId(e.target.value);
                        setRejectReassignUserId('');
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', fontSize: 12 }}
                    >
                      <option value="">Keep current department</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Reassign User (Optional)
                    </label>
                    <select
                      value={rejectReassignUserId}
                      onChange={e => setRejectReassignUserId(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF', fontSize: 12 }}
                    >
                      <option value="">Keep current assignee</option>
                      {usersList
                        .filter(u => !rejectReassignDeptId || u.department_id === rejectReassignDeptId)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} {u.department_name ? `(${u.department_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setActionModal(null)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!actionComment.trim()) {
                        alert('Reason for rejection is mandatory.');
                        return;
                      }
                      handleWorkflowAction('reject', {
                        comment: actionComment.trim(),
                        reassign_to: rejectReassignUserId || undefined,
                        reassign_department_id: rejectReassignDeptId || undefined,
                      });
                    }}
                    disabled={actionProcessing || !actionComment.trim()}
                    style={{ background: '#EF4444', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            {actionModal === 'reschedule' && (
              <div>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', marginBottom: 16, border: '1px solid #E2E8F0', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748B' }}>Previous / Current Due Date:</span>
                    <strong style={{ color: '#0F172A' }}>{task.due_date}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Original Statutory Due Date:</span>
                    <strong style={{ color: '#0F172A' }}>{task.original_due_date || task.due_date}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    New Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Mandatory Reason for Reschedule *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Statutory extension by CBDT/GST Council notification"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setActionModal(null)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newDate) {
                        alert('New due date is required.');
                        return;
                      }
                      if (!rescheduleReason.trim()) {
                        alert('Reason for reschedule is mandatory.');
                        return;
                      }
                      handleWorkflowAction('update_date', { due_date: newDate, reason: rescheduleReason.trim() });
                    }}
                    disabled={actionProcessing || !newDate || !rescheduleReason.trim()}
                    style={{ background: '#3B82F6', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            )}

            {actionModal === 'reassign' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Select New Assignee *
                  </label>
                  <select
                    value={reassignUserId}
                    onChange={e => setReassignUserId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select User...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role_name || u.email})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setActionModal(null)} style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWorkflowAction('reassign', { assignee_id: reassignUserId })}
                    disabled={actionProcessing || !reassignUserId}
                    style={{ background: '#3B82F6', color: '#FFF', padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reassign
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
