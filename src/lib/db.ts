import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const APP_DB_PATH = path.join(DATA_DIR, 'app.db');

let appDb: Database.Database | null = null;

export function getAppDb(): Database.Database {
  if (!appDb) {
    appDb = new Database(APP_DB_PATH);
    appDb.pragma('journal_mode = WAL');
    appDb.pragma('foreign_keys = ON');
    initAppDb(appDb);
  }
  return appDb;
}

function initAppDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traducoes (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      sigla TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      origem TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS traducoes_baixadas (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      traducao_cod INTEGER NOT NULL,
      nome_arquivo TEXT NOT NULL,
      data_importacao TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (traducao_cod) REFERENCES traducoes(cod)
    );
  `);
}

export function getTranslationDbPath(sigla: string): string {
  return path.join(DATA_DIR, `biblia-${sigla}.sqlite`);
}

export function createTranslationDb(sigla: string): Database.Database {
  const dbPath = getTranslationDbPath(sigla);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS livros (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      sigla TEXT NOT NULL,
      imagem TEXT,
      testamento TEXT,
      ordem INTEGER,
      UNIQUE(sigla)
    );

    CREATE TABLE IF NOT EXISTS capitulos (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      livro_cod INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      UNIQUE(livro_cod, numero),
      FOREIGN KEY (livro_cod) REFERENCES livros(cod)
    );

    CREATE TABLE IF NOT EXISTS versiculos (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      capitulo_cod INTEGER NOT NULL,
      numero INTEGER NOT NULL,
      texto TEXT NOT NULL,
      UNIQUE(capitulo_cod, numero),
      FOREIGN KEY (capitulo_cod) REFERENCES capitulos(cod)
    );

    CREATE INDEX IF NOT EXISTS idx_livros_sigla ON livros(sigla);
    CREATE INDEX IF NOT EXISTS idx_capitulos_livro ON capitulos(livro_cod);
    CREATE INDEX IF NOT EXISTS idx_versiculos_capitulo ON versiculos(capitulo_cod);
  `);
  return db;
}

export function translationDbExists(sigla: string): boolean {
  return fs.existsSync(getTranslationDbPath(sigla));
}

export function deleteTranslationDb(sigla: string): void {
  const dbPath = getTranslationDbPath(sigla);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  }
}

export function getTranslationBookCount(sigla: string): number {
  const dbPath = getTranslationDbPath(sigla);
  if (!fs.existsSync(dbPath)) return 0;
  const db = new Database(dbPath);
  const count = db.prepare('SELECT COUNT(*) as count FROM livros').get() as { count: number };
  db.close();
  return count.count;
}

export function closeAll(): void {
  if (appDb) {
    appDb.close();
    appDb = null;
  }
}
