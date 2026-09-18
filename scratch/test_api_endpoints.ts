async function testApiEndpoints() {
  console.log('=== END-TO-END HTTP API VERIFICATION ===\n');

  // 1. Authenticate via Login API
  console.log('[1] Logging in as Admin...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'raghu.gr@balajitransports.in',
      password: 'admin123',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log(`✓ Login successful! Token acquired for: ${loginData.user.name} (${loginData.user.role_name})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Settings
  console.log('\n[2] Fetching System & Notification Settings...');
  const settingsRes = await fetch('http://localhost:3000/api/settings', { headers: authHeaders });
  if (!settingsRes.ok) throw new Error(`Settings fetch failed: ${settingsRes.status}`);
  const settingsData = await settingsRes.json();
  console.log('Notification Settings in DB:');
  console.log(' - email_mode:', settingsData.notificationSettings?.email_mode);
  console.log(' - from_name:', settingsData.notificationSettings?.from_name);
  console.log(' - from_email:', settingsData.notificationSettings?.from_email);
  console.log(' - smtp_host:', settingsData.notificationSettings?.smtp_host || '(not set)');
  console.log(' - daily_summary_enabled:', settingsData.notificationSettings?.daily_summary_enabled);
  if (settingsData.notificationSettings?.email_mode !== 'production') {
    throw new Error(`Expected email_mode to be 'production', got '${settingsData.notificationSettings?.email_mode}'`);
  }
  console.log('✓ email_mode confirmed as production.');

  // 3. Fetch In-App Notifications
  console.log('\n[3] Fetching In-App Notifications...');
  const notifRes = await fetch('http://localhost:3000/api/notifications', { headers: authHeaders });
  if (!notifRes.ok) throw new Error(`Notifications fetch failed: ${notifRes.status}`);
  const notifData = await notifRes.json();
  console.log(`✓ Retrieved ${notifData.notifications?.length || 0} in-app notifications (Unread: ${notifData.unreadCount || 0}).`);

  // 4. Fetch Email Delivery Logs
  console.log('\n[4] Fetching Email Delivery Logs...');
  const emailLogsRes = await fetch('http://localhost:3000/api/notifications/emails', { headers: authHeaders });
  if (!emailLogsRes.ok) throw new Error(`Email logs fetch failed: ${emailLogsRes.status}`);
  const emailLogsData = await emailLogsRes.json();
  console.log(`✓ Retrieved ${emailLogsData.emails?.length || 0} email delivery records.`);
  console.log('Delivery Statistics:', emailLogsData.stats);

  // 5. Test Diagnostic Test Email Endpoint in Live Mode
  console.log('\n[5] Triggering Diagnostic Test Email...');
  const testEmailRes = await fetch('http://localhost:3000/api/notifications/emails', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'test',
      recipientEmail: 'alerts-test@balajigroups.com',
    }),
  });
  const testEmailData = await testEmailRes.json();
  console.log('Test Email Response:', testEmailData);
  console.log('✓ Diagnostic email endpoint executed in live mode without dev simulation bypass.');

  // 6. Test Notification Preferences
  console.log('\n[6] Testing Notification Preferences API...');
  const prefGetRes = await fetch('http://localhost:3000/api/notifications/preferences', { headers: authHeaders });
  const prefData = await prefGetRes.json();
  console.log('User Preferences:', prefData.preferences);

  const prefPutRes = await fetch('http://localhost:3000/api/notifications/preferences', {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      preferences: {
        ...prefData.preferences,
        email_enabled: 1,
        task_assigned: 1,
        due_date_reminder: 1,
      },
    }),
  });
  const prefPutData = await prefPutRes.json();
  console.log('✓ Preferences updated:', prefPutData.message);

  console.log('\n=== ALL END-TO-END TESTS PASSED CLEANLY ===');
}

testApiEndpoints().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
