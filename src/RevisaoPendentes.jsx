import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, ShieldCheck, ShieldX, ChevronDown, ChevronUp, GitBranch, User } from 'lucide-react';

const API_URL = 'http://172.25.180.113:8080/api/documentacao-pendente';

const CRITICIDADE_CORES = {
  critica: 'bg-red-600/15 text-red-400 border-red-600/30',
  crítica: 'bg-red-600/15 text-red-400 border-red-600/30',
  alta: 'bg-amber-600/15 text-amber-400 border-amber-600/30',
  media: 'bg-indigo-600/15 text-indigo-400 border-indigo-600/30',
  média: 'bg-indigo-600/15 text-indigo-400 border-indigo-600/30',
  baixa: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
};

function criticidadeClasse(criticidade) {
  return CRITICIDADE_CORES[(criticidade || '').toLowerCase()] || CRITICIDADE_CORES.baixa;
}

// Modal simples pra pedir o motivo antes de confirmar a rejeição.
function MotivoRejeicaoModal({ onConfirm, onClose }) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-200">Rejeitar documentação</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">
          <label className="text-xs text-slate-500 mb-2 block">Motivo da rejeição</label>
          <textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full h-28 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl p-4 text-sm text-slate-200 outline-none resize-none"
            placeholder="Ex: conteúdo de teste, informação já coberta por outro documento, etc."
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white flex items-center gap-2 transition-colors active:scale-95"
          >
            <ShieldX size={16} /> Confirmar rejeição
          </button>
        </div>
      </div>
    </div>
  );
}

function PendenteCard({ item, onAprovar, onRejeitar }) {
  const [expandido, setExpandido] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mostrarMotivo, setMostrarMotivo] = useState(false);

  const tags = (item.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const preview = item.conteudo?.length > 220 ? item.conteudo.slice(0, 220) + '…' : item.conteudo;

  const handleAprovar = async () => {
    setProcessando(true);
    await onAprovar(item.id);
    setProcessando(false);
  };

  const handleRejeitar = async (motivo) => {
    setProcessando(true);
    setMostrarMotivo(false);
    await onRejeitar(item.id, motivo);
    setProcessando(false);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
      {mostrarMotivo && (
        <MotivoRejeicaoModal onConfirm={handleRejeitar} onClose={() => setMostrarMotivo(false)} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wide bg-slate-800 text-slate-400 border border-slate-700">
              {item.tipo}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wide border ${criticidadeClasse(item.criticidade)}`}>
              {item.criticidade}
            </span>
            {item.notaOriginalId && (
              <span className="px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wide bg-indigo-950/40 text-indigo-400 border border-indigo-800/40 flex items-center gap-1">
                <GitBranch size={10} /> emenda de "{item.notaOriginalId}" · v{item.versao}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white truncate">{item.titulo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.tecnologia}{item.servico ? ` · ${item.servico}` : ''} · categoria: {item.categoria}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <User size={12} className="text-slate-600" />
            {item.solicitante
              ? <>solicitado por <span className="text-slate-300">{item.solicitante}</span></>
              : <span className="italic text-amber-500/80">solicitante não informado</span>}
          </p>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {expandido ? item.conteudo : preview}
      </div>
      {item.conteudo?.length > 220 && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {expandido ? <><ChevronUp size={13} /> Ver menos</> : <><ChevronDown size={13} /> Ver conteúdo completo</>}
        </button>
      )}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800/60 text-slate-500 border border-slate-800">#{t}</span>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-600">
          {new Date(item.criadoEm).toLocaleString('pt-BR')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarMotivo(true)}
            disabled={processando}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
          >
            <ShieldX size={13} /> Rejeitar
          </button>
          <button
            onClick={handleAprovar}
            disabled={processando}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
          >
            {processando ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Aprovar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RevisaoPendentes({ onToast, onCountChange }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const fetchPendentes = async () => {
    setLoading(true);
    setErroCarregamento(false);
    try {
      const res = await fetch(`${API_URL}?status=PENDENTE`, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setItens(dados);
      onCountChange?.(dados.length);
    } catch {
      // Não confundir "erro de conexão" com "nada pendente" — são estados bem diferentes
      // numa tela de revisão, e mostrar o segundo no lugar do primeiro esconde trabalho real.
      setErroCarregamento(true);
      onToast('Erro ao carregar documentação pendente. Verifique a conexão com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendentes(); }, []);

  const revisor = () => window.prompt('Seu nome (fica registrado como revisor):', '') || 'Desconhecido';

  const handleAprovar = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisor: revisor() }),
      });
      if (!res.ok) throw new Error();
      setItens((prev) => {
        const restante = prev.filter((i) => i.id !== id);
        onCountChange?.(restante.length);
        return restante;
      });
      onToast('Documentação aprovada e disponível na base de conhecimento.', 'success');
    } catch {
      onToast('Erro ao aprovar documentação.', 'error');
    }
  };

  const handleRejeitar = async (id, motivo) => {
    try {
      const res = await fetch(`${API_URL}/${id}/rejeitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisor: revisor(), motivo }),
      });
      if (!res.ok) throw new Error();
      setItens((prev) => {
        const restante = prev.filter((i) => i.id !== id);
        onCountChange?.(restante.length);
        return restante;
      });
      onToast('Documentação rejeitada.', 'success');
    } catch {
      onToast('Erro ao rejeitar documentação.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
        <RefreshCw size={20} className="animate-spin inline mr-3 text-indigo-500" /> Carregando fila de revisão...
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="bg-slate-900/50 border border-red-900/40 rounded-2xl p-12 text-center text-sm">
        <p className="text-red-400 mb-4">Não foi possível carregar a fila de revisão. Verifique se o backend está no ar.</p>
        <button
          onClick={fetchPendentes}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-600 text-sm italic">
        Nenhuma documentação pendente de revisão no momento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {itens.map((item) => (
        <PendenteCard key={item.id} item={item} onAprovar={handleAprovar} onRejeitar={handleRejeitar} />
      ))}
    </div>
  );
}
