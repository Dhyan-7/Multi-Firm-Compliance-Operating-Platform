import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const roles = db.prepare(`
      SELECT r.*, COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id
      ORDER BY r.created_at ASC
    `).all();

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, clone_from_role_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Role name is mandatory (minimum 2 characters)' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM roles WHERE LOWER(name) = ?").get(name.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 });
    }

    const roleId = `role_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
    db.prepare(`
      INSERT INTO roles (id, name, description, is_system)
      VALUES (?, ?, ?, 0)
    `).run(roleId, name.trim(), description || null);

    // Optionally clone permissions from existing role
    if (clone_from_role_id) {
      const sourcePerms = db.prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?").all(clone_from_role_id) as any[];
      const insertPerm = db.prepare("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)");
      sourcePerms.forEach(p => insertPerm.run(roleId, p.permission_id));
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'ROLE_CREATED', 'role', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, roleId, name.trim(), JSON.stringify({ description, clone_from: clone_from_role_id }));

    return NextResponse.json({ message: 'Role created successfully', id: roleId }, { status: 201 });
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
