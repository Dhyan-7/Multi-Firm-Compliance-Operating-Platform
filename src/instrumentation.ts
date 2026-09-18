/**
 * Next.js Server Instrumentation Hook
 * 
 * Automatically initializes background jobs and the SLA compliance engine
 * when the CompliCal local server starts up.
 */
export async function register() {
  // Only execute in NodeJS runtime environment (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initBackgroundScheduler } = await import('@/lib/jobs/scheduler');
    initBackgroundScheduler();
  }
}
