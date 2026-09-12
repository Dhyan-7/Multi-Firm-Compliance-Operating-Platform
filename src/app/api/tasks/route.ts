import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get('firm_id') || searchParams.get('firm');
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const department = searchParams.get('department_id') || searchParams.get('department');
    const category = searchParams.get('category_id') || searchParams.get('category');
    const assignee = searchParams.get('assignee_id') || searchParams.get('assignee');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    let where = '1=1';
    const params: any[] = [];

    if (firmId && firmId !== 'all') {
      where += ' AND t.firm_id = ?';
      params.push(firmId);
    }
    if (status && status !== 'all') {
      where += ' AND t.status = ?';
      params.push(status);
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
    if (search && search.trim()) {
      where += ' AND (c.name LIKE ? OR c.code LIKE ? OR f.display_name LIKE ? OR t.period LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }
    if (month && year) {
      where += " AND strftime('%Y-%m', t.due_date) = ?";
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (year) {
      where += " AND strftime('%Y', t.due_date) = ?";
      params.push(year.toString());
    }

    const tasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, f.legal_name, c.name as compliance_name, c.code as compliance_code,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        u.name as assignee_name, r.name as reviewer_name, d.name as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users r ON t.reviewer_id = r.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE ${where}
      ORDER BY t.due_date ASC
    `).all(...params);

    return NextResponse.json({ tasks });
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

    // Mandatory Field Validations
    if (!data.firm_id) {
      return NextResponse.json({ error: 'Organization (firm_id) is mandatory' }, { status: 400 });
    }
    if (!data.compliance_id) {
      return NextResponse.json({ error: 'Statutory compliance (compliance_id) is mandatory' }, { status: 400 });
    }
    if (!data.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.due_date)) {
      return NextResponse.json({ error: 'Valid Due Date (YYYY-MM-DD) is mandatory' }, { status: 400 });
    }
    if (!data.period) {
      return NextResponse.json({ error: 'Filing Period is mandatory' }, { status: 400 });
    }

    const db = getDb();
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskNumber = `TSK-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO compliance_tasks (
        id, task_number, firm_id, compliance_id, period, financial_year,
        due_date, original_due_date, department_id, assignee_id, reviewer_id,
        status, priority, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, taskNumber, data.firm_id, data.compliance_id, data.period,
      data.financial_year || 'FY 2026-27', data.due_date, data.due_date,
      data.department_id || null, data.assignee_id || null, data.reviewer_id || null,
      data.status || 'pending', data.priority || 'medium', user.id
    );

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'TASK_CREATED', 'task', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, taskNumber, JSON.stringify(data));

    return NextResponse.json({ id, message: 'Task created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
