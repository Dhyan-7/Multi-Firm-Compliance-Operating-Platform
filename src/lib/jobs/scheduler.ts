import cron from 'node-cron';
import getDb from '@/lib/db';

let isSchedulerRunning = false;

/**
 * Starts background tasks scheduler
 */
export function initBackgroundScheduler() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  console.log('[Scheduler] Background Compliance Engine initialized.');

  // Run every hour: Overdue detector & status evaluator
  cron.schedule('0 * * * *', () => {
    try {
      evaluateOverdueAndMissed();
    } catch (err) {
      console.error('[Scheduler] Error in evaluateOverdueAndMissed:', err);
    }
  });

  // Run daily at 06:00 AM: Reminder notification engine (30/15/7/3/1 days)
  cron.schedule('0 6 * * *', () => {
    try {
      runReminderEngine();
    } catch (err) {
      console.error('[Scheduler] Error in runReminderEngine:', err);
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
    SELECT t.*, f.display_name as firm_name, c.name as comp_name
    FROM compliance_tasks t
    JOIN firms f ON t.firm_id = f.id
    JOIN compliances c ON t.compliance_id = c.id
    WHERE t.status IN ('pending', 'in_progress', 'assigned', 'not_started')
    AND t.due_date < ?
  `).all(today) as any[];

  const updateStmt = db.prepare("UPDATE compliance_tasks SET status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const notifStmt = db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)");

  let count = 0;
  for (const t of overdueTasks) {
    updateStmt.run(t.id);
    count++;

    if (t.assignee_id) {
      notifStmt.run(
        t.assignee_id,
        'task_overdue',
        'Compliance Task Overdue!',
        `Task "${t.comp_name}" for "${t.firm_name}" was due on ${t.due_date} and is now overdue.`,
        'task',
        t.id
      );
    }
  }

  if (count > 0) {
    console.log(`[Scheduler] Marked ${count} tasks as overdue.`);
  }

  return count;
}

/**
 * Generates automated reminder alerts according to statutory rules (30, 15, 7, 3, 1 days before)
 */
export function runReminderEngine() {
  const db = getDb();
  const intervals = [30, 15, 7, 3, 1, 0];

  let remindersSent = 0;
  const notifStmt = db.prepare("INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)");

  for (const days of intervals) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateStr = targetDate.toISOString().split('T')[0];

    const upcomingTasks = db.prepare(`
      SELECT t.*, f.display_name as firm_name, c.name as comp_name
      FROM compliance_tasks t
      JOIN firms f ON t.firm_id = f.id
      JOIN compliances c ON t.compliance_id = c.id
      WHERE t.status IN ('pending', 'in_progress', 'assigned')
      AND t.due_date = ?
      AND t.assignee_id IS NOT NULL
    `).all(dateStr) as any[];

    for (const t of upcomingTasks) {
      const title = days === 0 ? 'Due Today: Compliance Filing' : `Reminder: Due in ${days} days`;
      const message = `${t.comp_name} for ${t.firm_name} is due on ${t.due_date}.`;

      notifStmt.run(t.assignee_id, 'reminder', title, message, 'task', t.id);
      remindersSent++;
    }
  }

  return remindersSent;
}
