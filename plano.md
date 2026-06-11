# Bíblia Admin — Plano

## Objetivo

Sistema Next.js para importar traduções da Bíblia de bibliaonline.com.br para bancos SQLite individuais, com interface web para importar, auditar e exportar.

---

## Arquitetura

```
biblia-admin/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── translations/route.ts   — GET  lista traduções
│   │   │   ├── import/route.ts          — POST importa (SSE stream)
│   │   │   ├── status/route.ts          — GET  status do banco
│   │   │   ├── download/route.ts        — GET  download .sqlite
│   │   │   ├── audit/route.ts           — GET/DELETE gerenciar bancos
│   │   │   └── export/route.ts          — GET  lista exportáveis
│   │   ├── page.tsx                     — Home (importar)
│   │   ├── auditoria/page.tsx           — Auditoria (gerenciar)
│   │   ├── exportar/page.tsx            — Exportar (baixar)
│   │   ├── NavBar.tsx                   — Navegação com active state
│   │   ├── layout.tsx                   — Layout raiz
│   │   └── globals.css                  — Tailwind v4 + animações
│   └── lib/
│       ├── db.ts                        — SQLite (app.db + por tradução)
│       └── scraper.ts                   — Web scraping + importação
├── data/
│   ├── app.db                           — traducoes + traducoes_baixadas
│   ├── biblia-ntlh.sqlite               — NTLH (68 livros, 1189 cap, 28953 vers)
│   └── biblia-wesley.sqlite             — Wesley NT (29 livros, 260 cap, 7957 vers)
├── docs/
│   └── api.md                           — Documentação das APIs
└── schema.sql                           — Schema de referência
```

---

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

---

## APIs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/translations` | Lista traduções (auto-popula) |
| POST | `/api/import` | Importa com SSE progress |
| GET | `/api/status?sigla=` | Status do banco |
| GET | `/api/download?sigla=` | Download .sqlite |
| GET | `/api/audit` | Lista bancos baixados |
| DELETE | `/api/audit?sigla=` | Exclui banco |
| GET | `/api/export` | Lista exportáveis |

Detalhes em `docs/api.md`.

---

## Fluxo de Importação

1. Usuário seleciona tradução no dropdown e clica "Importar"
2. GET `/api/translations` → lista 159 traduções do bibliaonline.com.br
3. POST `/api/import` → SSE stream com progresso:
   - `init` → livros encontrados
   - `book` → processando livro (um por vez)
   - `chapters` → processando capítulos
   - `chapter` → progresso de capítulo (5 em paralelo)
   - `complete` → importação finalizada
4. GET `/api/status` → verifica se banco existe e está completo
5. GET `/api/download` → baixa o arquivo .sqlite

---

## Decisões Técnicas

- **SQLite via better-sqlite3** — simples, sem dependência externa, portátil
- **SSE em vez de polling** — progresso em tempo real sem fazer requisições periódicas
- **5 requisições paralelas** — balance entre velocidade e não sobrecarregar o servidor
- **Cheerio para scraping** — leve, familiar, sem necessidade de browser headless
- **Traduções em bancos separados** — cada arquivo .sqlite é standalone para fácil distribuição
- **`traducoes_baixadas` como flag de conclusão** — registro só é inserido ao final da importação bem-sucedida

---

## Progresso

- [x] Next.js + TypeScript + Tailwind CSS v4
- [x] SQLite (app.db + bancos por tradução)
- [x] Scraper de traduções, livros, capítulos e versículos
- [x] Importação concorrente (5 em paralelo)
- [x] API de traduções (auto-popula)
- [x] API de importação com SSE stream
- [x] API de status
- [x] API de download
- [x] API de auditoria (listar/excluir)
- [x] API de exportação
- [x] Página inicial (selecionar + importar + progresso)
- [x] Página de auditoria (tabela com status)
- [x] Página de exportação (grid de downloads)
- [x] Navegação com active state
- [x] Loading states (traduções, status)
- [x] Traduções importadas: NTLH (68 livros), Wesley (29 livros)
- [x] Documentação das APIs em docs/api.md

## Próximos Passos

- Testar importação de mais traduções
- Verificar edge cases (traduções com caracteres especiais)
- Melhorar tratamento de erros na UI
- Opção de importar múltiplas traduções em fila
- Paginação ou busca na lista de traduções
