import { NextRequest } from 'next/server';
import { importTranslation, ImportProgress } from '@/lib/scraper';
import { getAppDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function encodeSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const { sigla } = await req.json();
    if (!sigla) {
      return new Response(encodeSSE({ type: 'error', message: 'sigla is required' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    const db = getAppDb();
    const traducao = db.prepare('SELECT * FROM traducoes WHERE sigla = ?').get(sigla) as any;
    if (!traducao) {
      return new Response(encodeSSE({ type: 'error', message: 'Translation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: any) => {
          controller.enqueue(encoder.encode(encodeSSE(data)));
        };

        try {
          let lastUpdate = 0;
          await importTranslation(sigla, (progress: ImportProgress) => {
            const now = Date.now();
            if (progress.type === 'verse' && now - lastUpdate < 100) return;
            lastUpdate = now;
            send(progress);
          });
          send({ type: 'done', message: 'Importação concluída com sucesso!' });
        } catch (error: any) {
          send({ type: 'error', message: error.message || 'Erro durante a importação' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return new Response(encodeSSE({ type: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
