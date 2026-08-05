import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, RefreshCw, BrainCircuit, AlertCircle, Maximize2, ShieldCheck, BookOpen } from 'lucide-react';
import RevisaoPendentes from './RevisaoPendentes';
import ConhecimentoManual from './ConhecimentoManual';

const DOMINIOS_URL = 'http://172.25.180.113:8080/api/dominios';
const DOCUMENTACAO_PENDENTE_URL = 'http://172.25.180.113:8080/api/documentacao-pendente';
const ABA_REVISAO = 'revisao-documentacao';
const ABA_CONHECIMENTO = 'base-conhecimento';

const DOMINIOS_CONFIG = [
  {
    key: 'modulos',
    label: 'Módulos do Sistema',
    endpoint: `${DOMINIOS_URL}/modulos`,
    descricao: 'Módulos funcionais disponíveis para análise SQL.',
    campos: [
      { key: 'nome', label: 'Nome', placeholder: 'Ex: Faturamento' },
      { key: 'especialidade', label: 'Especialidade', placeholder: 'Ex: Regras de NF-e' },
      { key: 'instrucaoEspecialidade', label: 'Instrução', placeholder: 'Ex: Priorizar regras fiscais' },
    ],
  },
  {
    key: 'tipos-comando',
    label: 'Tipos de Instrução',
    endpoint: `${DOMINIOS_URL}/tipos-comando`,
    descricao: 'Tipos de comando que guiam o comportamento da IA.',
    campos: [
      { key: 'nome', label: 'Nome', placeholder: 'Ex: Diagnóstico' },
      { key: 'explicacaoIntuito', label: 'Intuito', placeholder: 'Ex: Analisar causa raiz' },
      { key: 'instrucaoMetodologia', label: 'Metodologia', placeholder: 'Ex: Apresente problema e solução' },
    ],
  },
  {
    key: 'personas',
    label: 'Personas da IA',
    endpoint: `${DOMINIOS_URL}/personas`,
    descricao: 'Personalidades e estilos de resposta da IA.',
    campos: [
      { key: 'nome', label: 'Nome', placeholder: 'Ex: Especialista Técnico' },
      { key: 'descricaoTom', label: 'Tom', placeholder: 'Ex: Direto e analítico' },
      { key: 'instrucaoComportamento', label: 'Comportamento', placeholder: 'Ex: Responda sem jargões' },
    ],
  },
  {
    key: 'niveis-tecnicos',
    label: 'Níveis de Resposta',
    endpoint: `${DOMINIOS_URL}/niveis-tecnicos`,
    descricao: 'Profundidade técnica das respostas geradas.',
    campos: [
      { key: 'nome', label: 'Nome', placeholder: 'Ex: Dev Sênior' },
      { key: 'instrucaoProficiencia', label: 'Instrução', placeholder: 'Ex: Assuma conhecimento avançado' },
    ],
  },
];

// Componente de Notificação
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'border-emerald-600/40 text-emerald-400',
    error: 'border-red-600/40 text-red-400',
    info: 'border-indigo-600/40 text-indigo-400',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-slate-900 border ${colors[type]} rounded-xl px-5 py-3 text-sm shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {type === 'error' && <AlertCircle size={15} />}
      {type === 'success' && <Check size={15} />}
      {message}
    </div>
  );
}

// Modal para edição de textos grandes
function EditorModal({ campo, valor, onSave, onClose }) {
  const [texto, setTexto] = useState(valor || '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Editor expandido</h3>
            <p className="text-xs text-indigo-400 mt-0.5">Campo: {campo.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 flex-1">
          <textarea
            autoFocus
            value={texto}
            onChange={e => setTexto(e.target.value)}
            className="w-full h-72 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl p-4 text-sm text-slate-200 outline-none resize-none font-mono"
            placeholder={campo.placeholder}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">Cancelar</button>
           <button onClick={() => onSave(texto)} className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors active:scale-95">
             <Check size={16}/> Salvar texto
           </button>
        </div>
      </div>
    </div>
  );
}

// Linha da Tabela
function ItemRow({ item, campos, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);
  const [campoMax, setCampoMax] = useState(null); // Estado para controlar o modal de edição

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEditing(false);
  };

  return (
    <>
      {/* Renderiza o modal se houver um campo maximizado */}
      {campoMax && (
        <EditorModal
          campo={campoMax}
          valor={form[campoMax.key]}
          onSave={(novoTexto) => {
            setForm(p => ({ ...p, [campoMax.key]: novoTexto }));
            setCampoMax(null);
          }}
          onClose={() => setCampoMax(null)}
        />
      )}

      <tr className="border-b border-slate-800/60 group hover:bg-slate-800/20 transition-colors">
        <td className="px-4 py-2 text-xs text-slate-600 w-10">{item.id}</td>
        {campos.map((campo) => (
          <td key={campo.key} className="px-4 py-2">
            {editing ? (
              <div className="relative flex items-center group/input">
                <input
                  value={form[campo.key] || ''}
                  onChange={(e) => setForm((p) => ({ ...p, [campo.key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-200 outline-none"
                />
                <button
                  onClick={() => setCampoMax(campo)}
                  className="absolute right-1.5 p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-700 rounded-md opacity-0 group-hover/input:opacity-100 transition-all"
                  title="Expandir editor"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            ) : (
              <span className="text-sm text-slate-300 block truncate max-w-[200px]" title={item[campo.key]}>
                {item[campo.key] || <span className="text-slate-600 italic">—</span>}
              </span>
            )}
          </td>
        ))}
        <td className="px-4 py-2 w-28">
          <div className="flex items-center gap-2 justify-end">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400">
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
                <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500">
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-500 transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}

// Painel de Gestão de Dados (CRUD)
function DominioPainel({ dominio, onToast }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoForm, setNovoForm] = useState({});
  const [adicionando, setAdicionando] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [campoMaxNew, setCampoMaxNew] = useState(null); // Controle do modal para o Novo Registro

  const fetchItens = async () => {
    setLoading(true);
    try {
      const res = await fetch(dominio.endpoint);
      if (!res.ok) throw new Error();
      setItens(await res.json());
    } catch {
      onToast('Erro ao carregar dados do servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItens(); }, [dominio.key]);

  const handleSave = async (item) => {
    try {
      const res = await fetch(`${dominio.endpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error();
      const atualizado = await res.json();
      setItens((prev) => prev.map((i) => (i.id === atualizado.id ? atualizado : i)));
      onToast('Registro atualizado com sucesso.', 'success');
    } catch {
      onToast('Falha ao atualizar registro.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirma a exclusão definitiva?')) return;
    try {
      const res = await fetch(`${dominio.endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setItens((prev) => prev.filter((i) => i.id !== id));
      onToast('Registro removido.', 'success');
    } catch {
      onToast('Erro ao excluir registro.', 'error');
    }
  };

  const handleCreate = async () => {
    setSalvandoNovo(true);
    try {
      const res = await fetch(dominio.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoForm),
      });
      if (!res.ok) throw new Error();
      const criado = await res.json();
      setItens((prev) => [...prev, criado]);
      setNovoForm({});
      setAdicionando(false);
      onToast('Novo registro criado.', 'success');
    } catch {
      onToast('Erro ao criar registro.', 'error');
    } finally {
      setSalvandoNovo(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden relative">

      {/* Modal para Novo Registro */}
      {campoMaxNew && (
        <EditorModal
          campo={campoMaxNew}
          valor={novoForm[campoMaxNew.key]}
          onSave={(novoTexto) => {
            setNovoForm(p => ({ ...p, [campoMaxNew.key]: novoTexto }));
            setCampoMaxNew(null);
          }}
          onClose={() => setCampoMaxNew(null)}
        />
      )}

      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div>
          <h2 className="text-base font-semibold text-white">{dominio.label}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{dominio.descricao}</p>
        </div>
        <button
          onClick={() => { setAdicionando(true); setNovoForm({}); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-600/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={13} /> Novo registro
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/30">
              <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium w-10">ID</th>
              {dominio.campos.map((c) => (
                <th key={c.key} className="text-left px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody>
            {adicionando && (
              <tr className="border-b border-indigo-900/30 bg-indigo-950/10">
                <td className="px-4 py-2 text-xs text-slate-600">—</td>
                {dominio.campos.map((campo) => (
                  <td key={campo.key} className="px-4 py-2">
                    <div className="relative flex items-center group/input">
                      <input
                        value={novoForm[campo.key] || ''}
                        onChange={(e) => setNovoForm((p) => ({ ...p, [campo.key]: e.target.value }))}
                        placeholder={campo.placeholder}
                        autoFocus={campo.key === dominio.campos[0].key}
                        className="w-full bg-slate-800 border border-indigo-600/50 focus:border-indigo-400 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-200 outline-none"
                      />
                      <button
                        onClick={() => setCampoMaxNew(campo)}
                        className="absolute right-1.5 p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-700 rounded-md opacity-0 group-hover/input:opacity-100 transition-all"
                        title="Expandir editor"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </div>
                  </td>
                ))}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={handleCreate} disabled={salvandoNovo} className="p-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400">
                      {salvandoNovo ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    </button>
                    <button onClick={() => setAdicionando(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500">
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={dominio.campos.length + 2} className="px-4 py-12 text-center text-slate-500 text-sm">
                  <RefreshCw size={20} className="animate-spin inline mr-3 text-indigo-500" /> Carregando dados...
                </td>
              </tr>
            ) : itens.length === 0 && !adicionando ? (
              <tr>
                <td colSpan={dominio.campos.length + 2} className="px-4 py-12 text-center text-slate-600 text-sm italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <ItemRow key={item.id} item={item} campos={dominio.campos} onSave={handleSave} onDelete={handleDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-800 text-xs text-slate-600">
        {itens.length} registro{itens.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}

// Página Principal de Configurações
export default function ConfiguracaoPage({ onVoltar }) {
  const [abaSelecionada, setAbaSelecionada] = useState(DOMINIOS_CONFIG[0].key);
  const [toast, setToast] = useState(null);
  const [pendentesCount, setPendentesCount] = useState(0);

  const showToast = (message, type = 'info') => setToast({ message, type });
  const dominioAtivo = DOMINIOS_CONFIG.find((d) => d.key === abaSelecionada);
  const emRevisao = abaSelecionada === ABA_REVISAO;
  const emConhecimento = abaSelecionada === ABA_CONHECIMENTO;

  useEffect(() => {
    fetch(`${DOCUMENTACAO_PENDENTE_URL}?status=PENDENTE`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((dados) => setPendentesCount(dados.length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-300 font-sans overflow-hidden animate-in fade-in duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <aside className="w-72 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">ExplicaAi</h1>
              <p className="text-xs text-slate-500">Painel administrativo</p>
            </div>
          </div>
          <button onClick={onVoltar} className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao chat
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-600 font-medium px-3 mb-4">Entidades de domínio</p>
          {DOMINIOS_CONFIG.map((d) => (
            <button
              key={d.key}
              onClick={() => setAbaSelecionada(d.key)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border ${
                abaSelecionada === d.key
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/30'
                  : 'text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              {d.label}
            </button>
          ))}

          <p className="text-[11px] uppercase tracking-wide text-slate-600 font-medium px-3 mb-4 mt-6">Fila de revisão</p>
          <button
            onClick={() => setAbaSelecionada(ABA_REVISAO)}
            className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-xl text-sm transition-colors border ${
              emRevisao
                ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/30'
                : 'text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> Revisão de documentação</span>
            {pendentesCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-medium bg-amber-600 text-white">
                {pendentesCount}
              </span>
            )}
          </button>

          <p className="text-[11px] uppercase tracking-wide text-slate-600 font-medium px-3 mb-4 mt-6">Conhecimento</p>
          <button
            onClick={() => setAbaSelecionada(ABA_CONHECIMENTO)}
            className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-sm transition-colors border ${
              emConhecimento
                ? 'bg-indigo-600/10 text-indigo-400 border-indigo-600/30'
                : 'text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <BookOpen size={14} /> Base de conhecimento
          </button>
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Banco de dados pronto
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        <div className="bg-slate-900/20 border-b border-slate-800 px-10 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {emRevisao ? 'Revisão de documentação' : emConhecimento ? 'Base de conhecimento' : dominioAtivo.label}
            </h2>
            <p className="text-sm text-slate-500">
              {emRevisao
                ? 'Documentação Starbase (DBA/Infra) proposta pela IA em conversas, aguardando aprovação antes de ficar disponível na base de conhecimento.'
                : emConhecimento
                ? 'Documentos redigidos manualmente (manuais de processo, Q&A) indexados direto na base vetorial do ERP, sem depender da mineração da wiki.'
                : dominioAtivo.descricao}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-5xl mx-auto">
            {emRevisao ? (
              <RevisaoPendentes onToast={showToast} onCountChange={setPendentesCount} />
            ) : emConhecimento ? (
              <ConhecimentoManual onToast={showToast} />
            ) : (
              <DominioPainel key={abaSelecionada} dominio={dominioAtivo} onToast={showToast} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
