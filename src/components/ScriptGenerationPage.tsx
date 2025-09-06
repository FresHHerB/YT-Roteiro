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
  const [editedScript, setEditedScript] = useState<string>('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioMessage, setAudioMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedVoiceForAudio, setSelectedVoiceForAudio] = useState<number | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('');
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingGeneratedAudio, setIsPlayingGeneratedAudio] = useState(false);
  const [generatedAudioElement, setGeneratedAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [mediaChars, setMediaChars] = useState<string>('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);

  // Voice test state
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
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
    // Set default voice for audio generation
    setSelectedVoiceForAudio(channel?.voz_prefereida || null);
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
          setEditedScript(result.output);
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

  const generateAudio = async () => {
    if (!editedScript.trim()) {
      setAudioMessage({ type: 'error', text: 'Roteiro não disponível para gerar áudio.' });
      return;
    }

    if (!selectedVoiceForAudio) {
      setAudioMessage({ type: 'error', text: 'Selecione uma voz para gerar o áudio.' });
      return;
    }

    setIsGeneratingAudio(true);
    setAudioMessage(null);
    setGeneratedAudioUrl('');
    setGeneratedAudioBlob(null);

    try {
      // Get voice data
      const voice = voices.find(v => v.id === selectedVoiceForAudio);
      if (!voice) {
        throw new Error('Voz preferida não encontrada');
      }

      const payload = {
        roteiro: editedScript,
        plataforma: voice.plataforma,
        voice_id: voice.voice_id,
        speed: audioSpeed
      };

      console.log('🎵 Enviando payload para geração de áudio:', payload);
      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarAudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type da resposta:', contentType);
      
      if (response.ok) {
        // Verificar se é áudio binário
        if (contentType && (contentType.includes('binary/octet-stream') || contentType.includes('audio'))) {
          console.log('🎵 Resposta é áudio binário, processando...');
          
          // Processar como áudio binário
          const audioBuffer = await response.arrayBuffer();
          console.log('📦 ArrayBuffer obtido, tamanho:', audioBuffer.byteLength, 'bytes');
          
          if (audioBuffer.byteLength === 0) {
            throw new Error('Arquivo de áudio vazio recebido');
          }
          
          // Criar blob do áudio
          const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          console.log('📦 Blob criado, tamanho:', audioBlob.size, 'bytes');
          
          // Criar URL do blob
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('🔗 URL do blob criada:', audioUrl);
          
          setGeneratedAudioUrl(audioUrl);
          setGeneratedAudioBlob(audioBlob);
          console.log('✅ Áudio processado e definido no estado');
          setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
        } else {
          // Tentar processar como JSON (para compatibilidade futura)
          const responseText = await response.clone().text();
          console.log('📝 Response como texto:', responseText.substring(0, 200) + '...');
          
          try {
            const result = JSON.parse(responseText);
            console.log('✅ Response parseado como JSON:', result);
            
            // Extrair URL do áudio de diferentes formatos possíveis
            let audioUrl = null;
            
            if (Array.isArray(result) && result.length > 0) {
              const firstItem = result[0];
              audioUrl = firstItem.response || firstItem.url || firstItem.audio_url;
            } else if (result && typeof result === 'object') {
              audioUrl = result.response || result.url || result.audio_url;
            }
            
            if (audioUrl) {
              console.log('🎵 URL do áudio extraída:', audioUrl);
              setGeneratedAudioUrl(audioUrl);
              setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
            } else {
              throw new Error('URL do áudio não encontrada na resposta JSON');
            }
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse JSON:', parseError);
            throw new Error('Resposta não é JSON válido nem áudio binário');
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Erro HTTP:', response.status, errorText);
        throw new Error('Falha na geração do áudio');
      }
    } catch (error) {
      console.error('💥 Erro completo na geração de áudio:', error);
      setAudioMessage({ type: 'error', text: 'Erro ao gerar áudio. Tente novamente.' });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Controle do áudio gerado
  const playGeneratedAudio = () => {
    if (!generatedAudioUrl) return;

    if (isPlayingGeneratedAudio && generatedAudioElement) {
      // Parar áudio
      generatedAudioElement.pause();
      generatedAudioElement.currentTime = 0;
      setIsPlayingGeneratedAudio(false);
      setGeneratedAudioElement(null);
    } else {
      // Reproduzir áudio
      const audio = new Audio(generatedAudioUrl);
      
      audio.addEventListener('ended', () => {
        setIsPlayingGeneratedAudio(false);
        setGeneratedAudioElement(null);
      });

      audio.addEventListener('error', () => {
        setIsPlayingGeneratedAudio(false);
        setGeneratedAudioElement(null);
        setAudioMessage({ type: 'error', text: 'Erro ao reproduzir áudio gerado' });
      });

      audio.play().then(() => {
        setIsPlayingGeneratedAudio(true);
        setGeneratedAudioElement(audio);
      }).catch(() => {
        setAudioMessage({ type: 'error', text: 'Erro ao reproduzir áudio gerado' });
      });
    }
  };

  const downloadGeneratedAudio = () => {
    if (generatedAudioBlob) {
      // Download direto do blob
      const url = URL.createObjectURL(generatedAudioBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audio-${selectedChannel?.nome_canal || 'roteiro'}-${new Date().toISOString().split('T')[0]}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (generatedAudioUrl) {
      // Fallback para URL externa
      const link = document.createElement('a');
      link.href = generatedAudioUrl;
      link.download = `audio-${selectedChannel?.nome_canal || 'roteiro'}-${new Date().toISOString().split('T')[0]}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyScriptToClipboard = async () => {
    if (editedScript) {
      try {
        await navigator.clipboard.writeText(editedScript);
        setMessage({ type: 'success', text: 'Roteiro copiado para a área de transferência!' });
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao copiar roteiro.' });
      }
    }
  };

  const downloadScript = () => {
    if (editedScript) {
      const blob = new Blob([editedScript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roteiro-${selectedChannel?.nome_canal || 'script'}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
      // Get voice data
      const voice = voices.find(v => v.id === voiceId);
      if (!voice) {
        throw new Error('Voz não encontrada');
      }

      if (voice.plataforma === 'ElevenLabs') {
        // Get API key for ElevenLabs
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Buscar dados da voz para obter o preview_url
        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'xi-api-key': apisData.api_key
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
        }

        const voiceData = await response.json();
        
        // Verifica se há preview_url disponível
        if (!voiceData.preview_url) {
          throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
        }
        
        return voiceData.preview_url;

      } else if (voice.plataforma === 'Fish-Audio') {
        // Get API key for Fish-Audio
        const { data: apisData } = await supabase
          .from('apis')
          .select('*')
          .eq('plataforma', voice.plataforma)
          .single();

        if (!apisData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

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

        const modelData = await response.json();
        
        // Verifica se há samples disponíveis
        if (!modelData.samples || modelData.samples.length === 0) {
          throw new Error('Nenhum sample de áudio disponível para esta voz Fish-Audio');
        }
        
        // Usa o primeiro sample disponível
        const sampleAudioUrl = modelData.samples[0].audio;
        if (!sampleAudioUrl) {
          throw new Error('URL de áudio do sample não encontrada');
        }
        
        return sampleAudioUrl;
      }

      throw new Error('Plataforma não suportada para teste de voz');
    } catch (error) {
      console.error('Erro no generateVoiceTest:', error);
      throw error;
    }
  };

  const testSelectedVoice = () => {
    if (!selectedVoiceForAudio) return;
    
    const audioId = `voice-test-${selectedVoiceForAudio}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(selectedVoiceForAudio));
    setVoiceTestError('');

    generateVoiceTest(selectedVoiceForAudio)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setAudioMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceForAudio);
          return newSet;
        });
      });
  };

  const playSelectedVoicePreview = () => {
    if (!selectedVoiceId) return;
    
    const audioId = `voice-preview-${selectedVoiceId}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(selectedVoiceId));
    setVoiceTestError('');

    generateVoiceTest(selectedVoiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setModalMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceId);
          return newSet;
        });
      });
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
                  Crie roteiros personalizados e narrações com IA
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {selectedChannel && (
                <button
                  onClick={openSettingsModal}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurar Canal</span>
                </button>
              )}
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Script Generation */}
          <div className="space-y-8">
            {/* Channel Selection */}
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
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
                <div className="space-y-3">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                      className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
                        selectedChannelId === channel.id
                          ? 'bg-orange-900/30 border-orange-500 text-orange-400'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          selectedChannelId === channel.id ? 'bg-orange-500' : 'bg-gray-600'
                        }`}>
                          <Video className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">{channel.nome_canal}</h3>
                          <p className="text-xs text-gray-400">
                            {channel.media_chars ? `${channel.media_chars} chars médios` : 'Sem configuração de caracteres'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Script Generation Form */}
            {selectedChannel && (
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-light text-white mb-2">Gerar Roteiro</h2>
                  <p className="text-gray-400 text-sm">Configure os parâmetros para gerar seu roteiro</p>
                </div>
                
                <div className="space-y-6">
                  {/* Script Idea */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Ideia do Roteiro
                    </label>
                    <textarea
                      value={scriptIdea}
                      onChange={(e) => setScriptIdea(e.target.value)}
                      placeholder="Descreva a ideia principal do seu roteiro..."
                      className="w-full h-24 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>

                  {/* Model and Language */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Modelo de IA
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                      >
                        {modelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Idioma
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                      >
                        <option value="Português">Português</option>
                        <option value="Inglês">Inglês</option>
                        <option value="Espanhol">Espanhol</option>
                      </select>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateScript}
                    disabled={!scriptIdea.trim() || isGenerating}
                    className={`
                      w-full flex items-center justify-center space-x-3 py-4 rounded-xl font-medium transition-all duration-300 transform
                      ${!scriptIdea.trim() || isGenerating
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                        : 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Gerando Roteiro...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        <span>Gerar Roteiro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Generated Content */}
          <div className="space-y-8">
            {/* Generated Script */}
            {generatedScript && (
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-light text-white mb-2">Roteiro Gerado</h2>
                    <p className="text-gray-400 text-sm">
                      {scriptCharCount > 0 ? `${scriptCharCount.toLocaleString()} caracteres` : 'Edite conforme necessário'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={copyScriptToClipboard}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                      title="Copiar roteiro"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadScript}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                      title="Download roteiro"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="w-full h-80 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm resize-none"
                  placeholder="Seu roteiro aparecerá aqui..."
                />
                
                <div className="text-xs text-gray-400 mt-2">
                  {editedScript.length.toLocaleString()} caracteres
                </div>
              </div>
            )}

            {/* Audio Generation */}
            {editedScript && (
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-light text-white mb-2">Gerar Áudio</h2>
                  <p className="text-gray-400 text-sm">Configure a voz e velocidade para gerar o áudio</p>
                </div>

                {/* Audio Message Display */}
                {audioMessage && (
                  <div className={`mb-6 p-4 rounded-xl text-center border ${
                    audioMessage.type === 'success' 
                      ? 'bg-green-900/20 text-green-400 border-green-800' 
                      : 'bg-red-900/20 text-red-400 border-red-800'
                  }`}>
                    <span className="font-medium">{audioMessage.text}</span>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* Voice Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Voz para Áudio
                    </label>
                    {isLoadingVoices ? (
                      <div className="flex items-center space-x-2 p-3 bg-gray-800 border border-gray-600 rounded-xl">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-gray-400 text-sm">Carregando vozes...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={selectedVoiceForAudio || ''}
                          onChange={(e) => setSelectedVoiceForAudio(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                        >
                          <option value="">Selecione uma voz</option>
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.nome_voz} - {voice.plataforma}
                            </option>
                          ))}
                        </select>
                        
                        {/* Voice Test Button */}
                        {selectedVoiceForAudio && (
                          <button
                            onClick={testSelectedVoice}
                            disabled={selectedVoiceForAudio ? testingVoices.has(selectedVoiceForAudio) : false}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                              selectedVoiceForAudio && testingVoices.has(selectedVoiceForAudio)
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : isAudioPlaying(`voice-test-${selectedVoiceForAudio}`)
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {selectedVoiceForAudio && testingVoices.has(selectedVoiceForAudio) ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Carregando...</span>
                              </>
                            ) : isAudioPlaying(`voice-test-${selectedVoiceForAudio}`) ? (
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
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audio Speed */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Velocidade do Áudio: {audioSpeed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={audioSpeed}
                      onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0.5x</span>
                      <span>1.0x</span>
                      <span>2.0x</span>
                    </div>
                  </div>

                  {/* Generate Audio Button */}
                  <button
                    onClick={generateAudio}
                    disabled={!selectedVoiceForAudio || isGeneratingAudio}
                    className={`
                      w-full flex items-center justify-center space-x-3 py-4 rounded-xl font-medium transition-all duration-300 transform
                      ${!selectedVoiceForAudio || isGeneratingAudio
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                        : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                      }
                    `}
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Gerando Áudio...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        <span>Gerar Áudio</span>
                      </>
                    )}
                  </button>

                  {/* Generated Audio Player */}
                  {generatedAudioUrl && (
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Áudio Gerado</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={playGeneratedAudio}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                              isPlayingGeneratedAudio
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {isPlayingGeneratedAudio ? (
                              <>
                                <Square className="w-4 h-4" />
                                <span>Parar</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                <span>Reproduzir</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={downloadGeneratedAudio}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Audio Element for native controls */}
                      <audio
                        controls
                        src={generatedAudioUrl}
                        className="w-full"
                        preload="metadata"
                      >
                        Seu navegador não suporta o elemento de áudio.
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && selectedChannel && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeSettingsModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Configurações do Canal</h2>
                  <p className="text-sm text-gray-400">{selectedChannel.nome_canal}</p>
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
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Modal Message */}
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

              {/* Prompt Content */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Prompt do Canal
                </label>
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full h-40 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
                  placeholder="Prompt do canal..."
                />
                <div className="text-xs text-gray-400">
                  {editedPrompt.length.toLocaleString()} caracteres
                </div>
              </div>

              {/* Voice and Media Characters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Voice Preference */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Voz Preferida
                  </label>
                  {isLoadingVoices ? (
                    <div className="flex items-center space-x-2 p-3 bg-gray-800 border border-gray-600 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-400 text-sm">Carregando vozes...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select
                        value={selectedVoiceId || ''}
                        onChange={(e) => setSelectedVoiceId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                      >
                        <option value="">Selecione uma voz</option>
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.nome_voz} - {voice.plataforma}
                          </option>
                        ))}
                      </select>
                      
                      {/* Voice Preview Button */}
                      {selectedVoiceId && (
                        <button
                          onClick={playSelectedVoicePreview}
                          disabled={selectedVoiceId ? testingVoices.has(selectedVoiceId) : false}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                            selectedVoiceId && testingVoices.has(selectedVoiceId)
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : isAudioPlaying(`voice-preview-${selectedVoiceId}`)
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {selectedVoiceId && testingVoices.has(selectedVoiceId) ? (
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
                              <span>Testar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Media Characters */}
                <div className="space-y-2">
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
                    className="w-full p-3 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                  <div className="text-xs text-gray-400">
                    Número médio de caracteres dos roteiros
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700 flex-shrink-0">
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
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
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
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptGenerationPage;