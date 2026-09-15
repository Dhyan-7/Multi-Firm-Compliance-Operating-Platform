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
      SELECT t.*, f.display_name as firm_name, f.legal_name,
        COALESCE(t.task_name, c.name, 'Task') as compliance_name, c.code as compliance_code,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        u.name as assignee_name, u.email as assignee_email,
        rv.name as reviewer_name, d.name as department_name, c.id as comp_id
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      LEFT JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users rv ON t.reviewer_id = rv.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ?
    `).get(id);

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const compId = (task as any).comp_id;
    const mis = db.prepare("SELECT * FROM mis_records WHERE task_id = ? ORDER BY field_name").all(id);
    const misTemplate = compId ? db.prepare("SELECT * FROM mis_templates WHERE compliance_id = ? ORDER BY sort_order").all(compId) : [];
    const documents = db.prepare("SELECT d.*, u.name as uploader_name FROM documents d LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.task_id = ? AND d.status = 'active' ORDER BY d.created_at DESC").all(id);
    const comments = db.prepare("SELECT c.*, u.name as user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at ASC").all(id);
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
    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    const currentTask = db.prepare(`
      SELECT t.*, f.display_name as fn, COALESCE(t.task_name, c.name, 'Task') as cn
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      LEFT JOIN compliances c ON t.compliance_id = c.id
      WHERE t.id = ?
    `).get(id) as any;

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (data.action === 'submit') {
      db.prepare("UPDATE compliance_tasks SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

      if (currentTask.reviewer_id) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(
          currentTask.reviewer_id,
          'task_submitted',
          'Task Submitted for Review',
          `${currentTask.cn} for ${currentTask.fn} submitted by ${user.name}`,
          'task',
          id
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_SUBMITTED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ status: currentTask.status }),
        JSON.stringify({ status: 'submitted', submitted_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Task submitted for review' });
    }

    if (data.action === 'approve') {
      db.prepare("UPDATE compliance_tasks SET status = 'completed', approved_at = CURRENT_TIMESTAMP, approved_by = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id, id);
      db.prepare("INSERT INTO approvals (task_id, reviewer_id, action, comment) VALUES (?,?,'approved',?)").run(id, user.id, data.comment || '');

      if (currentTask.assignee_id) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(
          currentTask.assignee_id,
          'task_approved',
          'Task Approved & Completed',
          `${currentTask.cn} for ${currentTask.fn} approved by ${user.name}`,
          'task',
          id
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_APPROVED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ status: currentTask.status }),
        JSON.stringify({ status: 'completed', approved_by: user.name, comment: data.comment || '', timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Task approved and marked completed' });
    }

    if (data.action === 'reject' || data.action === 'request_changes') {
      const reason = (data.comment || data.reason || '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'Reason for rejection/changes requested is mandatory' }, { status: 400 });
      }

      const newAssignee = data.reassign_to || currentTask.assignee_id;
      const newDept = data.reassign_department_id || currentTask.department_id;

      db.prepare(`
        UPDATE compliance_tasks
        SET status = 'in_progress',
            rejection_reason = ?,
            assignee_id = ?,
            department_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, newAssignee, newDept, id);

      db.prepare("INSERT INTO approvals (task_id, reviewer_id, action, comment) VALUES (?,?, 'rejected', ?)").run(id, user.id, reason);

      if (newAssignee) {
        db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)").run(
          newAssignee,
          'task_rejected',
          'Task Changes Requested',
          `${currentTask.cn} for ${currentTask.fn} requires changes: ${reason}`,
          'task',
          id
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_REJECTED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ status: currentTask.status, assignee_id: currentTask.assignee_id }),
        JSON.stringify({ status: 'in_progress', reason, reassigned_to: newAssignee, reviewed_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Changes requested and task returned to assignee' });
    }

    if (data.action === 'update_status') {
      const oldStatus = currentTask.status;
      db.prepare("UPDATE compliance_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(data.status, id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_STATUS_CHANGED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ status: oldStatus }),
        JSON.stringify({ status: data.status, changed_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Status updated' });
    }

    if (data.action === 'update_priority') {
      const oldPriority = currentTask.priority;
      const newPriority = data.priority;
      const reason = data.reason || 'Manual priority adjustment';

      db.prepare(`
        UPDATE compliance_tasks
        SET priority = ?,
            manual_priority_override = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPriority, id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_PRIORITY_CHANGED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ priority: oldPriority }),
        JSON.stringify({ previous_priority: oldPriority, new_priority: newPriority, reason, changed_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Priority updated successfully', priority: newPriority });
    }

    if (data.action === 'update_date') {
      const oldDate = currentTask.due_date;
      const reason = (data.reason || '').trim() || 'Manual date adjustment';

      db.prepare(`
        UPDATE compliance_tasks
        SET original_due_date = COALESCE(original_due_date, ?),
            due_date = ?,
            reschedule_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(oldDate, data.due_date, reason, id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_DATE_CHANGED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ due_date: oldDate, original_due_date: currentTask.original_due_date || oldDate }),
        JSON.stringify({ previous_due_date: oldDate, new_due_date: data.due_date, reason, changed_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Due date updated successfully' });
    }

    if (data.action === 'save_mis') {
      db.prepare("DELETE FROM mis_records WHERE task_id = ?").run(id);
      const stmt = db.prepare("INSERT INTO mis_records (task_id, field_name, field_value, field_type, updated_by) VALUES (?,?,?,?,?)");
      Object.entries(data.mis || {}).forEach(([key, value]) => stmt.run(id, key, value as string, 'text', user.id));

      if (data.updateStatus) {
        db.prepare("UPDATE compliance_tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('not_started','pending','assigned')").run(id);
      }

      return NextResponse.json({ message: 'MIS saved' });
    }

    if (data.action === 'add_comment') {
      const commentText = (data.comment || '').trim();
      if (!commentText && !data.attachment_url) {
        return NextResponse.json({ error: 'Comment text or attachment is required' }, { status: 400 });
      }

      db.prepare(`
        INSERT INTO comments (task_id, user_id, comment, attachment_url, attachment_name)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, user.id, commentText || 'Uploaded attachment', data.attachment_url || null, data.attachment_name || null);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'TASK_COMMENT_ADDED', 'task', ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ comment: commentText, attachment: data.attachment_name, added_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Comment added' });
    }

    if (data.action === 'reassign') {
      const oldAssignee = currentTask.assignee_id;
      const reason = data.reason || 'Workload rebalance';

      db.prepare(`
        UPDATE compliance_tasks
        SET assignee_id = ?,
            department_id = COALESCE(?, department_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.assignee_id, data.department_id || null, id);

      if (data.assignee_id) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
          VALUES (?, 'task_assigned', 'Task Reassigned to You', ?, 'task', ?)
        `).run(
          data.assignee_id,
          `${currentTask.cn} for ${currentTask.fn} has been reassigned to you. Reason: ${reason}`,
          id
        );
      }

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'TASK_REASSIGNED', 'task', ?, ?, ?, ?)
      `).run(
        user.organization_id,
        user.id,
        user.name,
        id,
        `${currentTask.cn} - ${currentTask.fn}`,
        JSON.stringify({ previous_assignee: oldAssignee }),
        JSON.stringify({ new_assignee: data.assignee_id, reason, reassigned_by: user.name, timestamp_ist: istTimestamp })
      );

      return NextResponse.json({ message: 'Task reassigned successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
