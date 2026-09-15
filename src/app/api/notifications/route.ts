import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const notifications = db.prepare(`
      SELECT *, CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END as is_read 
      FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all(user.id);
    const unreadRow = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL").get(user.id) as any;
    const unreadCount = unreadRow ? unreadRow.c : 0;
    return NextResponse.json({ notifications, unreadCount, unread: unreadCount });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const data = await request.json();
    if (data.action === 'read_all') {
      db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(user.id);
    } else if (data.id) {
      db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(data.id, user.id);
    }
    const unreadRow = db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL").get(user.id) as any;
    const unreadCount = unreadRow ? unreadRow.c : 0;
    return NextResponse.json({ message: 'Updated', unreadCount });
  } catch (error) {
    console.error('Notifications update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
