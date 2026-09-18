import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, hashPassword, isAdminOrSuperAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.employee_id, u.designation, u.status, u.last_login, u.created_at,
        r.name as role_name, r.id as role_id, d.name as department_name, d.id as department_id
      FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.organization_id = ? ORDER BY u.name
    `).all(user.organization_id);
    const roles = db.prepare("SELECT * FROM roles ORDER BY id ASC").all();
    const departments = db.prepare("SELECT * FROM departments WHERE organization_id = ? ORDER BY name").all(user.organization_id);
    return NextResponse.json({ users, roles, departments });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin and Admin can create users' }, { status: 403 });
    }

    const data = await request.json();

    // Mandatory Field Validations
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required (minimum 2 characters)' }, { status: 400 });
    }

    const email = (data.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'A valid email address is mandatory' }, { status: 400 });
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
      return NextResponse.json({ error: 'Password is mandatory and must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();

    // Check email uniqueness
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
    }

    // Role validation & Single Super Admin rule
    const roleId = data.role_id || 'role_03';
    if (roleId === 'role_01') {
      return NextResponse.json({
        error: 'Only 1 Super Admin is permitted in the system (Raghu G R). Please assign Admin, User, or a custom role.'
      }, { status: 400 });
    }

    const role = db.prepare("SELECT id FROM roles WHERE id = ?").get(roleId);
    if (!role) {
      return NextResponse.json({ error: 'Selected role does not exist' }, { status: 400 });
    }

    const id = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const hashedPassword = hashPassword(data.password);
    const orgId = user.organization_id || 'org_001';

    db.prepare(`
      INSERT INTO users (
        id, organization_id, name, email, password_hash,
        department_id, designation, role_id, phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      orgId,
      data.name.trim(),
      email,
      hashedPassword,
      data.department_id || 'dept_08',
      data.designation || 'Staff',
      roleId,
      data.phone || null
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'USER_CREATED', 'user', ?, ?, ?)
    `).run(orgId, user.id, user.name, id, data.name.trim(), JSON.stringify({ email, role_id: roleId }));

    return NextResponse.json({ id, message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
