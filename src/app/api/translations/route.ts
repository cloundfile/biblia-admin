import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/db';
import { fetchTranslations } from '@/lib/scraper';

export async function GET() {
  try {
    const db = getAppDb();
    let traducoes = db.prepare('SELECT * FROM traducoes ORDER BY title').all();

    if (traducoes.length === 0) {
      const fetched = await fetchTranslations();
      const insert = db.prepare('INSERT OR IGNORE INTO traducoes (sigla, title, origem) VALUES (?, ?, ?)');
      const insertMany = db.transaction((items: { sigla: string; title: string; origem: string }[]) => {
        for (const item of items) {
          insert.run(item.sigla, item.title, item.origem);
        }
      });
      insertMany(fetched);
      traducoes = db.prepare('SELECT * FROM traducoes ORDER BY title').all();
    }

    return NextResponse.json(traducoes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
