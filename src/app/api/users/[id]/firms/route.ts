import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(request);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const firms = db.prepare(`
      SELECT f.id, f.display_name, f.legal_name, f.city, f.state,
             CASE WHEN ufa.user_id IS NOT NULL THEN 1 ELSE 0 END as has_access
      FROM firms f
      LEFT JOIN user_firm_access ufa ON f.id = ufa.firm_id AND ufa.user_id = ?
      WHERE f.status != 'deleted'
      ORDER BY f.display_name ASC
    `).all(id);

    return NextResponse.json({ firms });
  } catch (error) {
    console.error('User firms access error:', error);
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

    const { id } = await params;
    const body = await request.json();
    const { firm_ids } = body;

    if (!Array.isArray(firm_ids)) {
      return NextResponse.json({ error: 'firm_ids array required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(id) as any;
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const deleteOld = db.prepare("DELETE FROM user_firm_access WHERE user_id = ?");
    const insertNew = db.prepare("INSERT INTO user_firm_access (user_id, firm_id) VALUES (?, ?)");

    const runTx = db.transaction((ids: string[]) => {
      deleteOld.run(id);
      ids.forEach(fId => {
        if (fId) insertNew.run(id, fId);
      });
    });

    runTx(firm_ids);

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'USER_FIRM_ACCESS_UPDATED', 'user', ?, ?, ?)
    `).run(authUser.organization_id, authUser.id, authUser.name, id, user.name, JSON.stringify({ assignedCount: firm_ids.length }));

    return NextResponse.json({ message: 'Firm access permissions updated successfully' });
  } catch (error) {
    console.error('Update firm access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
