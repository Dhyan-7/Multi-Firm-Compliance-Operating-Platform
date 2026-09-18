import nodemailer from 'nodemailer';
import getDb from '@/lib/db';

export interface SendEmailOptions {
  id?: string;
  eventId?: string;
  eventType: string;
  recipientId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  firmId?: string;
  taskId?: string;
  complianceId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'queued';
  error?: string;
}

/**
 * Retrieves the active notification settings from DB & environment
 */
export function getEmailConfig() {
  const db = getDb();
  let settings: any = {};
  try {
    settings = db.prepare("SELECT * FROM notification_settings WHERE id = 'settings_001'").get() || {};
  } catch (err) {
    console.warn('Unable to query notification_settings:', err);
  }

  const emailMode = 'production';
  const smtpHost = process.env.SMTP_HOST || settings.smtp_host || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || String(settings.smtp_port || 587));
  const smtpSecure = process.env.SMTP_SECURE === 'true' || Boolean(settings.smtp_secure);
  const smtpUser = process.env.SMTP_USERNAME || settings.smtp_user || '';
  const smtpPass = process.env.SMTP_PASSWORD || settings.smtp_pass || '';
  const fromName = process.env.EMAIL_FROM_NAME || settings.from_name || 'CompliCal Alerts';
  const fromEmail = process.env.EMAIL_FROM || settings.from_email || 'alerts@balajigroups.com';

  return {
    emailMode,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    fromName,
    fromEmail,
  };
}

/**
 * Creates a nodemailer transport if configured
 */
function createTransportInstance(config: ReturnType<typeof getEmailConfig>) {
  if (!config.smtpHost) return null;

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser ? {
      user: config.smtpUser,
      pass: config.smtpPass,
    } : undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

/**
 * Dispatches an email notification through the configured delivery channel
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const db = getDb();
  const config = getEmailConfig();
  const emailId = options.id || `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Record initial queued entry if not already present
  try {
    const existing = db.prepare("SELECT id FROM email_notifications WHERE id = ?").get(emailId);
    if (!existing) {
      db.prepare(`
        INSERT INTO email_notifications (
          id, event_id, event_type, recipient_id, recipient_email, recipient_name,
          subject, body_html, body_text, firm_id, task_id, compliance_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')
      `).run(
        emailId,
        options.eventId || null,
        options.eventType,
        options.recipientId || null,
        options.recipientEmail,
        options.recipientName || null,
        options.subject,
        options.bodyHtml,
        options.bodyText || null,
        options.firmId || null,
        options.taskId || null,
        options.complianceId || null
      );
    }
  } catch (err) {
    console.error('[EmailService] Failed to record queued email:', err);
  }

  // Validate SMTP Configuration
  if (!config.smtpHost) {
    const errorMsg = 'SMTP Server Host is not configured. Please enter your SMTP host and credentials in System Settings.';
    console.warn(`[EmailService] Cannot dispatch email to ${options.recipientEmail}: ${errorMsg}`);

    try {
      db.prepare(`
        UPDATE email_notifications
        SET status = 'failed',
            error_message = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(errorMsg, emailId);
    } catch {}

    return {
      success: false,
      status: 'failed',
      error: errorMsg,
    };
  }

  // Live SMTP Transmission
  try {
    const transporter = createTransportInstance(config);
    if (!transporter) {
      throw new Error('SMTP transport is not configured');
    }

    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.recipientEmail,
      subject: options.subject,
      text: options.bodyText,
      html: options.bodyHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    db.prepare(`
      UPDATE email_notifications
      SET status = 'sent',
          sent_at = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(emailId);

    return {
      success: true,
      messageId: info.messageId,
      status: 'sent',
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown SMTP delivery failure';
    console.error(`[EmailService] Delivery failed to ${options.recipientEmail}:`, errorMsg);

    try {
      db.prepare(`
        UPDATE email_notifications
        SET status = 'failed',
            error_message = ?,
            retry_count = retry_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(errorMsg, emailId);
    } catch {}

    return {
      success: false,
      status: 'failed',
      error: errorMsg,
    };
  }
}

/**
 * Retries sending a previously failed email
 */
export async function retryFailedEmail(emailId: string): Promise<SendEmailResult> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM email_notifications WHERE id = ?").get(emailId) as any;
  if (!row) {
    return { success: false, status: 'failed', error: 'Email record not found' };
  }

  return sendEmail({
    id: row.id,
    eventId: row.event_id,
    eventType: row.event_type,
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    firmId: row.firm_id,
    taskId: row.task_id,
    complianceId: row.compliance_id,
  });
}
