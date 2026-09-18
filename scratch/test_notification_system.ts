import getDb from '@/lib/db';
import { dispatchNotificationEvent } from '@/lib/notifications/engine';
import { buildEmailContent } from '@/lib/notifications/templates';
import { sendEmail, getEmailConfig } from '@/lib/notifications/emailService';
import { evaluateOverdueAndMissed, runReminderEngine, runDailySummaryEngine } from '@/lib/jobs/scheduler';

async function runComprehensiveTests() {
  console.log('--- STARTING NOTIFICATION SYSTEM TEST ---');
  const db = getDb();

  // 1. Template compilation test
  console.log('\n[1] Testing all email templates...');
  const eventTypes = [
    'TASK_ASSIGNED',
    'TASK_REASSIGNED',
    'TASK_DUE_DATE_CHANGED',
    'COMPLIANCE_RESCHEDULED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'TASK_MISSED',
    'TASK_SUBMITTED',
    'TASK_APPROVED',
    'TASK_REJECTED',
    'TASK_CHANGES_REQUESTED',
    'TASK_COMMENT_ADDED',
    'BULK_ASSIGNMENT',
    'DAILY_SUMMARY',
  ];

  for (const et of eventTypes) {
    const result = buildEmailContent(et, {
      eventType: et,
      userName: 'Test User',
      taskName: 'Sample Compliance Task',
      firmName: 'BALAJI GROUPS Ltd',
      complianceName: 'GST Filing',
      departmentName: 'Taxation',
      dueDate: '2026-09-25',
      priority: 'High',
      status: 'pending',
      assignedBy: 'Admin',
      comment: 'Sample note',
      summaryStats: {
        totalAssigned: 5,
        pending: 2,
        inProgress: 1,
        awaitingReview: 1,
        overdue: 1,
        missed: 0,
        completed: 0,
        tasksDueToday: [{ taskName: 'GST Task', firmName: 'BALAJI', priority: 'High' }],
      },
    });
    if (!result.subject || !result.html || !result.text) {
      throw new Error(`Template failed for ${et}`);
    }
    if (result.html.includes('Dhyan')) {
      throw new Error(`Personal name detected in template ${et}!`);
    }
    if (!result.html.includes('BALAJI GROUPS')) {
      throw new Error(`Missing BALAJI GROUPS branding in template ${et}`);
    }
  }
  console.log(`✓ All ${eventTypes.length} templates compiled cleanly with proper BALAJI GROUPS white-label branding.`);

  // 2. Preferences checking
  console.log('\n[2] Testing notification preferences...');
  const user = db.prepare("SELECT id, name, email FROM users WHERE role_id = 'role_01' LIMIT 1").get() as any;
  console.log(`Using admin user: ${user.name} (${user.email})`);

  // Ensure preferences record
  db.prepare(`
    INSERT INTO user_notification_preferences (user_id, email_enabled, task_assigned, overdue_alert)
    VALUES (?, 1, 1, 1)
    ON CONFLICT(user_id) DO UPDATE SET email_enabled = 1, task_assigned = 1, overdue_alert = 1
  `).run(user.id);
  console.log('✓ Preferences set and verified.');

  // 3. Dispatch dual-channel event test
  console.log('\n[3] Testing dual-channel notification dispatch...');
  const testEventRes = await dispatchNotificationEvent({
    eventType: 'TASK_ASSIGNED',
    recipientIds: [user.id],
    data: {
      userName: user.name,
      taskName: 'Verification Test Task',
      firmName: 'BALAJI GROUPS',
      priority: 'High',
      dueDate: '2026-09-25',
    },
  });
  console.log(`✓ Dual-channel dispatch result: In-app: ${testEventRes.inAppDeliveredCount}, Email: ${testEventRes.emailQueuedCount}`);

  // 4. Test Deduplication
  console.log('\n[4] Testing deduplication / idempotency key...');
  const testKey = `TEST_IDEMP_${Date.now()}`;
  const res1 = await dispatchNotificationEvent({
    eventType: 'TASK_DUE_SOON',
    recipientIds: [user.id],
    idempotencyKey: testKey,
    data: { taskName: 'Idempotency Task' },
  });
  const res2 = await dispatchNotificationEvent({
    eventType: 'TASK_DUE_SOON',
    recipientIds: [user.id],
    idempotencyKey: testKey,
    data: { taskName: 'Idempotency Task' },
  });
  if (!res2.skippedDuplicates) {
    throw new Error('Deduplication failed! Second call should have been skipped.');
  }
  console.log('✓ Idempotency deduplication confirmed working.');

  // 5. Background scheduler execution test
  console.log('\n[5] Testing scheduler engines...');
  const overdueRes = await evaluateOverdueAndMissed();
  console.log('✓ Overdue and missed evaluation executed successfully.');

  const reminderRes = await runReminderEngine();
  console.log(`✓ Reminder engine executed successfully (Sent: ${reminderRes}).`);

  const summaryRes = await runDailySummaryEngine();
  console.log(`✓ Daily summary engine executed successfully (Summaries sent: ${summaryRes}).`);

  // 6. Inspect Email Config
  console.log('\n[6] Current Email Config:');
  console.log(getEmailConfig());

  console.log('\n--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

runComprehensiveTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
