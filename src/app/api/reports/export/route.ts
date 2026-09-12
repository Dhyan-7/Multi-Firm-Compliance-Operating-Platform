import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateExcelBuffer, generatePdfBuffer, generateCsvString } from '@/lib/export/exporter';

function executeExport(format: string, reportType: string, firmId: string | null) {
  const db = getDb();

  // Query tasks based on report type
  let sql = `
    SELECT
      t.task_number as "Task Number",
      f.display_name as "Firm",
      c.name as "Compliance",
      c.code as "Code",
      cc.name as "Category",
      t.period as "Period",
      t.due_date as "Due Date",
      UPPER(t.status) as "Status",
      UPPER(t.priority) as "Priority",
      COALESCE(u.name, 'Unassigned') as "Assignee",
      COALESCE(d.name, 'N/A') as "Department"
    FROM compliance_tasks t
    JOIN firms f ON t.firm_id = f.id
    JOIN compliances c ON t.compliance_id = c.id
    LEFT JOIN compliance_categories cc ON c.category_id = cc.id
    LEFT JOIN users u ON t.assignee_id = u.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (firmId && firmId !== 'all') {
    sql += ` AND t.firm_id = ?`;
    params.push(firmId);
  }
  if (reportType === 'overdue') {
    sql += ` AND t.status = 'overdue'`;
  } else if (reportType === 'missed') {
    sql += ` AND t.status = 'missed'`;
  } else if (reportType === 'completed') {
    sql += ` AND t.status = 'completed'`;
  } else if (reportType === 'pending') {
    sql += ` AND t.status IN ('pending', 'assigned', 'in_progress')`;
  }

  sql += ` ORDER BY t.due_date ASC`;

  const rows = db.prepare(sql).all(...params) as Record<string, any>[];

  const timestamp = new Date().toISOString().split('T')[0];
  const filenameBase = `Compliance_Report_${reportType}_${timestamp}`;

  if (format === 'csv') {
    const csvData = generateCsvString(rows);
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    const columns = ['Task Number', 'Firm', 'Compliance', 'Category', 'Due Date', 'Status', 'Assignee'];
    const pdfRows = rows.map(r => [
      r['Task Number'] || '',
      r['Firm'] || '',
      r['Compliance'] || '',
      r['Category'] || '',
      r['Due Date'] || '',
      r['Status'] || '',
      r['Assignee'] || '',
    ]);
    const pdfBuffer = generatePdfBuffer(`Compliance Report — ${reportType.toUpperCase()}`, columns, pdfRows);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    });
  }

  // Default: xlsx
  const xlsxBuffer = generateExcelBuffer(rows, 'Compliance Data');
  return new NextResponse(new Uint8Array(xlsxBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();
    const reportType = searchParams.get('type') || 'compliance';
    const firmId = searchParams.get('firm_id');

    return executeExport(format, reportType, firmId);
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: 'Export generation failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const format = (body.format || 'xlsx').toLowerCase();
    const reportType = body.type || 'compliance';
    const firmId = body.firm_id || null;

    return executeExport(format, reportType, firmId);
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json({ error: 'Export generation failed' }, { status: 500 });
  }
}
