"use client";

import { useState, useEffect } from "react";

interface AuditItem {
  traducao_cod: number;
  sigla: string;
  title: string;
  nome_arquivo: string;
  data_importacao: string;
  dbExists: boolean;
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = () => {
    setLoading(true);
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const handleDelete = async (sigla: string) => {
    if (!confirm(`Tem certeza que deseja excluir o banco "${sigla}"? Esta ação não pode ser desfeita.`)) return;

    try {
      const res = await fetch(`/api/audit?sigla=${sigla}`, { method: "DELETE" });
      if (res.ok) {
        fetchAudit();
      }
    } catch {}
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auditoria</h1>
          <p className="mt-1 text-slate-500">Gerencie os bancos de dados baixados. Você pode excluir um banco para baixar uma nova versão.</p>
        </div>
        <button
          onClick={fetchAudit}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-slate-500 font-medium">Nenhum banco baixado ainda.</p>
          <p className="text-slate-400 text-sm mt-1">Vá para a página inicial e importe uma tradução.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tradução</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sigla</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Arquivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Importado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.traducao_cod} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.sigla}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.nome_arquivo}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(item.data_importacao + "Z").toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-4">
                    {item.dbExists ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Disponível
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Ausente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(item.sigla)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
