import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.bibliaonline.com.br';


export interface Translation {
  sigla: string;
  title: string;
  origem: string;
}

export interface BookInfo {
  nome: string;
  sigla: string;
  testamento: 'AT' | 'NT';
  ordem: number;
}

const SKIP_PATHS = new Set([
  '', '/', '/traducoes', '/busca', '/contato', '/termos',
  '/hoje', '/livros', '/devocional-diario', '/recursos-biblicos',
  '/versiculos-por-temas', '/anuncie-conosco',
  '/termos-de-uso-e-privacidade', '/compartilhe',
  '/login', '/cadastro', '/recuperar-senha',
  '/anuncie', '/inicio', '/principal',
]);

function isTranslationHref(href: string): boolean {
  if (!href.startsWith('/')) return false;
  const [pathPart] = href.replace(/\/$/, '').split('?');
  if (SKIP_PATHS.has(pathPart)) return false;
  if (pathPart.substring(1).includes('/')) return false;
  const slug = pathPart.substring(1);
  if (!slug || slug.length < 2) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug);
}

export async function fetchTranslations(): Promise<Translation[]> {
  const html = await fetch(`${BASE_URL}/traducoes`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliaAdmin/1.0)' },
  }).then(r => r.text());

  const $ = cheerio.load(html);
  const candidates = new Map<string, string[]>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!isTranslationHref(href)) return;
    const [pathPart] = href.replace(/\/$/, '').split('?');
    const sigla = pathPart.replace('/', '');
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 3) return;
    if (!candidates.has(sigla)) candidates.set(sigla, []);
    candidates.get(sigla)!.push(text);
  });

  const translations: Translation[] = [];

  for (const [sigla, texts] of candidates) {
    const best = texts.find(t => {
      const lower = t.toLowerCase();
      return lower.includes(sigla.toLowerCase()) && !lower.includes('bíblia online') && !lower.includes('biblia online');
    }) || texts[0];

    let title = best.replace(new RegExp(`\\b${sigla}\\b`, 'ig'), '').trim();
    title = title.replace(/[-\s]+$/, '').replace(/^[-\s]+/, '').trim();
    title = title.replace(/\s+/g, ' ').trim();
    if (/^'s?\b/i.test(title)) {
      title = sigla.charAt(0).toUpperCase() + sigla.slice(1) + ' ' + title;
    } else if (!title) {
      title = sigla.toUpperCase();
    }

    translations.push({
      sigla,
      title,
      origem: `${BASE_URL}/${sigla}`,
    });
  }

  return translations.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchBooks(sigla: string): Promise<BookInfo[]> {
  const html = await fetch(`${BASE_URL}/${sigla}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliaAdmin/1.0)' },
  }).then(r => r.text());

  const $ = cheerio.load(html);
  const books: BookInfo[] = [];
  const seen = new Set<string>();
  let ordem = 0;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const fullPath = href.replace(/\/$/, '');
    const expectedPrefix = `/${sigla}/`;
    if (!fullPath.startsWith(expectedPrefix)) return;

    const bookSlug = fullPath.substring(expectedPrefix.length);
    if (!bookSlug || bookSlug.includes('/')) return;
    if (seen.has(bookSlug)) return;
    seen.add(bookSlug);

    const nome = $(el).text().trim();
    if (!nome || nome.length < 2) return;

    const atSection = $(el).closest('section, div, ul').text();
    const prevHeaders = $(el).parents().find('h2, h3, h4, strong').map((_, h) => $(h).text().toLowerCase()).get();
    const testamento = prevHeaders.some(h => h.includes('novo testamento') || h.includes('novo')) ? 'NT' : 'AT';
    const parentText = $(el).closest('section, div, nav, ul').text().toLowerCase();
    const isNT = parentText.includes('novo testamento') || (fullPath.toLowerCase() !== nome.toLowerCase() && (
      ['mateus', 'marcos', 'lucas', 'joão', 'joao', 'atos', 'romanos',
       '1 coríntios', '2 coríntios', 'gálatas', 'efésios', 'filipenses',
       'colossenses', '1 tessalonicenses', '2 tessalonicenses', '1 timóteo',
       '2 timóteo', 'tito', 'filemom', 'hebreus', 'tiago', '1 pedro',
       '2 pedro', '1 joão', '2 joão', '3 joão', 'judas', 'apocalipse'
      ].includes(nome.toLowerCase())
    ));

    ordem++;
    books.push({
      nome,
      sigla: bookSlug,
      testamento: isNT ? 'NT' : 'AT',
      ordem,
    });
  });

  return books;
}

async function fetchChapterCount(sigla: string, bookSlug: string): Promise<number> {
  try {
    const html = await fetch(`${BASE_URL}/${sigla}/${bookSlug}/1`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliaAdmin/1.0)' },
    }).then(r => r.text());

    const $ = cheerio.load(html);
    let maxChapter = 0;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const pattern = new RegExp(`^/${sigla}/${bookSlug}/(\\d+)$`);
      const match = href.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxChapter) maxChapter = num;
      }
    });

    return maxChapter;
  } catch {
    return 0;
  }
}

async function fetchVerses(sigla: string, bookSlug: string, chapter: number): Promise<{ numero: number; texto: string }[]> {
  const html = await fetch(`${BASE_URL}/${sigla}/${bookSlug}/${chapter}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliaAdmin/1.0)' },
  }).then(r => r.text());

  const $ = cheerio.load(html);
  const verses: { numero: number; texto: string }[] = [];

  $('span.t').each((_, el) => {
    const prev = $(el).prev('span.v');
    if (!prev.length) return;
    const verseNum = parseInt(prev.text().trim(), 10);
    if (isNaN(verseNum)) return;
    const text = $(el).text().trim();
    if (text) {
      verses.push({ numero: verseNum, texto: text });
    }
  });

  if (verses.length === 0) {
    const text = $('body').text() || '';
    const verseRegex = /(\d+)\s+([A-Z"'(][^0-9]+?)(?=\d+\s+[A-Z"'(]|$)/g;
    let match;
    while ((match = verseRegex.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      const txt = match[2].trim();
      if (num > 0 && txt.length > 2) {
        verses.push({ numero: num, texto: txt });
      }
    }
  }

  return verses;
}

export async function importTranslation(
  sigla: string,
  onProgress: (data: ImportProgress) => void,
): Promise<void> {
  const books = await fetchBooks(sigla);
  const totalBooks = books.length;

  onProgress({ type: 'init', message: `Encontrados ${totalBooks} livros`, totalBooks, currentBook: 0, bookName: '', chapter: 0, totalChapters: 0, verse: 0, totalVerses: 0 });

  const { createTranslationDb } = await import('./db');
  const db = createTranslationDb(sigla);

  try {
    const insertBook = db.prepare('INSERT OR IGNORE INTO livros (nome, sigla, testamento, ordem) VALUES (?, ?, ?, ?)');
    const insertChapter = db.prepare('INSERT OR IGNORE INTO capitulos (livro_cod, numero) VALUES (?, ?)');
    const insertVerse = db.prepare('INSERT OR IGNORE INTO versiculos (capitulo_cod, numero, texto) VALUES (?, ?, ?)');

    for (let bi = 0; bi < books.length; bi++) {
      const book = books[bi];
      onProgress({ type: 'book', message: `Processando livro: ${book.nome} (${bi + 1}/${totalBooks})`, totalBooks, currentBook: bi + 1, bookName: book.nome, chapter: 0, totalChapters: 0, verse: 0, totalVerses: 0 });

      insertBook.run(book.nome, book.sigla, book.testamento, book.ordem);
      const bookRow = db.prepare('SELECT cod FROM livros WHERE sigla = ?').get(book.sigla) as { cod: number };
      const bookCod = bookRow.cod;

      const totalChapters = await fetchChapterCount(sigla, book.sigla);
      if (totalChapters === 0) continue;

      onProgress({ type: 'chapters', message: `Processando capítulos de ${book.nome} (${bi + 1}/${totalBooks})`, totalBooks, currentBook: bi + 1, bookName: book.nome, chapter: 0, totalChapters, verse: 0, totalVerses: 0 });

      const chapterNumbers = Array.from({ length: totalChapters }, (_, i) => i + 1);

      for (let start = 0; start < chapterNumbers.length; start += 5) {
        const batch = chapterNumbers.slice(start, start + 5);
        const results = await Promise.all(
          batch.map(async (ch) => {
            const verses = await fetchVerses(sigla, book.sigla, ch);
            return { ch, verses };
          })
        );

        for (const { ch, verses } of results) {
          onProgress({ type: 'chapter', message: `Capítulo ${ch}/${totalChapters} de ${book.nome}`, totalBooks, currentBook: bi + 1, bookName: book.nome, chapter: ch, totalChapters, verse: 0, totalVerses: verses.length });

          insertChapter.run(bookCod, ch);
          const chapterRow = db.prepare('SELECT cod FROM capitulos WHERE livro_cod = ? AND numero = ?').get(bookCod, ch) as { cod: number };
          const chapterCod = chapterRow.cod;

          for (let vi = 0; vi < verses.length; vi++) {
            const v = verses[vi];
            insertVerse.run(chapterCod, v.numero, v.texto);
          }
        }
      }
    }

    const totalVersiculos = db.prepare('SELECT COUNT(*) as count FROM versiculos').get() as { count: number };
    onProgress({ type: 'complete', message: `Importação concluída! ${books.length} livros, ${totalVersiculos.count} versículos importados.`, totalBooks, currentBook: books.length, bookName: '', chapter: 0, totalChapters: 0, verse: 0, totalVerses: 0 });

    const { getAppDb } = await import('./db');
    const appDb = getAppDb();
    const traducao = appDb.prepare('SELECT cod FROM traducoes WHERE sigla = ?').get(sigla) as { cod: number };
    if (traducao) {
      appDb.prepare('INSERT INTO traducoes_baixadas (traducao_cod, nome_arquivo) VALUES (?, ?)').run(traducao.cod, `biblia-${sigla}.sqlite`);
    }
  } finally {
    db.close();
  }
}

export interface ImportProgress {
  type: 'init' | 'book' | 'chapters' | 'chapter' | 'verse' | 'complete' | 'error';
  message: string;
  totalBooks: number;
  currentBook: number;
  bookName: string;
  chapter: number;
  totalChapters: number;
  verse: number;
  totalVerses: number;
  error?: string;
}
