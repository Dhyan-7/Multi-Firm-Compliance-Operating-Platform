import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get('firm_id');
    const fy = searchParams.get('fy');
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const taskId = searchParams.get('task_id');
    const documentType = searchParams.get('document_type');
    const departmentId = searchParams.get('department_id');

    const db = getDb();
    let query = `
      SELECT d.*, COALESCE(d.file_path, d.storage_path) as file_path,
        f.display_name as firm_name, c.name as compliance_name,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        t.period, t.due_date, u.name as uploader_name, dep.name as department_name
      FROM documents d
      LEFT JOIN compliance_tasks t ON d.task_id = t.id
      LEFT JOIN firms f ON COALESCE(d.firm_id, t.firm_id) = f.id
      LEFT JOIN compliances c ON COALESCE(d.compliance_id, t.compliance_id) = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN departments dep ON COALESCE(d.department_id, t.department_id) = dep.id
      WHERE d.status = 'active'
    `;
    const params: any[] = [];

    if (firmId) {
      query += ` AND (d.firm_id = ? OR t.firm_id = ?)`;
      params.push(firmId, firmId);
    }
    if (fy) {
      query += ` AND (d.financial_year = ? OR t.financial_year = ?)`;
      params.push(fy, fy);
    }
    if (categoryId) {
      query += ` AND c.category_id = ?`;
      params.push(categoryId);
    }
    if (taskId) {
      query += ` AND d.task_id = ?`;
      params.push(taskId);
    }
    if (documentType) {
      query += ` AND d.document_type = ?`;
      params.push(documentType);
    }
    if (departmentId) {
      query += ` AND (d.department_id = ? OR t.department_id = ?)`;
      params.push(departmentId, departmentId);
    }
    if (search) {
      query += ` AND (d.file_name LIKE ? OR d.document_type LIKE ? OR c.name LIKE ? OR f.display_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    const documents = db.prepare(query).all(...params);

    // Also return tree structure counts for the repository sidebar
    const firms = db.prepare("SELECT id, COALESCE(display_name, legal_name, 'Firm') as display_name FROM firms WHERE status != 'deleted' ORDER BY display_name").all();
    const categories = db.prepare("SELECT id, name, icon, color FROM compliance_categories WHERE status = 'active' ORDER BY sort_order").all();
    const departments = db.prepare("SELECT id, name FROM departments WHERE status = 'active' ORDER BY name").all();

    return NextResponse.json({ documents, firms, categories, departments });
  } catch (error) {
    console.error('Documents fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('task_id') as string | null;
    const rawFirmId = formData.get('firm_id') as string | null;
    const departmentId = (formData.get('department_id') as string | null) || null;
    const documentType = (formData.get('document_type') as string) || 'General Document';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!taskId && !rawFirmId) {
      return NextResponse.json({ error: 'Either task_id or firm_id is required' }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum allowable limit of 25MB' }, { status: 400 });
    }

    const db = getDb();
    let task: any = null;
    if (taskId) {
      task = db.prepare("SELECT * FROM compliance_tasks WHERE id = ?").get(taskId) as any;
    }

    const finalFirmId = task?.firm_id || rawFirmId;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.pdf';
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    const fileUrl = `/uploads/${uniqueFilename}`;

    fs.writeFileSync(filePath, buffer);

    const docId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO documents (
        id, firm_id, task_id, compliance_id, department_id, financial_year, period,
        file_name, original_name, file_path, storage_path, file_size, mime_type,
        document_type, uploaded_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      docId,
      finalFirmId || null,
      taskId || null,
      task?.compliance_id || null,
      departmentId,
      task?.financial_year || null,
      task?.period || null,
      file.name,
      file.name,
      fileUrl,
      fileUrl,
      file.size,
      file.type || 'application/octet-stream',
      documentType,
      user.id
    );

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'DOCUMENT_UPLOADED', 'document', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, docId, file.name, JSON.stringify({ taskId, firmId: finalFirmId, size: file.size, type: documentType, timestamp_ist: istTimestamp }));

    return NextResponse.json({
      id: docId,
      file_name: file.name,
      file_path: fileUrl,
      file_size: file.size,
      document_type: documentType,
      uploaded_by: user.id,
      uploader_name: user.name,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, file_name, document_type, department_id } = body;
    if (!id || !file_name) return NextResponse.json({ error: 'Document ID and filename required' }, { status: 400 });

    const db = getDb();
    const current = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    db.prepare(`
      UPDATE documents
      SET file_name = ?,
          document_type = COALESCE(?, document_type),
          department_id = COALESCE(?, department_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(file_name.trim(), document_type || null, department_id || null, id);

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
      VALUES (?, ?, ?, 'DOCUMENT_RENAMED', 'document', ?, ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      file_name,
      JSON.stringify({ file_name: current.file_name, document_type: current.document_type }),
      JSON.stringify({ file_name, document_type, timestamp_ist: istTimestamp, changed_by: user.name })
    );

    return NextResponse.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });

    const db = getDb();
    const current = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    db.prepare("UPDATE documents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    // Optional physical file clean-up if saved locally
    try {
      const relPath = current.file_path || current.storage_path;
      if (relPath && typeof relPath === 'string' && relPath.startsWith('/uploads/')) {
        const fullLocalPath = path.join(process.cwd(), 'public', relPath.replace(/^\//, ''));
        if (fs.existsSync(fullLocalPath)) {
          fs.unlinkSync(fullLocalPath);
        }
      }
    } catch (cleanErr) {
      console.warn('Physical file deletion warning:', cleanErr);
    }

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'DOCUMENT_DELETED', 'document', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, current.file_name, JSON.stringify({ deleted_by: user.name, timestamp_ist: istTimestamp }));

    return NextResponse.json({ message: 'Document removed from vault' });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
