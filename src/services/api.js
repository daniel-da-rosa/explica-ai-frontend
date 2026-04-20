import React, { useState, useEffect } from "react";
import { Bot, User, Send, Settings, Code2, BrainCircuit, AlertTriangle, RefreshCw } from "lucide-react";
import { apiService } from "./services/api";

export default function App() {
  // 1. Estados para carregar os combos do Banco de Dados
  const [personas, setPersonas] = useState([]);
  const [niveis, setNiveis] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Estado do Formulário (O Payload que vai pro Spring Boot)
  const [formData, setFormData] = useState({
    mensagemOriginal: "",
    personaId: "",
    nivelTecnicoId: "",
    tipoComandoId: ""
  });

  // 3. Ciclo de Vida: Busca dados do banco assim que a tela abre
  useEffect(() => {
    const carregarDependencias = async () => {
      try {
        const [dadosPersonas, dadosNiveis, dadosTipos] = await Promise.all([
          apiService.buscarPersonas(),
          apiService.buscarNiveisTecnicos(),
          apiService.buscarTiposComando()
        ]);
        
        setPersonas(dadosPersonas);
        setNiveis(dadosNiveis);
        setTipos(dadosTipos);
      } catch (error) {
        console.error("Falha fatal ao carregar combos:", error);
        alert("Erro ao conectar com o banco. O Spring Boot está rodando?");
      } finally {
        setIsLoading(false);
      }
    };

    carregarDependencias();
  }, []);

  // 4. Manipulador de Mudança dos Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 5. Ação de Salvar/Enviar Comando
  const handleSalvarComando = async (e) => {
    e.preventDefault(); // Evita o refresh da página
    
    if (!formData.mensagemOriginal || !formData.personaId || !formData.nivelTecnicoId || !formData.tipoComandoId) {
      alert("Morfético, preencha todos os campos antes de enviar o código ao motor!");
      return;
    }

    try {
      console.log("Enviando Payload:", formData);
      const resultado = await apiService.salvarComando(formData);
      console.log("Sucesso no Backend:", resultado);
      alert("Comando processado com sucesso pela IA!");
      
      // Limpa o script após o envio, mas mantém as configurações
      setFormData(prev => ({ ...prev, mensagemOriginal: "" }));
    } catch (error) {
      console.error("Erro na execução:", error);
      alert("Falha ao salvar comando. Olhe o console (F12) ou o log do DBeaver.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-emerald-500">
        <RefreshCw className="animate-spin w-10 h-10 mr-3" />
        <span className="text-xl font-bold">Iniciando Motor Explica-AI...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-8 flex justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: CONFIGURAÇÕES DA IA (Combos do Banco) */}
        <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-6">
            <Settings className="w-6 h-6 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-100">Parâmetros do Motor</h2>
          </div>

          <form id="ai-form" onSubmit={handleSalvarComando} className="space-y-5">
            {/* Combo: Persona */}
            <div>
              <label className="flex items-center text-sm text-gray-400 mb-2">
                <User className="w-4 h-4 mr-2" /> Persona (Tom)
              </label>
              <select 
                name="personaId" 
                value={formData.personaId} 
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Selecione --</option>
                {personas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            {/* Combo: Nível Técnico */}
            <div>
              <label className="flex items-center text-sm text-gray-400 mb-2">
                <BrainCircuit className="w-4 h-4 mr-2" /> Nível Técnico
              </label>
              <select 
                name="nivelTecnicoId" 
                value={formData.nivelTecnicoId} 
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Selecione --</option>
                {niveis.map(n => (
                  <option key={n.id} value={n.id}>{n.nome}</option>
                ))}
              </select>
            </div>

            {/* Combo: Tipo de Comando */}
            <div>
              <label className="flex items-center text-sm text-gray-400 mb-2">
                <AlertTriangle className="w-4 h-4 mr-2" /> Tipo de Comando
              </label>
              <select 
                name="tipoComandoId" 
                value={formData.tipoComandoId} 
                onChange={handleChange}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Selecione --</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* COLUNA DIREITA: EDITOR DE CÓDIGO PL/SQL */}
        <div className="col-span-2 flex flex-col">
          <div className="flex-grow bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4 mb-4">
              <Code2 className="w-6 h-6 text-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-100">Script / Comando</h2>
            </div>
            
            <textarea
              name="mensagemOriginal"
              value={formData.mensagemOriginal}
              onChange={handleChange}
              placeholder="Cole o script SQL pesado aqui (ex: declare ... begin ... end;)"
              className="flex-grow w-full bg-gray-950 border border-gray-700 rounded-lg p-4 font-mono text-sm text-emerald-400 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              type="submit" 
              form="ai-form"
              className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-emerald-900 transition-all active:scale-95"
            >
              <Bot className="w-5 h-5 mr-2" />
              Processar IA
              <Send className="w-4 h-4 ml-3" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}