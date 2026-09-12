import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can update roles' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    const db = getDb();
    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(id) as any;
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    if (id === 'role_01') {
      return NextResponse.json({ error: 'Super Admin system role is immutable and cannot be renamed' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Role name must be at least 2 characters' }, { status: 400 });
    }

    db.prepare(`
      UPDATE roles
      SET name = ?,
          description = ?
      WHERE id = ?
    `).run(name.trim(), description || null, id);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'ROLE_UPDATED', 'role', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, name.trim(), JSON.stringify({ description }));

    return NextResponse.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Role update error:', error);
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

    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can delete roles' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    if (id === 'role_01' || id === 'role_02' || id === 'role_03') {
      return NextResponse.json({ error: 'System roles (Super Admin, Admin, and User) are permanent and cannot be deleted' }, { status: 400 });
    }

    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(id) as any;
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    // Check if any users are assigned to this role
    const assignedUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role_id = ?").get(id) as any;
    if (assignedUsers && assignedUsers.count > 0) {
      return NextResponse.json({
        error: `Cannot delete role: ${assignedUsers.count} active user(s) are currently assigned to this role. Please reassign them first.`
      }, { status: 400 });
    }

    // Delete permissions and role
    db.prepare("DELETE FROM role_permissions WHERE role_id = ?").run(id);
    db.prepare("DELETE FROM roles WHERE id = ?").run(id);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data)
      VALUES (?, ?, ?, 'ROLE_DELETED', 'role', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, role.name, JSON.stringify({ role }));

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Role delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
