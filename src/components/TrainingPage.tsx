import React, { useState } from 'react';
import { 
  BookOpen, 
  Upload, 
  Type, 
  X, 
  Wand2, 
  Loader2, 
  FileText, 
  ArrowLeft,
  Bot,
  Sparkles,
  CheckCircle,
  Copy,
  Download,
  Edit3,
  Mic,
  Settings
} from 'lucide-react';
import { ScriptData, TrainingData } from '../types';
import { PageType } from '../App';

interface TrainingPageProps {
  user: any;
  onBack: () => void;
  onNavigate?: (page: PageType) => void;
}

const TrainingPage: React.FC<TrainingPageProps> = ({ user, onBack, onNavigate }) => {
  const [trainingData, setTrainingData] = useState<TrainingData>({
    channelName: '',
    scripts: {
      script1: { text: '', file: null, type: 'text', title: '' },
      script2: { text: '', file: null, type: 'text', title: '' },
      script3: { text: '', file: null, type: 'text', title: '' },
    },
    model: 'GPT-5'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptData, setPromptData] = useState<{ 
    channelName: string; 
    prompt_titulo: string; 
    prompt_roteiro: string; 
  } | null>(null);
  const [editedTitlePrompt, setEditedTitlePrompt] = useState('');
  const [editedScriptPrompt, setEditedScriptPrompt] = useState('');
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateScript = (scriptKey: keyof TrainingData['scripts'], data: Partial<ScriptData>) => {
    setTrainingData(prev => ({
      ...prev,
      scripts: {
        ...prev.scripts,
        [scriptKey]: { ...prev.scripts[scriptKey], ...data }
      }
    }));
  };

  const handleSubmit = async () => {
    if (!trainingData.channelName.trim()) {
      setMessage({ type: 'error', text: 'Por favor, preencha o nome do canal.' });
      return;
    }

    const hasContent = Object.values(trainingData.scripts).some(script => 
      script.text.trim() || script.file
    );

    if (!hasContent) {
      setMessage({ type: 'error', text: 'Por favor, adicione pelo menos um roteiro.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
          reader.readAsText(file);
        });
      };

      const getScriptContent = async (script: ScriptData): Promise<string> => {
        if (script.type === 'text') {
          return script.text;
        } else if (script.file) {
          try {
            return await readFileContent(script.file);
          } catch (error) {
            console.error("Error reading file:", error);
            return '';
          }
        }
        return '';
      };

      const script1Content = await getScriptContent(trainingData.scripts.script1);
      const script2Content = await getScriptContent(trainingData.scripts.script2);
      const script3Content = await getScriptContent(trainingData.scripts.script3);

      const payload = {
        nomeCanal: trainingData.channelName,
        titulo1: trainingData.scripts.script1.title,
        roteiro1: script1Content,
        titulo2: trainingData.scripts.script2.title,
        roteiro2: script2Content,
        titulo3: trainingData.scripts.script3.title,
        roteiro3: script3Content,
        modelo: trainingData.model
      };

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/guiaRoteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const responseData = result[0] || {};
        const titlePrompt = responseData.prompt_titulo || 'Prompt de título não encontrado';
        const scriptPrompt = responseData.prompt_roteiro || 'Prompt de roteiro não encontrado';
        
        setPromptData({ 
          channelName: trainingData.channelName, 
          prompt_titulo: titlePrompt,
          prompt_roteiro: scriptPrompt
        });
        setEditedTitlePrompt(titlePrompt);
        setEditedScriptPrompt(scriptPrompt);
        setShowPromptModal(true);
        setModalMessage(null);
        setMessage({ type: 'success', text: 'Treinamento enviado com sucesso!' });
        
        // Reset form
        setTrainingData({
          channelName: '',
          scripts: {
            script1: { text: '', file: null, type: 'text', title: '' },
            script2: { text: '', file: null, type: 'text', title: '' },
            script3: { text: '', file: null, type: 'text', title: '' },
          },
          model: 'GPT-5'
        });
      } else {
        throw new Error('Falha no envio do treinamento');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao enviar treinamento. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePromptInDatabase = async () => {
    if (!promptData) return;

    setIsUpdatingPrompt(true);
    setModalMessage(null);
    try {
      const payload = {
        nome_canal: promptData.channelName,
        prompt_titulo: editedTitlePrompt,
        prompt_roteiro: editedScriptPrompt
      };

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/updatePromptRoteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setModalMessage({ type: 'success', text: 'Prompt atualizado com sucesso!' });
      } else {
        throw new Error('Falha na atualização do prompt');
      }
    } catch (err) {
      setModalMessage({ type: 'error', text: 'Erro ao atualizar prompt. Tente novamente.' });
    } finally {
      setIsUpdatingPrompt(false);
    }
  };

  const copyToClipboard = async () => {
    const combinedPrompts = `=== PROMPT DE TÍTULO ===\n${editedTitlePrompt}\n\n=== PROMPT DE ROTEIRO ===\n${editedScriptPrompt}`;
    if (combinedPrompts) {
      try {
        await navigator.clipboard.writeText(combinedPrompts);
        setModalMessage({ type: 'success', text: 'Prompts copiados para a área de transferência!' });
      } catch (err) {
        setModalMessage({ type: 'error', text: 'Erro ao copiar prompts.' });
      }
    }
  };

  const downloadPrompt = () => {
    const combinedPrompts = `=== PROMPT DE TÍTULO ===\n${editedTitlePrompt}\n\n=== PROMPT DE ROTEIRO ===\n${editedScriptPrompt}`;
    if (combinedPrompts) {
      const blob = new Blob([combinedPrompts], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-${promptData?.channelName || 'roteiro'}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const modelOptions = [
    { value: 'GPT-5', label: 'GPT-5', icon: Bot },
    { value: 'GPT-4.1-mini', label: 'GPT-4.1-mini', icon: Bot },
    { value: 'Sonnet-4', label: 'Sonnet-4', icon: Sparkles },
    { value: 'Gemini-2.5-Pro', label: 'Gemini-2.5-Pro', icon: Wand2 }
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between w-full">
            {/* Left Section: Back button + Page title */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-white">
                  Treinar Canal
                </h1>
                <p className="text-sm text-gray-400">
                  Analise e replique a estrutura de canais existentes
                </p>
              </div>
            </div>
            
            {/* Center Section: Navigation Icons */}
            <div className="flex items-center space-x-2 flex-1 justify-center max-w-md">
              <button
                onClick={() => onNavigate && onNavigate('training')}
                className="p-2 text-blue-400 bg-blue-900/30 rounded-lg transition-all duration-200"
                title="Treinar Canal"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate && onNavigate('prompts')}
                className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-900/30 rounded-lg transition-all duration-200"
                title="Revisar/Editar Conteúdo"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate && onNavigate('generate')}
                className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-lg transition-all duration-200"
                title="Gerar Roteiro e Áudio"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate && onNavigate('settings')}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-all duration-200"
                title="Configurações Gerais"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            {/* Right Section: Settings + User info */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <button
                onClick={() => onNavigate && onNavigate('settings')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-white text-sm font-medium">{user.email}</div>
                  <div className="text-gray-400 text-xs">Admin</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {/* Channel Name */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Configuração do Canal</h2>
              <p className="text-gray-400 text-sm">Defina o nome do seu canal para personalizar o treinamento</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Nome do Canal
              </label>
              <input
                type="text"
                value={trainingData.channelName}
                onChange={(e) => setTrainingData(prev => ({ ...prev, channelName: e.target.value }))}
                placeholder="Ex: Meu Canal de Tecnologia"
                className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Scripts Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-light text-white mb-2">Roteiros de Referência</h2>
              <p className="text-gray-400 text-sm">Adicione até 3 roteiros para treinar o modelo com seu estilo</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(trainingData.scripts).map(([key, script], index) => (
                <ScriptInputCard
                  key={key}
                  title={`Roteiro ${index + 1}`}
                  script={script}
                  onUpdate={(data) => updateScript(key as keyof TrainingData['scripts'], data)}
                />
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Modelo de IA</h2>
              <p className="text-gray-400 text-sm">Escolha o modelo que melhor se adapta ao seu estilo</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {modelOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTrainingData(prev => ({ ...prev, model: option.value }))}
                    className={`p-6 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                      trainingData.model === option.value
                        ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                        : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <IconComponent className="w-8 h-8" />
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!trainingData.channelName.trim() || isLoading}
              className={`
                flex items-center space-x-3 px-12 py-4 rounded-xl font-medium transition-all duration-300 transform
                ${!trainingData.channelName.trim() || isLoading
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                  : 'bg-white text-black hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processando Treinamento...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Iniciar Treinamento</span>
                </>
              )}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`max-w-md mx-auto p-4 rounded-xl text-center border ${
              message.type === 'success' 
                ? 'bg-green-900/20 text-green-400 border-green-800' 
                : 'bg-red-900/20 text-red-400 border-red-800'
            }`}>
              <span className="font-medium">{message.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Edit Modal */}
      {showPromptModal && promptData && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setShowPromptModal(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col"
            className="bg-gray-900 rounded-2xl border border-gray-700 w-[80%] h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Prompts Gerados com Sucesso!</h2>
                  <p className="text-green-400 text-sm">Edite e salve seus prompts personalizados</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              {/* Success Message */}
              {modalMessage && (
                <div className={`p-4 rounded-xl text-center border ${
                  modalMessage.type === 'success' 
                    ? 'bg-green-900/20 text-green-400 border-green-800' 
                    : 'bg-red-900/20 text-red-400 border-red-800'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    {modalMessage.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    <span className="font-medium">{modalMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Channel Name (Read-only) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">
                  Nome do Canal
                </label>
                <input
                  type="text"
                  value={promptData.channelName}
                  readOnly
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white cursor-not-allowed opacity-75"
                />
              </div>

              {/* Split Layout for Both Prompts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Title Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <label className="block text-sm font-medium text-gray-300">
                      Prompt de Título
                    </label>
                  </div>
                  <textarea
                    value={editedTitlePrompt}
                    onChange={(e) => setEditedTitlePrompt(e.target.value)}
                    className="w-full h-64 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                    placeholder="Prompt para geração de títulos..."
                  />
                  <div className="text-xs text-gray-400">
                    {editedTitlePrompt.length.toLocaleString()} caracteres
                  </div>
                </div>

                {/* Script Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <label className="block text-sm font-medium text-gray-300">
                      Prompt de Roteiro
                    </label>
                  </div>
                  <textarea
                    value={editedScriptPrompt}
                    onChange={(e) => setEditedScriptPrompt(e.target.value)}
                    className="w-full h-64 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                    placeholder="Prompt para geração de roteiros..."
                  />
                  <div className="text-xs text-gray-400">
                    {editedScriptPrompt.length.toLocaleString()} caracteres
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-5 border-t border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={downloadPrompt}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={updatePromptInDatabase}
                  disabled={isUpdatingPrompt}
                  className={`
                    flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${isUpdatingPrompt
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  {isUpdatingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Atualizar Prompts</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Script Input Card Component
interface ScriptInputCardProps {
  title: string;
  script: ScriptData;
  onUpdate: (data: Partial<ScriptData>) => void;
}

const ScriptInputCard: React.FC<ScriptInputCardProps> = ({ title, script, onUpdate }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpdate({ file, type: 'file', text: '' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const acceptedTypes = ['.txt', '.doc', '.docx', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (acceptedTypes.includes(fileExtension)) {
        onUpdate({ file, type: 'file', text: '' });
      }
    }
  };

  const clearContent = () => {
    onUpdate({ text: '', file: null, type: 'text', title: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchToText = () => {
    onUpdate({ type: 'text', file: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const switchToFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`bg-gray-800/50 rounded-xl border transition-all duration-300 ${
        isDragOver 
          ? 'border-blue-500 bg-blue-900/20' 
          : 'border-gray-700 hover:border-gray-600'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Card Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white">{title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={switchToText}
              className={`p-2 rounded-lg transition-all duration-200 ${
                script.type === 'text'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}
              title="Texto"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={switchToFile}
              className={`p-2 rounded-lg transition-all duration-200 ${
                script.type === 'file'
                  ? 'bg-blue-900/30 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }`}
              title="Arquivo"
            >
              <Upload className="w-4 h-4" />
            </button>
            {(script.text || script.file) && (
              <button
                onClick={clearContent}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                title="Limpar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Title Field */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-300">
            Título do {title}
          </label>
          <input
            type="text"
            value={script.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Digite o título do roteiro..."
            className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
          />
        </div>

        {script.type === 'text' ? (
          <div className="space-y-3">
            <textarea
              value={script.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Cole o conteúdo do roteiro aqui..."
              className="w-full h-32 p-3 bg-black border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm"
            />
            {script.text && (
              <div className="text-xs text-gray-400">
                {script.text.length} caracteres
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
            />
            
            {script.file ? (
              <div className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{script.file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(script.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={switchToFile}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                  isDragOver
                    ? 'border-blue-400 text-blue-400 bg-blue-900/10'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                }`}
              >
                <Upload className={`w-6 h-6 mb-2 transition-transform duration-300 ${
                  isDragOver ? 'scale-110' : 'hover:scale-110'
                }`} />
                <span className="text-sm font-medium">
                  {isDragOver ? 'Solte o arquivo aqui' : 'Clique ou arraste'}
                </span>
                <span className="text-xs text-gray-500 mt-1">TXT, DOC, DOCX, PDF</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingPage;