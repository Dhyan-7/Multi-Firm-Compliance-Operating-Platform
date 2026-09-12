import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, verifyPassword, hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const profile = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.employee_id, u.designation, u.status, u.last_login, u.created_at,
             r.name as role_name, r.id as role_id,
             d.name as department_name, d.id as department_id,
             o.name as organization_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ?
    `).get(authUser.id);

    if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

    // Recent activity for current user
    const activity = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 15
    `).all(authUser.id);

    return NextResponse.json({ profile, activity });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const db = getDb();

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(authUser.id) as any;
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Handle Password Change
    if (body.current_password && body.new_password) {
      if (!verifyPassword(body.current_password, currentUser.password_hash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      if (typeof body.new_password !== 'string' || body.new_password.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      const newHash = hashPassword(body.new_password);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(newHash, authUser.id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'USER_PASSWORD_CHANGED', 'user', ?, ?, ?)
      `).run(authUser.organization_id, authUser.id, authUser.name, authUser.id, authUser.name, JSON.stringify({ action: 'Password updated securely' }));
    }

    // Handle Personal Details Update
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      }

      db.prepare(`
        UPDATE users
        SET name = ?,
            phone = ?,
            designation = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(body.name.trim(), body.phone || null, body.designation || currentUser.designation, authUser.id);

      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'USER_PROFILE_UPDATED', 'user', ?, ?, ?)
      `).run(authUser.organization_id, authUser.id, body.name.trim(), authUser.id, body.name.trim(), JSON.stringify({ name: body.name.trim(), phone: body.phone }));
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
