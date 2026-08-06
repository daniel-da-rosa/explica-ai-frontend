import React, { useState, useEffect, useRef } from 'react';
import { User, Send, Settings, RefreshCw, Code2, Cpu, ChevronDown, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ConfiguracaoPage from './Configuracao';
import IconeExplicaAi from './IconeExplicaAi';

// Linha de configuração colapsável: fechada mostra só rótulo + valor selecionado (uma
// linha compacta); aberta mostra o controle de verdade. Troca os selects sempre visíveis
// do menu lateral por um padrão tipo "ajustes" — o objetivo é nunca precisar de scroll
// no painel, já que só o campo que a pessoa está mexendo fica expandido por vez.
function CampoColapsavel({ label, valor, aberto, onToggle, children }) {
  return (
    <div className={`rounded-lg border transition-colors ${aberto ? 'border-indigo-500/40 bg-slate-900' : 'border-slate-800'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-800/40 rounded-lg transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-[11px] text-slate-500">{label}</span>
          <span className="block text-sm text-slate-200 truncate">{valor}</span>
        </span>
        <ChevronDown size={15} className={`text-slate-600 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && <div className="px-3 pb-2.5 pt-0.5">{children}</div>}
    </div>
  );
}

export default function App() {
  // --- CONFIGURAÇÃO DA API ---
  const DOMINIOS_URL = 'http://172.25.180.113:8080/api/dominios';
  const COMANDOS_URL = 'http://172.25.180.113:8080/api/comandos';

  // --- ESTADO DE TELA ---
  const [tela, setTela] = useState('chat'); // 'chat' | 'configuracao'

  // --- ESTADOS DE DADOS ---
  const [modulos, setModulos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [persona, setPersonas] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [apiConectada, setApiConectada] = useState(false);

  // --- ESTADOS DE CONTROLO ---
  const [config, setConfig] = useState({
    moduloId: '',
    tipoComandoId: '',
    personaId: '',
    nivelTecnicoId: '',
  });

  const [origemModelo, setOrigemModelo] = useState('CLOUD'); // 'CLOUD' | 'LOCAL'

  const [memo, setMemo] = useState(
    "SELECT * FROM FAT_NOTA_FISCAL WHERE STATUS_NFE = 'REJEITADA' AND CHAVE_ACESSO IS NULL;"
  );

  const [isSynced, setIsSynced] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Iniciando sistema... aguardando conexão com o servidor.' }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [feedbackEnviado, setFeedbackEnviado] = useState({}); // { [experienciaId]: boolean | 'enviando' }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Qual campo de configuração está expandido no painel lateral — só um por vez
  // (accordion), pra manter o painel curto e nunca precisar de scroll.
  const [campoAberto, setCampoAberto] = useState(null);
  const toggleCampo = (id) => setCampoAberto((prev) => (prev === id ? null : id));

  // Painel lateral inteiro recolhido pra só o ícone (padrão "rail" tipo Slack/VS Code) —
  // ao recolher, fecha também qualquer campo aberto, senão ele reaparece expandido a
  // primeira vez que o painel volta a abrir.
  const [sidebarAberto, setSidebarAberto] = useState(true);
  const toggleSidebar = () => setSidebarAberto((prev) => {
    if (prev) setCampoAberto(null);
    return !prev;
  });

  // --- HELPER FETCH ---
  const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    return response.json();
  };

  // --- CARREGAR DOMÍNIOS INICIAIS ---
  // "isCargaInicial" separa duas responsabilidades que estavam misturadas: atualizar as
  // listas de módulos/tipos/personas/níveis (precisa acontecer sempre — inclusive ao voltar
  // da tela de Configurações, já que o usuário pode ter editado algo lá) e resetar a conversa
  // + a seleção padrão (só faz sentido na primeira carga da página, nunca de novo depois —
  // era isso que apagava a conversa toda vez que voltava de Configurações).
  const fetchConfiguracoes = async (isCargaInicial = false) => {
    try {
      const [resModulos, resTipos, resPersonas, resNiveis] = await Promise.all([
        fetchJSON(`${DOMINIOS_URL}/modulos`),
        fetchJSON(`${DOMINIOS_URL}/tipos-comando`),
        fetchJSON(`${DOMINIOS_URL}/personas`),
        fetchJSON(`${DOMINIOS_URL}/niveis-tecnicos`)
      ]);

      setModulos(resModulos);
      setTipos(resTipos);
      setPersonas(resPersonas);
      setNiveis(resNiveis);
      setApiConectada(true);

      // Preenche a config só onde ainda está vazia — cobre o caso de a primeira carga ter
      // falhado (backend subiu depois) sem nunca sobrescrever uma seleção que o usuário já
      // fez (módulo/persona escolhidos não devem voltar pro primeiro da lista ao retornar
      // de Configurações).
      setConfig(prev => ({
        moduloId: prev.moduloId || resModulos[0]?.id || '',
        tipoComandoId: prev.tipoComandoId || resTipos[0]?.id || '',
        personaId: prev.personaId || resPersonas[0]?.id || '',
        nivelTecnicoId: prev.nivelTecnicoId || resNiveis[0]?.id || ''
      }));

      if (isCargaInicial) {
        setMessages([{ role: 'assistant', content: '**Servidor conectado.** Selecione os parâmetros e sincronize o script para começar.' }]);
      }
    } catch (error) {
      console.error("Falha na conexão:", error);
      setApiConectada(false);
      if (isCargaInicial) {
        setMessages([{ role: 'assistant', content: '**Erro de conexão.** Verifique se o servidor está ativo em http://localhost:8080.' }]);
      }
    }
  };

  useEffect(() => { fetchConfiguracoes(true); }, []);

  useEffect(() => {
    setIsSynced(false);
  }, [memo, config.moduloId, config.tipoComandoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Devolve o foco pra caixa de digitação assim que a resposta chega (isLoading volta a
  // false) — sem isso o usuário precisa clicar de novo no campo pra continuar digitando,
  // já que o textarea fica desabilitado (e perde o foco) enquanto isLoading é true.
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  // --- HANDLERS ---
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  // Mesma coisa que handleConfigChange, mas já recolhe o campo depois de escolher —
  // usado nos selects do painel colapsável (memo/textarea não usa isso, senão fecharia
  // a cada tecla digitada).
  const handleConfigChangeAndClose = (e) => {
    handleConfigChange(e);
    setCampoAberto(null);
  };

  const handleOrigemChange = (e) => {
    setOrigemModelo(e.target.value);
    setCampoAberto(null);
  };

  // --- VALORES EXIBIDOS NAS LINHAS COLAPSADAS ---
  const nomeModulo = modulos.find(m => String(m.id) === String(config.moduloId))?.nome || '—';
  const nomeTipo = tipos.find(t => String(t.id) === String(config.tipoComandoId))?.nome || '—';
  const nomePersona = persona.find(p => String(p.id) === String(config.personaId))?.nome || '—';
  const nomeNivel = niveis.find(n => String(n.id) === String(config.nivelTecnicoId))?.nome || '—';
  const nomeOrigem = origemModelo === 'CLOUD' ? 'Nuvem (provedor configurado)' : 'Local (Ollama)';
  const memoPreview = memo.trim() ? (memo.length > 44 ? memo.slice(0, 44) + '…' : memo) : 'Nenhum script definido';

  const handleSincronizarMotor = async () => {
    setIsLoading(true);
    try {
      await fetch(`${COMANDOS_URL}/1/reset`, { method: 'DELETE' });
      setMessages([{
        role: 'assistant',
        content: '**Parâmetros sincronizados.** O histórico foi limpo e o novo contexto foi definido como prioridade.'
      }]);
      setIsSynced(true);
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopiarMensagem = async (conteudo, index) => {
    try {
      await navigator.clipboard.writeText(conteudo);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((atual) => (atual === index ? null : atual)), 1500);
    } catch (error) {
      console.error("Erro ao copiar mensagem:", error);
    }
  };

  // Feedback empírico (ver docs/base-de-experiencias-estrategia.md) — confirmadoPor fica em
  // branco de propósito, não há login no sistema; a experiência já registra o id, não precisa
  // de mais fricção pro usuário confirmar se ajudou ou não.
  const handleFeedbackExperiencia = async (experienciaId, funcionou) => {
    setFeedbackEnviado(prev => ({ ...prev, [experienciaId]: 'enviando' }));
    try {
      await fetch(`${COMANDOS_URL.replace('/comandos', '/experiencias')}/${experienciaId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmadoPor: '', funcionou })
      });
      setFeedbackEnviado(prev => ({ ...prev, [experienciaId]: funcionou ? 'ajudou' : 'nao-ajudou' }));
    } catch (error) {
      console.error("Erro ao registrar feedback:", error);
      setFeedbackEnviado(prev => ({ ...prev, [experienciaId]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isSynced) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const diagnostico = await fetchJSON(`${COMANDOS_URL}/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comandoId: 1,
          moduloId: config.moduloId,
          tipoComandoId: config.tipoComandoId,
          personaId: config.personaId,
          nivelTecnicoId: config.nivelTecnicoId,
          conteudoMemo: memo,
          perguntaUsuario: userMsg,
          origemModelo
        })
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: diagnostico.causaProvavel,
        experienciasCitadas: diagnostico.experienciasCitadas || []
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Erro:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERIZAÇÃO DE MARKDOWN ---
  const renderMessageContent = (content) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <div className="my-3 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <div className="bg-slate-900 text-[10px] text-slate-500 px-3 py-1.5 flex justify-between items-center border-b border-slate-800 uppercase tracking-wide">
                  <span>{match ? match[1] : 'SQL'}</span>
                  <Code2 size={12} />
                </div>
                <pre className="p-3 text-sm text-indigo-300 overflow-x-auto font-mono">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 text-[13px]" {...props}>
                {children}
              </code>
            )
          },
          table: ({children}) => (
            <div className="my-4 overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({children}) => <thead className="bg-slate-900 text-slate-200">{children}</thead>,
          th: ({children}) => <th className="p-2 border border-slate-800 font-medium">{children}</th>,
          td: ({children}) => <td className="p-2 border border-slate-800">{children}</td>,
          ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-1">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-1">{children}</ol>,
          p: ({children}) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  // --- RENDERIZAÇÃO CONDICIONAL DE TELA ---
  if (tela === 'configuracao') {
    return (
      <ConfiguracaoPage
        onVoltar={() => {
          setTela('chat');
          fetchConfiguracoes();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-300 font-sans overflow-hidden">
      <aside className={`${sidebarAberto ? 'w-80' : 'w-16'} bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-200`}>

        <div className={`border-b border-slate-800 ${sidebarAberto ? 'p-6' : 'p-3'}`}>
          <div className={`flex items-center ${sidebarAberto ? 'gap-3' : 'flex-col gap-2'}`}>
            <div className="shrink-0 relative">
              <IconeExplicaAi size={38} />
              <span
                title={apiConectada ? 'Conectado ao servidor' : 'Sem conexão com o servidor'}
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${apiConectada ? 'bg-emerald-500' : 'bg-red-500'}`}
              ></span>
            </div>
            {sidebarAberto && (
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-white tracking-tight">Explica Aí</h1>
                <p className="text-xs text-slate-500">Motor de Conhecimento Operacional</p>
              </div>
            )}
            <button
              onClick={() => setTela('configuracao')}
              title="Configurações"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={toggleSidebar}
              title={sidebarAberto ? 'Recolher menu' : 'Expandir menu'}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {sidebarAberto ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {sidebarAberto && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="space-y-2">
            <h2 className="text-xs font-medium text-slate-500 flex items-center gap-2 px-1">
              <Cpu size={13} /> Contexto
            </h2>
            <div className="space-y-2">
              <CampoColapsavel label="Módulo do sistema" valor={nomeModulo} aberto={campoAberto === 'modulo'} onToggle={() => toggleCampo('modulo')}>
                <select name="moduloId" value={config.moduloId} onChange={handleConfigChangeAndClose} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors">
                  {modulos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </CampoColapsavel>
              <CampoColapsavel label="Tipo de instrução" valor={nomeTipo} aberto={campoAberto === 'tipo'} onToggle={() => toggleCampo('tipo')}>
                <select name="tipoComandoId" value={config.tipoComandoId} onChange={handleConfigChangeAndClose} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors">
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </CampoColapsavel>
            </div>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="text-xs font-medium text-slate-500 flex items-center gap-2 px-1">
              <Settings size={13} /> Atendimento
            </h2>
            <div className="space-y-2">
              <CampoColapsavel label="Persona da IA" valor={nomePersona} aberto={campoAberto === 'persona'} onToggle={() => toggleCampo('persona')}>
                <select name="personaId" value={config.personaId} onChange={handleConfigChangeAndClose} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors">
                  {persona.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </CampoColapsavel>
              <CampoColapsavel label="Nível de resposta" valor={nomeNivel} aberto={campoAberto === 'nivel'} onToggle={() => toggleCampo('nivel')}>
                <select name="nivelTecnicoId" value={config.nivelTecnicoId} onChange={handleConfigChangeAndClose} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors">
                  {niveis.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
                </select>
              </CampoColapsavel>
              <CampoColapsavel label="Origem do modelo" valor={nomeOrigem} aberto={campoAberto === 'origem'} onToggle={() => toggleCampo('origem')}>
                <select
                  value={origemModelo}
                  onChange={handleOrigemChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors"
                >
                  <option value="CLOUD">Nuvem (provedor configurado)</option>
                  <option value="LOCAL">Local (Ollama)</option>
                </select>
              </CampoColapsavel>
            </div>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="text-xs font-medium text-slate-500 flex items-center gap-2 px-1">
              <Code2 size={13} /> Script SQL
            </h2>
            <CampoColapsavel label="Script SQL (memo)" valor={memoPreview} aberto={campoAberto === 'memo'} onToggle={() => toggleCampo('memo')}>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none outline-none transition-colors"
              />
            </CampoColapsavel>
          </section>
        </div>
        )}
        {!sidebarAberto && <div className="flex-1" />}

        <div className={`border-t border-slate-800 ${sidebarAberto ? 'p-5' : 'p-3'}`}>
          <button
            onClick={handleSincronizarMotor}
            disabled={isLoading}
            title={isSynced ? 'Sincronizado' : 'Sincronizar novo script'}
            className={`w-full flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${sidebarAberto ? 'py-2.5' : 'py-2'} ${
              isSynced
              ? 'bg-slate-800/60 text-slate-500 cursor-default border border-slate-800'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            {sidebarAberto && (isSynced ? "Sincronizado" : "Sincronizar novo script")}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {messages.map((msg, index) => (
            <div key={index} className={`group flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <IconeExplicaAi size={28} />
                </div>
              )}
              <div className="flex flex-col gap-1" style={{ maxWidth: '85%' }}>
                <div className={`p-5 rounded-2xl text-sm ${
                  msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none'
                }`}>
                  {renderMessageContent(msg.content)}
                </div>
                {msg.role === 'assistant' && msg.experienciasCitadas?.length > 0 && (() => {
                  const experienciaId = msg.experienciasCitadas[0];
                  const status = feedbackEnviado[experienciaId];
                  if (status === 'ajudou' || status === 'nao-ajudou') {
                    return (
                      <p className="self-start px-2 py-1 text-xs text-slate-500">
                        {status === 'ajudou' ? 'Valeu, obrigado pelo retorno!' : 'Obrigado — vamos rever esse relato.'}
                      </p>
                    );
                  }
                  return (
                    <div className="self-start flex items-center gap-2 px-1">
                      <span className="text-xs text-slate-600">Esse relato de experiência ajudou?</span>
                      <button
                        onClick={() => handleFeedbackExperiencia(experienciaId, true)}
                        disabled={status === 'enviando'}
                        className="px-2 py-1 rounded-md text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        Isso me ajudou
                      </button>
                      <button
                        onClick={() => handleFeedbackExperiencia(experienciaId, false)}
                        disabled={status === 'enviando'}
                        className="px-2 py-1 rounded-md text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        Não se aplicou
                      </button>
                    </div>
                  );
                })()}
                <button
                  onClick={() => handleCopiarMensagem(msg.content, index)}
                  title="Copiar mensagem"
                  className={`flex items-center gap-1 ${msg.role === 'user' ? 'self-end' : 'self-start'} px-2 py-1 rounded-md text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity`}
                >
                  {copiedIndex === index ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                </button>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto items-center">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <IconeExplicaAi size={28} />
              </div>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-gradient-to-t from-slate-950 to-transparent">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
            <div className={`flex-1 bg-slate-900 border rounded-xl overflow-hidden transition-colors duration-200 ${
              !isSynced ? 'border-amber-600/50' : 'border-slate-800 focus-within:border-indigo-500'
            }`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
                disabled={!apiConectada || isLoading || !isSynced}
                placeholder={!isSynced ? "Sincronize o novo script no painel lateral..." : "Digite aqui sua dúvida técnica..."}
                className="w-full bg-transparent text-slate-200 p-4 resize-none h-14 outline-none placeholder-slate-600 text-sm disabled:opacity-40"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isSynced}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-6 rounded-xl transition-colors active:scale-95 flex items-center justify-center"
            >
              <Send size={19} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
