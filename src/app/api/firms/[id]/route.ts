import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const firm = db.prepare(`
      SELECT f.*, et.name as entity_type_name, et.code as entity_type_code
      FROM firms f
      LEFT JOIN entity_types et ON f.entity_type_id = et.id
      WHERE f.id = ? AND f.status != 'deleted'
    `).get(id);

    if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 });

    const contacts = db.prepare("SELECT * FROM firm_contacts WHERE firm_id = ? ORDER BY created_at ASC").all(id);

    // Firm specific stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('pending','assigned','not_started') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
      FROM compliance_tasks
      WHERE firm_id = ?
    `).get(id) as any;

    const total = stats?.total || 0;
    const completed = stats?.completed || 0;
    const overdue = stats?.overdue || 0;
    const healthScore = total > 0 ? Math.max(0, Math.min(100, Math.round(((completed - overdue * 2) / total) * 100))) : 100;

    // Applicable compliances
    const compliances = db.prepare(`
      SELECT fc.*, c.name as compliance_name, c.code as compliance_code, c.frequency, c.authority, c.priority,
             cc.name as category_name, cc.color as category_color, cc.icon as category_icon,
             u.name as assignee_name, d.name as department_name
      FROM firm_compliances fc
      JOIN compliances c ON fc.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON COALESCE(fc.default_assignee_id, fc.override_assignee_id) = u.id
      LEFT JOIN departments d ON COALESCE(fc.default_department_id, fc.override_department_id) = d.id
      WHERE fc.firm_id = ?
      ORDER BY c.priority DESC, c.name ASC
    `).all(id);

    // Recent tasks
    const tasks = db.prepare(`
      SELECT t.*, c.name as compliance_name, c.code as compliance_code,
             u.name as assignee_name, cc.name as category_name, cc.color as category_color
      FROM compliance_tasks t
      JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.firm_id = ?
      ORDER BY t.due_date ASC
      LIMIT 50
    `).all(id);

    // Activity timeline
    const activity = db.prepare(`
      SELECT * FROM audit_logs
      WHERE (entity_id = ? AND entity_type = 'firm')
         OR (entity_type = 'task' AND entity_id IN (SELECT id FROM compliance_tasks WHERE firm_id = ?))
      ORDER BY created_at DESC
      LIMIT 25
    `).all(id, id);

    return NextResponse.json({
      firm,
      contacts,
      stats: { ...stats, healthScore },
      compliances,
      tasks,
      activity
    });
  } catch (error) {
    console.error('Firm detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(id) as any;
    if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 });

    // Validate PAN if changed
    if (body.pan) {
      const pan = body.pan.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        return NextResponse.json({ error: 'Invalid PAN format' }, { status: 400 });
      }
      body.pan = pan;
    }

    // Validate GSTIN if changed
    if (body.gstin) {
      const gstin = body.gstin.trim().toUpperCase();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
        return NextResponse.json({ error: 'Invalid GSTIN format' }, { status: 400 });
      }
      body.gstin = gstin;
    }

    db.prepare(`
      UPDATE firms
      SET display_name = COALESCE(?, display_name),
          legal_name = COALESCE(?, legal_name),
          pan = COALESCE(?, pan),
          gstin = COALESCE(?, gstin),
          cin = COALESCE(?, cin),
          industry = COALESCE(?, industry),
          employee_count = COALESCE(?, employee_count),
          turnover_band = COALESCE(?, turnover_band),
          registered_address = COALESCE(?, registered_address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pin_code = COALESCE(?, pin_code),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      body.display_name || null,
      body.legal_name || null,
      body.pan || null,
      body.gstin || null,
      body.cin || body.cin_llpin || null,
      body.industry || null,
      body.employee_count !== undefined ? Number(body.employee_count) : null,
      body.turnover_band || null,
      body.registered_address || body.address_line1 || null,
      body.city || null,
      body.state || null,
      body.pin_code || body.pincode || null,
      id
    );

    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'FIRM_UPDATED', 'firm', ?, ?, ?)
    `).run(user.organization_id, user.id, user.name, id, body.display_name || firm.display_name, JSON.stringify(body));

    return NextResponse.json({ message: 'Firm updated successfully' });
  } catch (error) {
    console.error('Firm update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC check: only Admin and Super Admin can permanently remove a firm (Section 2.3)
    const isAdmin = user.role_name === 'Super Admin' || user.role_name === 'Admin' || user.role_id === 'role_01' || user.role_id === 'role_02';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete a firm' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(id) as any;
    if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 });

    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    // Soft delete the firm
    db.prepare("UPDATE firms SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    // Cancel pending/open tasks associated with this firm
    db.prepare(`
      UPDATE compliance_tasks
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE firm_id = ? AND status NOT IN ('completed', 'cancelled')
    `).run(id);

    // Disable firm compliances
    db.prepare("UPDATE firm_compliances SET status = 'inactive', enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE firm_id = ?").run(id);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_data, new_data)
      VALUES (?, ?, ?, 'FIRM_DELETED', 'firm', ?, ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      firm.display_name || firm.legal_name,
      JSON.stringify({ status: firm.status, legal_name: firm.legal_name, display_name: firm.display_name }),
      JSON.stringify({ status: 'deleted', deleted_by: user.name, timestamp_ist: istTimestamp })
    );

    return NextResponse.json({ message: 'Firm deleted permanently from active operations', firm_id: id });
  } catch (error) {
    console.error('Firm delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
