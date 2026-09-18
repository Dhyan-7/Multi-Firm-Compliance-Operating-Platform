import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'compliance';
    const firmId = searchParams.get('firm_id');
    const departmentId = searchParams.get('department_id');
    const categoryId = searchParams.get('category_id');

    // Build base task filter conditions
    let taskFilter = ' WHERE 1=1';
    const params: any[] = [];

    if (firmId && firmId !== 'all') {
      taskFilter += ' AND t.firm_id = ?';
      params.push(firmId);
    }
    if (departmentId && departmentId !== 'all') {
      taskFilter += ' AND t.department_id = ?';
      params.push(departmentId);
    }
    if (categoryId && categoryId !== 'all') {
      taskFilter += ' AND c.category_id = ?';
      params.push(categoryId);
    }

    // 1. Overall Summary KPIs
    const summaryRow = db.prepare(`
      SELECT
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('pending', 'assigned', 'not_started') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed') THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN t.status = 'missed' THEN 1 ELSE 0 END) as missed,
        ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(t.id), 0) * 100, 0), 1) as healthScore
      FROM compliance_tasks t
      LEFT JOIN compliances c ON t.compliance_id = c.id
      ${taskFilter}
    `).get(...params) as any;

    const summary = {
      total: summaryRow?.total || 0,
      completed: summaryRow?.completed || 0,
      pending: (summaryRow?.pending || 0) + (summaryRow?.in_progress || 0) + (summaryRow?.submitted || 0),
      overdue: summaryRow?.overdue || 0,
      missed: summaryRow?.missed || 0,
      healthScore: summaryRow?.healthScore || 0,
    };

    // 2. Upcoming Statutory Deadlines (Categorized: Due Today, Due Soon, Overdue, Missed)
    const dueToday = db.prepare(`
      SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, t.due_date, t.status, t.priority,
        COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${taskFilter} AND t.status != 'completed' AND t.due_date = date('now')
      ORDER BY t.priority DESC, t.due_date ASC
      LIMIT 10
    `).all(...params);

    const dueSoon = db.prepare(`
      SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, t.due_date, t.status, t.priority,
        COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name,
        CAST(julianday(t.due_date) - julianday('now') AS INTEGER) as days_remaining
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${taskFilter} AND t.status != 'completed' AND t.due_date > date('now') AND t.due_date <= date('now', '+7 days')
      ORDER BY t.due_date ASC, t.priority DESC
      LIMIT 10
    `).all(...params);

    const overdueList = db.prepare(`
      SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, t.due_date, t.status, t.priority,
        COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name,
        CAST(julianday('now') - julianday(t.due_date) AS INTEGER) as days_overdue
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${taskFilter} AND (t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed'))
      ORDER BY days_overdue DESC, t.priority DESC
      LIMIT 10
    `).all(...params);

    const missedList = db.prepare(`
      SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, t.due_date, t.status, t.priority,
        COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name,
        CAST(julianday('now') - julianday(t.due_date) AS INTEGER) as days_overdue
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${taskFilter} AND t.status = 'missed'
      ORDER BY days_overdue DESC
      LIMIT 10
    `).all(...params);

    // 3. Specific Report Datasets
    let data: any[] = [];

    if (type === 'compliance' || type === 'firm') {
      data = db.prepare(`
        SELECT f.id, f.display_name as firm_name, f.pan, f.gstin,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status IN ('pending', 'assigned', 'not_started', 'in_progress', 'submitted') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN t.status = 'missed' THEN 1 ELSE 0 END) as missed,
          ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(t.id), 0) * 100, 0), 1) as health
        FROM firms f
        LEFT JOIN compliance_tasks t ON f.id = t.firm_id
        LEFT JOIN compliances c ON t.compliance_id = c.id
        ${firmId && firmId !== 'all' ? 'WHERE f.id = ?' : ''}
        GROUP BY f.id
        ORDER BY health DESC, f.display_name ASC
      `).all(...(firmId && firmId !== 'all' ? [firmId] : []));
    } else if (type === 'department') {
      data = db.prepare(`
        SELECT d.id, d.name as department_name,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status IN ('pending', 'assigned', 'not_started', 'in_progress', 'submitted') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed') THEN 1 ELSE 0 END) as overdue,
          ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(t.id), 0) * 100, 0), 1) as completion_rate
        FROM departments d
        LEFT JOIN compliance_tasks t ON d.id = t.department_id
        ${departmentId && departmentId !== 'all' ? 'WHERE d.id = ?' : ''}
        GROUP BY d.id
        ORDER BY completion_rate DESC, d.name ASC
      `).all(...(departmentId && departmentId !== 'all' ? [departmentId] : []));
    } else if (type === 'user') {
      data = db.prepare(`
        SELECT u.id, u.name as user_name, COALESCE(d.name, 'Administration') as department_name,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status IN ('pending', 'assigned', 'not_started', 'in_progress', 'submitted') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed') THEN 1 ELSE 0 END) as overdue,
          ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(t.id), 0) * 100, 0), 1) as completion_rate
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN compliance_tasks t ON u.id = t.assignee_id
        WHERE u.status = 'active'
        GROUP BY u.id
        ORDER BY total DESC, completion_rate DESC
      `).all();
    } else if (type === 'category') {
      data = db.prepare(`
        SELECT cc.id, cc.name, cc.color, cc.icon,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status IN ('pending', 'assigned', 'not_started', 'in_progress', 'submitted') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed') THEN 1 ELSE 0 END) as overdue,
          ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0.0 END) / NULLIF(COUNT(t.id), 0) * 100, 0), 1) as completion_rate
        FROM compliance_categories cc
        LEFT JOIN compliances c ON cc.id = c.category_id
        LEFT JOIN compliance_tasks t ON c.id = t.compliance_id
        GROUP BY cc.id
        ORDER BY total DESC
      `).all();
    } else if (type === 'overdue') {
      data = db.prepare(`
        SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, c.code,
          t.period, t.due_date, t.status, t.priority,
          COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name,
          CAST(julianday('now') - julianday(t.due_date) AS INTEGER) as days_overdue
        FROM compliance_tasks t
        JOIN firms f ON t.firm_id = f.id
        JOIN compliances c ON t.compliance_id = c.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        ${taskFilter} AND (t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed'))
        ORDER BY days_overdue DESC, t.priority DESC
      `).all(...params);
    } else if (type === 'missed') {
      data = db.prepare(`
        SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, c.code,
          t.period, t.due_date, t.status, t.priority,
          COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name,
          CAST(julianday('now') - julianday(t.due_date) AS INTEGER) as days_overdue
        FROM compliance_tasks t
        JOIN firms f ON t.firm_id = f.id
        JOIN compliances c ON t.compliance_id = c.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        ${taskFilter} AND t.status = 'missed'
        ORDER BY days_overdue DESC
      `).all(...params);
    } else if (type === 'completed') {
      data = db.prepare(`
        SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, c.code,
          t.period, t.due_date, t.completed_at, t.status,
          COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name
        FROM compliance_tasks t
        JOIN firms f ON t.firm_id = f.id
        JOIN compliances c ON t.compliance_id = c.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        ${taskFilter} AND t.status = 'completed'
        ORDER BY t.completed_at DESC, t.due_date DESC
      `).all(...params);
    } else if (type === 'pending') {
      data = db.prepare(`
        SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name, c.code,
          t.period, t.due_date, t.status, t.priority,
          COALESCE(u.name, 'Unassigned') as assignee_name, COALESCE(d.name, 'General') as department_name
        FROM compliance_tasks t
        JOIN firms f ON t.firm_id = f.id
        JOIN compliances c ON t.compliance_id = c.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        ${taskFilter} AND t.status IN ('pending', 'assigned', 'not_started', 'in_progress', 'submitted')
        ORDER BY t.due_date ASC
      `).all(...params);
    } else if (type === 'documents') {
      data = db.prepare(`
        SELECT t.id, t.task_number, f.display_name as firm_name, c.name as compliance_name,
          t.period, t.due_date, t.status,
          COUNT(d.id) as document_count,
          COALESCE(u.name, 'Unassigned') as assignee_name
        FROM compliance_tasks t
        JOIN firms f ON t.firm_id = f.id
        JOIN compliances c ON t.compliance_id = c.id
        LEFT JOIN users u ON t.assignee_id = u.id
        LEFT JOIN documents d ON t.id = d.task_id AND d.status = 'active'
        ${taskFilter}
        GROUP BY t.id
        ORDER BY document_count ASC, t.due_date ASC
      `).all(...params);
    }

    return NextResponse.json({
      type,
      summary,
      upcomingDeadlines: {
        dueToday,
        dueSoon,
        overdue: overdueList,
        missed: missedList,
      },
      data,
    });
  } catch (error) {
    console.error('Reports route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
