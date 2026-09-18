import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({
        firms: [],
        tasks: [],
        compliances: [],
        users: [],
        departments: [],
        documents: [],
      });
    }

    const likeQuery = `%${q}%`;

    // 1. Search Firms
    const firms = db.prepare(`
      SELECT id, display_name, legal_name, pan, gstin, cin, status
      FROM firms
      WHERE status != 'deleted'
        AND (display_name LIKE ? OR legal_name LIKE ? OR pan LIKE ? OR gstin LIKE ? OR cin LIKE ?)
      ORDER BY display_name ASC
      LIMIT 8
    `).all(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);

    // 2. Search Tasks
    let taskSql = `
      SELECT t.id, t.task_number, t.period, t.due_date, t.status, t.priority,
        c.name as compliance_name, c.code as compliance_code,
        f.display_name as firm_name,
        u.name as assignee_name,
        d.name as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE (
        t.task_number LIKE ?
        OR c.name LIKE ?
        OR c.code LIKE ?
        OR f.display_name LIKE ?
        OR f.legal_name LIKE ?
        OR t.period LIKE ?
        OR u.name LIKE ?
        OR d.name LIKE ?
      )
    `;
    const taskParams: any[] = [
      likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery
    ];

    // If standard user, scope tasks to their assigned or department tasks
    if (user.role_id === 'role_03') {
      taskSql += ` AND (t.assignee_id = ? OR t.department_id = ?)`;
      taskParams.push(user.id, user.department_id);
    }
    taskSql += ` ORDER BY t.due_date ASC LIMIT 10`;
    const tasks = db.prepare(taskSql).all(...taskParams);

    // 3. Search Compliances
    const compliances = db.prepare(`
      SELECT c.id, c.name, c.code, c.authority, c.frequency, c.status,
        cc.name as category_name, cc.color as category_color, cc.icon as category_icon
      FROM compliances c
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      WHERE c.name LIKE ? OR c.code LIKE ? OR c.authority LIKE ? OR c.regulatory_reference LIKE ?
      ORDER BY c.name ASC
      LIMIT 8
    `).all(likeQuery, likeQuery, likeQuery, likeQuery);

    // 4. Search Users (Admin / Super Admin, or visible colleagues)
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.designation, d.name as department_name, r.name as role_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.status = 'active'
        AND (u.name LIKE ? OR u.email LIKE ? OR u.designation LIKE ? OR d.name LIKE ?)
      ORDER BY u.name ASC
      LIMIT 6
    `).all(likeQuery, likeQuery, likeQuery, likeQuery);

    // 5. Search Departments
    const departments = db.prepare(`
      SELECT d.id, d.name, u.name as head_name
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      WHERE d.status = 'active' AND d.name LIKE ?
      ORDER BY d.name ASC
      LIMIT 5
    `).all(likeQuery);

    // 6. Search Documents
    const documents = db.prepare(`
      SELECT d.id, d.file_name, d.document_type, d.file_path,
        f.display_name as firm_name, dep.name as department_name
      FROM documents d
      LEFT JOIN firms f ON d.firm_id = f.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      WHERE d.status = 'active'
        AND (d.file_name LIKE ? OR d.document_type LIKE ? OR f.display_name LIKE ?)
      ORDER BY d.created_at DESC
      LIMIT 6
    `).all(likeQuery, likeQuery, likeQuery);

    return NextResponse.json({
      firms,
      tasks,
      compliances,
      users,
      departments,
      documents,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
