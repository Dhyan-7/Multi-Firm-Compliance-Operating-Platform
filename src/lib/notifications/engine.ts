import getDb from '@/lib/db';
import { buildEmailContent, EmailTemplateData } from './templates';
import { sendEmail } from './emailService';

export interface NotificationEventPayload {
  eventType: string; // e.g., 'TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_DUE_SOON', etc.
  entityType?: string; // 'task' | 'compliance' | 'firm'
  entityId?: string;
  firmId?: string;
  taskId?: string;
  complianceId?: string;
  triggeredBy?: string; // user_id of actor
  idempotencyKey?: string; // for deduplication (e.g. `REMINDER:task_123:3:2026-09-18`)
  recipientIds?: string[]; // user IDs to notify
  data?: Partial<EmailTemplateData>;
  skipEmail?: boolean;
  skipInApp?: boolean;
}

export interface DispatchResult {
  eventId: string;
  inAppDeliveredCount: number;
  emailQueuedCount: number;
  skippedDuplicates?: boolean;
}

/**
 * Checks if a user has opted into email notifications for this specific event type
 */
function isEmailAllowedForUser(userId: string, eventType: string): boolean {
  const db = getDb();
  const criticalEvents = ['TASK_OVERDUE', 'TASK_MISSED'];
  if (criticalEvents.includes(eventType)) {
    return true; // Mandatory statutory alerts
  }

  try {
    const pref = db.prepare("SELECT * FROM user_notification_preferences WHERE user_id = ?").get(userId) as any;
    if (!pref) return true; // Default to enabled if no preference record yet

    if (pref.email_enabled === 0) return false;

    switch (eventType) {
      case 'TASK_ASSIGNED': return pref.task_assigned !== 0;
      case 'TASK_REASSIGNED': return pref.task_reassigned !== 0;
      case 'TASK_DUE_DATE_CHANGED':
      case 'COMPLIANCE_RESCHEDULED':
      case 'TASK_DUE_SOON': return pref.due_date_reminder !== 0;
      case 'TASK_SUBMITTED': return pref.task_review !== 0;
      case 'TASK_APPROVED': return pref.task_completed !== 0;
      case 'TASK_REJECTED': return pref.task_rejected !== 0;
      case 'TASK_CHANGES_REQUESTED': return pref.changes_requested !== 0;
      case 'TASK_COMMENT_ADDED': return pref.comment_added !== 0;
      case 'DAILY_SUMMARY': return pref.daily_summary !== 0;
      default: return true;
    }
  } catch (err) {
    console.warn('[NotificationEngine] Error checking preferences:', err);
    return true;
  }
}

/**
 * Resolves recipient user records (id, name, email) from IDs
 */
function resolveUsers(userIds: string[]): Array<{ id: string; name: string; email: string }> {
  if (!userIds || userIds.length === 0) return [];
  const db = getDb();
  const placeholders = userIds.map(() => '?').join(',');
  try {
    return db.prepare(`SELECT id, name, email FROM users WHERE id IN (${placeholders}) AND status = 'active'`).all(...userIds) as any[];
  } catch (err) {
    console.error('[NotificationEngine] Failed to resolve users:', err);
    return [];
  }
}

/**
 * Master dispatcher for the CompliCal Notification Engine
 */
export async function dispatchNotificationEvent(payload: NotificationEventPayload): Promise<DispatchResult> {
  const db = getDb();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Check Idempotency / Duplicate Prevention
  if (payload.idempotencyKey) {
    try {
      const existing = db.prepare("SELECT id FROM notification_events WHERE idempotency_key = ?").get(payload.idempotencyKey);
      if (existing) {
        console.log(`[NotificationEngine] Deduplication: skipping event with key ${payload.idempotencyKey}`);
        return { eventId: (existing as any).id, inAppDeliveredCount: 0, emailQueuedCount: 0, skippedDuplicates: true };
      }
    } catch (err) {
      console.warn('[NotificationEngine] Idempotency check warning:', err);
    }
  }

  // 2. Record the Notification Event in Audit Table
  try {
    db.prepare(`
      INSERT INTO notification_events (
        id, event_type, entity_type, entity_id, firm_id, task_id, compliance_id,
        triggered_by, idempotency_key, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      payload.eventType,
      payload.entityType || 'task',
      payload.entityId || payload.taskId || 'general',
      payload.firmId || null,
      payload.taskId || null,
      payload.complianceId || null,
      payload.triggeredBy || null,
      payload.idempotencyKey || null,
      payload.data ? JSON.stringify(payload.data) : null
    );
  } catch (err) {
    console.error('[NotificationEngine] Failed to record event:', err);
  }

  // 3. Resolve Target Recipients
  const recipients = resolveUsers(payload.recipientIds || []);
  let inAppDeliveredCount = 0;
  let emailQueuedCount = 0;

  // 4. Dispatch In-App Notifications (Channel 1)
  if (!payload.skipInApp) {
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const user of recipients) {
      try {
        const title = payload.data?.taskName
          ? `${payload.eventType.replace(/_/g, ' ')}: ${payload.data.taskName}`
          : 'Compliance Notification';

        const message = payload.data?.comment ||
          (payload.data?.firmName ? `${payload.data.taskName || 'Task'} for ${payload.data.firmName}` : 'New update in CompliCal');

        notifStmt.run(
          user.id,
          payload.eventType.toLowerCase(),
          title,
          message,
          payload.entityType || 'task',
          payload.entityId || payload.taskId || null
        );
        inAppDeliveredCount++;
      } catch (err) {
        console.error(`[NotificationEngine] In-app notification error for user ${user.id}:`, err);
      }
    }
  }

  // 5. Dispatch Email Notifications (Channel 2)
  if (!payload.skipEmail) {
    for (const user of recipients) {
      if (!user.email || !user.email.includes('@')) {
        continue;
      }

      // Check User Email Preferences
      if (!isEmailAllowedForUser(user.id, payload.eventType)) {
        console.log(`[NotificationEngine] Email suppressed by user preference: ${user.email} for ${payload.eventType}`);
        continue;
      }

      // Render Branded Responsive HTML & Plain Text
      const emailContent = buildEmailContent(payload.eventType, {
        ...payload.data,
        eventType: payload.eventType,
        userName: user.name,
        taskId: payload.taskId,
        firmId: payload.firmId,
        complianceId: payload.complianceId,
      });

      // Send (or queue in dev mode) via Email Service
      try {
        await sendEmail({
          eventId,
          eventType: payload.eventType,
          recipientId: user.id,
          recipientEmail: user.email,
          recipientName: user.name,
          subject: emailContent.subject,
          bodyHtml: emailContent.html,
          bodyText: emailContent.text,
          firmId: payload.firmId,
          taskId: payload.taskId,
          complianceId: payload.complianceId,
        });
        emailQueuedCount++;
      } catch (err) {
        console.error(`[NotificationEngine] Email dispatch error for ${user.email}:`, err);
      }
    }
  }

  return {
    eventId,
    inAppDeliveredCount,
    emailQueuedCount,
  };
}
