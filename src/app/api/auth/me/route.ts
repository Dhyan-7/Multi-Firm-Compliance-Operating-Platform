import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import getDb from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const userRecord = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.employee_id, u.designation, u.avatar_url,
             r.id as role_id, r.name as role_name,
             d.id as department_id, d.name as department_name,
             o.id as organization_id, o.name as organization_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ?
    `).get(user.id);

    // Get user permissions
    const permissions = db.prepare(`
      SELECT p.module, p.action
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `).all(user.role_id) as { module: string; action: string }[];

    return NextResponse.json({
      user: userRecord,
      permissions: permissions.map(p => `${p.module}:${p.action}`)
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
