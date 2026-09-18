import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    let pref = db.prepare("SELECT * FROM user_notification_preferences WHERE user_id = ?").get(user.id) as any;

    if (!pref) {
      // Default preferences
      pref = {
        user_id: user.id,
        email_enabled: 1,
        task_assigned: 1,
        task_reassigned: 1,
        due_date_reminder: 1,
        overdue_alert: 1,
        missed_alert: 1,
        task_review: 1,
        task_rejected: 1,
        changes_requested: 1,
        task_completed: 1,
        comment_added: 1,
        daily_summary: 0,
      };
    }

    return NextResponse.json({ preferences: pref });
  } catch (error) {
    console.error('Fetch preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const db = getDb();

    db.prepare(`
      INSERT INTO user_notification_preferences (
        user_id, email_enabled, task_assigned, task_reassigned, due_date_reminder,
        overdue_alert, missed_alert, task_review, task_rejected, changes_requested,
        task_completed, comment_added, daily_summary, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        email_enabled = excluded.email_enabled,
        task_assigned = excluded.task_assigned,
        task_reassigned = excluded.task_reassigned,
        due_date_reminder = excluded.due_date_reminder,
        overdue_alert = excluded.overdue_alert,
        missed_alert = excluded.missed_alert,
        task_review = excluded.task_review,
        task_rejected = excluded.task_rejected,
        changes_requested = excluded.changes_requested,
        task_completed = excluded.task_completed,
        comment_added = excluded.comment_added,
        daily_summary = excluded.daily_summary,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      user.id,
      body.email_enabled !== undefined ? (body.email_enabled ? 1 : 0) : 1,
      body.task_assigned !== undefined ? (body.task_assigned ? 1 : 0) : 1,
      body.task_reassigned !== undefined ? (body.task_reassigned ? 1 : 0) : 1,
      body.due_date_reminder !== undefined ? (body.due_date_reminder ? 1 : 0) : 1,
      body.overdue_alert !== undefined ? (body.overdue_alert ? 1 : 0) : 1,
      body.missed_alert !== undefined ? (body.missed_alert ? 1 : 0) : 1,
      body.task_review !== undefined ? (body.task_review ? 1 : 0) : 1,
      body.task_rejected !== undefined ? (body.task_rejected ? 1 : 0) : 1,
      body.changes_requested !== undefined ? (body.changes_requested ? 1 : 0) : 1,
      body.task_completed !== undefined ? (body.task_completed ? 1 : 0) : 1,
      body.comment_added !== undefined ? (body.comment_added ? 1 : 0) : 1,
      body.daily_summary !== undefined ? (body.daily_summary ? 1 : 0) : 0
    );

    return NextResponse.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
