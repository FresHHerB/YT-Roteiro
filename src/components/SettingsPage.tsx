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
  Download
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
    nome_voz: '',
    voice_id: '',
    plataforma: '',
    idioma: '',
    genero: '',
    preview_url: ''
  });
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  
  // Audio State
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [testingVoices, setTestingVoices] = useState<Set<number>>(new Set());
  const [voiceTestError, setVoiceTestError] = useState<string>('');

  useEffect(() => {
    loadApis();
    loadVoices();
  }, []);

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
        nome_voz: voice.nome_voz,
        voice_id: voice.voice_id,
        plataforma: voice.plataforma,
        idioma: voice.idioma || '',
        genero: voice.genero || '',
        preview_url: voice.preview_url || ''
      });
    } else {
      setEditingVoice(null);
      setVoiceForm({
        nome_voz: '',
        voice_id: '',
        plataforma: '',
        idioma: '',
        genero: '',
        preview_url: ''
      });
    }
    setShowVoiceModal(true);
  };

  const closeVoiceModal = () => {
    setShowVoiceModal(false);
    setEditingVoice(null);
    setVoiceForm({
      nome_voz: '',
      voice_id: '',
      plataforma: '',
      idioma: '',
      genero: '',
      preview_url: ''
    });
  };

  const saveVoice = async () => {
    if (!voiceForm.nome_voz.trim() || !voiceForm.voice_id.trim() || !voiceForm.plataforma.trim()) {
      setMessage({ type: 'error', text: 'Preencha os campos obrigatórios (Nome, ID e Plataforma).' });
      return;
    }

    setIsSavingVoice(true);
    try {
      if (editingVoice) {
        // Update existing voice
        const { error } = await supabase
          .from('vozes')
          .update({
            nome_voz: voiceForm.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: voiceForm.idioma || null,
            genero: voiceForm.genero || null,
            preview_url: voiceForm.preview_url || null
          })
          .eq('id', editingVoice.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz atualizada com sucesso!' });
      } else {
        // Create new voice
        const { error } = await supabase
          .from('vozes')
          .insert([{
            nome_voz: voiceForm.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: voiceForm.idioma || null,
            genero: voiceForm.genero || null,
            preview_url: voiceForm.preview_url || null
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

            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando vozes...</span>
                </div>
              </div>
            ) : voices.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-light text-white mb-2">Nenhuma voz configurada</h3>
                <p className="text-gray-400">Adicione suas vozes de IA para começar</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {voices.map((voice) => (
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
                    Nome da Voz *
                  </label>
                  <input
                    type="text"
                    value={voiceForm.nome_voz}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, nome_voz: e.target.value }))}
                    placeholder="Ex: Maria Brasileira"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Voice ID *
                  </label>
                  <input
                    type="text"
                    value={voiceForm.voice_id}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, voice_id: e.target.value }))}
                    placeholder="Ex: pNInz6obpgDQGcFmaJgB"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Plataforma *
                </label>
                <select
                  value={voiceForm.plataforma}
                  onChange={(e) => setVoiceForm(prev => ({ ...prev, plataforma: e.target.value }))}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white"
                >
                  <option value="">Selecione uma plataforma</option>
                  <option value="ElevenLabs">ElevenLabs</option>
                  <option value="Fish-Audio">Fish-Audio</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Google">Google</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Idioma
                  </label>
                  <input
                    type="text"
                    value={voiceForm.idioma}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, idioma: e.target.value }))}
                    placeholder="Ex: Português"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Gênero
                  </label>
                  <select
                    value={voiceForm.genero}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, genero: e.target.value }))}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="">Selecione o gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Neutro">Neutro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  URL de Preview
                </label>
                <input
                  type="url"
                  value={voiceForm.preview_url}
                  onChange={(e) => setVoiceForm(prev => ({ ...prev, preview_url: e.target.value }))}
                  placeholder="https://exemplo.com/audio.mp3"
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={closeVoiceModal}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={saveVoice}
                disabled={isSavingVoice || !voiceForm.nome_voz.trim() || !voiceForm.voice_id.trim() || !voiceForm.plataforma.trim()}
                className={`
                  flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                  ${isSavingVoice || !voiceForm.nome_voz.trim() || !voiceForm.voice_id.trim() || !voiceForm.plataforma.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
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
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
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
  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'ElevenLabs': 'bg-orange-500',
      'Fish-Audio': 'bg-blue-500',
      'OpenAI': 'bg-green-500',
      'Google': 'bg-red-500'
    };
    return colors[platform] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(api.plataforma)}`}>
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white">{api.plataforma}</h3>
            <p className="text-xs text-gray-400">
              Criado em {formatDate(api.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-black/50 rounded border border-gray-700">
        <p className="text-xs text-gray-400 font-mono">
          {api.api_key.substring(0, 20)}...
        </p>
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
  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'ElevenLabs': 'bg-orange-500',
      'Fish-Audio': 'bg-blue-500',
      'OpenAI': 'bg-green-500',
      'Google': 'bg-red-500'
    };
    return colors[platform] || 'bg-gray-500';
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(voice.plataforma)}`}>
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white">{voice.nome_voz}</h3>
            <p className="text-xs text-gray-400">{voice.plataforma}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onTest}
            disabled={isTestingVoice}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isTestingVoice
                ? 'text-gray-400 cursor-not-allowed'
                : isPlaying
                ? 'text-red-400 hover:bg-red-900/20'
                : 'text-green-400 hover:bg-green-900/20'
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
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all duration-200"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {voice.idioma && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Idioma:</span>
            <span className="text-xs text-gray-300">{voice.idioma}</span>
          </div>
        )}
        {voice.genero && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Gênero:</span>
            <span className="text-xs text-gray-300">{voice.genero}</span>
          </div>
        )}
        <div className="p-2 bg-black/50 rounded border border-gray-700">
          <p className="text-xs text-gray-400 font-mono">
            ID: {voice.voice_id}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;