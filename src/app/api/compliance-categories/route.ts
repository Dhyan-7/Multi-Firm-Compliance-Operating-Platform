import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const categories = db.prepare(`
      SELECT cc.*, COUNT(c.id) as compliance_count
      FROM compliance_categories cc
      LEFT JOIN compliances c ON cc.id = c.category_id
      WHERE cc.status = 'active'
      GROUP BY cc.id
      ORDER BY cc.sort_order ASC, cc.name ASC
    `).all();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, code, description, color, icon } = body;
    if (!name || !code) return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });

    const db = getDb();
    const id = `cat_${Date.now().toString(36)}`;
    db.prepare(`
      INSERT INTO compliance_categories (id, name, code, description, color, icon, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, code, description || '', color || '#3B82F6', icon || '📋');

    return NextResponse.json({ message: 'Category created', id });
  } catch (error) {
    console.error('Category create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
