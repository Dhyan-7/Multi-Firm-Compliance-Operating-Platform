import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateFirmComplianceCalendar } from '@/lib/compliance/recurring';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const fy = body.financial_year || '2026-2027';

    const result = generateFirmComplianceCalendar({
      firm_id: id,
      financial_year: fy,
      created_by: user.id
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Generate calendar error:', error);
    return NextResponse.json({ error: error?.message || 'Calendar generation failed' }, { status: 500 });
  }
}
