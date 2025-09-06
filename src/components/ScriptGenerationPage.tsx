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
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      // Log do tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type da resposta:', contentType);
      if (response.ok) {
      // Tentar ler como texto primeiro para ver o formato
      const responseText = await response.text();
      console.log('📝 Response como texto:', responseText);
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Response parseado como JSON:', result);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse JSON:', parseError);
        console.log('🔍 Tentando processar como resposta binária...');
        
        // Se não é JSON, pode ser o arquivo binário direto
        if (contentType && contentType.includes('audio')) {
          console.log('🎵 Resposta parece ser áudio direto');
          const blob = new Blob([responseText], { type: contentType });
          const audioUrl = URL.createObjectURL(blob);
          setGeneratedAudioUrl(audioUrl);
          setMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
          return;
        }
        
        throw new Error('Resposta não é JSON válido nem áudio direto');
      }
        
      // Processar resposta JSON
      console.log('🔍 Analisando estrutura da resposta JSON...');
      console.log('🔍 Tipo da resposta:', typeof result);
      console.log('🔍 É array?', Array.isArray(result));
      
      if (Array.isArray(result)) {
        console.log('📋 Array com', result.length, 'elementos');
        result.forEach((item, index) => {
          console.log(`📋 Item ${index}:`, item);
        });
      } else {
        console.log('📋 Objeto:', result);
      }
        // Extrair URL do áudio da resposta
          setGeneratedAudioUrl(audioUrl);
      // Tentar extrair URL do áudio de diferentes formatos possíveis
      let audioUrl = null;
      
      if (Array.isArray(result) && result.length > 0) {
        console.log('🎯 Processando como array...');
        const firstItem = result[0];
        console.log('🎯 Primeiro item:', firstItem);
        
        // Verificar diferentes possíveis campos
        if (firstItem.response) {
          audioUrl = firstItem.response;
          console.log('✅ URL encontrada em result[0].response:', audioUrl);
        } else if (firstItem.url) {
          audioUrl = firstItem.url;
          console.log('✅ URL encontrada em result[0].url:', audioUrl);
        } else if (firstItem.audio_url) {
          audioUrl = firstItem.audio_url;
          console.log('✅ URL encontrada em result[0].audio_url:', audioUrl);
        }
      } else if (result && typeof result === 'object') {
        console.log('🎯 Processando como objeto...');
        if (result.response) {
          audioUrl = result.response;
          console.log('✅ URL encontrada em result.response:', audioUrl);
        } else if (result.url) {
          audioUrl = result.url;
          console.log('✅ URL encontrada em result.url:', audioUrl);
        } else if (result.audio_url) {
          audioUrl = result.audio_url;
          console.log('✅ URL encontrada em result.audio_url:', audioUrl);
        }
      }
      } else {
      if (audioUrl) {
        console.log('🎵 URL do áudio extraída:', audioUrl);
        setGeneratedAudioUrl(audioUrl);
        const errorText = await response.text();
        console.error('Erro HTTP:', response.status, errorText);
        console.error('❌ URL do áudio não encontrada na resposta');
        console.error('❌ Estrutura completa da resposta:', JSON.stringify(result, null, 2));
        throw new Error('Falha na geração do áudio');
      }

      // Log da resposta HTTP
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('📡 Response content-type:', response.headers.get('content-type'));

      // Obter resposta como texto primeiro
      const responseText = await response.text();
      console.log('📄 Response como texto:', responseText);

      // Tentar fazer parse como JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Response parseado como JSON:', result);
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse JSON:', parseError);
        console.log('📄 Response text que falhou no parse:', responseText);
        throw new Error('Resposta não é um JSON válido');
      }

      console.log('🔍 Estrutura completa da resposta:', JSON.stringify(result, null, 2));

      // Tentar extrair URL do áudio de diferentes formas
      let audioUrl = null;
      
      if (Array.isArray(result) && result.length > 0) {
        console.log('📋 Resposta é um array, primeiro item:', result[0]);
        audioUrl = result[0].response || result[0].url || result[0].audio_url;
      } else if (result && typeof result === 'object') {
        console.log('📦 Resposta é um objeto:', result);
        audioUrl = result.response || result.url || result.audio_url;
      }

      console.log('🎵 URL do áudio extraída:', audioUrl);

      if (!audioUrl) {
        console.error('❌ Nenhuma URL de áudio encontrada na resposta');
        console.log('🔍 Campos disponíveis:', Object.keys(result));
        throw new Error('URL do áudio não encontrada na resposta');
      }

      // Sucesso - definir URL do áudio gerado
      setGeneratedAudioUrl(audioUrl);
      setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
      console.log('✅ Áudio gerado com sucesso! URL:', audioUrl);

    } catch (error) {
      console.error('Erro completo:', error);
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
    if (!generatedAudioUrl) return;
    
    const link = document.createElement('a');
    link.href = generatedAudioUrl;
    link.download = `audio-${selectedChannel?.nome_canal || 'roteiro'}-${new Date().toISOString().split('T')[0]}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVoiceId);
          return newSet;
        });
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
                    <span>Gerar Roteiro</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Script Field - Always visible after channel selection */}
          {selectedChannel && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-light text-white">Roteiro</h2>
                  <div className="flex items-center space-x-4">
                    {editedScript && (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded-full text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>{editedScript.length.toLocaleString()} caracteres</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(editedScript)}
                        disabled={!editedScript}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                          editedScript 
                            ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                            : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </button>
                      <button
                        onClick={() => {
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
                        }}
                        disabled={!editedScript}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                          editedScript 
                            ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                            : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Canal: {selectedChannel?.nome_canal}</p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/50 rounded-xl border border-gray-700 p-6 h-80 overflow-y-auto">
                  <textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-gray-300 leading-relaxed placeholder:text-gray-500"
                    placeholder="Cole seu roteiro aqui ou gere um novo usando o formulário acima..."
                  />
                </div>
                
                {/* Voice Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-300">
                      Voz para Áudio
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Voice Selector */}
                    <div className="flex-1">
                      {isLoadingVoices ? (
                        <div className="flex items-center space-x-2 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          <span className="text-gray-400 text-sm">Carregando vozes...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedVoiceForAudio || ''}
                          onChange={(e) => setSelectedVoiceForAudio(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white"
                        >
                          <option value="">Selecione uma voz</option>
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.nome_voz} - {voice.plataforma}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    {/* Voice Test Button */}
                    <button
                      onClick={testSelectedVoice}
                      disabled={!selectedVoiceForAudio || (selectedVoiceForAudio ? testingVoices.has(selectedVoiceForAudio) : false)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        !selectedVoiceForAudio || (selectedVoiceForAudio ? testingVoices.has(selectedVoiceForAudio) : false)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isAudioPlaying(`voice-test-${selectedVoiceForAudio}`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
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
                          <span>Testar</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Selected Voice Info */}
                  {selectedVoiceForAudio && (
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      <Mic className="w-4 h-4" />
                      <span>
                        Voz selecionada: {voices.find(v => v.id === selectedVoiceForAudio)?.nome_voz || 'Não encontrada'} 
                        ({voices.find(v => v.id === selectedVoiceForAudio)?.plataforma || 'N/A'})
                      </span>
                    </div>
                  )}

                  {/* Speed Selector */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Velocidade do Áudio
                    </label>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-400 w-12">0.5x</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={audioSpeed}
                        onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="text-sm text-gray-400 w-12">2.0x</span>
                      <div className="bg-gray-800 px-3 py-1 rounded-lg text-sm font-medium text-white min-w-[60px] text-center">
                        {audioSpeed.toFixed(1)}x
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Audio Generation Section */}
                <div className="flex flex-col items-center space-y-4">
                  {/* Audio Message */}
                  {audioMessage && (
                    <div className={`p-3 rounded-xl text-center border text-sm ${
                      audioMessage.type === 'success' 
                        ? 'bg-green-900/20 text-green-400 border-green-800' 
                        : 'bg-red-900/20 text-red-400 border-red-800'
                    }`}>
                      <span className="font-medium">{audioMessage.text}</span>
                    </div>
                  )}
                  
                  {/* Generate Audio Button */}
                  <button
                    onClick={generateAudio}
                    disabled={!editedScript.trim() || isGeneratingAudio || !selectedVoiceForAudio}
                    className={`
                      flex items-center space-x-3 px-8 py-3 rounded-xl font-medium transition-all duration-300 transform
                      ${!editedScript.trim() || isGeneratingAudio || !selectedVoiceForAudio
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                        : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
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
                  
                  {/* Generated Audio Controls */}
                  {generatedAudioUrl && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 w-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-white">Áudio Gerado</h3>
                            <p className="text-sm text-gray-400">Reproduza ou faça download do áudio</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-4">
                        <button
                          onClick={playGeneratedAudio}
                          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                            isPlayingGeneratedAudio
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isPlayingGeneratedAudio ? (
                            <>
                              <Square className="w-5 h-5" />
                              <span>Parar Áudio</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              <span>Reproduzir Áudio</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={downloadGeneratedAudio}
                          className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download MP3</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Voice Selection Warning */}
                  {!selectedVoiceForAudio && (
                    <p className="text-yellow-400 text-sm text-center">
                      Selecione uma voz para gerar o áudio
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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