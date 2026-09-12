import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();

    const firms = db.prepare(`
      SELECT f.*, et.name as entity_type_name, et.code as entity_type_code,
        (SELECT COUNT(*) FROM compliance_tasks t WHERE t.firm_id = f.id) as total_tasks,
        (SELECT COUNT(*) FROM compliance_tasks t WHERE t.firm_id = f.id AND t.status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM compliance_tasks t WHERE t.firm_id = f.id AND t.status IN ('pending','not_started','assigned')) as pending_tasks,
        (SELECT COUNT(*) FROM compliance_tasks t WHERE t.firm_id = f.id AND t.status = 'overdue') as overdue_tasks,
        (SELECT COUNT(*) FROM compliance_tasks t WHERE t.firm_id = f.id AND t.status = 'missed') as missed_tasks
      FROM firms f
      LEFT JOIN entity_types et ON f.entity_type_id = et.id
      WHERE f.status != 'deleted'
      ORDER BY f.display_name ASC
    `).all() as any[];

    // Calculate health scores
    const enriched = firms.map(f => {
      const total = f.total_tasks || 0;
      const completed = f.completed_tasks || 0;
      const overdue = f.overdue_tasks || 0;
      const healthScore = total > 0 ? Math.max(0, Math.min(100, Math.round(((completed - (overdue * 2)) / total) * 100))) : 100;
      return {
        ...f,
        stats: {
          total,
          completed,
          pending: f.pending_tasks || 0,
          overdue,
          missed: f.missed_tasks || 0,
          healthScore
        }
      };
    });

    return NextResponse.json({ firms: enriched });
  } catch (error) {
    console.error('Firms fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    // Mandatory Field Validations
    if (!data.display_name || typeof data.display_name !== 'string' || data.display_name.trim().length < 2) {
      return NextResponse.json({ error: 'Display Name is required (minimum 2 characters)' }, { status: 400 });
    }

    if (!data.legal_name || typeof data.legal_name !== 'string' || data.legal_name.trim().length < 2) {
      return NextResponse.json({ error: 'Full Legal Name is required (minimum 2 characters)' }, { status: 400 });
    }

    if (!data.entity_type_id) {
      return NextResponse.json({ error: 'Entity Type is required' }, { status: 400 });
    }

    // Statutory PAN Validation (Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter)
    const pan = (data.pan || '').trim().toUpperCase();
    if (!pan) {
      return NextResponse.json({ error: 'Permanent Account Number (PAN) is mandatory' }, { status: 400 });
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan)) {
      return NextResponse.json({ error: 'Invalid PAN format. Standard Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. AABCB1234F)' }, { status: 400 });
    }

    // Statutory GSTIN Validation if provided
    const gstin = (data.gstin || '').trim().toUpperCase();
    if (gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin)) {
        return NextResponse.json({ error: 'Invalid GSTIN format. Standard GSTIN format is 15 characters (e.g. 27AABCB1234F1Z5)' }, { status: 400 });
      }
    }

    // Location Validations
    if (!data.state || typeof data.state !== 'string') {
      return NextResponse.json({ error: 'State is mandatory' }, { status: 400 });
    }
    if (!data.city || typeof data.city !== 'string') {
      return NextResponse.json({ error: 'City is mandatory' }, { status: 400 });
    }

    const pinCode = (data.pin_code || data.pincode || '').trim();
    if (pinCode && !/^[1-9][0-9]{5}$/.test(pinCode)) {
      return NextResponse.json({ error: 'Invalid PIN code. Must be a 6-digit Indian postal code' }, { status: 400 });
    }

    const db = getDb();
    const id = `firm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orgId = user.organization_id || 'org_001';

    db.prepare(`
      INSERT INTO firms (
        id, organization_id, legal_name, display_name, entity_type_id,
        registration_number, cin, llpin, incorporation_date, pan, tan, gstin,
        financial_year, registered_address, communication_address, state, city,
        pin_code, email, phone, website, industry, business_type, employee_count,
        turnover_band, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active')
    `).run(
      id, orgId, data.legal_name.trim(), data.display_name.trim(), data.entity_type_id,
      data.registration_number || null, data.cin || data.cin_llpin || null, data.llpin || null,
      data.incorporation_date || null, pan, data.tan ? data.tan.toUpperCase() : null, gstin || null,
      data.financial_year || 'April-March', data.registered_address || data.address_line1 || null,
      data.communication_address || data.registered_address || data.address_line1 || null,
      data.state.trim(), data.city.trim(), pinCode || null, data.email || null, data.phone || null,
      data.website || null, data.industry || null, data.business_type || null,
      Number(data.employee_count) || 0, data.turnover_band || null
    );

    // Add user access
    db.prepare("INSERT OR IGNORE INTO user_firm_access (user_id, firm_id) VALUES (?, ?)").run(user.id, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'FIRM_CREATED', 'firm', ?, ?, ?)
    `).run(orgId, user.id, user.name, id, data.display_name, JSON.stringify({ pan, gstin, entity_type_id: data.entity_type_id }));

    // Add contacts if provided
    if (data.contacts && Array.isArray(data.contacts)) {
      const cStmt = db.prepare("INSERT INTO firm_contacts (id, firm_id, contact_type, name, email, phone, designation) VALUES (?,?,?,?,?,?,?)");
      data.contacts.forEach((c: any) => {
        if (c.name) {
          const contactId = `fc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          cStmt.run(contactId, id, c.contact_type || 'Authorized Representative', c.name, c.email || null, c.phone || null, c.designation || null);
        }
      });
    }

    // Add to search index
    db.prepare("INSERT INTO search_index (entity_type, entity_id, title, subtitle, content, firm_name) VALUES (?, ?, ?, ?, ?, ?)")
      .run('firm', id, data.display_name, data.legal_name, `${data.display_name} ${data.legal_name} ${pan} ${gstin} ${data.city} ${data.state}`, data.display_name);

    return NextResponse.json({ id, message: 'Firm created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Create firm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
