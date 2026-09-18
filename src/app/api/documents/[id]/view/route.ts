import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as any;

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const localPath = path.join(process.cwd(), 'public', doc.file_path.replace(/^\//, ''));
    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ error: 'Physical file not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(localPath);
    const ext = path.extname(doc.file_name).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      txt: 'text/plain',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = doc.mime_type || mimeMap[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.file_name)}"`,
      },
    });
  } catch (error) {
    console.error('View document error:', error);
    return NextResponse.json({ error: 'Failed to view document' }, { status: 500 });
  }
}
