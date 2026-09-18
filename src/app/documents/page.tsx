'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AppLayout';
import { formatISTDate } from '@/lib/dateUtils';

export default function DocumentsVaultPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Filters
  const [selectedFirm, setSelectedFirm] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [search, setSearch] = useState('');

  // Upload Modal & Drag-and-Drop
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFirmId, setUploadFirmId] = useState('');
  const [uploadDeptId, setUploadDeptId] = useState('');
  const [uploadDocType, setUploadDocType] = useState('Tax Challan / Receipt');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Rename Modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState('');
  const [renameFileName, setRenameFileName] = useState('');
  const [renameDocType, setRenameDocType] = useState('');
  const [renameDeptId, setRenameDeptId] = useState('');
  const [renaming, setRenaming] = useState(false);
  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const fetchDocuments = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedFirm !== 'all') query.set('firm_id', selectedFirm);
      if (selectedCategory !== 'all') query.set('category_id', selectedCategory);
      if (selectedType !== 'all') query.set('document_type', selectedType);
      if (selectedDept !== 'all') query.set('department_id', selectedDept);
      if (search) query.set('search', search);

      const res = await fetch(`/api/documents?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setFirms(data.firms || []);
        setCategories(data.categories || []);
        setDepartments(data.departments || []);
        if (data.firms?.length > 0 && !uploadFirmId) {
          setUploadFirmId(data.firms[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token, selectedFirm, selectedCategory, selectedType, selectedDept, search]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/firms', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => {
        if (d.firms?.length > 0) {
          setFirms(d.firms);
          setUploadFirmId(prev => prev || d.firms[0].id);
        }
      })
      .catch(console.error);

    fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(d => {
        if (d.departments?.length > 0) {
          setDepartments(d.departments);
        }
      })
      .catch(console.error);
  }, [token]);

  const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'xlsx', 'csv', 'docx'];

  const validateFile = (file: File): boolean => {
    if (file.size > 25 * 1024 * 1024) {
      alert('File exceeds the maximum allowable size of 25MB.');
      return false;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTS.includes(ext)) {
      alert('Unsupported file format. Allowed types: PDF, PNG, JPG, JPEG, XLSX, CSV, DOCX.');
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!validateFile(file)) return;
      setUploadFile(file);
      setUploadFileName(file.name);
      setUploadModalOpen(true);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uploadFile) return;
    if (!validateFile(uploadFile)) return;
    if (!uploadFirmId) {
      alert('Please select an organization.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('firm_id', uploadFirmId);
      if (uploadDeptId) formData.append('department_id', uploadDeptId);
      formData.append('document_type', uploadDocType);

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setNotice(`Document "${uploadFile.name}" uploaded successfully to vault.`);
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadFileName('');
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to upload document');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const openRenameModal = (doc: any) => {
    setRenameDocId(doc.id);
    setRenameFileName(doc.file_name || '');
    setRenameDocType(doc.document_type || 'General Document');
    setRenameDeptId(doc.department_id || '');
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !renameDocId || !renameFileName.trim()) return;

    setRenaming(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: renameDocId,
          file_name: renameFileName.trim(),
          document_type: renameDocType,
          department_id: renameDeptId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotice('Document updated successfully.');
        setRenameModalOpen(false);
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to update document');
      }
    } catch (err) {
      console.error('Rename error:', err);
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!token) return;
    const confirmed = window.confirm(`Are you sure you want to remove "${doc.file_name}" from the document vault?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(data.message || 'Document deleted from vault.');
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Delete document error:', err);
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
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Centralized Statutory Document Vault ({documents.length})
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Permanent repository of tax challans, acknowledgement receipts, and signed regulatory filings.
          </p>
        </div>

        <button
          onClick={() => {
            setUploadFile(null);
            setUploadFileName('');
            setUploadModalOpen(true);
          }}
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
          <span>+</span> Upload Document
        </button>

        {notice && (
          <div style={{ width: '100%', marginTop: 8, padding: '8px 14px', background: '#ECFDF5', color: '#065F46', borderRadius: 8, fontSize: 13, border: '1px solid #A7F3D0' }}>
            ✓ {notice}
          </div>
        )}
      </div>

      {/* Main Layout: Left Folder Tree, Right Documents Grid/Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Left Organization Tree Filter */}
        <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 18, height: 'fit-content' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 12 }}>
            ORGANIZATIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setSelectedFirm('all')}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: selectedFirm === 'all' ? '#EFF6FF' : 'transparent',
                color: selectedFirm === 'all' ? '#2563EB' : '#334155',
                fontWeight: selectedFirm === 'all' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🏢 All Organizations
            </button>

            {firms.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFirm(f.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: selectedFirm === f.id ? '#EFF6FF' : 'transparent',
                  color: selectedFirm === f.id ? '#2563EB' : '#334155',
                  fontWeight: selectedFirm === f.id ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                📁 {f.display_name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', margin: '20px 0 12px' }}>
            CATEGORIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                textAlign: 'left',
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: selectedCategory === 'all' ? '#EFF6FF' : 'transparent',
                color: selectedCategory === 'all' ? '#2563EB' : '#334155',
                fontWeight: selectedCategory === 'all' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              All Categories
            </button>

            {categories.slice(0, 8).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: selectedCategory === c.id ? '#EFF6FF' : 'transparent',
                  color: selectedCategory === c.id ? '#2563EB' : '#334155',
                  fontWeight: selectedCategory === c.id ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {c.icon || '🏷️'} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Documents List */}
        <div>
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              setUploadFile(null);
              setUploadFileName('');
              setUploadModalOpen(true);
            }}
            style={{
              border: dragOver ? '2px dashed #2563EB' : '2px dashed #CBD5E1',
              background: dragOver ? '#EFF6FF' : '#F8FAFC',
              borderRadius: 10,
              padding: '16px 20px',
              textAlign: 'center',
              marginBottom: 16,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>📤</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
              Drag & drop files here to upload to the Vault, or <span style={{ color: '#2563EB', textDecoration: 'underline' }}>browse files</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Supports PDFs, challans, signed filings, incorporation documents, and certificates (up to 25MB)
            </div>
          </div>

          {/* Filter and Search bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search documents by filename, challan reference, or compliance..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
            />

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
            >
              <option value="all">All Document Types</option>
              <option value="Statutory Return">Statutory Return</option>
              <option value="Tax Challan / Receipt">Tax Challan / Receipt</option>
              <option value="Filing Acknowledgement">Filing Acknowledgement</option>
              <option value="Incorporation Certificate">Incorporation Certificate</option>
              <option value="PAN / TAN Copy">PAN / TAN Copy</option>
              <option value="GST Registration Certificate">GST Registration Certificate</option>
              <option value="Audit Report">Audit Report</option>
              <option value="Notice / Summon">Notice / Summon</option>
              <option value="Contract / Agreement">Contract / Agreement</option>
              <option value="General Document">General Document</option>
            </select>

            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: '#FFF' }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ color: '#64748B', fontSize: 13 }}>Loading documents...</div>
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
                <h3 style={{ fontSize: 16, color: '#0F172A', margin: 0 }}>No documents found</h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0' }}>
                  Upload standalone firm documents or statutory filings using the upload area above.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                    <th style={{ padding: '12px' }}>Document Name</th>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Organization</th>
                    <th style={{ padding: '12px' }}>Department</th>
                    <th style={{ padding: '12px' }}>Compliance / Period</th>
                    <th style={{ padding: '12px' }}>Size</th>
                    <th style={{ padding: '12px' }}>Uploaded By</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>📄</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{d.file_name}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8' }}>
                              {formatISTDate(d.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 11, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, color: '#334155' }}>
                          {d.document_type || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{d.firm_name || 'All Firms'}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{d.department_name || 'General'}</td>
                      <td style={{ padding: '12px' }}>
                        {d.compliance_name ? (
                          <div>
                            <div>{d.compliance_name}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{d.period || '—'}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Standalone</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{(d.file_size / 1024).toFixed(1)} KB</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{d.uploader_name || 'Staff'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            style={{
                              padding: '4px 10px',
                              background: '#F0FDF4',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            View 👁️
                          </button>
                          <a
                            href={`/api/documents/${d.id}/download?token=${encodeURIComponent(token || '')}`}
                            style={{
                              padding: '4px 10px',
                              background: '#EFF6FF',
                              color: '#2563EB',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            Download ⬇
                          </a>
                          <button
                            onClick={() => openRenameModal(d)}
                            style={{
                              padding: '4px 8px',
                              background: '#F8FAFC',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            style={{
                              padding: '4px 8px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Upload Standalone Document Modal */}
      {uploadModalOpen && (
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
          <div style={{ width: '100%', maxWidth: 500, background: '#FFFFFF', borderRadius: 14, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Upload Document to Vault
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Select File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx"
                    required={!uploadFile}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (!validateFile(f)) {
                          e.target.value = '';
                          return;
                        }
                        setUploadFile(f);
                        setUploadFileName(f.name);
                      }
                    }}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                  {uploadFile && (
                    <div style={{ fontSize: 11, color: '#2563EB', marginTop: 4, fontWeight: 600 }}>
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Organization *
                  </label>
                  <select
                    required
                    value={uploadFirmId}
                    onChange={e => setUploadFirmId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Select Organization...</option>
                    {firms.map(f => (
                      <option key={f.id} value={f.id}>{f.display_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Document Type
                    </label>
                    <select
                      value={uploadDocType}
                      onChange={e => setUploadDocType(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="Tax Challan / Receipt">Tax Challan / Receipt</option>
                      <option value="Statutory Return">Statutory Return</option>
                      <option value="Filing Acknowledgement">Filing Acknowledgement</option>
                      <option value="Incorporation Certificate">Incorporation Certificate</option>
                      <option value="PAN / TAN Copy">PAN / TAN Copy</option>
                      <option value="GST Registration Certificate">GST Registration Certificate</option>
                      <option value="Audit Report">Audit Report</option>
                      <option value="Notice / Summon">Notice / Summon</option>
                      <option value="Contract / Agreement">Contract / Agreement</option>
                      <option value="General Document">General Document</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Department
                    </label>
                    <select
                      value={uploadDeptId}
                      onChange={e => setUploadDeptId(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                    >
                      <option value="">General / All</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    cursor: uploading || !uploadFile ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Document Modal */}
      {renameModalOpen && (
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
          <div style={{ width: '100%', maxWidth: 440, background: '#FFFFFF', borderRadius: 14, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Rename Document
              </h3>
              <button
                onClick={() => setRenameModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRenameSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    File Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={renameFileName}
                    onChange={e => setRenameFileName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Document Type
                  </label>
                  <select
                    value={renameDocType}
                    onChange={e => setRenameDocType(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="Tax Challan / Receipt">Tax Challan / Receipt</option>
                    <option value="Statutory Return">Statutory Return</option>
                    <option value="Filing Acknowledgement">Filing Acknowledgement</option>
                    <option value="Incorporation Certificate">Incorporation Certificate</option>
                    <option value="PAN / TAN Copy">PAN / TAN Copy</option>
                    <option value="GST Registration Certificate">GST Registration Certificate</option>
                    <option value="Audit Report">Audit Report</option>
                    <option value="Notice / Summon">Notice / Summon</option>
                    <option value="Contract / Agreement">Contract / Agreement</option>
                    <option value="General Document">General Document</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Department
                  </label>
                  <select
                    value={renameDeptId}
                    onChange={e => setRenameDeptId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">General / All</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  style={{ background: '#F1F5F9', color: '#475569', padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameFileName.trim()}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    cursor: renaming || !renameFileName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {renaming ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Browser Document Viewer Modal */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 960,
              height: '90vh',
              maxHeight: 880,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 20 }}>
                  {previewDoc.file_name?.toLowerCase().endsWith('.pdf') ? '📄' :
                   /\.(png|jpe?g|webp|gif|svg)$/i.test(previewDoc.file_name || '') ? '🖼️' : '📎'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {previewDoc.file_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    {previewDoc.document_type || 'Document'} • {(previewDoc.file_size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={`/api/documents/${previewDoc.id}/view?token=${encodeURIComponent(token || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 12px',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Open in New Tab ↗
                </a>
                <a
                  href={`/api/documents/${previewDoc.id}/download?token=${encodeURIComponent(token || '')}`}
                  style={{
                    padding: '6px 12px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  Download ⬇
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 22,
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1,
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div
              style={{
                flex: 1,
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                padding: 16,
              }}
            >
              {previewDoc.file_name?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`/api/documents/${previewDoc.id}/view?token=${encodeURIComponent(token || '')}`}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#FFF' }}
                  title={previewDoc.file_name}
                />
              ) : /\.(png|jpe?g|webp|gif|svg)$/i.test(previewDoc.file_name || '') ? (
                <div style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={`/api/documents/${previewDoc.id}/view?token=${encodeURIComponent(token || '')}`}
                    alt={previewDoc.file_name}
                    style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 120px)', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, background: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', maxWidth: 440 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>In-Browser Preview Not Supported</h4>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                    This file format (.{previewDoc.file_name?.split('.').pop()}) cannot be previewed directly in the browser. You can download and open it on your device.
                  </p>
                  <a
                    href={`/api/documents/${previewDoc.id}/download?token=${encodeURIComponent(token || '')}`}
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#2563EB',
                      color: '#FFF',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Download File ⬇
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
