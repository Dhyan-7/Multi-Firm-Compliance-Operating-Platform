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

    // Determine actual file path
    const localPath = path.join(process.cwd(), 'public', doc.file_path.replace(/^\//, ''));
    if (!fs.existsSync(localPath)) {
      // Check if sample or test document
      return NextResponse.json({ error: 'Physical file not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(localPath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
