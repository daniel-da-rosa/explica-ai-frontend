import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, X, Check, RefreshCw, BookOpen, Layers } from 'lucide-react';

const CONHECIMENTO_URL = 'http://172.25.180.113:8080/api/conhecimento';
const DOMINIOS_URL = 'http://172.25.180.113:8080/api/dominios';

// Modal de criação/edição — reaproveita o padrão visual dos outros modais do app
// (fundo desfocado, cabeçalho com título + X, rodapé com Cancelar/Salvar).
function DocumentoModal({ documento, modulos, onSave, onClose }) {
  const [titulo, setTitulo] = useState(documento?.titulo || '');
  const [tela, setTela] = useState(documento?.tela || '');
  const [texto, setTexto] = useState(documento?.texto || '');
  const [moduloIds, setModuloIds] = useState(documento?.moduloIds?.map(String) || []);
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(documento?.id);

  // Ao editar, o texto completo não vem na listagem (só o resumo) — busca via
  // busca semântica pelo próprio título como uma aproximação simples do conteúdo
  // não é confiável, então por ora o texto começa vazio na edição e o usuário
  // reescreve/cola de novo. Documentado no aviso abaixo do campo.

  const alternarModulo = (id) => {
    setModuloIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !texto.trim() || moduloIds.length === 0) return;
    setSalvando(true);
    await onSave({ titulo: titulo.trim(), tela: tela.trim(), texto, moduloIds: moduloIds.map(Number) });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 shrink-0">
          <h3 className="text-sm font-semibold text-slate-200">
            {editando ? 'Editar documento' : 'Novo documento de conhecimento'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Título *</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Manual de Operação: Proposta de Venda"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Tela (opcional)</label>
              <input
                value={tela}
                onChange={(e) => setTela(e.target.value)}
                placeholder="Ex: PVEN013"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Módulos *</label>
            <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-2 gap-1.5">
              {modulos.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-indigo-400">
                  <input
                    type="checkbox"
                    checked={moduloIds.includes(String(m.id))}
                    onChange={() => alternarModulo(String(m.id))}
                    className="accent-indigo-600"
                  />
                  {m.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Conteúdo (markdown ou texto puro) *</label>
            {editando && (
              <p className="text-[11px] text-amber-500/80 italic mb-1">
                Edição substitui todo o conteúdo — cole o texto completo atualizado, não só a mudança.
              </p>
            )}
            <textarea
              autoFocus={!editando}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o conteúdo completo do documento..."
              className="w-full h-72 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-4 text-xs font-mono text-slate-300 outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || !titulo.trim() || !texto.trim() || moduloIds.length === 0}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center gap-2 transition-colors active:scale-95"
          >
            {salvando ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
            {editando ? 'Salvar alterações' : 'Indexar documento'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConhecimentoManual({ onToast }) {
  const [documentos, setDocumentos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [documentoEditando, setDocumentoEditando] = useState(null);

  const nomeModulo = (id) => modulos.find((m) => String(m.id) === String(id))?.nome || `#${id}`;

  const carregar = async () => {
    setLoading(true);
    setErroCarregamento(false);
    try {
      const [resDocs, resModulos] = await Promise.all([
        fetch(`${CONHECIMENTO_URL}/documentos`, { cache: 'no-store' }),
        fetch(`${DOMINIOS_URL}/modulos`),
      ]);
      if (!resDocs.ok || !resModulos.ok) throw new Error();
      setDocumentos(await resDocs.json());
      setModulos(await resModulos.json());
    } catch {
      setErroCarregamento(true);
      onToast('Erro ao carregar a base de conhecimento. Verifique a conexão com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const handleSalvar = async (dados) => {
    const editando = Boolean(documentoEditando?.id);
    try {
      const res = await fetch(
        editando ? `${CONHECIMENTO_URL}/documentos/${encodeURIComponent(documentoEditando.id)}` : `${CONHECIMENTO_URL}/texto`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        }
      );
      if (!res.ok) throw new Error();
      onToast(editando ? 'Documento atualizado com sucesso.' : 'Documento indexado com sucesso.', 'success');
      setModalAberto(false);
      setDocumentoEditando(null);
      carregar();
    } catch {
      onToast('Erro ao salvar documento.', 'error');
    }
  };

  const handleExcluir = async (doc) => {
    if (!window.confirm(`Excluir "${doc.titulo}" da base de conhecimento? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`${CONHECIMENTO_URL}/documentos/${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
      onToast('Documento removido.', 'success');
    } catch {
      onToast('Erro ao excluir documento.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
        <RefreshCw size={20} className="animate-spin inline mr-3 text-indigo-500" /> Carregando base de conhecimento...
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="bg-slate-900/50 border border-red-900/40 rounded-2xl p-12 text-center text-sm">
        <p className="text-red-400 mb-4">Não foi possível carregar a base de conhecimento. Verifique se o backend está no ar.</p>
        <button
          onClick={carregar}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {modalAberto && (
        <DocumentoModal
          documento={documentoEditando}
          modulos={modulos}
          onClose={() => { setModalAberto(false); setDocumentoEditando(null); }}
          onSave={handleSalvar}
        />
      )}

      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-400" /> Base de conhecimento (textos manuais)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Documentos redigidos manualmente (manuais, Q&amp;A) indexados diretamente por texto, sem passar pela mineração da wiki.</p>
        </div>
        <button
          onClick={() => { setDocumentoEditando(null); setModalAberto(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-600/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors shrink-0"
        >
          <Plus size={13} /> Novo documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-600 text-sm italic">
          Nenhum documento manual indexado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/30">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Título</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Tela</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Módulos</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">Chunks</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-800/60 group hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-200">{doc.titulo}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{doc.tela || <span className="text-slate-700">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(doc.moduloIds || []).map((id) => (
                        <span key={id} className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-400 border border-slate-700">
                          {nomeModulo(id)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 flex items-center gap-1">
                    <Layers size={12} /> {doc.chunks}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setDocumentoEditando(doc); setModalAberto(true); }}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-500 transition-all"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleExcluir(doc)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-600">
        {documentos.length} documento{documentos.length === 1 ? '' : 's'} · {documentos.reduce((soma, d) => soma + d.chunks, 0)} chunks
      </div>
    </div>
  );
}
