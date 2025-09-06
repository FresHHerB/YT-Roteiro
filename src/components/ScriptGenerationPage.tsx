import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Wand2, 
  Loader2, 
  Play, 
  Square, 
  Download,
  Mic,
  RefreshCw,
  Volume2,
  BookOpen,
  Edit3,
  Settings
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
  onNavigate?: (page: string) => void;
}

const ScriptGenerationPage: React.FC<ScriptGenerationPageProps> = ({ user, onBack, onNavigate }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [scriptIdea, setScriptIdea] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);

  useEffect(() => {
    loadChannels();
    loadVoices();
  }, []);

  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
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
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
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

  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    const voice = voices.find(v => v.id === voiceId);
    if (!voice) {
      throw new Error('Voz não encontrada');
    }

    if (voice.plataforma === 'ElevenLabs') {
      const { data: apisData } = await supabase
        .from('apis')
        .select('*')
        .eq('plataforma', voice.plataforma)
        .single();

      if (!apisData) {
        throw new Error(`API key não encontrada para ${voice.plataforma}`);
      }

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
      
      if (!voiceData.preview_url) {
        throw new Error('Nenhum preview de áudio disponível para esta voz ElevenLabs');
      }
      
      return voiceData.preview_url;

    } else if (voice.plataforma === 'Fish-Audio') {
      const { data: apisData } = await supabase
        .from('apis')
        .select('*')
        .eq('plataforma', voice.plataforma)
        .single();

      if (!apisData) {
        throw new Error(`API key não encontrada para ${voice.plataforma}`);
      }

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
      
      if (!modelData.samples || modelData.samples.length === 0) {
        throw new Error('Nenhum sample de áudio disponível para esta voz Fish-Audio');
      }
      
      const sampleAudioUrl = modelData.samples[0].audio;
      if (!sampleAudioUrl) {
        throw new Error('URL de áudio do sample não encontrada');
      }
      
      return sampleAudioUrl;
    }

    throw new Error('Plataforma não suportada para teste');
  };

  const testVoice = (voiceId: number) => {
    const audioId = `voice-test-${voiceId}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voiceId));

    generateVoiceTest(voiceId)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voiceId);
          return newSet;
        });
      });
  };

  const generateScript = async () => {
    if (!selectedChannelId || !scriptIdea.trim() || !language.trim()) {
      setMessage({ type: 'error', text: 'Selecione um canal, digite uma ideia para o roteiro e especifique o idioma.' });
      return;
    }

    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    if (!selectedChannel) {
      setMessage({ type: 'error', text: 'Canal selecionado não encontrado.' });
      return;
    }

    setIsGeneratingScript(true);
    setMessage(null);

    try {
      console.log('🚀 Iniciando geração de roteiro...');
      
      const payload = {
        nomeCanal: selectedChannel.nome_canal,
        ideiaRoteiro: scriptIdea,
        promptRoteiro: selectedChannel.prompt_roteiro,
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
        idioma: language
      };

      console.log('📤 Payload enviado:', payload);

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarRoteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Resposta recebida:', result);
        
        const scriptContent = result[0]?.output || result.output || result.roteiro || 'Roteiro gerado com sucesso!';
        setGeneratedScript(scriptContent);
        setMessage({ type: 'success', text: 'Roteiro gerado com sucesso!' });
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro na geração:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar roteiro. Tente novamente.' });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateAudio = async () => {
    if (!generatedScript.trim()) {
      setMessage({ type: 'error', text: 'Gere um roteiro primeiro.' });
      return;
    }

    if (!selectedVoiceId) {
      setMessage({ type: 'error', text: 'Selecione uma voz para gerar o áudio.' });
      return;
    }

    const selectedVoice = voices.find(v => v.id === selectedVoiceId);
    if (!selectedVoice) {
      setMessage({ type: 'error', text: 'Voz selecionada não encontrada.' });
      return;
    }

    setIsGeneratingAudio(true);
    setMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);

    try {
      console.log('🎵 Iniciando geração de áudio...');
      
      const payload = {
        texto: generatedScript,
        voiceId: selectedVoice.voice_id,
        plataforma: selectedVoice.plataforma,
        velocidade: audioSpeed
      };

      console.log('📤 Payload enviado para áudio:', payload);

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook-test/gerarAudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('content-type') || '';
      console.log('📄 Content-Type da resposta:', contentType);

      if (response.ok) {
        if (contentType.includes('binary/octet-stream') || contentType.includes('audio/')) {
          console.log('🎵 Resposta é áudio binário, processando...');
          
          // Para logs de debug, clone a response e leia como texto (apenas primeiros caracteres)
          const debugText = await response.clone().text();
          console.log('📝 Response como texto (primeiros 200 chars):', debugText.substring(0, 200));
          
          // Processar o áudio binário corretamente
          const arrayBuffer = await response.arrayBuffer();
          console.log('📦 ArrayBuffer obtido, tamanho:', arrayBuffer.byteLength, 'bytes');
          
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          console.log('📦 Blob criado, tamanho:', blob.size, 'bytes');
          
          const blobUrl = URL.createObjectURL(blob);
          console.log('🔗 URL do blob criada:', blobUrl);
          
          setAudioUrl(blobUrl);
          setAudioBlob(blob);
          console.log('✅ Áudio processado e definido no estado');
          
          setMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
        } else {
          // Resposta JSON (para compatibilidade futura)
          const result = await response.json();
          console.log('✅ Resposta JSON recebida:', result);
          
          if (result.audioUrl) {
            setAudioUrl(result.audioUrl);
            setMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
          } else {
            throw new Error('URL do áudio não encontrada na resposta');
          }
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro na geração de áudio:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar áudio. Tente novamente.' });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const downloadAudio = () => {
    if (audioBlob) {
      // Download direto do blob
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roteiro-audio-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (audioUrl) {
      // Download da URL externa
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `roteiro-audio-${Date.now()}.mp3`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const playGeneratedAudio = () => {
    if (!audioUrl) return;
    
    const audioId = 'generated-audio';
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
    } else {
      playAudio(audioUrl, audioId);
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

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
            
            {/* Center Section: Navigation Icons */}
            <div className="flex items-center space-x-2 flex-1 justify-center max-w-md">
              <button
                onClick={() => onNavigate && onNavigate('training')}
                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
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
                className="p-2 text-orange-400 bg-orange-900/30 rounded-lg transition-all duration-200"
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
                onClick={() => {
                  loadChannels();
                  loadVoices();
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Atualizar</span>
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
          {/* Channel Selection */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Selecionar Canal</h2>
              <p className="text-gray-400 text-sm">Escolha o canal para usar o prompt de roteiro</p>
            </div>
            
            {isLoadingChannels ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando canais...</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <select
                  value={selectedChannelId || ''}
                  onChange={(e) => setSelectedChannelId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full max-w-md p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white text-center"
                >
                  <option value="">Selecione um canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.nome_canal}
                      {channel.media_chars && ` (${channel.media_chars} chars)`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Script Generation */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Gerar Roteiro</h2>
              <p className="text-gray-400 text-sm">Digite sua ideia e gere um roteiro personalizado</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Idioma
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Ex: Português, Inglês, Espanhol..."
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Ideia do Roteiro
                </label>
                <textarea
                  value={scriptIdea}
                  onChange={(e) => setScriptIdea(e.target.value)}
                  placeholder="Descreva sua ideia para o roteiro..."
                  className="w-full h-32 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 resize-none"
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={generateScript}
                  disabled={!selectedChannelId || !scriptIdea.trim() || !language.trim() || isGeneratingScript}
                  className={`
                    flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-300 transform
                    ${!selectedChannelId || !scriptIdea.trim() || !language.trim() || isGeneratingScript
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      : 'bg-orange-600 text-white hover:bg-orange-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                  disabled={!selectedChannelId || !scriptIdea.trim() || !selectedModel.trim() || isGeneratingScript}
                    }
                  `}
                >
                  {isGeneratingScript ? (
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
          </div>

          {/* Generated Script */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Roteiro Gerado</h2>
              <p className="text-gray-400 text-sm">Edite o roteiro conforme necessário</p>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={generatedScript}
                onChange={(e) => setGeneratedScript(e.target.value)}
                placeholder="O roteiro gerado aparecerá aqui..."
                className="w-full h-64 p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500 text-sm font-mono resize-none"
              />
              <div className="text-xs text-gray-400 text-right">
                {generatedScript.length.toLocaleString()} caracteres
              </div>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Seleção de Voz</h2>
              <p className="text-gray-400 text-sm">Escolha a voz para narrar o roteiro</p>
            </div>
            
            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando vozes...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <select
                    value={selectedVoiceId || ''}
                    onChange={(e) => setSelectedVoiceId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full max-w-md p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white text-center"
                  >
                    <option value="">Selecione uma voz</option>
                    {voices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.nome_voz} - {voice.plataforma}
                        {voice.idioma && ` (${voice.idioma})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Voice Test Button */}
                {selectedVoiceId && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => testVoice(selectedVoiceId)}
                      disabled={testingVoices.has(selectedVoiceId)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        testingVoices.has(selectedVoiceId)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isAudioPlaying(`voice-test-${selectedVoiceId}`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {testingVoices.has(selectedVoiceId) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Carregando...</span>
                        </>
                      ) : isAudioPlaying(`voice-test-${selectedVoiceId}`) ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Testar Voz</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Speed Control */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 text-center">
                    Velocidade: {audioSpeed.toFixed(1)}x
                  </label>
                  <div className="flex justify-center">
                    <input
                      type="range"
                      min="0.7"
                      max="1.2"
                      step="0.1"
                      value={audioSpeed}
                      onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                      className="w-64 slider"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 max-w-64 mx-auto">
                    <span>0.7x</span>
                    <span>1.0x</span>
                    <span>1.2x</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Generation */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Gerar Áudio</h2>
              <p className="text-gray-400 text-sm">Transforme seu roteiro em áudio</p>
            </div>
            
            <div className="space-y-6">
              {/* Generate Button */}
              <div className="flex justify-center">
                <button
                  onClick={generateAudio}
                  disabled={!generatedScript.trim() || !selectedVoiceId || isGeneratingAudio}
                  className={`
                    flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-300 transform
                    ${!selectedChannelId || !scriptIdea.trim() || !language.trim() || !selectedModel.trim() || isGeneratingScript
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
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
              </div>

              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-black/50 rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Áudio Gerado</h3>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={playGeneratedAudio}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isAudioPlaying('generated-audio')
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {isAudioPlaying('generated-audio') ? (
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
                        onClick={downloadAudio}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Native Audio Player */}
                  <audio
                    controls
                    src={audioUrl}
                    className="w-full"
                    style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                  >
                    Seu navegador não suporta o elemento de áudio.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptGenerationPage;