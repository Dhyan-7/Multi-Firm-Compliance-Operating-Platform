import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userFilter = searchParams.get('user');
    const actionFilter = searchParams.get('action');
    const entityFilter = searchParams.get('entity_type');

    let where = '1=1';
    const params: any[] = [];
    if (userFilter) { where += ' AND a.user_id = ?'; params.push(userFilter); }
    if (actionFilter) { where += ' AND a.action = ?'; params.push(actionFilter); }
    if (entityFilter) { where += ' AND a.entity_type = ?'; params.push(entityFilter); }

    const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs a WHERE ${where}`).get(...params) as any).c;
    const logs = db.prepare(`SELECT * FROM audit_logs a WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    return NextResponse.json({ logs, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
