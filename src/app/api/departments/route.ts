import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const departments = db.prepare(`
      SELECT d.*, u.name as head_name, u.email as head_email,
             COUNT(DISTINCT mem.id) as member_count,
             COUNT(DISTINCT t.id) as task_count
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      LEFT JOIN users mem ON d.id = mem.department_id
      LEFT JOIN compliance_tasks t ON d.id = t.department_id
      WHERE d.status = 'active'
      GROUP BY d.id
      ORDER BY d.name ASC
    `).all();

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Departments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, head_user_id } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const deptId = `dept_${Date.now().toString(36)}`;
    db.prepare("INSERT INTO departments (id, organization_id, name, head_user_id, status) VALUES (?, ?, ?, ?, 'active')")
      .run(deptId, user.organization_id || 'org_001', name, head_user_id || null);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'DEPARTMENT_CREATED', 'department', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, deptId, name, JSON.stringify({ name, head_user_id }));

    return NextResponse.json({ message: 'Department created', id: deptId });
  } catch (error) {
    console.error('Department creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
