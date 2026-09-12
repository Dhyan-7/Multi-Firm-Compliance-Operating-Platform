import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = getDb();

    const task = db.prepare(`
      SELECT t.*, f.display_name as firm_name, f.legal_name, c.name as compliance_name, c.code as compliance_code,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        u.name as assignee_name, u.email as assignee_email,
        rv.name as reviewer_name, d.name as department_name, c.id as comp_id
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id LEFT JOIN users rv ON t.reviewer_id = rv.id
      LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = ?
    `).get(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const mis = db.prepare("SELECT * FROM mis_records WHERE task_id = ? ORDER BY field_name").all(id);
    const misTemplate = db.prepare("SELECT * FROM mis_templates WHERE compliance_id = ? ORDER BY sort_order").all((task as any).comp_id);
    const documents = db.prepare("SELECT d.*, u.name as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.task_id = ? AND d.status = 'active' ORDER BY d.created_at DESC").all(id);
    const comments = db.prepare("SELECT c.*, u.name as user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at DESC").all(id);
    const approvals = db.prepare("SELECT a.*, u.name as reviewer_name FROM approvals a LEFT JOIN users u ON a.reviewer_id = u.id WHERE a.task_id = ? ORDER BY a.created_at DESC").all(id);
    const activity = db.prepare("SELECT * FROM audit_logs WHERE entity_id = ? AND entity_type = 'task' ORDER BY created_at DESC").all(id);

    return NextResponse.json({ task, mis, misTemplate, documents, comments, approvals, activity });
  } catch (error) {
    console.error('Task detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const db = getDb();
    const data = await request.json();

    if (data.action === 'submit') {
      db.prepare("UPDATE compliance_tasks SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      const t = db.prepare("SELECT t.*, f.display_name as fn, c.name as cn FROM compliance_tasks t JOIN firms f ON t.firm_id=f.id JOIN compliances c ON t.compliance_id=c.id WHERE t.id=?").get(id) as any;
      if (t?.reviewer_id) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(t.reviewer_id, 'task_submitted', 'Task Submitted for Review', `${t.cn} for ${t.fn} submitted by ${user.name}`, 'task', id);
      }
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_SUBMITTED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, `${t?.cn} - ${t?.fn}`, '{"status":"in_progress"}', '{"status":"submitted"}');
      return NextResponse.json({ message: 'Task submitted for review' });
    }

    if (data.action === 'approve') {
      db.prepare("UPDATE compliance_tasks SET status = 'completed', approved_at = CURRENT_TIMESTAMP, approved_by = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id, id);
      db.prepare("INSERT INTO approvals (task_id, reviewer_id, action, comment) VALUES (?,?,'approved',?)").run(id, user.id, data.comment || '');
      const t = db.prepare("SELECT t.*, f.display_name as fn, c.name as cn FROM compliance_tasks t JOIN firms f ON t.firm_id=f.id JOIN compliances c ON t.compliance_id=c.id WHERE t.id=?").get(id) as any;
      if (t?.assignee_id) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(t.assignee_id, 'task_approved', 'Task Approved', `${t.cn} for ${t.fn} approved by ${user.name}`, 'task', id);
      }
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_APPROVED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, `${t?.cn} - ${t?.fn}`, '{"status":"submitted"}', '{"status":"completed"}');
      return NextResponse.json({ message: 'Task approved' });
    }

    if (data.action === 'reject') {
      db.prepare("UPDATE compliance_tasks SET status = 'in_progress', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.comment, id);
      db.prepare("INSERT INTO approvals (task_id, reviewer_id, action, comment) VALUES (?,?,'rejected',?)").run(id, user.id, data.comment || '');
      const t = db.prepare("SELECT t.*, f.display_name as fn, c.name as cn FROM compliance_tasks t JOIN firms f ON t.firm_id=f.id JOIN compliances c ON t.compliance_id=c.id WHERE t.id=?").get(id) as any;
      if (t?.assignee_id) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(t.assignee_id, 'task_rejected', 'Task Rejected', `${t.cn} for ${t.fn} rejected: ${data.comment}`, 'task', id);
      }
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_REJECTED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, `${t?.cn} - ${t?.fn}`, '{"status":"submitted"}', `{"status":"in_progress","reason":"${data.comment}"}`);
      return NextResponse.json({ message: 'Task rejected' });
    }

    if (data.action === 'update_status') {
      const old = db.prepare("SELECT status FROM compliance_tasks WHERE id = ?").get(id) as any;
      db.prepare("UPDATE compliance_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.status, id);
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_STATUS_CHANGED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, '', JSON.stringify({ status: old?.status }), JSON.stringify({ status: data.status }));
      return NextResponse.json({ message: 'Status updated' });
    }

    if (data.action === 'update_date') {
      const old = db.prepare("SELECT due_date FROM compliance_tasks WHERE id = ?").get(id) as any;
      db.prepare("UPDATE compliance_tasks SET due_date = ?, reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.due_date, data.reason, id);
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_DATE_CHANGED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, '', JSON.stringify({ due_date: old?.due_date }), JSON.stringify({ due_date: data.due_date, reason: data.reason }));
      return NextResponse.json({ message: 'Date updated' });
    }

    if (data.action === 'save_mis') {
      db.prepare("DELETE FROM mis_records WHERE task_id = ?").run(id);
      const stmt = db.prepare("INSERT INTO mis_records (task_id, field_name, field_value, field_type, updated_by) VALUES (?,?,?,?,?)");
      Object.entries(data.mis).forEach(([key, value]) => stmt.run(id, key, value as string, 'text', user.id));
      if (data.updateStatus) {
        db.prepare("UPDATE compliance_tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('not_started','pending','assigned')").run(id);
      }
      return NextResponse.json({ message: 'MIS saved' });
    }

    if (data.action === 'add_comment') {
      db.prepare("INSERT INTO comments (task_id, user_id, comment) VALUES (?,?,?)").run(id, user.id, data.comment);
      return NextResponse.json({ message: 'Comment added' });
    }

    if (data.action === 'reassign') {
      const old = db.prepare("SELECT assignee_id FROM compliance_tasks WHERE id = ?").get(id) as any;
      db.prepare("UPDATE compliance_tasks SET assignee_id = ?, department_id = COALESCE(?, department_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.assignee_id, data.department_id || null, id);
      
      db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?, 'task_assigned', 'Task Reassigned to You', 'You have been assigned to a compliance task', 'task', ?)").run(data.assignee_id, id);
      db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data) VALUES (?,?,?,'TASK_REASSIGNED','task',?,?,?,?)").run(user.organization_id, user.id, user.name, id, '', JSON.stringify({ old_assignee: old?.assignee_id }), JSON.stringify({ new_assignee: data.assignee_id }));
      return NextResponse.json({ message: 'Task reassigned' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
