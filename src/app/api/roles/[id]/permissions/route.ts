import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can view role permissions' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(id);
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    const allPermissions = db.prepare("SELECT * FROM permissions ORDER BY module, action").all();
    const assignedPermissions = db.prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?").all(id) as any[];
    const assignedIds = assignedPermissions.map(p => p.permission_id);

    return NextResponse.json({ role, allPermissions, assignedIds });
  } catch (error) {
    console.error('Role permissions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can modify role permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { permission_ids } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json({ error: 'permission_ids must be an array' }, { status: 400 });
    }

    // Super Admin permissions are immutable
    if (id === 'role_01') {
      return NextResponse.json({ error: 'Super Admin permissions are permanent and cannot be modified' }, { status: 400 });
    }

    const db = getDb();
    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(id) as any;
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    // Transaction to update role permissions
    const deleteOld = db.prepare("DELETE FROM role_permissions WHERE role_id = ?");
    const insertNew = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");

    const runTx = db.transaction((pIds: string[]) => {
      deleteOld.run(id);
      for (const pId of pIds) {
        insertNew.run(id, pId);
      }
    });

    runTx(permission_ids);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'ROLE_PERMISSIONS_UPDATED', 'role', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, role.name, JSON.stringify({ permissionsCount: permission_ids.length }));

    return NextResponse.json({ message: 'Permissions updated successfully', count: permission_ids.length });
  } catch (error) {
    console.error('Role permissions update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
