import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // e.g. "09" or "9"
    const year = searchParams.get('year') || '2026';
    const firmId = searchParams.get('firm_id');
    const departmentId = searchParams.get('department_id');
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assignee_id');

    const db = getDb();
    let query = `
      SELECT t.id, t.period, t.due_date, t.status, t.priority,
             f.id as firm_id, f.display_name as firm_name,
             c.id as compliance_id, c.name as compliance_name, c.code as compliance_code, c.frequency,
             cc.id as category_id, cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
             u.id as assignee_id, u.name as assignee_name,
             d.id as department_id, d.name as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (year && month) {
      const paddedMonth = month.toString().padStart(2, '0');
      query += ` AND strftime('%Y-%m', t.due_date) = ?`;
      params.push(`${year}-${paddedMonth}`);
    } else if (year) {
      query += ` AND strftime('%Y', t.due_date) = ?`;
      params.push(year.toString());
    }

    if (firmId && firmId !== 'all') {
      query += ` AND t.firm_id = ?`;
      params.push(firmId);
    }
    if (departmentId && departmentId !== 'all') {
      query += ` AND t.department_id = ?`;
      params.push(departmentId);
    }
    if (categoryId && categoryId !== 'all') {
      query += ` AND c.category_id = ?`;
      params.push(categoryId);
    }
    if (status && status !== 'all') {
      query += ` AND t.status = ?`;
      params.push(status);
    }
    if (assigneeId && assigneeId !== 'all') {
      query += ` AND t.assignee_id = ?`;
      params.push(assigneeId);
    }

    query += ` ORDER BY t.due_date ASC, t.priority DESC`;

    const tasks = db.prepare(query).all(...params);

    // Group tasks by date for calendar day bubbles
    const byDate: Record<string, any[]> = {};
    for (const t of tasks as any[]) {
      if (!byDate[t.due_date]) byDate[t.due_date] = [];
      byDate[t.due_date].push(t);
    }

    return NextResponse.json({ tasks, byDate });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { task_id, new_date, reason } = body;

    if (!task_id || !new_date) {
      return NextResponse.json({ error: 'task_id and new_date are required' }, { status: 400 });
    }

    const db = getDb();
    const task = db.prepare(`
      SELECT t.*, f.display_name as firm_name, c.name as comp_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      WHERE t.id = ?
    `).get(task_id) as any;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const oldDate = task.due_date;
    db.prepare(`
      UPDATE compliance_tasks
      SET due_date = ?, reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new_date, reason || 'Rescheduled via calendar', task_id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
      VALUES (?, ?, ?, 'CALENDAR_TASK_RESCHEDULED', 'task', ?, ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      task_id,
      `${task.comp_name} - ${task.firm_name}`,
      JSON.stringify({ due_date: oldDate }),
      JSON.stringify({ due_date: new_date, reason: reason || 'Calendar reschedule' })
    );

    // Notification if assignee exists
    if (task.assignee_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        VALUES (?, 'task_rescheduled', 'Task Due Date Rescheduled', ?, 'task', ?)
      `).run(
        task.assignee_id,
        `${task.comp_name} for ${task.firm_name} has been moved from ${oldDate} to ${new_date}. Reason: ${reason || 'Calendar adjustment'}`,
        task_id
      );
    }

    return NextResponse.json({ message: 'Task rescheduled successfully', oldDate, newDate: new_date });
  } catch (error) {
    console.error('Calendar reschedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
