import { NextRequest, NextResponse } from 'next/server';
import { translationDbExists, getTranslationBookCount, getAppDb, getTranslationDbPath } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sigla = req.nextUrl.searchParams.get('sigla');
    if (!sigla) {
      return NextResponse.json({ error: 'sigla is required' }, { status: 400 });
    }

    const db = getAppDb();
    const traducao = db.prepare('SELECT * FROM traducoes WHERE sigla = ?').get(sigla) as any;
    if (!traducao) {
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }

    const exists = translationDbExists(sigla);
    if (!exists) {
      return NextResponse.json({ exists: false, complete: false, bookCount: 0 });
    }

    const bookCount = getTranslationBookCount(sigla);
    const baixada = db.prepare('SELECT * FROM traducoes_baixadas WHERE traducao_cod = ? ORDER BY data_importacao DESC LIMIT 1').get(traducao.cod) as any;
    const complete = !!baixada;

    return NextResponse.json({
      exists: true,
      complete,
      bookCount,
      dataImportacao: baixada?.data_importacao || null,
      nomeArquivo: `biblia-${sigla}.sqlite`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
