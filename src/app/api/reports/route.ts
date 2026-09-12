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

    if (type === 'compliance') {
      const data = db.prepare(`
        SELECT f.display_name as firm_name, 
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status='completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status IN ('pending','not_started','assigned') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN t.status='overdue' THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN t.status='missed' THEN 1 ELSE 0 END) as missed,
          ROUND(SUM(CASE WHEN t.status='completed' THEN 1.0 ELSE 0.0 END)/COUNT(t.id)*100, 1) as health
        FROM compliance_tasks t JOIN firms f ON t.firm_id=f.id
        GROUP BY f.id ORDER BY f.display_name
      `).all();
      return NextResponse.json({ data, type });
    }
    if (type === 'overdue') {
      const data = db.prepare(`
        SELECT t.task_number, f.display_name as firm_name, c.name as compliance_name, t.due_date, t.status, t.priority,
          u.name as assignee_name, d.name as department_name,
          CAST(julianday('now')-julianday(t.due_date) AS INTEGER) as days_overdue
        FROM compliance_tasks t JOIN firms f ON t.firm_id=f.id JOIN compliances c ON t.compliance_id=c.id
        LEFT JOIN users u ON t.assignee_id=u.id LEFT JOIN departments d ON t.department_id=d.id
        WHERE t.status IN ('overdue','missed') ORDER BY t.due_date
      `).all();
      return NextResponse.json({ data, type });
    }
    if (type === 'department') {
      const data = db.prepare(`
        SELECT d.name as department_name,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status='completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status='overdue' THEN 1 ELSE 0 END) as overdue,
          ROUND(SUM(CASE WHEN t.status='completed' THEN 1.0 ELSE 0.0 END)/MAX(COUNT(t.id),1)*100, 1) as completion_rate
        FROM compliance_tasks t JOIN departments d ON t.department_id=d.id GROUP BY d.id ORDER BY completion_rate DESC
      `).all();
      return NextResponse.json({ data, type });
    }
    if (type === 'user') {
      const data = db.prepare(`
        SELECT u.name as user_name, d.name as department_name,
          COUNT(t.id) as total,
          SUM(CASE WHEN t.status='completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status='overdue' THEN 1 ELSE 0 END) as overdue,
          ROUND(SUM(CASE WHEN t.status='completed' THEN 1.0 ELSE 0.0 END)/MAX(COUNT(t.id),1)*100, 1) as completion_rate
        FROM compliance_tasks t JOIN users u ON t.assignee_id=u.id LEFT JOIN departments d ON u.department_id=d.id
        GROUP BY u.id ORDER BY completion_rate DESC
      `).all();
      return NextResponse.json({ data, type });
    }
    if (type === 'category') {
      const data = db.prepare(`
        SELECT cc.name, cc.color, COUNT(t.id) as total,
          SUM(CASE WHEN t.status='completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN t.status='overdue' THEN 1 ELSE 0 END) as overdue
        FROM compliance_tasks t JOIN compliances c ON t.compliance_id=c.id
        JOIN compliance_categories cc ON c.category_id=cc.id GROUP BY cc.id ORDER BY total DESC
      `).all();
      return NextResponse.json({ data, type });
    }
    return NextResponse.json({ data: [], type });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
