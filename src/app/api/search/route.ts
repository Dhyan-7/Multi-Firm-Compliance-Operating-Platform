import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    if (q.length < 2) return NextResponse.json({ results: [] });

    // Search across entities using FTS5 or LIKE fallback
    let ftsResults: any[] = [];
    try {
      ftsResults = db.prepare("SELECT entity_type, entity_id, title, subtitle, content, firm_name FROM search_index WHERE search_index MATCH ? LIMIT 20").all(q + '*');
    } catch {
      ftsResults = db.prepare("SELECT entity_type, entity_id, title, subtitle, content, firm_name FROM search_index WHERE title LIKE ? OR subtitle LIKE ? OR content LIKE ? LIMIT 20").all(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Also search tasks
    const taskResults = db.prepare(`
      SELECT 'task' as entity_type, t.id as entity_id, c.name as title,
        f.display_name || ' — ' || t.period as subtitle, t.status as content, f.display_name as firm_name
      FROM compliance_tasks t JOIN firms f ON t.firm_id = f.id JOIN compliances c ON t.compliance_id = c.id
      WHERE c.name LIKE ? OR f.display_name LIKE ? OR f.legal_name LIKE ? OR t.task_number LIKE ? OR f.gstin LIKE ? OR f.pan LIKE ?
      LIMIT 10
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);

    const allResults = [...ftsResults, ...taskResults];
    const grouped: Record<string, any[]> = {};
    allResults.forEach((r: any) => {
      const type = r.entity_type;
      if (!grouped[type]) grouped[type] = [];
      if (grouped[type].length < 5) grouped[type].push(r);
    });

    return NextResponse.json({ results: grouped });
  } catch (error) {
    return NextResponse.json({ error: 'Search error' }, { status: 500 });
  }
}
