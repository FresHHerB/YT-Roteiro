import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  CheckCircle,
  Key,
  Mic,
  Play,
  Square,
  RefreshCw,
  Upload,
  Download,
  BookOpen
} from 'lucide-react';

interface API {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
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
  audio_file_path?: string;
}

interface SettingsPageProps {
  user: any;
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack }) => {
  const [apis, setApis] = useState<API[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ElevenLabs' | 'Fish-Audio'>('all');
  const [isLoadingApis, setIsLoadingApis] = useState(true);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // API Modal State
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<API | null>(null);
  const [apiForm, setApiForm] = useState({ plataforma: '', api_key: '' });
  const [isSavingApi, setIsSavingApi] = useState(false);
  
  // Voice Modal State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [voiceForm, setVoiceForm] = useState({
    voice_id: '',
    plataforma: '',
  });
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [isCollectingVoiceData, setIsCollectingVoiceData] = useState(false);
  const [collectedVoiceData, setCollectedVoiceData] = useState<{
    nome_voz: string;
    idioma: string;
    genero: string;
  } | null>(null);
  const [autoCollectTimeout, setAutoCollectTimeout] = useState<NodeJS.Timeout | null>(null);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  
  // Audio State
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [voiceTestError, setVoiceTestError] = useState<string>('');

  useEffect(() => {
    loadApis();
    loadVoices();
  }, []);

  useEffect(() => {
    // Filter voices based on active filter
    if (activeFilter === 'all') {
      setFilteredVoices(voices);
    } else {
      setFilteredVoices(voices.filter(voice => voice.plataforma === activeFilter));
    }
  }, [voices, activeFilter]);

  // Audio control functions
  const playAudio = (audioUrl: string, audioId: string) => {
    // Stop any currently playing audio
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

  const loadApis = async () => {
    setIsLoadingApis(true);
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar APIs.' });
      } else {
        setApis(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingApis(false);
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
        setMessage({ type: 'error', text: 'Erro ao carregar vozes.' });
      } else {
        setVoices(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Collect voice data automatically
  const collectVoiceData = async (voiceId: string, platform: string) => {
    if (!voiceId.trim() || !platform.trim()) {
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
      return;
    }

    setIsCollectingVoiceData(true);
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
    
    try {
      const apiData = apis.find(api => api.plataforma === platform);
      if (!apiData) {
        throw new Error(`API key não encontrada para ${platform}`);
      }

      if (platform === 'ElevenLabs') {
        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
          method: 'GET',
          headers: {
            'xi-api-key': apiData.api_key
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
        }

        const voiceData = await response.json();
        
        // Map language codes to names
        const languageMap: { [key: string]: string } = {
          'en': 'Inglês',
          'pt': 'Português',
          'es': 'Espanhol',
          'fr': 'Francês',
          'de': 'Alemão',
          'it': 'Italiano',
          'ja': 'Japonês',
          'ko': 'Coreano',
          'zh': 'Chinês'
        };

        // Map gender
        const genderMap: { [key: string]: string } = {
          'male': 'Masculino',
          'female': 'Feminino',
          'neutral': 'Neutro'
        };

        setCollectedVoiceData({
          nome_voz: voiceData.name || 'Nome não disponível',
          idioma: languageMap[voiceData.labels?.language || ''] || voiceData.labels?.language || 'Não especificado',
          genero: genderMap[voiceData.labels?.gender || ''] || voiceData.labels?.gender || 'Não especificado'
        });
        setCanPlayPreview(true);

      } else if (platform === 'Fish-Audio') {
        const response = await fetch(`https://api.fish.audio/model/${voiceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiData.api_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro Fish-Audio: ${response.status} - ${errorText}`);
        }

        const modelData = await response.json();
        
        setCollectedVoiceData({
          nome_voz: modelData.title || 'Nome não disponível',
          idioma: modelData.languages?.join(', ') || 'Não especificado',
          genero: 'Não especificado' // Fish-Audio não fornece gênero diretamente
        });
        setCanPlayPreview(true);
      }

    } catch (error) {
      console.error('Erro ao coletar dados da voz:', error);
      // Não mostrar erro global no modal, apenas limpar dados
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
    } finally {
      setIsCollectingVoiceData(false);
    }
  };

  // Auto-collect data when voice_id or platform changes
  const handleVoiceFormChange = (field: string, value: string) => {
    setVoiceForm(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timeout
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
    }
    
    // Set new timeout for auto-collection
    const newTimeout = setTimeout(() => {
      const updatedForm = { ...voiceForm, [field]: value };
      if (updatedForm.voice_id.trim() && updatedForm.plataforma.trim()) {
        collectVoiceData(updatedForm.voice_id, updatedForm.plataforma);
      }
    }, 800); // 800ms delay after user stops typing
    
    setAutoCollectTimeout(newTimeout);
  };

  // Test voice preview in modal
  const testVoiceInModal = () => {
    if (!collectedVoiceData || !voiceForm.voice_id || !voiceForm.plataforma) return;
    
    const tempVoice: Voice = {
      id: 0,
      nome_voz: collectedVoiceData.nome_voz,
      voice_id: voiceForm.voice_id,
      plataforma: voiceForm.plataforma,
      idioma: collectedVoiceData.idioma,
      genero: collectedVoiceData.genero,
      created_at: new Date().toISOString()
    };
    
    const audioId = `modal-voice-preview`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(0)); // Use ID 0 for modal preview

    generateVoiceTest(tempVoice)
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
          newSet.delete(0);
          return newSet;
        });
      });
  };

  // API Functions
  const openApiModal = (api?: API) => {
    if (api) {
      setEditingApi(api);
      setApiForm({ plataforma: api.plataforma, api_key: api.api_key });
    } else {
      setEditingApi(null);
      setApiForm({ plataforma: '', api_key: '' });
    }
    setShowApiModal(true);
  };

  const closeApiModal = () => {
    setShowApiModal(false);
    setEditingApi(null);
    setApiForm({ plataforma: '', api_key: '' });
  };

  const saveApi = async () => {
    if (!apiForm.plataforma.trim() || !apiForm.api_key.trim()) {
      setMessage({ type: 'error', text: 'Preencha todos os campos.' });
      return;
    }

    setIsSavingApi(true);
    try {
      if (editingApi) {
        // Update existing API
        const { error } = await supabase
          .from('apis')
          .update({
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          })
          .eq('id', editingApi.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API atualizada com sucesso!' });
      } else {
        // Create new API
        const { error } = await supabase
          .from('apis')
          .insert([{
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API adicionada com sucesso!' });
      }

      closeApiModal();
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar API.' });
    } finally {
      setIsSavingApi(false);
    }
  };

  const deleteApi = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta API?')) return;

    try {
      const { error } = await supabase
        .from('apis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'API excluída com sucesso!' });
      loadApis();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir API.' });
    }
  };

  // Voice Functions
  const openVoiceModal = (voice?: Voice) => {
    if (voice) {
      setEditingVoice(voice);
      setVoiceForm({
        voice_id: voice.voice_id,
        plataforma: voice.plataforma
      });
      setCollectedVoiceData({
        nome_voz: voice.nome_voz,
        idioma: voice.idioma || '',
        genero: voice.genero || ''
      });
      setCanPlayPreview(true);
    } else {
      setEditingVoice(null);
      setVoiceForm({
        voice_id: '',
        plataforma: ''
      });
      setCollectedVoiceData(null);
      setCanPlayPreview(false);
    }
    
    // Clear any existing timeout
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }
    
    setShowVoiceModal(true);
  };

  const closeVoiceModal = () => {
    // Clear timeout on close
    if (autoCollectTimeout) {
      clearTimeout(autoCollectTimeout);
      setAutoCollectTimeout(null);
    }
    
    setShowVoiceModal(false);
    setEditingVoice(null);
    setVoiceForm({
      voice_id: '',
      plataforma: ''
    });
    setCollectedVoiceData(null);
    setCanPlayPreview(false);
  };

  const saveVoice = async () => {
    if (!voiceForm.voice_id.trim() || !voiceForm.plataforma.trim() || !collectedVoiceData) {
      setMessage({ type: 'error', text: 'Preencha o Voice ID, selecione a plataforma e colete os dados automaticamente.' });
      return;
    }

    setIsSavingVoice(true);
    try {
      if (editingVoice) {
        // Update existing voice
        const { error } = await supabase
          .from('vozes')
          .update({
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          })
          .eq('id', editingVoice.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz atualizada com sucesso!' });
      } else {
        // Create new voice
        const { error } = await supabase
          .from('vozes')
          .insert([{
            nome_voz: collectedVoiceData.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: collectedVoiceData.idioma || null,
            genero: collectedVoiceData.genero || null
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz adicionada com sucesso!' });
      }

      closeVoiceModal();
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao salvar voz.' });
    } finally {
      setIsSavingVoice(false);
    }
  };

  const deleteVoice = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta voz?')) return;

    try {
      const { error } = await supabase
        .from('vozes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Voz excluída com sucesso!' });
      loadVoices();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao excluir voz.' });
    }
  };

  // Generate voice test audio
  const generateVoiceTest = async (voice: Voice): Promise<string> => {
    try {
      if (voice.plataforma === 'ElevenLabs') {
        // Get API key for ElevenLabs
        const apiData = apis.find(api => api.plataforma === voice.plataforma);
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Buscar dados da voz para obter o preview_url
        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'xi-api-key': apiData.api_key
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
        const apiData = apis.find(api => api.plataforma === voice.plataforma);
        if (!apiData) {
          throw new Error(`API key não encontrada para ${voice.plataforma}`);
        }

        // Para Fish-Audio, buscamos os dados do modelo para obter o sample de áudio
        const response = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiData.api_key}`,
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

      throw new Error('Plataforma não suportada para teste');
    } catch (error) {
      console.error('Erro ao gerar teste de voz:', error);
      throw error;
    }
  };

  const testVoice = (voice: Voice) => {
    const audioId = `voice-test-${voice.id}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setIsTestingVoice(true);
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setIsTestingVoice(false);
      });
  };

  const testVoicePreview = (voice: Voice) => {
    const audioId = `voice-preview-${voice.id}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    setTestingVoices(prev => new Set(prev).add(voice.id));
    setVoiceTestError('');

    generateVoiceTest(voice)
      .then(audioUrl => {
        playAudio(audioUrl, audioId);
      })
      .catch(error => {
        console.error('Erro no teste de voz:', error);
        setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao testar voz' });
      })
      .finally(() => {
        setTestingVoices(prev => {
          const newSet = new Set(prev);
          newSet.delete(voice.id);
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
              
              {/* Navigation Icons */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => window.location.href = '#training'}
                  className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                  title="Treinar Canal"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button
                  onClick={() => window.location.href = '#prompts'}
                  className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-900/30 rounded-lg transition-all duration-200"
                  title="Revisar/Editar Conteúdo"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => window.location.href = '#generate'}
                  className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-900/30 rounded-lg transition-all duration-200"
                  title="Gerar Roteiro e Áudio"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onBack()}
                  className="p-2 text-gray-300 bg-gray-700 rounded-lg transition-all duration-200"
                  title="Configurações Gerais"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-white">
                  Configurações Gerais
                </h1>
                <p className="text-sm text-gray-400">
                  Gerencie vozes e APIs do sistema
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadApis}
                disabled={isLoadingApis}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingApis ? 'animate-spin' : ''}`} />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* APIs Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">APIs</h2>
                  <p className="text-sm text-gray-400">Gerencie suas chaves de API</p>
                </div>
              </div>
              <button
                onClick={() => openApiModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {isLoadingApis ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando APIs...</span>
                </div>
              </div>
            ) : apis.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhuma API configurada</h3>
                <p className="text-gray-400">Adicione suas chaves de API para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apis.map((api) => (
                  <ApiCard
                    key={api.id}
                    api={api}
                    onEdit={() => openApiModal(api)}
                    onDelete={() => deleteApi(api.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Voices Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Vozes</h2>
                  <p className="text-sm text-gray-400">Gerencie suas vozes de IA</p>
                </div>
              </div>
              <button
                onClick={() => openVoiceModal()}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Voice Filters */}
            <div className="flex items-center space-x-3 mb-6">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'all'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>Todas</span>
                <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                  {voices.length}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter('ElevenLabs')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'ElevenLabs'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>ElevenLabs</span>
                <span className="bg-purple-700 text-white text-xs px-2 py-1 rounded-full">
                  {voices.filter(v => v.plataforma === 'ElevenLabs').length}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter('Fish-Audio')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === 'Fish-Audio'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>Fish-Audio</span>
                <span className="bg-cyan-700 text-white text-xs px-2 py-1 rounded-full">
                  {voices.filter(v => v.plataforma === 'Fish-Audio').length}
                </span>
              </button>
            </div>

            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando vozes...</span>
                </div>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">
                  {activeFilter === 'all' ? 'Nenhuma voz configurada' : `Nenhuma voz ${activeFilter} encontrada`}
                </h3>
                <p className="text-gray-400">
                  {activeFilter === 'all' ? 'Adicione suas vozes de IA para começar' : `Configure vozes da plataforma ${activeFilter}`}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    onEdit={() => openVoiceModal(voice)}
                    onDelete={() => deleteVoice(voice.id)}
                    onTest={() => testVoicePreview(voice)}
                    isPlaying={isAudioPlaying(`voice-preview-${voice.id}`) || isAudioPlaying(`voice-test-${voice.id}`)}
                    isTestingVoice={testingVoices.has(voice.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Modal */}
      {showApiModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeApiModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-medium text-white">
                {editingApi ? 'Editar API' : 'Adicionar API'}
              </h2>
              <button
                onClick={closeApiModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Plataforma
                </label>
                <select
                  value={apiForm.plataforma}
                  onChange={(e) => setApiForm(prev => ({ ...prev, plataforma: e.target.value }))}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                >
                  <option value="">Selecione uma plataforma</option>
                  <option value="ElevenLabs">ElevenLabs</option>
                  <option value="Fish-Audio">Fish-Audio</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Google">Google</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiForm.api_key}
                  onChange={(e) => setApiForm(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="Cole sua API key aqui"
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={closeApiModal}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={saveApi}
                disabled={isSavingApi || !apiForm.plataforma.trim() || !apiForm.api_key.trim()}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isSavingApi || !apiForm.plataforma.trim() || !apiForm.api_key.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {isSavingApi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {showVoiceModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={closeVoiceModal}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-medium text-white">
                {editingVoice ? 'Editar Voz' : 'Adicionar Voz'}
              </h2>
              <button
                onClick={closeVoiceModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Plataforma *
                  </label>
                  <select
                    value={voiceForm.plataforma}
                    onChange={(e) => handleVoiceFormChange('plataforma', e.target.value)}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="">Selecione uma plataforma</option>
                    <option value="ElevenLabs">ElevenLabs</option>
                    <option value="Fish-Audio">Fish-Audio</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Voice ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={voiceForm.voice_id}
                      onChange={(e) => handleVoiceFormChange('voice_id', e.target.value)}
                      placeholder="Cole o Voice ID da plataforma selecionada"
                      className="w-full p-3 bg-black border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                    />
                    {isCollectingVoiceData && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Cole o Voice ID da plataforma selecionada
                  </p>
                </div>
              </div>

              {/* Auto-collected data display */}
              {collectedVoiceData && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Dados Auto-preenchidos</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-300">
                        Nome da Voz
                      </label>
                      <input
                        type="text"
                        value={collectedVoiceData.nome_voz}
                        onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, nome_voz: e.target.value } : null)}
                        className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-300">
                          Idioma
                        </label>
                        <input
                          type="text"
                          value={collectedVoiceData.idioma}
                          onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, idioma: e.target.value } : null)}
                          className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-300">
                          Gênero
                        </label>
                        <input
                          type="text"
                          value={collectedVoiceData.genero}
                          onChange={(e) => setCollectedVoiceData(prev => prev ? { ...prev, genero: e.target.value } : null)}
                          className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Voice Preview Button */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-300">
                        Teste de Voz
                      </label>
                      <button
                        onClick={testVoiceInModal}
                        disabled={!canPlayPreview || testingVoices.has(0)}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full justify-center ${
                          !canPlayPreview || testingVoices.has(0)
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : isAudioPlaying('modal-voice-preview')
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {testingVoices.has(0) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Carregando...</span>
                          </>
                        ) : isAudioPlaying('modal-voice-preview') ? (
                          <>
                            <Square className="w-4 h-4" />
                            <span>Parar Preview</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Reproduzir Preview</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={closeVoiceModal}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={saveVoice}
                disabled={isSavingVoice || !voiceForm.voice_id.trim() || !voiceForm.plataforma.trim() || !collectedVoiceData}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isSavingVoice || !voiceForm.voice_id.trim() || !voiceForm.plataforma.trim() || !collectedVoiceData
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                `}
              >
                {isSavingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
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

// API Card Component
interface ApiCardProps {
  api: API;
  onEdit: () => void;
  onDelete: () => void;
}

const ApiCard: React.FC<ApiCardProps> = ({ api, onEdit, onDelete }) => {
  const getPlatformBadge = (platform: string) => {
    const badges: { [key: string]: { bg: string; text: string } } = {
      'ElevenLabs': { bg: 'bg-purple-600', text: 'text-white' },
      'Fish-Audio': { bg: 'bg-cyan-600', text: 'text-white' },
      'OpenAI': { bg: 'bg-green-600', text: 'text-white' },
      'Google': { bg: 'bg-red-600', text: 'text-white' }
    };
    return badges[platform] || { bg: 'bg-gray-600', text: 'text-white' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const platformBadge = getPlatformBadge(api.plataforma);

  return (
    <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
          
          {/* API Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-white truncate">{api.plataforma}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${platformBadge.bg} ${platformBadge.text}`}>
                {api.plataforma}
              </span>
            </div>
            
            {/* API Details */}
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="font-mono">{api.api_key.substring(0, 20)}...</span>
              <span>•</span>
              <span>Criado em {formatDate(api.created_at)}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Voice Card Component
interface VoiceCardProps {
  voice: Voice;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  isPlaying: boolean;
  isTestingVoice: boolean;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ 
  voice, 
  onEdit, 
  onDelete, 
  onTest, 
  isPlaying, 
  isTestingVoice 
}) => {
  const getPlatformBadge = (platform: string) => {
    const badges: { [key: string]: { bg: string; text: string } } = {
      'ElevenLabs': { bg: 'bg-purple-600', text: 'text-white' },
      'Fish-Audio': { bg: 'bg-cyan-600', text: 'text-white' },
      'OpenAI': { bg: 'bg-green-600', text: 'text-white' },
      'Google': { bg: 'bg-red-600', text: 'text-white' }
    };
    return badges[platform] || { bg: 'bg-gray-600', text: 'text-white' };
  };

  const platformBadge = getPlatformBadge(voice.plataforma);

  return (
    <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
          
          {/* Voice Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-white truncate">{voice.nome_voz}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${platformBadge.bg} ${platformBadge.text}`}>
                {voice.plataforma}
              </span>
            </div>
            
            {/* Voice Details */}
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="font-mono">{voice.voice_id}</span>
              {voice.idioma && (
                <>
                  <span>•</span>
                  <span>{voice.idioma}</span>
                </>
              )}
              {voice.genero && (
                <>
                  <span>•</span>
                  <span>{voice.genero}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={onTest}
            disabled={isTestingVoice}
            className={`p-2 rounded-lg transition-all duration-200 hover:bg-gray-700/50 ${
              isTestingVoice
                ? 'text-gray-400 cursor-not-allowed'
                : isPlaying
                ? 'text-red-400'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {isTestingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;