import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, hashPassword, isAdminOrSuperAdmin, isSuperAdmin } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.employee_id, u.designation, u.status, u.last_login, u.created_at,
             r.name as role_name, r.id as role_id,
             d.name as department_name, d.id as department_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(id) as any;

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const assignedFirms = db.prepare("SELECT firm_id FROM user_firm_access WHERE user_id = ?").all(id) as any[];
    const assigned_firm_ids = assignedFirms.map(f => f.firm_id);

    return NextResponse.json({ user, assigned_firm_ids });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can update users' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Hierarchy guard: Admin cannot modify the primary Super Admin (Dhyan)
    if (id === 'user_01' && !isSuperAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Admins cannot modify the primary Super Admin account' }, { status: 403 });
    }

    // Single Super Admin rule: Cannot promote any user to role_01
    if (body.role_id === 'role_01' && id !== 'user_01') {
      return NextResponse.json({
        error: 'Only 1 Super Admin is permitted in the system (Dhyan). Please assign Admin, User, or a custom role.'
      }, { status: 400 });
    }

    // Protect user_01 from having role changed away from Super Admin
    if (id === 'user_01' && body.role_id && body.role_id !== 'role_01') {
      return NextResponse.json({ error: 'Cannot change the role of the primary Super Admin' }, { status: 400 });
    }

    // Validate email uniqueness if changing email
    if (body.email && body.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
      const duplicate = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(body.email.trim().toLowerCase(), id);
      if (duplicate) {
        return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
      }
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const email = body.email !== undefined ? body.email.trim().toLowerCase() : existing.email;
    const roleId = body.role_id !== undefined ? body.role_id : existing.role_id;
    const departmentId = body.department_id !== undefined ? body.department_id : existing.department_id;
    const designation = body.designation !== undefined ? body.designation.trim() : existing.designation;
    const phone = body.phone !== undefined ? body.phone.trim() : existing.phone;
    const status = body.status !== undefined ? body.status : existing.status;

    // Optional password reset
    let passwordHash = existing.password_hash;
    if (body.password && typeof body.password === 'string' && body.password.length >= 6) {
      passwordHash = hashPassword(body.password);
    }

    db.prepare(`
      UPDATE users
      SET name = ?,
          email = ?,
          password_hash = ?,
          role_id = ?,
          department_id = ?,
          designation = ?,
          phone = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(name, email, passwordHash, roleId, departmentId, designation, phone, status, id);

    // Synchronize firm access if provided
    if (Array.isArray(body.assigned_firm_ids)) {
      db.prepare("DELETE FROM user_firm_access WHERE user_id = ?").run(id);
      const insertAccess = db.prepare("INSERT INTO user_firm_access (user_id, firm_id) VALUES (?, ?)");
      body.assigned_firm_ids.forEach((fId: string) => {
        if (fId) insertAccess.run(id, fId);
      });
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'USER_UPDATED', 'user', ?, ?, ?)
    `).run(authUser.organization_id, authUser.id, authUser.name, id, name, JSON.stringify({ roleId, status, departmentId }));

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(authUser)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can delete users' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    // Prevent deleting primary Super Admin (user_01) or current user
    if (id === 'user_01') {
      return NextResponse.json({ error: 'Primary Super Admin (Dhyan) cannot be deleted' }, { status: 400 });
    }

    if (id === authUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own active user session' }, { status: 400 });
    }

    const userToDelete = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admin cannot delete Super Admin
    if (userToDelete.role_id === 'role_01') {
      return NextResponse.json({ error: 'Super Admin cannot be deleted' }, { status: 400 });
    }

    // Unassign tasks or keep history, delete user access & delete user
    db.prepare("DELETE FROM user_firm_access WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data)
      VALUES (?, ?, ?, 'USER_DELETED', 'user', ?, ?, ?)
    `).run(authUser.organization_id, authUser.id, authUser.name, id, userToDelete.name, JSON.stringify({ email: userToDelete.email }));

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
