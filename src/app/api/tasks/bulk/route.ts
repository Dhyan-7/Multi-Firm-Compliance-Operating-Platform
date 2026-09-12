import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, task_ids, assignee_id, department_id, status, due_date, reason } = body;

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json({ error: 'No tasks provided' }, { status: 400 });
    }

    const db = getDb();
    let updatedCount = 0;

    if (action === 'assign') {
      if (!assignee_id && !department_id) {
        return NextResponse.json({ error: 'Assignee or Department is required' }, { status: 400 });
      }

      const updateStmt = db.prepare(`
        UPDATE compliance_tasks
        SET assignee_id = COALESCE(?, assignee_id),
            department_id = COALESCE(?, department_id),
            status = CASE WHEN status = 'not_started' THEN 'assigned' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const notifStmt = db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        VALUES (?, 'task_assigned', 'Task Assigned', 'You have been assigned to a compliance task', 'task', ?)
      `);

      const auditStmt = db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'BULK_TASK_ASSIGN', 'task', ?, 'Bulk Assignment', ?)
      `);

      for (const id of task_ids) {
        updateStmt.run(assignee_id || null, department_id || null, id);
        if (assignee_id) {
          notifStmt.run(assignee_id, id);
        }
        auditStmt.run(user.organization_id, user.id, user.name, id, JSON.stringify({ assignee_id, department_id }));
        updatedCount++;
      }

      return NextResponse.json({ message: `Successfully assigned ${updatedCount} tasks.`, count: updatedCount });
    }

    if (action === 'status') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }

      const updateStmt = db.prepare(`
        UPDATE compliance_tasks
        SET status = ?,
            completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const auditStmt = db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'BULK_TASK_STATUS', 'task', ?, 'Bulk Status Update', ?)
      `);

      for (const id of task_ids) {
        updateStmt.run(status, status, id);
        auditStmt.run(user.organization_id, user.id, user.name, id, JSON.stringify({ status }));
        updatedCount++;
      }

      return NextResponse.json({ message: `Updated status to ${status} for ${updatedCount} tasks.`, count: updatedCount });
    }

    if (action === 'reschedule') {
      if (!due_date) {
        return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
      }

      const updateStmt = db.prepare(`
        UPDATE compliance_tasks
        SET due_date = ?,
            reschedule_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const auditStmt = db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'BULK_TASK_RESCHEDULE', 'task', ?, 'Bulk Reschedule', ?)
      `);

      for (const id of task_ids) {
        updateStmt.run(due_date, reason || 'Bulk rescheduled by admin', id);
        auditStmt.run(user.organization_id, user.id, user.name, id, JSON.stringify({ due_date, reason }));
        updatedCount++;
      }

      return NextResponse.json({ message: `Rescheduled ${updatedCount} tasks to ${due_date}.`, count: updatedCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
