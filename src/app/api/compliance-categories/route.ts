import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/auth';

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
    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can manage compliance categories' }, { status: 403 });
    }

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

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can manage compliance categories' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, code, description, color, icon, status } = body;
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const db = getDb();
    const current = db.prepare("SELECT * FROM compliance_categories WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    db.prepare(`
      UPDATE compliance_categories
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, code, description, color, icon, status, id);

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'COMPLIANCE_CATEGORY_UPDATED', 'compliance_category', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, name || current.name, JSON.stringify({ ...body, updated_by: user.name, timestamp_ist: istTimestamp }));

    return NextResponse.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete compliance categories' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const db = getDb();
    const current = db.prepare("SELECT * FROM compliance_categories WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const compCount = (db.prepare("SELECT COUNT(*) as count FROM compliances WHERE category_id = ?").get(id) as any)?.count || 0;
    if (compCount > 0) {
      return NextResponse.json({
        error: `Cannot delete category with ${compCount} bound statutory compliance templates. Reassign or delete those templates first.`
      }, { status: 400 });
    }

    db.prepare("DELETE FROM compliance_categories WHERE id = ?").run(id);

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'COMPLIANCE_CATEGORY_DELETED', 'compliance_category', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, current.name, JSON.stringify({ deleted_by: user.name, timestamp_ist: istTimestamp }));

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
