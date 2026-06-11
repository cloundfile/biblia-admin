import { NextResponse } from 'next/server';
import { getAppDb, translationDbExists } from '@/lib/db';

export async function GET() {
  try {
    const db = getAppDb();
    const rows = db.prepare(`
      SELECT t.cod as traducao_cod, t.sigla, t.title, td.nome_arquivo, td.data_importacao
      FROM traducoes_baixadas td
      JOIN traducoes t ON t.cod = td.traducao_cod
      WHERE td.cod IN (SELECT MAX(cod) FROM traducoes_baixadas GROUP BY traducao_cod)
      ORDER BY t.title ASC
    `).all();

    const result = (rows as any[]).filter(row => translationDbExists(row.sigla));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
