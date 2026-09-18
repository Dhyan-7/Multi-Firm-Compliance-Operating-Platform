import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { retryFailedEmail, sendEmail } from '@/lib/notifications/emailService';
import { buildEmailContent } from '@/lib/notifications/templates';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = `
      SELECT e.*, f.display_name as firm_name,
             COALESCE(t.task_name, c.name, 'Task') as task_name
      FROM email_notifications e
      LEFT JOIN firms f ON e.firm_id = f.id
      LEFT JOIN compliance_tasks t ON e.task_id = t.id
      LEFT JOIN compliances c ON e.compliance_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Normal users only see their own email logs; Admins/Super Admins see all
    const isAdmin = ['role_01', 'role_02', 'role_03'].includes(user.role_id) || user.role_name?.toLowerCase().includes('admin');
    if (!isAdmin) {
      query += ` AND e.recipient_id = ?`;
      params.push(user.id);
    }

    if (status && status !== 'all') {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (e.subject LIKE ? OR e.recipient_email LIKE ? OR e.recipient_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY e.created_at DESC LIMIT ?`;
    params.push(limit);

    const emails = db.prepare(query).all(...params);

    // Stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued
      FROM email_notifications
    `).get();

    return NextResponse.json({ emails, stats });
  } catch (error) {
    console.error('Fetch emails error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, emailId, recipientEmail } = body;

    if (action === 'retry') {
      if (!emailId) return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
      const res = await retryFailedEmail(emailId);
      return NextResponse.json(res);
    }

    if (action === 'test') {
      const targetEmail = recipientEmail || user.email;
      if (!targetEmail || !targetEmail.includes('@')) {
        return NextResponse.json({ error: 'Valid recipient email is required' }, { status: 400 });
      }

      const content = buildEmailContent('TASK_ASSIGNED', {
        eventType: 'TASK_ASSIGNED',
        userName: user.name,
        taskName: 'Sample GST Filing Deliverable',
        firmName: 'BALAJI GROUPS — Enterprise Operations',
        complianceName: 'GSTR-3B Monthly Return',
        departmentName: 'Accounts & Taxation',
        priority: 'High',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        status: 'assigned',
        assignedBy: 'CompliCal System Administrator',
      });

      const res = await sendEmail({
        eventType: 'TEST_EMAIL',
        recipientId: user.id,
        recipientEmail: targetEmail,
        recipientName: user.name,
        subject: `[Test] ${content.subject}`,
        bodyHtml: content.html,
        bodyText: content.text,
      });

      return NextResponse.json({
        message: res.success ? `Test email successfully dispatched to ${targetEmail}` : `Test email failed: ${res.error}`,
        result: res,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Email action error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
