/**
 * CompliCal — Standalone Background Worker Process
 * 
 * Runs the statutory scheduler (overdue detection, statutory reminders, daily summaries)
 * independently from the HTTP server process.
 */
const { execSync } = require('child_process');
const path = require('path');

console.log('[Worker] Starting CompliCal Background Compliance Worker Process...');

try {
  // Use tsx to execute the typescript scheduler
  const projectRoot = path.resolve(__dirname, '..');
  const cmd = `npx tsx -e "import { initBackgroundScheduler, evaluateOverdueAndMissed, runReminderEngine } from './src/lib/jobs/scheduler'; console.log('[Worker] Initializing Background Engine...'); initBackgroundScheduler(); console.log('[Worker] Running immediate startup evaluation...'); evaluateOverdueAndMissed(); runReminderEngine(); console.log('[Worker] Engine active. Press Ctrl+C to stop.'); setInterval(() => {}, 1000);"`;
  
  execSync(cmd, { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  if (err.signal !== 'SIGINT') {
    console.error('[Worker] Fatal worker error:', err);
    process.exit(1);
  }
}
