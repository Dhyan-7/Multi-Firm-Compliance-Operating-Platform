import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, head_user_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Department name is mandatory (minimum 2 characters)' }, { status: 400 });
    }

    const db = getDb();
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(id) as any;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    db.prepare(`
      UPDATE departments
      SET name = ?,
          head_user_id = ?
      WHERE id = ?
    `).run(name.trim(), head_user_id || null, id);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'DEPARTMENT_UPDATED', 'department', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, name.trim(), JSON.stringify({ name: name.trim(), head_user_id }));

    return NextResponse.json({ message: 'Department updated successfully' });
  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(id) as any;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    // Check if any users are in this department
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE department_id = ?").get(id) as any;
    if (userCount && userCount.count > 0) {
      return NextResponse.json({
        error: `Cannot delete department: ${userCount.count} staff members are assigned here. Reassign them first.`
      }, { status: 400 });
    }

    db.prepare("DELETE FROM departments WHERE id = ?").run(id);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data)
      VALUES (?, ?, ?, 'DEPARTMENT_DELETED', 'department', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, dept.name, JSON.stringify({ dept }));

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Department delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
