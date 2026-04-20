import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Settings, RefreshCw, Code2, Cpu, BrainCircuit } from 'lucide-react';
// Importação das bibliotecas de Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function App() {
  // --- CONFIGURAÇÃO DA API ---
  const DOMINIOS_URL = 'http://localhost:8080/api/dominios';
  const COMANDOS_URL = 'http://localhost:8080/api/comandos';

  // --- ESTADOS DE DADOS ---
  const [modulos, setModulos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [apiConectada, setApiConectada] = useState(false);

  // --- ESTADOS DE CONTROLO ---
  const [config, setConfig] = useState({
    moduloId: '',
    tipoComandoId: '',
    personaId: '',
    nivelTecnicoId: '',
  });

  const [memo, setMemo] = useState(
    'SELECT * FROM FAT_NOTA_FISCAL WHERE STATUS_NFE = \'REJEITADA\' AND CHAVE_ACESSO IS NULL;'
  );
  
  const [isSynced, setIsSynced] = useState(true); 
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Iniciando sistema... Por favor, aguarde a ligação ao banco de dados.' }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- HELPER FETCH ---
  const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    return response.json();
  };

  // --- CARREGAR DOMÍNIOS INICIAIS ---
  const fetchConfiguracoes = async () => {
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

      setConfig({
        moduloId: resModulos[0]?.id || '',
        tipoComandoId: resTipos[0]?.id || '',
        personaId: resPersonas[0]?.id || '',
        nivelTecnicoId: resNiveis[0]?.id || ''
      });

      setMessages([{ role: 'assistant', content: '✅ **Servidor conectado.** Selecione os parâmetros e sincronize o script para começar.' }]);
    } catch (error) {
      console.error("Falha na conexão:", error);
      setApiConectada(false);
      setMessages([{ role: 'assistant', content: '❌ **Erro de Ligação.** Verifique se o Spring Boot está ativo em http://localhost:8080.' }]);
    }
  };

  useEffect(() => { fetchConfiguracoes(); }, []);

  useEffect(() => {
    setIsSynced(false);
  }, [memo, config.moduloId, config.tipoComandoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // --- HANDLERS ---
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  const handleSincronizarMotor = async () => {
    setIsLoading(true);
    try {
      await fetch(`${COMANDOS_URL}/1/reset`, { method: 'DELETE' });
      setMessages([{ 
        role: 'assistant', 
        content: '🚀 **Parâmetros Sincronizados.** O histórico foi limpo e o novo contexto SQL foi definido como prioridade.' 
      }]);
      setIsSynced(true);
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
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
          perguntaUsuario: userMsg
        })
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: diagnostico.causaProvavel }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `**Erro:** ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NOVA FUNÇÃO RENDERIZADORA COM REACT-MARKDOWN ---
  const renderMessageContent = (content) => {
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Renderização customizada de blocos de código
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <div className="my-3 rounded-md overflow-hidden bg-slate-900 border border-slate-700">
                <div className="bg-slate-800 text-[10px] text-slate-400 px-3 py-1 flex justify-between items-center border-b border-slate-700 uppercase">
                  <span>{match ? match[1] : 'SQL'}</span>
                  <Code2 size={12} />
                </div>
                <pre className="p-3 text-sm text-cyan-300 overflow-x-auto font-mono">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-slate-800 px-1 rounded text-cyan-400" {...props}>
                {children}
              </code>
            )
          },
          // Estilização de tabelas Markdown
          table: ({children}) => (
            <div className="my-4 overflow-x-auto border border-slate-700 rounded-lg">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({children}) => <thead className="bg-slate-800 text-white">{children}</thead>,
          th: ({children}) => <th className="p-2 border border-slate-700 font-bold">{children}</th>,
          td: ({children}) => <td className="p-2 border border-slate-700">{children}</td>,
          // Listas
          ul: ({children}) => <ul className="list-disc ml-5 mb-4 space-y-1">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-4 space-y-1">{children}</ol>,
          p: ({children}) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-300 font-sans overflow-hidden">
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2 rounded-lg text-white shadow-lg shadow-cyan-900/20">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">ExplicaAi</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Core Engine v2.0</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="space-y-4">
            <h2 className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
              <Cpu size={14} /> Definição de Contexto
            </h2>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Módulo do Sistema</label>
              <select name="moduloId" value={config.moduloId} onChange={handleConfigChange} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {modulos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Tipo de Instrução</label>
              <select name="tipoComandoId" value={config.tipoComandoId} onChange={handleConfigChange} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-800">
            <h2 className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
              <Settings size={14} /> Atendimento
            </h2>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Persona da IA</label>
              <select name="personaId" value={config.personaId} onChange={handleConfigChange} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {personas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Nível de Resposta</label>
              <select name="nivelTecnicoId" value={config.nivelTecnicoId} onChange={handleConfigChange} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {niveis.map(n => <option key={n.id} value={n.id}>{n.nome}</option>)}
              </select>
            </div>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-2">
              <Code2 size={14} /> Script SQL (Memo)
            </h2>
            <textarea 
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full h-40 bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-cyan-200/60 focus:border-cyan-500 resize-none outline-none"
            />
          </section>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={handleSincronizarMotor}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all shadow-lg ${
              isSynced 
              ? 'bg-slate-800 text-slate-500 cursor-default border border-slate-700' 
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 animate-pulse'
            }`}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            {isSynced ? "Motor Sincronizado" : "Efetivar Novo Script"}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="bg-slate-900/30 border-b border-slate-800 py-2 px-6 flex justify-between items-center text-[10px] font-mono">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiConectada ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
            {apiConectada ? 'CONNECTION: ESTABLISHED' : 'CONNECTION: TERMINATED'}
          </span>
          <span className="text-slate-500">DB: POSTGRESQL | CACHE: REDIS</span>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-5 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-lg">
                  <Bot size={22} className="text-cyan-400" />
                </div>
              )}
              <div className={`p-5 rounded-2xl text-sm shadow-xl ${
                msg.role === 'user' 
                ? 'bg-cyan-700 text-white rounded-tr-none border border-cyan-600' 
                : 'bg-slate-900/80 text-slate-300 border border-slate-800 rounded-tl-none'
              }`} style={{ maxWidth: '85%' }}>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-5 max-w-4xl mx-auto items-center">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 animate-pulse">
                <Bot size={22} className="text-cyan-600" />
              </div>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-gradient-to-t from-slate-950 to-transparent">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-4">
            <div className={`flex-1 bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 ${
              !isSynced ? 'border-amber-600/50 bg-amber-950/5' : 'border-slate-800 focus-within:border-cyan-500'
            }`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
                disabled={!apiConectada || isLoading || !isSynced}
                placeholder={!isSynced ? "⚠️ Sincronize o novo script no painel lateral..." : "Digite aqui sua dúvida técnica..."}
                className="w-full bg-transparent text-slate-200 p-4 resize-none h-14 outline-none placeholder-slate-600 text-sm disabled:opacity-40"
              />
            </div>
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading || !isSynced} 
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white px-8 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}