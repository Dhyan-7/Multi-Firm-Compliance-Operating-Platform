import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { evaluateApplicability } from '@/lib/compliance/applicability';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    const firm = db.prepare(`
      SELECT f.*, et.code as entity_type_code
      FROM firms f
      LEFT JOIN entity_types et ON f.entity_type_id = et.id
      WHERE f.id = ?
    `).get(id) as any;

    if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 });

    // 1. Current firm compliances
    const configured = db.prepare(`
      SELECT fc.*, c.name, c.code, c.frequency, c.authority, c.priority,
             cc.name as category_name, cc.color as category_color, cc.icon as category_icon
      FROM firm_compliances fc
      JOIN compliances c ON fc.compliance_id = c.id
      LEFT JOIN compliance_categories cc ON c.category_id = cc.id
      WHERE fc.firm_id = ?
    `).all(id);

    // 2. Evaluated automatic recommendations
    const recommendations = evaluateApplicability({
      id: firm.id,
      name: firm.display_name,
      entity_type_code: firm.entity_type_code || '',
      employee_count: firm.employee_count,
      has_gstin: !!firm.gstin,
      has_pan: !!firm.pan,
    });

    return NextResponse.json({ configured, recommendations });
  } catch (error) {
    console.error('Firm compliances error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const {
      compliance_id,
      status = 'active',
      default_assignee_id,
      default_department_id,
      override_frequency,
      override_due_day,
      notes
    } = body;

    if (!compliance_id) {
      return NextResponse.json({ error: 'compliance_id is required' }, { status: 400 });
    }

    const db = getDb();
    const firm = db.prepare("SELECT * FROM firms WHERE id = ?").get(id) as any;
    if (!firm) return NextResponse.json({ error: 'Firm not found' }, { status: 404 });

    const comp = db.prepare("SELECT * FROM compliances WHERE id = ?").get(compliance_id) as any;
    if (!comp) return NextResponse.json({ error: 'Compliance not found' }, { status: 404 });

    const existing = db.prepare("SELECT id FROM firm_compliances WHERE firm_id = ? AND compliance_id = ?").get(id, compliance_id);
    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });

    if (existing) {
      db.prepare(`
        UPDATE firm_compliances
        SET status = ?,
            enabled = CASE WHEN ? = 'inactive' THEN 0 ELSE 1 END,
            default_assignee_id = ?,
            override_assignee_id = ?,
            default_department_id = ?,
            override_department_id = ?,
            override_frequency = ?,
            override_due_day = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE firm_id = ? AND compliance_id = ?
      `).run(
        status,
        status,
        default_assignee_id || null,
        default_assignee_id || null,
        default_department_id || null,
        default_department_id || null,
        override_frequency || null,
        override_due_day !== undefined && override_due_day !== '' ? Number(override_due_day) : null,
        notes || null,
        id,
        compliance_id
      );
    } else {
      const fcId = `fc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO firm_compliances (
          id, firm_id, compliance_id, status, enabled,
          default_assignee_id, override_assignee_id,
          default_department_id, override_department_id,
          override_frequency, override_due_day, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fcId,
        id,
        compliance_id,
        status,
        status === 'inactive' ? 0 : 1,
        default_assignee_id || null,
        default_assignee_id || null,
        default_department_id || null,
        default_department_id || null,
        override_frequency || null,
        override_due_day !== undefined && override_due_day !== '' ? Number(override_due_day) : null,
        notes || null
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'FIRM_COMPLIANCE_CONFIGURED', 'firm', ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      `${comp.name} for ${firm.display_name}`,
      JSON.stringify({
        compliance_name: comp.name,
        compliance_code: comp.code,
        override_frequency,
        override_due_day,
        status,
        configured_by: user.name,
        timestamp_ist: istTimestamp
      })
    );

    return NextResponse.json({ message: 'Firm compliance configured successfully' });
  } catch (error) {
    console.error('Firm compliance save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let compliance_id = searchParams.get('compliance_id');

    if (!compliance_id) {
      try {
        const body = await request.json();
        compliance_id = body.compliance_id;
      } catch {
        // query param fallback
      }
    }

    if (!compliance_id) {
      return NextResponse.json({ error: 'compliance_id is required' }, { status: 400 });
    }

    const db = getDb();
    const comp = db.prepare("SELECT name, code FROM compliances WHERE id = ?").get(compliance_id) as any;
    const firm = db.prepare("SELECT display_name FROM firms WHERE id = ?").get(id) as any;

    // Delete firm compliance link
    db.prepare("DELETE FROM firm_compliances WHERE firm_id = ? AND compliance_id = ?").run(id, compliance_id);

    // Audit log
    const istTimestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'FIRM_COMPLIANCE_REMOVED', 'firm', ?, ?, ?)
    `).run(
      user.organization_id,
      user.id,
      user.name,
      id,
      `${comp?.name || 'Compliance'} for ${firm?.display_name || 'Firm'}`,
      JSON.stringify({ compliance_id, removed_by: user.name, timestamp_ist: istTimestamp })
    );

    return NextResponse.json({ message: 'Compliance removed from firm successfully' });
  } catch (error) {
    console.error('Firm compliance remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
