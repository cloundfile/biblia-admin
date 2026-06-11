import { NextRequest, NextResponse } from 'next/server';
import { getTranslationDbPath, translationDbExists } from '@/lib/db';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const sigla = req.nextUrl.searchParams.get('sigla');
    if (!sigla) {
      return NextResponse.json({ error: 'sigla is required' }, { status: 400 });
    }

    if (!translationDbExists(sigla)) {
      return NextResponse.json({ error: 'Database not found for this translation' }, { status: 404 });
    }

    const dbPath = getTranslationDbPath(sigla);
    const fileBuffer = fs.readFileSync(dbPath);
    const fileName = `biblia-${sigla}.sqlite`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
