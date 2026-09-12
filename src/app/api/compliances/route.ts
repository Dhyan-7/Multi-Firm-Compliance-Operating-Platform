import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const compliances = db.prepare(`
      SELECT c.*, cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
        d.name as department_name
      FROM compliances c
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN departments d ON c.default_department_id = d.id
      ORDER BY cc.sort_order, c.name
    `).all();
    const categories = db.prepare("SELECT * FROM compliance_categories ORDER BY sort_order").all();
    return NextResponse.json({ compliances, categories });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const data = await request.json();
    const id = `comp_${Date.now()}`;
    db.prepare(`INSERT INTO compliances (id, category_id, name, code, description, authority, frequency, due_day, grace_period_days, priority, default_department_id, regulatory_reference, notes, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, data.category_id, data.name, data.code, data.description, data.authority, data.frequency, data.due_day, data.grace_period_days || 0, data.priority || 'medium', data.default_department_id, data.regulatory_reference, data.notes, 'active'
    );
    db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data) VALUES (?,?,?,'COMPLIANCE_CREATED','compliance',?,?,?)").run(user.organization_id, user.id, user.name, id, data.name, JSON.stringify(data));
    return NextResponse.json({ id, message: 'Compliance created' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
