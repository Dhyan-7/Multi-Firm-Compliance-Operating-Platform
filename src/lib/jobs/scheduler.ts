import cron from 'node-cron';
import getDb from '@/lib/db';
import { dispatchNotificationEvent } from '@/lib/notifications/engine';

let isSchedulerRunning = false;

/**
 * Starts background tasks scheduler
 */
export function initBackgroundScheduler() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  console.log('[Scheduler] Background Compliance & Notification Engine initialized.');

  // Run every hour: Overdue detector & status evaluator
  cron.schedule('0 * * * *', () => {
    try {
      evaluateOverdueAndMissed();
    } catch (err) {
      console.error('[Scheduler] Error in evaluateOverdueAndMissed:', err);
    }
  });

  // Run daily at 06:00 AM IST: Reminder notification engine (7/3/1/0 days)
  cron.schedule('0 6 * * *', () => {
    try {
      runReminderEngine();
    } catch (err) {
      console.error('[Scheduler] Error in runReminderEngine:', err);
    }
  });

  // Run daily at 08:00 AM IST: Daily Summary Briefing
  cron.schedule('0 8 * * *', () => {
    try {
      runDailySummaryEngine();
    } catch (err) {
      console.error('[Scheduler] Error in runDailySummaryEngine:', err);
    }
  });
}

/**
 * Detects tasks whose due date has passed without completion and marks them Overdue or Missed
 */
export function evaluateOverdueAndMissed() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  // 1. Identify tasks pending/in_progress where due_date < today and not yet overdue
  const overdueTasks = db.prepare(`
    SELECT t.*, f.display_name as firm_name, COALESCE(t.task_name, c.name, 'Task') as comp_name,
           d.name as department_name
    FROM compliance_tasks t
    JOIN firms f ON t.firm_id = f.id
    LEFT JOIN compliances c ON t.compliance_id = c.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.status IN ('pending', 'in_progress', 'assigned', 'not_started')
    AND t.due_date < ?
  `).all(today) as any[];

  const updateStmt = db.prepare("UPDATE compliance_tasks SET status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE id = ?");

  let count = 0;
  for (const t of overdueTasks) {
    updateStmt.run(t.id);
    count++;

    if (t.assignee_id) {
      dispatchNotificationEvent({
        eventType: 'TASK_OVERDUE',
        entityType: 'task',
        entityId: t.id,
        taskId: t.id,
        firmId: t.firm_id,
        complianceId: t.compliance_id,
        idempotencyKey: `OVERDUE:${t.id}:${today}`,
        recipientIds: [t.assignee_id],
        data: {
          taskName: t.comp_name,
          firmName: t.firm_name,
          departmentName: t.department_name,
          dueDate: t.due_date,
          priority: t.priority,
          status: 'overdue',
        },
      }).catch(err => console.error('[Scheduler] Error dispatching TASK_OVERDUE:', err));
    }
  }

  if (count > 0) {
    console.log(`[Scheduler] Marked ${count} tasks as overdue.`);
  }

  return count;
}

/**
 * Generates automated reminder alerts according to statutory rules (7, 3, 1, 0 days before)
 * Idempotency key guarantees zero duplicate emails if job is re-run.
 */
export function runReminderEngine() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  let intervals = [7, 3, 1, 0];
  try {
    const settings = db.prepare("SELECT reminder_intervals FROM notification_settings WHERE id = 'settings_001'").get() as any;
    if (settings?.reminder_intervals) {
      intervals = settings.reminder_intervals.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n));
    }
  } catch {}

  let remindersDispatched = 0;

  for (const days of intervals) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split('T')[0];

    const upcomingTasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, COALESCE(t.task_name, c.name, 'Task') as comp_name,
             d.name as department_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      LEFT JOIN compliances c ON t.compliance_id = c.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.status IN ('pending', 'in_progress', 'assigned', 'not_started')
      AND t.due_date = ?
      AND t.assignee_id IS NOT NULL
    `).all(dateStr) as any[];

    for (const t of upcomingTasks) {
      dispatchNotificationEvent({
        eventType: 'TASK_DUE_SOON',
        entityType: 'task',
        entityId: t.id,
        taskId: t.id,
        firmId: t.firm_id,
        complianceId: t.compliance_id,
        idempotencyKey: `REMINDER:${t.id}:${days}:${today}`,
        recipientIds: [t.assignee_id],
        data: {
          taskName: t.comp_name,
          firmName: t.firm_name,
          departmentName: t.department_name,
          dueDate: t.due_date,
          priority: t.priority,
          status: t.status,
          daysRemaining: days,
        },
      }).catch(err => console.error('[Scheduler] Error dispatching TASK_DUE_SOON:', err));

      remindersDispatched++;
    }
  }

  return remindersDispatched;
}

/**
 * Dispatches optional Daily Summary Briefing to active users
 */
export function runDailySummaryEngine() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  try {
    const settings = db.prepare("SELECT daily_summary_enabled FROM notification_settings WHERE id = 'settings_001'").get() as any;
    if (settings && settings.daily_summary_enabled === 0) {
      return 0;
    }
  } catch {}

  // Fetch users opted-in or superadmins
  const users = db.prepare(`
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.status = 'active'
  `).all() as any[];

  let summariesSent = 0;
  for (const user of users) {
    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as awaiting_review,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM compliance_tasks
      WHERE assignee_id = ?
    `).get(user.id) as any;

    if (!counts || counts.total === 0) continue;

    dispatchNotificationEvent({
      eventType: 'DAILY_SUMMARY',
      entityType: 'task',
      entityId: 'summary',
      idempotencyKey: `DAILY_SUMMARY:${user.id}:${today}`,
      recipientIds: [user.id],
      data: {
        summaryStats: {
          totalAssigned: counts.total || 0,
          pending: counts.pending || 0,
          inProgress: counts.in_progress || 0,
          awaitingReview: counts.awaiting_review || 0,
          overdue: counts.overdue || 0,
          missed: counts.missed || 0,
          completed: counts.completed || 0,
        },
      },
    }).catch(err => console.error('[Scheduler] Error dispatching DAILY_SUMMARY:', err));

    summariesSent++;
  }

  return summariesSent;
}
