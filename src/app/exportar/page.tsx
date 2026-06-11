"use client";

import { useState, useEffect } from "react";

interface ExportItem {
  traducao_cod: number;
  sigla: string;
  title: string;
  nome_arquivo: string;
  data_importacao: string;
}

export default function ExportPage() {
  const [items, setItems] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = () => {
    setLoading(true);
    fetch("/api/export")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const handleDownload = (sigla: string) => {
    window.open(`/api/download?sigla=${sigla}`, "_blank");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exportar</h1>
          <p className="mt-1 text-slate-500">Baixe os bancos de dados SQLite das traduções já importadas.</p>
        </div>
        <button
          onClick={fetchExports}
          className="px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex gap-1">
            <span className="loading-dot w-3 h-3 bg-indigo-600 rounded-full inline-block" />
            <span className="loading-dot w-3 h-3 bg-indigo-600 rounded-full inline-block" />
            <span className="loading-dot w-3 h-3 bg-indigo-600 rounded-full inline-block" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <p className="text-slate-500 font-medium">Nenhuma tradução disponível para exportação.</p>
          <p className="text-slate-400 text-sm mt-1">Importe uma tradução primeiro na página inicial.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.traducao_cod} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.sigla}</p>
                </div>
                <span className="ml-2 flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Pronto
                </span>
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                <p className="font-mono">{item.nome_arquivo}</p>
                <p>Importado em: {new Date(item.data_importacao + "Z").toLocaleString("pt-BR")}</p>
              </div>
              <button
                onClick={() => handleDownload(item.sigla)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
