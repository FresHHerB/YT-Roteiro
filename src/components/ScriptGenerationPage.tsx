import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Mic, 
  ArrowLeft, 
  Settings, 
  Wand2, 
  Loader2, 
  CheckCircle,
  X,
  RefreshCw,
  Video,
  Bot,
  Sparkles,
  Play,
  Square,
  Copy,
  Download
} from 'lucide-react';

interface Channel {
  id: number;
  nome_canal: string;
  prompt_roteiro: string;
  prompt_titulo: string;
  created_at: string;
  voz_prefereida?: number;
  media_chars?: number;
}

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma?: string;
  genero?: string;
  preview_url?: string;
  created_at: string;
}

interface ScriptGenerationPageProps {
  user: any;
  onBack: () => void;
}

const ScriptGenerationPage: React.FC<ScriptGenerationPageProps> = ({ user, onBack }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [scriptIdea, setScriptIdea] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('Sonnet-4');
  const [language, setLanguage] = useState('Português');
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptCharCount, setScriptCharCount] = useState<number>(0);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [mediaChars, setMediaChars] = useState<string>('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);

  // Voice test state
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceTestError, setVoiceTestError] = useState<string>('');

  const modelOptions = [
    { value: 'Sonnet-4', label: 'Sonnet-4', icon: Sparkles },
    { value: 'GPT-5', label: 'GPT-5', icon: Bot },
    { value: 'GPT-4.1-mini', label: 'GPT-4.1-mini', icon: Bot },
    { value: 'Gemini-2.5-Pro', label: 'Gemini-2.5-Pro', icon: Wand2 },
    { value: 'Gemini-2.5-Flash', label: 'Gemini-2.5-Flash', icon: Wand2 }
  ];

  useEffect(() => {
    loadChannels();
    loadVoices();
  }, []);

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    
    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });

    audio.addEventListener('error', () => {
      setPlayingAudio(null);
      setModalMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setModalMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });
  };

  const pauseAudio = () => {
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
      setPlayingAudio(null);
    }
  };

  const isAudioPlaying = (audioId: string) => {
    return playingAudio?.id === audioId;
  };

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
        if (!data || data.length === 0) {
          setMessage({ type: 'error', text: 'Nenhum canal encontrado. Crie um canal primeiro na página de treinamento.' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .order('nome_voz', { ascending: true });

      if (error) {
        console.error('Erro ao carregar vozes:', error);
      } else {
        setVoices(data || []);
      }
    } catch (err) {
      console.error('Erro de conexão ao carregar vozes:', err);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleChannelSelect = (channelId: number) => {
    const channel = channels.find(c => c.id === channelId);
    setSelectedChannelId(channelId);
    setSelectedChannel(channel || null);
    setMessage(null);
  };

  const openSettingsModal = () => {
    if (!selectedChannel) return;
    
    setEditedPrompt(selectedChannel.prompt_roteiro || '');
    setSelectedVoiceId(selectedChannel.voz_prefereida || null);
    setMediaChars(selectedChannel.media_chars?.toString() || '');
    setModalMessage(null);
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
    setEditedPrompt('');
    setSelectedVoiceId(null);
    setMediaChars('');
    setModalMessage(null);
  };

  const updateChannelSettings = async () => {
    if (!selectedChannel) return;

    setIsUpdatingSettings(true);
    setModalMessage(null);
    try {
      const updateData: any = {
        prompt_roteiro: editedPrompt
      };

      if (selectedVoiceId !== null) {
        updateData.voz_prefereida = selectedVoiceId;
      }

      if (mediaChars.trim()) {
        const parsedMediaChars = parseFloat(mediaChars);
        if (!isNaN(parsedMediaChars)) {
          updateData.media_chars = parsedMediaChars;
        }
      }

      const { error: updateError } = await supabase
        .from('canais')
        .update(updateData)
        .eq('id', selectedChannel.id);

      if (updateError) {
        throw new Error('Erro ao atualizar configurações do canal');
      }

      // Update local state
      setSelectedChannel(prev => prev ? {
        ...prev,
        prompt_roteiro: editedPrompt,
        voz_prefereida: selectedVoiceId || prev.voz_prefereida,
        media_chars: mediaChars ? parseFloat(mediaChars) : prev.media_chars
      } : null);
      
      setModalMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
      loadChannels(); // Refresh the channels list
    } catch (err) {
      setModalMessage({ type: 'error', text: 'Erro ao atualizar configurações. Tente novamente.' });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const generateScript = async () => {
    if (!selectedChannel || !scriptIdea.trim()) {
      setMessage({ type: 'error', text: 'Selecione um canal e digite uma ideia para o roteiro.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setGeneratedScript('');
    setScriptCharCount(0);

    try {
      const payload = {
        id_canal: selectedChannel.id,
        nome_canal: selectedChannel.nome_canal,
        ideia_roteiro: scriptIdea,
        modelo: selectedModel,
        idioma: language
      };

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarRoteiro2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result && result.output) {
          setGeneratedScript(result.output);
          setScriptCharCount(result.cont_chars || 0);
          setMessage({ type: 'success', text: 'Roteiro gerado com sucesso!' });
        } else {
          console.error('Resposta inesperada:', result);
          throw new Error('Resposta inválida do servidor');
        }
        
        // Clear the idea input after successful generation
        setScriptIdea('');
      } else {
        const errorText = await response.text();
        console.error('Erro HTTP:', response.status, errorText);
        throw new Error('Falha na geração do roteiro');
      }
    } catch (error) {
      console.error('Erro completo:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar roteiro. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const getSelectedVoicePreviewUrl = () => {
    if (!selectedVoiceId) return null;
    const voice = voices.find(v => v.id === selectedVoiceId);
    return voice?.preview_url || null;
  };

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
      // Get voice data
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Voz não encontrada');
      }

      // Get API key for the platform
      const { data: apisData } = await supabase
        .from('apis')
        .select('*')
        .eq('plataforma', voice.plataforma)
        .single();

      if (!apisData) {
        throw new Error(`API key não encontrada para ${voice.plataforma}`);
      }

      const testText = "Olá! Este é um teste de voz para verificar a qualidade e o som desta voz artificial.";

      if (voice.plataforma === 'ElevenLabs') {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apisData.api_key
          },
          body: JSON.stringify({
            text: testText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);

      } else if (voice.plataforma === 'Fish-Audio') {
        // Para Fish-Audio, buscamos os dados do modelo para obter o sample de áudio
        const response = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apisData.api_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro Fish-Audio: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    const audioId = `voice-preview-${selectedVoiceId}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setIsTestingVoice(true);
    setVoiceTestError('');

    generateVoiceTest(selectedVoiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
      })
      .finally(() => {
        setIsTestingVoice(false);
      });
  };

  const playSelectedVoicePreviewOld = () => {
    // Fallback method using preview_url if available
    const previewUrl = getSelectedVoicePreviewUrl();
    if (previewUrl && selectedVoiceId) {
      const audioId = `voice-preview-${selectedVoiceId}`;
      if (isAudioPlaying(audioId)) {
        pauseAudio();
      } else {
        playAudio(previewUrl, audioId);
      }
    } else if (selectedVoiceId) {
      // If no preview URL, generate audio in real-time
      playSelectedVoicePreview();
    }
  };

  const copyToClipboard = async () => {
    if (editedPrompt) {
      try {
        await navigator.clipboard.writeText(editedPrompt);
        setModalMessage({ type: 'success', text: 'Prompt copiado para a área de transferência!' });
      } catch (err) {
        setModalMessage({ type: 'error', text: 'Erro ao copiar prompt.' });
      }
    }
  };

  const downloadPrompt = () => {
    if (editedPrompt && selectedChannel) {
      const blob = new Blob([editedPrompt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-${selectedChannel.nome_canal}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-white">
                  Gerar Roteiro e Áudio
                </h1>
                <p className="text-sm text-gray-400">
                  Crie narrações com vozes de IA
                </p>
              </div>
            </div>
            <button
              onClick={loadChannels}
              disabled={isLoadingChannels}
              className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingChannels ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Message Display */}
        {message && (
          <div className={`mb-8 p-4 rounded-xl text-center border ${
            message.type === 'success' 
              ? 'bg-green-900/20 text-green-400 border-green-800' 
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Channel Selector */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Selecionar Canal</h2>
              <p className="text-gray-400 text-sm">Escolha o canal para gerar o roteiro</p>
            </div>
            
            {isLoadingChannels ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando canais...</span>
                </div>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhum canal encontrado</h3>
                <p className="text-gray-400">Crie um canal primeiro na página de treinamento</p>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedChannelId || ''}
                  onChange={(e) => handleChannelSelect(parseInt(e.target.value))}
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white text-center text-lg"
                >
                  <option value="">Selecione um canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.nome_canal}
                    </option>
                  ))}
                </select>

                {/* Settings Button */}
                {selectedChannel && (
                  <div className="flex justify-center">
                    <button
                      onClick={openSettingsModal}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Configurações Gerais</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language Input */}
          <div className="mb-8">
            <label className="block text-white text-sm font-medium mb-3">
              Idioma
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Ex: Português, English, Español..."
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Script Idea Input */}
          {selectedChannel && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Sua Nova Ideia</h2>
                <p className="text-gray-400 text-sm">Descreva sua ideia para o roteiro do canal "{selectedChannel.nome_canal}"</p>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={scriptIdea}
                  onChange={(e) => setScriptIdea(e.target.value)}
                  placeholder="Escreva aqui sua nova ideia..."
                  className="w-full h-40 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                />
                <div className="text-xs text-gray-400">
                  {scriptIdea.length.toLocaleString()} caracteres
                </div>
              </div>
            </div>
          )}

          {/* Model Selection */}
          {selectedChannel && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Modelo de IA</h2>
                <p className="text-gray-400 text-sm">Escolha o modelo para gerar seu roteiro</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {modelOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedModel(option.value)}
                      className={`p-4 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        selectedModel === option.value
                          ? 'bg-orange-900/30 border-orange-500 text-orange-400'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <IconComponent className="w-6 h-6" />
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {selectedChannel && (
            <div className="flex justify-center">
              <button
                onClick={generateScript}
                disabled={!scriptIdea.trim() || isGenerating}
                className={`
                  flex items-center space-x-3 px-12 py-4 rounded-xl font-medium transition-all duration-300 transform
                  ${!scriptIdea.trim() || isGenerating
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                    : 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Gerando Roteiro...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6" />
                    <span>Gerar Roteiro e Áudio</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generated Script Display */}
      {generatedScript && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-light text-white">Roteiro Gerado</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>{scriptCharCount.toLocaleString()} caracteres</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedScript)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedScript], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `roteiro-${selectedChannel?.nome_canal || 'script'}-${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Canal: {selectedChannel?.nome_canal}</p>
            </div>
            
            <div className="bg-black/50 rounded-xl border border-gray-700 p-6">
              <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                {generatedScript}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedChannel && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeSettingsModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Configurações do canal "{selectedChannel.nome_canal}"</h2>
                </div>
              </div>
              <button
                onClick={closeSettingsModal}
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
                  value={selectedChannel.nome_canal}
                  readOnly
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white cursor-not-allowed opacity-75"
                />
              </div>

              {/* Editable Prompt Content */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">
                  Conteúdo do Prompt
                </label>
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full h-80 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                  placeholder="Conteúdo do prompt..."
                />
                <div className="text-xs text-gray-400">
                  {editedPrompt.length.toLocaleString()} caracteres
                </div>
              </div>

              {/* Voice Preference and Media Characters - Same Line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voice Preference */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Voz Preferida
                  </label>
                  {isLoadingVoices ? (
                    <div className="flex items-center space-x-2 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-400 text-sm">Carregando vozes...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedVoiceId || ''}
                      onChange={(e) => setSelectedVoiceId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                    >
                      <option value="">Selecione uma voz</option>
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.nome_voz} - {voice.plataforma}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="text-xs text-gray-400">
                    Voz que será usada para gerar áudios deste canal
                  </div>
                  
                  {/* Voice Preview Button */}
                  {selectedVoiceId && (
                    <div className="mt-2">
                      {voiceTestError && (
                        <p className="text-xs text-red-400 mb-2">
                          {voiceTestError}
                        </p>
                      )}
                      <button
                        onClick={playSelectedVoicePreview}
                        disabled={isTestingVoice}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          isTestingVoice
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isAudioPlaying(`voice-preview-${selectedVoiceId}`)
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isTestingVoice ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Carregando...</span>
                          </>
                        ) : isAudioPlaying(`voice-preview-${selectedVoiceId}`) ? (
                          <>
                            <Square className="w-4 h-4" />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Testar Voz</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Media Characters */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Média de Caracteres
                  </label>
                  <input
                    type="number"
                    value={mediaChars}
                    onChange={(e) => setMediaChars(e.target.value)}
                    placeholder="Ex: 1500"
                    min="0"
                    step="1"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                  <div className="text-xs text-gray-400">
                    Número médio de caracteres dos roteiros deste canal
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
                  onClick={closeSettingsModal}
                  className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={updateChannelSettings}
                  disabled={isUpdatingSettings}
                  className={`
                    flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                    ${isUpdatingSettings
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  {isUpdatingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Atualizar Configurações</span>
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

export default ScriptGenerationPage;