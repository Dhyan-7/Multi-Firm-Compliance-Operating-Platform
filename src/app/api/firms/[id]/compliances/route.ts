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
    const { compliance_id, status, default_assignee_id, default_department_id } = body;

    const db = getDb();
    const existing = db.prepare("SELECT id FROM firm_compliances WHERE firm_id = ? AND compliance_id = ?").get(id, compliance_id);

    if (existing) {
      db.prepare(`
        UPDATE firm_compliances
        SET status = COALESCE(?, status),
            enabled = CASE WHEN ? = 'inactive' THEN 0 ELSE 1 END,
            default_assignee_id = COALESCE(?, default_assignee_id),
            override_assignee_id = COALESCE(?, override_assignee_id),
            default_department_id = COALESCE(?, default_department_id),
            override_department_id = COALESCE(?, override_department_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE firm_id = ? AND compliance_id = ?
      `).run(status, status, default_assignee_id, default_assignee_id, default_department_id, default_department_id, id, compliance_id);
    } else {
      const fcId = `fc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO firm_compliances (id, firm_id, compliance_id, status, enabled, default_assignee_id, override_assignee_id, default_department_id, override_department_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fcId, id, compliance_id, status || 'active', status === 'inactive' ? 0 : 1, default_assignee_id || null, default_assignee_id || null, default_department_id || null, default_department_id || null);
    }

    return NextResponse.json({ message: 'Firm compliance updated successfully' });
  } catch (error) {
    console.error('Firm compliance save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
