"use client";

import { useState, useEffect, useRef } from "react";

interface Translation {
  cod: number;
  sigla: string;
  title: string;
  origem: string;
}

interface StatusResult {
  exists: boolean;
  complete: boolean;
  bookCount: number;
  dataImportacao: string | null;
  nomeArquivo: string;
}

interface ImportProgress {
  type: string;
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

export default function HomePage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [selected, setSelected] = useState("");
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [loadingTranslations, setLoadingTranslations] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/translations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTranslations(data);
        setLoadingTranslations(false);
      })
      .catch(() => setLoadingTranslations(false));
  }, []);

  useEffect(() => {
    if (!selected || importing) {
      setStatus(null);
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    fetch(`/api/status?sigla=${selected}`)
      .then((r) => r.json())
      .then((data) => { setStatus(data); setStatusLoading(false); })
      .catch(() => { setStatus(null); setStatusLoading(false); });
  }, [selected, importing]);

  const handleImport = async () => {
    if (!selected || importing) return;
    setImporting(true);
    setProgress(null);
    setStatus(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sigla: selected }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setProgress(data);
              if (data.type === "done" || data.type === "error") {
                setImporting(false);
                setSelected(selected);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setProgress({ type: "error", message: err.message, totalBooks: 0, currentBook: 0, bookName: "", chapter: 0, totalChapters: 0, verse: 0, totalVerses: 0 });
      setImporting(false);
    }
  };

  const handleDownload = () => {
    if (!selected) return;
    window.open(`/api/download?sigla=${selected}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar Tradução</h1>
        <p className="mt-1 text-slate-500">Selecione uma tradução para baixar e salvar como banco de dados SQLite.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Tradução</label>
        <div className="flex gap-3">
          <select
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={importing || loadingTranslations}
          >
            <option value="">
              {loadingTranslations
                ? "Carregando traduções..."
                : "Selecione uma tradução"}
            </option>
            {translations.map((t) => (
              <option key={t.cod} value={t.sigla}>
                {t.title} ({t.sigla})
              </option>
            ))}
          </select>
        </div>

        {importing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
            <span className="inline-flex gap-1">
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
            </span>
            Importando... Não feche esta página.
          </div>
        )}
      </div>

      {statusLoading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="flex gap-1">
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
              <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
            </div>
            Verificando status...
          </div>
        </div>
      )}

      {status && !importing && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Status</h2>
          {status.exists && status.complete ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Banco de dados disponível</span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p>Livros: {status.bookCount}</p>
                <p>Arquivo: {status.nomeArquivo}</p>
                {status.dataImportacao && <p>Importado em: {new Date(status.dataImportacao + "Z").toLocaleString("pt-BR")}</p>}
              </div>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar Banco
              </button>
              <p className="text-xs text-slate-400 mt-2">O banco contém todos os livros, capítulos e versículos desta tradução.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {status.exists
                  ? "O banco existe mas está incompleto. Clique para importar novamente."
                  : "Nenhum banco encontrado para esta tradução. Clique para importar."}
              </p>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar
              </button>
            </div>
          )}
        </div>
      )}

      {importing && progress && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Progresso da Importação</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>Livros</span>
                <span>{progress.currentBook}/{progress.totalBooks}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.totalBooks > 0 ? (progress.currentBook / progress.totalBooks) * 100 : 0}%` }}
                />
              </div>
            </div>

            {progress.bookName && (
              <div className="text-sm text-slate-700">
                <p className="font-medium text-indigo-700">{progress.bookName}</p>
                <p className="text-slate-500 mt-1">
                  Capítulo {progress.chapter}/{progress.totalChapters}
                  {progress.totalVerses > 0 && (
                    <span className="ml-2">Versículo {progress.verse}/{progress.totalVerses}</span>
                  )}
                </p>
              </div>
            )}

            {progress.type !== "done" && progress.type !== "error" && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex gap-1">
                  <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
                  <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
                  <span className="loading-dot w-2 h-2 bg-indigo-600 rounded-full inline-block" />
                </div>
                {progress.message}
              </div>
            )}

            {(progress.type === "done" || progress.type === "complete") && (
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {progress.message}
              </div>
            )}

            {progress.type === "error" && (
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {progress.error || progress.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
