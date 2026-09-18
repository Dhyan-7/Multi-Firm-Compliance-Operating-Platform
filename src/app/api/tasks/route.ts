import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { dispatchNotificationEvent } from '@/lib/notifications/engine';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get('firm_id') || searchParams.get('firm');
    const complianceId = searchParams.get('compliance_id') || searchParams.get('compliance');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const department = searchParams.get('department_id') || searchParams.get('department');
    const category = searchParams.get('category_id') || searchParams.get('category');
    const assignee = searchParams.get('assignee_id') || searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const taskType = searchParams.get('task_type');
    const search = searchParams.get('search');
    const dueDateFrom = searchParams.get('due_date_from');
    const dueDateTo = searchParams.get('due_date_to');
    const isOverdue = searchParams.get('overdue') === 'true' || searchParams.get('overdue') === '1';
    const isCritical = searchParams.get('critical') === 'true' || searchParams.get('critical') === '1';

    let where = '1=1';
    const params: any[] = [];

    if (firmId && firmId !== 'all') {
      where += ' AND t.firm_id = ?';
      params.push(firmId);
    }
    if (complianceId && complianceId !== 'all') {
      where += ' AND t.compliance_id = ?';
      params.push(complianceId);
    }
    if (status && status !== 'all') {
      if (status === 'overdue') {
        where += " AND (t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed'))";
      } else if (status === 'pending') {
        where += " AND t.status IN ('pending', 'not_started', 'assigned')";
      } else if (status === 'my' || status === 'my_assigned') {
        where += ' AND t.assignee_id = ?';
        params.push(user.id);
      } else {
        where += ' AND t.status = ?';
        params.push(status);
      }
    }
    if (department && department !== 'all') {
      where += ' AND t.department_id = ?';
      params.push(department);
    }
    if (category && category !== 'all') {
      where += ' AND c.category_id = ?';
      params.push(category);
    }
    if (assignee && assignee !== 'all') {
      where += ' AND t.assignee_id = ?';
      params.push(assignee);
    }
    if (priority && priority !== 'all') {
      where += ' AND t.priority = ?';
      params.push(priority);
    }
    if (taskType && taskType !== 'all') {
      where += " AND COALESCE(t.task_type, 'compliance') = ?";
      params.push(taskType);
    }
    if (dueDateFrom) {
      where += ' AND t.due_date >= ?';
      params.push(dueDateFrom);
    }
    if (dueDateTo) {
      where += ' AND t.due_date <= ?';
      params.push(dueDateTo);
    }
    if (isOverdue) {
      where += " AND (t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed'))";
    }
    if (isCritical) {
      where += " AND t.priority = 'critical'";
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      where += ` AND (
        COALESCE(t.task_name, '') LIKE ? OR
        COALESCE(t.task_description, '') LIKE ? OR
        COALESCE(c.name, '') LIKE ? OR
        COALESCE(c.code, '') LIKE ? OR
        COALESCE(f.display_name, '') LIKE ? OR
        COALESCE(f.legal_name, '') LIKE ? OR
        COALESCE(u.name, '') LIKE ? OR
        COALESCE(d.name, '') LIKE ? OR
        COALESCE(t.task_number, '') LIKE ? OR
        COALESCE(t.period, '') LIKE ? OR
        COALESCE(t.id, '') LIKE ?
      )`;
      params.push(s, s, s, s, s, s, s, s, s, s, s);
    }
    if (month && year) {
      where += " AND strftime('%Y-%m', t.due_date) = ?";
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (year) {
      where += " AND strftime('%Y', t.due_date) = ?";
      params.push(year.toString());
    }

    const tasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, f.legal_name,
        COALESCE(t.task_name, c.name, 'Task') as compliance_name, c.code as compliance_code,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        u.name as assignee_name, r.name as reviewer_name, d.name as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      LEFT JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users r ON t.reviewer_id = r.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE ${where}
      ORDER BY t.due_date ASC
    `).all(...params);

    // Compute dynamic category counts scoped to firmFilter (if active)
    const firmScope = (firmId && firmId !== 'all') ? 'AND firm_id = ?' : '';
    const firmScopeParam = (firmId && firmId !== 'all') ? [firmId] : [];

    const allCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE 1=1 ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const myCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE assignee_id = ? ${firmScope}`).get(user.id, ...firmScopeParam) as any)?.c || 0;
    const pendingCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status IN ('pending', 'not_started', 'assigned') ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const inProgressCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'in_progress' ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const submittedCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'submitted' ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const overdueCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status != 'completed' AND (status = 'overdue' OR due_date < date('now')) ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const missedCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'missed' ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;
    const completedCount = (db.prepare(`SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'completed' ${firmScope}`).get(...firmScopeParam) as any)?.c || 0;

    const counts = {
      all: allCount,
      my: myCount,
      pending: pendingCount,
      in_progress: inProgressCount,
      submitted: submittedCount,
      overdue: overdueCount,
      missed: missedCount,
      completed: completedCount,
    };

    return NextResponse.json({ tasks, counts });
  } catch (error) {
    console.error('Tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const isCustom = data.task_type === 'custom' || !data.compliance_id;

    // Mandatory Field Validations
    if (!data.firm_id) {
      return NextResponse.json({ error: 'Organization (firm_id) is mandatory' }, { status: 400 });
    }

    if (isCustom) {
      if (!data.task_name || !data.task_name.trim()) {
        return NextResponse.json({ error: 'Task Name is mandatory for custom tasks' }, { status: 400 });
      }
    } else {
      if (!data.compliance_id) {
        return NextResponse.json({ error: 'Statutory compliance (compliance_id) is mandatory' }, { status: 400 });
      }
    }

    if (!data.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) {
      return NextResponse.json({ error: 'Valid Due Date (YYYY-MM-DD) is mandatory' }, { status: 400 });
    }

    const db = getDb();
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskNumber = `TSK-${Date.now().toString().slice(-6)}`;
    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    db.prepare(`
      INSERT INTO compliance_tasks (
        id, task_number, task_type, task_name, task_description, firm_id, compliance_id,
        period, financial_year, due_date, original_due_date, department_id, assignee_id,
        reviewer_id, status, priority, manual_priority_override, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      taskNumber,
      isCustom ? 'custom' : 'compliance',
      isCustom ? data.task_name.trim() : null,
      data.description || data.task_description || null,
      data.firm_id,
      isCustom ? null : data.compliance_id,
      data.period || 'General / One-Time',
      data.financial_year || 'FY 2026-27',
      data.due_date,
      data.due_date,
      data.department_id || null,
      data.assignee_id || null,
      data.reviewer_id || null,
      data.status || 'not_started',
      data.priority || 'medium',
      data.priority ? 1 : 0,
      user.id
    );

    // Audit log
    const firm = db.prepare("SELECT display_name FROM firms WHERE id = ?").get(data.firm_id) as any;
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'TASK_CREATED', 'task', ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      `${data.task_name || 'Statutory Task'} - ${firm?.display_name || 'Firm'}`,
      JSON.stringify({ ...data, task_id: id, task_number: taskNumber, created_by: user.name, timestamp_ist: istTimestamp })
    );

    // Notification if assignee assigned
    if (data.assignee_id) {
      dispatchNotificationEvent({
        eventType: 'TASK_ASSIGNED',
        entityType: 'task',
        entityId: id,
        taskId: id,
        firmId: data.firm_id,
        complianceId: data.compliance_id || null,
        triggeredBy: user.id,
        recipientIds: [data.assignee_id],
        data: {
          taskName: data.task_name || 'Compliance Task',
          firmName: firm?.display_name || 'Organization',
          dueDate: data.due_date,
          priority: data.priority || 'medium',
          status: 'assigned',
          assignedBy: user.name,
        },
      }).catch(err => console.error('Dispatch TASK_ASSIGNED error on create:', err));
    }

    return NextResponse.json({ id, taskNumber, message: 'Task created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
