# API - Bíblia Admin

## Visão Geral

Base URL: `http://localhost:3000/api`

Todas as rotas são servidas via Next.js App Router. Os bancos de dados SQLite ficam em `data/`.

---

## `GET /api/translations`

Lista todas as traduções disponíveis no bibliaonline.com.br.

Se o banco `app.db` ainda não tiver traduções, faz uma requisição ao site, popula a tabela `traducoes` e retorna os dados.

**Resposta (200):**
```json
[
  {
    "cod": 1,
    "sigla": "acf",
    "title": "Almeida Corrigida Fiel",
    "origem": "https://www.bibliaonline.com.br/acf"
  }
]
```

**Erro (500):** `{ "error": "mensagem" }`

---

## `POST /api/import`

Inicia a importação de uma tradução. Retorna um **SSE stream** (Server-Sent Events) com o progresso.

**Request body:**
```json
{ "sigla": "ntlh" }
```

**Resposta:** `Content-Type: text/event-stream`

Cada evento tem o formato `data: {...}\n\n`. O payload JSON contém:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `type` | string | `init`, `book`, `chapters`, `chapter`, `complete`, `error` |
| `message` | string | Mensagem descritiva |
| `totalBooks` | number | Total de livros encontrados |
| `currentBook` | number | Livro atual sendo processado |
| `bookName` | string | Nome do livro atual |
| `chapter` | number | Capítulo atual |
| `totalChapters` | number | Total de capítulos do livro atual |
| `verse` | number | Versículo atual |
| `totalVerses` | number | Total de versículos do capítulo atual |
| `error?` | string | Mensagem de erro (type=`error`) |

**Fluxo de eventos:**
1. `type: "init"` — livros encontrados
2. `type: "book"` — iniciando processamento de um livro
3. `type: "chapters"` — processando capítulos do livro
4. `type: "chapter"` — progresso por capítulo
5. `type: "complete"` — importação finalizada
6. `type: "error"` — erro durante importação

**Erros:**
- `400`: sigla não informada
- `404`: tradução não encontrada no banco
- `500`: erro interno

---

## `GET /api/status?sigla={sigla}`

Verifica o status de uma tradução já baixada.

**Query params:** `sigla` (obrigatório)

**Resposta (200):**
```json
{
  "exists": true,
  "complete": true,
  "bookCount": 68,
  "dataImportacao": "2026-06-11 15:07:38",
  "nomeArquivo": "biblia-ntlh.sqlite"
}
```

Campos:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `exists` | boolean | Se o arquivo .sqlite existe no disco |
| `complete` | boolean | Se há registro em `traducoes_baixadas` (importação finalizada) |
| `bookCount` | number | Quantidade de livros no banco |
| `dataImportacao` | string \| null | Data da importação |
| `nomeArquivo` | string | Nome do arquivo para download |

**Erro (400):** `{ "error": "sigla is required" }`
**Erro (404):** `{ "error": "Translation not found" }`

---

## `GET /api/download?sigla={sigla}`

Faz o download do arquivo SQLite de uma tradução.

**Query params:** `sigla` (obrigatório)

**Resposta (200):** `Content-Type: application/octet-stream` com `Content-Disposition: attachment; filename="biblia-{sigla}.sqlite"`

**Erro (400):** `{ "error": "sigla is required" }`
**Erro (404):** `{ "error": "Database not found for this translation" }`

---

## `GET /api/audit`

Lista todas as traduções que já foram baixadas, com status do arquivo no disco.

**Resposta (200):**
```json
[
  {
    "traducao_cod": 2,
    "sigla": "ntlh",
    "title": "Nova Tradução na Linguagem de Hoje",
    "nome_arquivo": "biblia-ntlh.sqlite",
    "data_importacao": "2026-06-11 15:07:38",
    "dbExists": true,
    "bookCount": 68
  }
]
```

Campos adicionais:
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dbExists` | boolean | Se o arquivo .sqlite existe atualmente no disco |
| `bookCount` | number | Quantidade de livros no banco |

---

## `DELETE /api/audit?sigla={sigla}`

Exclui o banco de dados de uma tradução (arquivo .sqlite e registro em `traducoes_baixadas`).

**Query params:** `sigla` (obrigatório)

**Resposta (200):** `{ "success": true }`

**Erro (400):** `{ "error": "sigla is required" }`

---

## `GET /api/export`

Lista as traduções disponíveis para exportação (apenas a importação mais recente de cada tradução que possui arquivo no disco).

**Resposta (200):**
```json
[
  {
    "traducao_cod": 2,
    "sigla": "ntlh",
    "title": "Nova Tradução na Linguagem de Hoje",
    "nome_arquivo": "biblia-ntlh.sqlite",
    "data_importacao": "2026-06-11 15:07:38"
  }
]
```

---

## Dependências

- **better-sqlite3** — banco de dados SQLite
- **cheerio** — parser HTML para scraping

## Banco de Dados

### app.db (principal)

```sql
traducoes (cod, sigla, title, origem)
traducoes_baixadas (cod, traducao_cod, nome_arquivo, data_importacao)
```

### biblia-{sigla}.sqlite (por tradução)

```sql
livros (cod, nome, sigla, imagem, testamento, ordem)
capitulos (cod, livro_cod, numero)
versiculos (cod, capitulo_cod, numero, texto)
```
