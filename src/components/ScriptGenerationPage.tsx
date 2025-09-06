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

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      // Log do tipo de conteúdo da resposta
      const contentType = response.headers.get('content-type');
      console.log('📄 Content-Type da resposta:', contentType);
      
      if (response.ok) {
        // Tentar ler como texto primeiro para ver o formato
        const responseText = await response.clone().text();
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
            setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
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
        
        if (audioUrl) {
          console.log('🎵 URL do áudio extraída:', audioUrl);
          setGeneratedAudioUrl(audioUrl);
          setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
        } else {
          console.error('❌ URL do áudio não encontrada na resposta');
          console.error('❌ Estrutura completa da resposta:', JSON.stringify(result, null, 2));
          throw new Error('URL do áudio não encontrada na resposta');
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
};

export default ScriptGenerationPage;