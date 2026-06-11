CREATE TABLE IF NOT EXISTS traducoes (
    cod INTEGER PRIMARY KEY AUTOINCREMENT,
    sigla TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    origem TEXT NOT NULL,
);

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

    FOREIGN KEY (livro_cod)
    REFERENCES livros(cod)
);

CREATE TABLE IF NOT EXISTS versiculos (
    cod INTEGER PRIMARY KEY AUTOINCREMENT,
    capitulo_cod INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    texto TEXT NOT NULL,

    UNIQUE(capitulo_cod, numero),

    FOREIGN KEY (capitulo_cod)
    REFERENCES capitulos(cod)
);

CREATE INDEX IF NOT EXISTS idx_livros_sigla
ON livros(sigla);

CREATE INDEX IF NOT EXISTS idx_capitulos_livro
ON capitulos(livro_cod);

CREATE INDEX IF NOT EXISTS idx_versiculos_capitulo
ON versiculos(capitulo_cod);