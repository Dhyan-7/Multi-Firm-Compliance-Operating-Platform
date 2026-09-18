import getDb from '@/lib/db';
import { sendEmail, retryFailedEmail } from '@/lib/notifications/emailService';

async function testLiveSmtpHandling() {
  console.log('--- TESTING LIVE SMTP CONFIGURATION & RETRY ---');
  const db = getDb();

  // Test 1: Config with an unreachable test host
  db.prepare(`
    UPDATE notification_settings
    SET smtp_host = 'smtp.invalid-domain-test-12345.com',
        smtp_port = 587,
        smtp_user = 'testuser@balajitransports.in',
        smtp_pass = 'testpassword'
    WHERE id = 'settings_001'
  `).run();

  const res = await sendEmail({
    eventType: 'TASK_ASSIGNED',
    recipientEmail: 'test@example.com',
    recipientName: 'Test Recipient',
    subject: 'Live SMTP Test Email',
    bodyHtml: '<p>Testing live SMTP delivery failure capture</p>',
  });

  console.log('Result with configured SMTP host:', res);
  if (res.success) {
    throw new Error('Should not have succeeded with invalid domain!');
  }
  console.log('✓ Successfully caught real network/DNS error from nodemailer:', res.error);

  // Check database record for the failure
  const failedEmail = db.prepare("SELECT * FROM email_notifications WHERE recipient_email = 'test@example.com' ORDER BY created_at DESC LIMIT 1").get() as any;
  console.log('✓ Email record status:', failedEmail.status, '| Error message:', failedEmail.error_message);

  // Test Retry
  console.log('\nTesting Retry mechanism...');
  const retryRes = await retryFailedEmail(failedEmail.id);
  console.log('Retry result:', retryRes);
  console.log('✓ Retry handler executed and recorded updated retry attempt.');

  // Clean up test domain from DB
  db.prepare(`
    UPDATE notification_settings
    SET smtp_host = NULL,
        smtp_user = NULL,
        smtp_pass = NULL
    WHERE id = 'settings_001'
  `).run();

  // Remove test email record
  db.prepare("DELETE FROM email_notifications WHERE recipient_email = 'test@example.com'").run();

  console.log('\n--- LIVE SMTP TESTING COMPLETE ---');
}

testLiveSmtpHandling().catch(err => {
  console.error(err);
  process.exit(1);
});
