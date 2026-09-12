import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const org = db.prepare("SELECT * FROM organizations WHERE id = 'org_001'").get();
    const reminderRules = db.prepare("SELECT * FROM reminder_rules ORDER BY days_before DESC").all();
    const systemSettings = db.prepare("SELECT * FROM system_settings").all();

    return NextResponse.json({ organization: org, reminderRules, systemSettings });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { organization, reminderRules } = body;
    const db = getDb();

    if (organization) {
      db.prepare(`
        UPDATE organizations
        SET name = COALESCE(?, name),
            address = COALESCE(?, address),
            financial_year_start = COALESCE(?, financial_year_start),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 'org_001'
      `).run(organization.name, organization.address, organization.financial_year_start);
    }

    if (reminderRules && Array.isArray(reminderRules)) {
      for (const rule of reminderRules) {
        if (rule.id) {
          db.prepare(`
            UPDATE reminder_rules
            SET is_active = ?,
                enabled = ?,
                channel = ?
            WHERE id = ?
          `).run(rule.is_active || rule.enabled ? 1 : 0, rule.is_active || rule.enabled ? 1 : 0, rule.channel || 'both', rule.id);
        }
      }
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, new_data)
      VALUES (?, ?, ?, 'SETTINGS_UPDATED', 'organization', 'org_001', 'System Settings', ?)
    `).run(user.organization_id, user.id, user.name, JSON.stringify(body));

    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
