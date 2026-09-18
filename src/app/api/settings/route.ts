import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest, isAdminOrSuperAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const org = db.prepare("SELECT * FROM organizations WHERE id = 'org_001'").get();
    const reminderRules = db.prepare("SELECT * FROM reminder_rules ORDER BY days_before DESC").all();
    const systemSettings = db.prepare("SELECT * FROM system_settings").all();
    const notificationSettings = db.prepare("SELECT * FROM notification_settings WHERE id = 'settings_001'").get();

    return NextResponse.json({ organization: org, reminderRules, systemSettings, notificationSettings });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminOrSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can modify system settings' }, { status: 403 });
    }

    const body = await request.json();
    const { organization, reminderRules, notificationSettings } = body;
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

    if (notificationSettings) {
      db.prepare(`
        INSERT INTO notification_settings (
          id, email_mode, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
          from_name, from_email, daily_summary_enabled, reminder_intervals, updated_at
        ) VALUES (
          'settings_001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
        ON CONFLICT(id) DO UPDATE SET
          email_mode = excluded.email_mode,
          smtp_host = excluded.smtp_host,
          smtp_port = excluded.smtp_port,
          smtp_secure = excluded.smtp_secure,
          smtp_user = excluded.smtp_user,
          smtp_pass = excluded.smtp_pass,
          from_name = excluded.from_name,
          from_email = excluded.from_email,
          daily_summary_enabled = excluded.daily_summary_enabled,
          reminder_intervals = excluded.reminder_intervals,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        notificationSettings.email_mode || 'production',
        notificationSettings.smtp_host || '',
        parseInt(notificationSettings.smtp_port) || 587,
        notificationSettings.smtp_secure ? 1 : 0,
        notificationSettings.smtp_user || '',
        notificationSettings.smtp_pass || '',
        notificationSettings.from_name || 'CompliCal Alerts',
        notificationSettings.from_email || 'alerts@balajigroups.com',
        notificationSettings.daily_summary_enabled ? 1 : 0,
        notificationSettings.reminder_intervals || '7,3,1,0'
      );
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
