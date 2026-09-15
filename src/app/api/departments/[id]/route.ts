import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const dept = db.prepare(`
      SELECT d.*, u.name as head_name, u.email as head_email
      FROM departments d
      LEFT JOIN users u ON d.head_user_id = u.id
      WHERE d.id = ?
    `).get(id) as any;

    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.designation, u.status, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.department_id = ?
      ORDER BY u.name ASC
    `).all(id);

    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_tasks
      FROM compliance_tasks
      WHERE department_id = ?
    `).get(id);

    return NextResponse.json({ department: dept, members, taskStats });
  } catch (error) {
    console.error('Department fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, head_user_id, reassign_user_ids } = body;

    const db = getDb();
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(id) as any;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    if (name) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'Department name is mandatory (minimum 2 characters)' }, { status: 400 });
      }

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
    }

    // Handle adding / moving users into this department
    if (Array.isArray(reassign_user_ids) && reassign_user_ids.length > 0) {
      for (const uid of reassign_user_ids) {
        db.prepare("UPDATE users SET department_id = ? WHERE id = ?").run(id, uid);
        db.prepare(`
          INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
          VALUES (?, ?, ?, 'USER_DEPARTMENT_REASSIGNED', 'user', ?, ?, ?)
        `).run(user.organization_id, user.id, user.name, uid, dept.name, JSON.stringify({ user_id: uid, new_department_id: id, department_name: dept.name }));
      }
    }

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
    const url = new URL(request.url);
    const transferTo = url.searchParams.get('transfer_to');
    const db = getDb();

    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(id) as any;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    // Check if any users are in this department
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE department_id = ?").get(id) as any;
    if (userCount && userCount.count > 0) {
      if (!transferTo) {
        return NextResponse.json({
          error: `Cannot delete department: ${userCount.count} staff members are assigned here. Reassign them first or select a transfer department.`,
          userCount: userCount.count
        }, { status: 400 });
      }

      // Reassign all members to transferTo
      const targetDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(transferTo) as any;
      if (!targetDept) {
        return NextResponse.json({ error: 'Target transfer department not found' }, { status: 400 });
      }

      db.prepare("UPDATE users SET department_id = ? WHERE department_id = ?").run(transferTo, id);
      db.prepare("UPDATE compliance_tasks SET department_id = ? WHERE department_id = ?").run(transferTo, id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
        VALUES (?, ?, ?, 'DEPARTMENT_MEMBERS_TRANSFERRED', 'department', ?, ?, ?, ?)
      `).run(user.organization_id, user.id, user.name, id, dept.name,
        JSON.stringify({ from_department: dept.name, count: userCount.count }),
        JSON.stringify({ to_department: targetDept.name, to_id: transferTo })
      );
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
