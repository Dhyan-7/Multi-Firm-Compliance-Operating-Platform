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
    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'Compliance Name is required' }, { status: 400 });
    }
    if (!data.code?.trim()) {
      return NextResponse.json({ error: 'Statutory Code / Act is required' }, { status: 400 });
    }
    if (!data.category_id) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    if (!data.frequency) {
      return NextResponse.json({ error: 'Filing Frequency is required' }, { status: 400 });
    }

    const id = `comp_${Date.now()}`;
    db.prepare(`INSERT INTO compliances (id, category_id, name, code, description, authority, frequency, due_day, grace_period_days, priority, default_department_id, regulatory_reference, notes, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, data.category_id, data.name.trim(), data.code.trim().toUpperCase(), data.description || '', data.authority || '', data.frequency, data.due_day ? Number(data.due_day) : null, data.grace_period_days ? Number(data.grace_period_days) : 0, data.priority || 'medium', data.default_department_id || null, data.regulatory_reference || '', data.notes || '', 'active'
    );
    db.prepare("INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data) VALUES (?,?,?,'COMPLIANCE_CREATED','compliance',?,?,?)").run(user.organization_id, user.id, user.name, id, data.name.trim(), JSON.stringify(data));
    return NextResponse.json({ id, message: 'Compliance created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Create compliance error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const data = await request.json();
    const { id } = data;
    if (!id) return NextResponse.json({ error: 'Compliance ID required' }, { status: 400 });

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const current = db.prepare("SELECT * FROM compliances WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Compliance not found' }, { status: 404 });

    db.prepare(`
      UPDATE compliances
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          category_id = COALESCE(?, category_id),
          description = COALESCE(?, description),
          authority = COALESCE(?, authority),
          frequency = COALESCE(?, frequency),
          due_day = COALESCE(?, due_day),
          grace_period_days = COALESCE(?, grace_period_days),
          priority = COALESCE(?, priority),
          default_department_id = COALESCE(?, default_department_id),
          regulatory_reference = COALESCE(?, regulatory_reference),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.name,
      data.code,
      data.category_id,
      data.description,
      data.authority,
      data.frequency,
      data.due_day !== undefined ? Number(data.due_day) : null,
      data.grace_period_days !== undefined ? Number(data.grace_period_days) : null,
      data.priority,
      data.default_department_id,
      data.regulatory_reference,
      data.notes,
      data.status,
      id
    );

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
      VALUES (?, ?, ?, 'COMPLIANCE_UPDATED', 'compliance', ?, ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      data.name || current.name,
      JSON.stringify(current),
      JSON.stringify({ ...data, updated_by: user.name, timestamp_ist: istTimestamp })
    );

    return NextResponse.json({ message: 'Compliance updated successfully' });
  } catch (error) {
    console.error('Update compliance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Compliance ID required' }, { status: 400 });

    const db = getDb();
    const current = db.prepare("SELECT * FROM compliances WHERE id = ?").get(id) as any;
    if (!current) return NextResponse.json({ error: 'Compliance not found' }, { status: 404 });

    const taskCount = (db.prepare("SELECT COUNT(*) as count FROM compliance_tasks WHERE compliance_id = ?").get(id) as any)?.count || 0;
    const firmCount = (db.prepare("SELECT COUNT(*) as count FROM firm_compliances WHERE compliance_id = ?").get(id) as any)?.count || 0;

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    if (taskCount > 0 || firmCount > 0) {
      // Soft-deactivate if actively used
      db.prepare("UPDATE compliances SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      db.prepare(`
        INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
        VALUES (?, ?, ?, 'COMPLIANCE_DEACTIVATED', 'compliance', ?, ?, ?)
      `).run(user.organization_id, user.id, user.name, id, current.name, JSON.stringify({ reason: 'In use by firms or tasks, deactivated', timestamp_ist: istTimestamp }));

      return NextResponse.json({ message: 'Compliance deactivated (in use by existing firms/tasks)' });
    }

    db.prepare("DELETE FROM compliances WHERE id = ?").run(id);
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'COMPLIANCE_DELETED', 'compliance', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, current.name, JSON.stringify({ deleted_by: user.name, timestamp_ist: istTimestamp }));

    return NextResponse.json({ message: 'Compliance deleted successfully' });
  } catch (error) {
    console.error('Delete compliance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

