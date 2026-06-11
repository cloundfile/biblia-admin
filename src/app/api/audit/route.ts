import { NextRequest, NextResponse } from 'next/server';
import { getAppDb, deleteTranslationDb, translationDbExists, getTranslationBookCount } from '@/lib/db';

export async function GET() {
  try {
    const db = getAppDb();
    const rows = db.prepare(`
      SELECT t.cod as traducao_cod, t.sigla, t.title, td.nome_arquivo, td.data_importacao
      FROM traducoes_baixadas td
      JOIN traducoes t ON t.cod = td.traducao_cod
      ORDER BY td.data_importacao DESC
    `).all();

    const result = (rows as any[]).map(row => ({
      ...row,
      dbExists: translationDbExists(row.sigla),
      bookCount: getTranslationBookCount(row.sigla),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sigla = req.nextUrl.searchParams.get('sigla');
    if (!sigla) {
      return NextResponse.json({ error: 'sigla is required' }, { status: 400 });
    }

    const db = getAppDb();
    const traducao = db.prepare('SELECT cod FROM traducoes WHERE sigla = ?').get(sigla) as any;
    if (traducao) {
      db.prepare('DELETE FROM traducoes_baixadas WHERE traducao_cod = ?').run(traducao.cod);
    }

    deleteTranslationDb(sigla);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
