import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Wand2, 
  Loader2, 
  CheckCircle,
  Copy,
  Download,
  Mic,
  Play,
  Square,
  RefreshCw,
  Volume2
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
  const [selectedVoiceId, setSelectedVoiceId] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [audioMessage, setAudioMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('');
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());

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
      setAudioMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
    });

    audio.play().then(() => {
      setPlayingAudio({ id: audioId, audio });
    }).catch(() => {
      setAudioMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
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
    try {
      const { data, error } = await supabase
        .from('canais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar canais.' });
      } else {
        setChannels(data || []);
        if (data && data.length > 0) {
          setSelectedChannelId(data[0].id);
          if (data[0].voz_prefereida) {
            setSelectedVoiceId(data[0].voz_prefereida);
          }
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

  const generateScript = async () => {
    if (!selectedChannelId) {
      setMessage({ type: 'error', text: 'Selecione um canal primeiro.' });
      return;
    }

    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    if (!selectedChannel) {
      setMessage({ type: 'error', text: 'Canal não encontrado.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setGeneratedScript('');

    try {
      const payload = {
        nomeCanal: selectedChannel.nome_canal,
        promptRoteiro: selectedChannel.prompt_roteiro
      };

      console.log('📤 Enviando payload para geração de roteiro:', payload);

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarRoteiro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Resposta recebida:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Resultado do roteiro:', result);
        
        const scriptContent = result[0]?.output || result.output || 'Roteiro gerado com sucesso!';
        setGeneratedScript(scriptContent);
        setMessage({ type: 'success', text: 'Roteiro gerado com sucesso!' });
      } else {
        throw new Error('Falha na geração do roteiro');
      }
    } catch (error) {
      console.error('💥 Erro na geração de roteiro:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar roteiro. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAudio = async () => {
    if (!selectedVoiceId || !generatedScript.trim()) {
      setAudioMessage({ type: 'error', text: 'Selecione uma voz e gere um roteiro primeiro.' });
      return;
    }

    const selectedVoice = voices.find(v => v.id === selectedVoiceId);
    if (!selectedVoice) {
      setAudioMessage({ type: 'error', text: 'Voz não encontrada.' });
      return;
    }

    setIsGenerating(true);
    setAudioMessage(null);
    setGeneratedAudioUrl('');

    try {
      const payload = {
        text: generatedScript,
        voice_id: selectedVoice.voice_id,
        platform: selectedVoice.plataforma,
        speed: speed
      };

      console.log('📤 Enviando payload para geração de áudio:', payload);

      const response = await fetch('https://n8n-n8n.h5wo9n.easypanel.host/webhook/gerarAudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Status da resposta:', response.status);
      console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
      console.log('📥 Content-Type:', response.headers.get('content-type'));

      const responseText = await response.text();
      console.log('📄 Resposta como texto:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Response parseado como JSON:', result);
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse JSON:', parseError);
        console.log('📄 Resposta não é JSON válido:', responseText);
        throw new Error('Resposta inválida do servidor');
      }

      console.log('🔍 Estrutura completa da resposta:', JSON.stringify(result, null, 2));

      let audioUrl = '';

      if (Array.isArray(result) && result.length > 0) {
        console.log('📋 Resposta é um array, processando primeiro item...');
        const firstItem = result[0];
        console.log('🎯 Primeiro item:', firstItem);
        
        audioUrl = firstItem.response || firstItem.url || firstItem.audio_url || '';
      } else if (result && typeof result === 'object') {
        console.log('📦 Resposta é um objeto, buscando URL...');
        audioUrl = result.response || result.url || result.audio_url || '';
      }

      console.log('🔗 URL do áudio extraída:', audioUrl);

      if (audioUrl) {
        setGeneratedAudioUrl(audioUrl);
        setAudioMessage({ type: 'success', text: 'Áudio gerado com sucesso!' });
        console.log('✅ Áudio gerado com sucesso! URL:', audioUrl);
      } else {
        console.log('❌ URL do áudio não encontrada na resposta');
        throw new Error('URL do áudio não encontrada na resposta');
      }

      if (!response.ok) {
        throw new Error('Falha na geração do áudio');
      }
    } catch (error) {
      console.error('💥 Erro completo na geração de áudio:', error);
      setAudioMessage({ type: 'error', text: 'Erro ao gerar áudio. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVoiceTest = async (voiceId: number): Promise<string> => {
    try {
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
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const testVoicePreview = (voiceId: number) => {
    const audioId = `voice-preview-${voiceId}`;
    
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

  const playGeneratedAudio = () => {
    if (!generatedAudioUrl) return;
    
    const audioId = 'generated-audio';
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
    } else {
      playAudio(generatedAudioUrl, audioId);
    }
  };

  const downloadGeneratedAudio = () => {
    if (!generatedAudioUrl) return;
    
    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    const channelName = selectedChannel?.nome_canal || 'audio';
    const fileName = `audio-${channelName}-${new Date().toISOString().split('T')[0]}.mp3`;
    
    const a = document.createElement('a');
    a.href = generatedAudioUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyScript = async () => {
    if (generatedScript) {
      try {
        await navigator.clipboard.writeText(generatedScript);
        setMessage({ type: 'success', text: 'Roteiro copiado para a área de transferência!' });
      } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao copiar roteiro.' });
      }
    }
  };

  const downloadScript = () => {
    if (generatedScript) {
      const selectedChannel = channels.find(c => c.id === selectedChannelId);
      const channelName = selectedChannel?.nome_canal || 'roteiro';
      const blob = new Blob([generatedScript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roteiro-${channelName}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

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
              onClick={() => {
                loadChannels();
                loadVoices();
              }}
              disabled={isLoadingChannels || isLoadingVoices}
              className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingChannels || isLoadingVoices ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Channel Selection */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-light text-white mb-2">Seleção do Canal</h2>
              <p className="text-gray-400 text-sm">Escolha o canal para gerar o roteiro</p>
            </div>
            
            {isLoadingChannels ? (
              <div className="flex items-center space-x-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Carregando canais...</span>
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Nenhum canal encontrado. Crie um canal primeiro na página de treinamento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <select
                  value={selectedChannelId || ''}
                  onChange={(e) => {
                    const channelId = parseInt(e.target.value);
                    setSelectedChannelId(channelId);
                    const channel = channels.find(c => c.id === channelId);
                    if (channel?.voz_prefereida) {
                      setSelectedVoiceId(channel.voz_prefereida);
                    }
                  }}
                  className="w-full p-4 bg-black border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                >
                  <option value="">Selecione um canal</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.nome_canal}
                    </option>
                  ))}
                </select>
                
                {selectedChannel && (
                  <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-300 text-sm">
                      <strong>Prompt:</strong> {selectedChannel.prompt_roteiro.substring(0, 200)}
                      {selectedChannel.prompt_roteiro.length > 200 && '...'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Script Generation */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-light text-white mb-2">Geração de Roteiro</h2>
                <p className="text-gray-400 text-sm">Gere um roteiro baseado no canal selecionado</p>
              </div>
              <button
                onClick={generateScript}
                disabled={!selectedChannelId || isGenerating}
                className={`
                  flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform
                  ${!selectedChannelId || isGenerating
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 active:scale-95'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Gerar Roteiro</span>
                  </>
                )}
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl text-center border ${
                message.type === 'success' 
                  ? 'bg-green-900/20 text-green-400 border-green-800' 
                  : 'bg-red-900/20 text-red-400 border-red-800'
              }`}>
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            {/* Generated Script Display */}
            {generatedScript && (
              <div className="space-y-4">
                <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-white">Roteiro Gerado</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={copyScript}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </button>
                      <button
                        onClick={downloadScript}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {generatedScript}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 mt-3">
                    {generatedScript.length.toLocaleString()} caracteres
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Generation */}
          {generatedScript && (
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Geração de Áudio</h2>
                <p className="text-gray-400 text-sm">Configure a voz e velocidade para gerar o áudio</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Voice Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voz para Narração
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
                        className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 text-white"
                      >
                        <option value="">Selecione uma voz</option>
                        {voices.map((voice) => (
                          <option key={voice.id} value={voice.id}>
                            {voice.nome_voz} - {voice.plataforma} ({voice.idioma})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Voice Preview */}
                  {selectedVoiceId && (
                    <button
                      onClick={() => testVoicePreview(selectedVoiceId)}
                      disabled={testingVoices.has(selectedVoiceId)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                        testingVoices.has(selectedVoiceId)
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : isAudioPlaying(`voice-preview-${selectedVoiceId}`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {testingVoices.has(selectedVoiceId) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Carregando...</span>
                        </>
                      ) : isAudioPlaying(`voice-preview-${selectedVoiceId}`) ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar Preview</span>
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

                {/* Speed Control */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Velocidade da Narração
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>0.5x</span>
                        <span className="text-white font-medium">{speed.toFixed(1)}x</span>
                        <span>2.0x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                        <Volume2 className="w-4 h-4" />
                        <span>Ajuste a velocidade da narração</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Audio Button */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={generateAudio}
                  disabled={!selectedVoiceId || !generatedScript.trim() || isGenerating}
                  className={`
                    flex items-center space-x-3 px-8 py-4 rounded-xl font-medium transition-all duration-300 transform
                    ${!selectedVoiceId || !generatedScript.trim() || isGenerating
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95'
                    }
                  `}
                >
                  {isGenerating ? (
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

              {/* Generated Audio Player */}
              {generatedAudioUrl && (
                <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-green-400">Áudio Gerado com Sucesso!</h3>
                      <p className="text-green-300 text-sm">Seu áudio está pronto para reprodução ou download</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={playGeneratedAudio}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isAudioPlaying('generated-audio')
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isAudioPlaying('generated-audio') ? (
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
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download MP3</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptGenerationPage;