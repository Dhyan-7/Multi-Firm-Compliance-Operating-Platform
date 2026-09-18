import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/dashboard - Get dashboard data
export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const monthStart = `${today.substring(0, 7)}-01`;
    const monthEnd = new Date(new Date(today).getFullYear(), new Date(today).getMonth() + 1, 0).toISOString().split('T')[0];

    // Accurate Dynamic KPI data
    const totalFirms = (db.prepare("SELECT COUNT(*) as c FROM firms WHERE status = 'active'").get() as any).c;
    const totalTasks = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks").get() as any).c;
    const myAssigned = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE assignee_id = ?").get(user.id) as any).c;
    const completed = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'completed'").get() as any).c;
    const pending = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status IN ('pending','not_started','assigned')").get() as any).c;
    const inProgress = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'in_progress'").get() as any).c;
    const overdue = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status != 'completed' AND (status = 'overdue' OR due_date < date('now'))").get() as any).c;
    const missed = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'missed'").get() as any).c;
    const dueToday = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE due_date = ? AND status NOT IN ('completed','missed')").get(today) as any).c;
    const dueThisWeek = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE due_date BETWEEN ? AND ? AND status NOT IN ('completed','missed')").get(today, weekEnd) as any).c;
    const submitted = (db.prepare("SELECT COUNT(*) as c FROM compliance_tasks WHERE status = 'submitted'").get() as any).c;

    // Firm-wise summary (strictly no employee count or turnover)
    const firmSummary = db.prepare(`
      SELECT f.id, f.display_name as name, f.legal_name,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('pending','not_started','assigned') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN (t.status = 'overdue' OR (t.due_date < date('now') AND t.status != 'completed')) THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN t.status = 'missed' THEN 1 ELSE 0 END) as missed
      FROM firms f LEFT JOIN compliance_tasks t ON f.id = t.firm_id
      WHERE f.status = 'active' GROUP BY f.id ORDER BY f.display_name
    `).all();

    // Today's tasks
    const todayTasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, c.name as compliance_name, c.code as compliance_code,
        u.name as assignee_name, cc.name as category_name, cc.color as category_color
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      WHERE t.due_date = ? AND t.status NOT IN ('completed','missed')
      ORDER BY t.priority DESC LIMIT 10
    `).all(today);

    // Upcoming tasks (next 7 days)
    const upcomingTasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, c.name as compliance_name,
        u.name as assignee_name, cc.name as category_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      WHERE t.due_date > ? AND t.due_date <= ? AND t.status NOT IN ('completed','missed')
      ORDER BY t.due_date LIMIT 10
    `).all(today, weekEnd);

    // Monthly completion trend (last 6 months)
    const monthlyTrend = db.prepare(`
      SELECT strftime('%Y-%m', due_date) as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
      FROM compliance_tasks
      GROUP BY strftime('%Y-%m', due_date)
      ORDER BY month DESC LIMIT 6
    `).all();

    // Category distribution
    const categoryDist = db.prepare(`
      SELECT cc.name, cc.color, COUNT(t.id) as count
      FROM compliance_tasks t
      JOIN compliances c ON t.compliance_id = c.id
      JOIN compliance_categories cc ON c.category_id = cc.id
      GROUP BY cc.id ORDER BY count DESC LIMIT 8
    `).all();

    // Department performance
    const deptPerf = db.prepare(`
      SELECT d.name,
        COUNT(t.id) as total,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM compliance_tasks t
      JOIN departments d ON t.department_id = d.id
      GROUP BY d.id ORDER BY total DESC
    `).all();

    // Recent activity
    const recentActivity = db.prepare(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
    `).all();

    return NextResponse.json({
      kpis: { totalFirms, totalTasks, myAssigned, completed, pending, inProgress, overdue, missed, dueToday, dueThisWeek, submitted },
      firmSummary,
      todayTasks,
      upcomingTasks,
      monthlyTrend: monthlyTrend.reverse(),
      categoryDist,
      deptPerf,
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
