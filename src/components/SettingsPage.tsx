import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  CheckCircle,
  Key,
  Mic,
  Search,
  Play,
  Square,
  RefreshCw
} from 'lucide-react';

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

interface API {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
}

interface SettingsPageProps {
  user: any;
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [apis, setApis] = useState<API[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isLoadingApis, setIsLoadingApis] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Voice form state
  const [showVoiceForm, setShowVoiceForm] = useState(false);
  const [editingVoice, setEditingVoice] = useState<Voice | null>(null);
  const [voiceForm, setVoiceForm] = useState({
    nome_voz: '',
    voice_id: '',
    plataforma: 'ElevenLabs',
    idioma: '',
    genero: ''
  });
  const [isSubmittingVoice, setIsSubmittingVoice] = useState(false);
  
  // API form state
  const [showApiForm, setShowApiForm] = useState(false);
  const [editingApi, setEditingApi] = useState<API | null>(null);
  const [apiForm, setApiForm] = useState({
    plataforma: 'ElevenLabs',
    api_key: ''
  });
  const [isSubmittingApi, setIsSubmittingApi] = useState(false);
  
  // Voice search state
  const [isSearchingVoice, setIsSearchingVoice] = useState(false);
  const [voiceSearchError, setVoiceSearchError] = useState<string>('');
  
  // Audio preview state
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);

  useEffect(() => {
    loadVoices();
    loadApis();
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

  // Function to get voice preview URL from API
  const getVoicePreviewUrl = async (voiceId: string, platform: string): Promise<string | null> => {
    try {
      // Get API key for the platform
      const platformApi = apis.find(api => api.plataforma === platform);
      if (!platformApi) {
        throw new Error(`API key não encontrada para ${platform}`);
      }

      if (platform === 'ElevenLabs') {
        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
          headers: {
            'xi-api-key': platformApi.api_key
          }
        });

        if (!response.ok) {
          throw new Error(`Erro na API ElevenLabs: ${response.status}`);
        }

        const data = await response.json();
        return data.preview_url || null;
      } else if (platform === 'Fish-Audio') {
        const response = await fetch(`https://api.fish.audio/v1/voices/${voiceId}`, {
          headers: {
            'Authorization': `Bearer ${platformApi.api_key}`
          }
        });

        if (!response.ok) {
          throw new Error(`Erro na API Fish-Audio: ${response.status}`);
        }

        const data = await response.json();
        return data.preview_url || null;
      }

      return null;
    } catch (error) {
      console.error('Erro ao obter URL de preview:', error);
      return null;
    }
  };

  // Voice preview function
  const playVoicePreview = async (voice: Voice) => {
    const audioId = `voice-${voice.id}`;
    
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    try {
      setMessage(null);
      
      // Try to get fresh preview URL from API
      const freshPreviewUrl = await getVoicePreviewUrl(voice.voice_id, voice.plataforma);
      
      if (freshPreviewUrl) {
        playAudio(freshPreviewUrl, audioId);
      } else if (voice.preview_url) {
        // Fallback to stored URL
        playAudio(voice.preview_url, audioId);
      } else {
        setMessage({ type: 'error', text: 'URL de preview não disponível para esta voz' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao reproduzir preview da voz' });
    }
  };

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase
        .from('vozes')
        .select('*')
        .order('created_at', { ascending: false });

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

  // Voice search function
  const searchVoiceData = async (voiceId: string, platform: string) => {
    const platformApi = apis.find(api => api.plataforma === platform);
    if (!platformApi) {
      throw new Error(`API key não encontrada para ${platform}`);
    }

    if (platform === 'ElevenLabs') {
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          'xi-api-key': platformApi.api_key
        }
      });

      if (!response.ok) {
        throw new Error(`Voice ID não encontrado na ElevenLabs`);
      }

      const data = await response.json();
      return {
        nome_voz: data.name,
        preview_url: data.preview_url,
        idioma: data.labels?.language || '',
        genero: data.labels?.gender || ''
      };
    } else if (platform === 'Fish-Audio') {
      const response = await fetch(`https://api.fish.audio/v1/voices/${voiceId}`, {
        headers: {
          'Authorization': `Bearer ${platformApi.api_key}`
        }
      });

      if (!response.ok) {
        throw new Error(`Voice ID não encontrado na Fish-Audio`);
      }

      const data = await response.json();
      return {
        nome_voz: data.name,
        preview_url: data.preview_url,
        idioma: data.language || '',
        genero: data.gender || ''
      };
    }

    throw new Error('Plataforma não suportada');
  };

  const handleVoiceSearch = async () => {
    if (!voiceForm.voice_id.trim()) {
      setVoiceSearchError('Digite um Voice ID para buscar');
      return;
    }

    setIsSearchingVoice(true);
    setVoiceSearchError('');

    try {
      const voiceData = await searchVoiceData(voiceForm.voice_id, voiceForm.plataforma);
      
      setVoiceForm(prev => ({
        ...prev,
        nome_voz: voiceData.nome_voz,
        idioma: voiceData.idioma,
        genero: voiceData.genero
      }));
      
      setVoiceSearchError('Dados da voz carregados com sucesso!');
    } catch (error) {
      setVoiceSearchError(error instanceof Error ? error.message : 'Erro ao buscar dados da voz');
    } finally {
      setIsSearchingVoice(false);
    }
  };

  const handleVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voiceForm.nome_voz.trim() || !voiceForm.voice_id.trim()) {
      setMessage({ type: 'error', text: 'Nome da voz e Voice ID são obrigatórios.' });
      return;
    }

    setIsSubmittingVoice(true);
    setMessage(null);

    try {
      if (editingVoice) {
        const { error } = await supabase
          .from('vozes')
          .update({
            nome_voz: voiceForm.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: voiceForm.idioma,
            genero: voiceForm.genero
          })
          .eq('id', editingVoice.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('vozes')
          .insert([{
            nome_voz: voiceForm.nome_voz,
            voice_id: voiceForm.voice_id,
            plataforma: voiceForm.plataforma,
            idioma: voiceForm.idioma,
            genero: voiceForm.genero
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Voz adicionada com sucesso!' });
      }

      resetVoiceForm();
      loadVoices();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar voz.' });
    } finally {
      setIsSubmittingVoice(false);
    }
  };

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiForm.api_key.trim()) {
      setMessage({ type: 'error', text: 'API Key é obrigatória.' });
      return;
    }

    setIsSubmittingApi(true);
    setMessage(null);

    try {
      if (editingApi) {
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
        const { error } = await supabase
          .from('apis')
          .insert([{
            plataforma: apiForm.plataforma,
            api_key: apiForm.api_key
          }]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'API adicionada com sucesso!' });
      }

      resetApiForm();
      loadApis();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar API.' });
    } finally {
      setIsSubmittingApi(false);
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir voz.' });
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir API.' });
    }
  };

  const resetVoiceForm = () => {
    setVoiceForm({
      nome_voz: '',
      voice_id: '',
      plataforma: 'ElevenLabs',
      idioma: '',
      genero: ''
    });
    setEditingVoice(null);
    setShowVoiceForm(false);
    setVoiceSearchError('');
  };

  const resetApiForm = () => {
    setApiForm({
      plataforma: 'ElevenLabs',
      api_key: ''
    });
    setEditingApi(null);
    setShowApiForm(false);
  };

  const editVoice = (voice: Voice) => {
    setVoiceForm({
      nome_voz: voice.nome_voz,
      voice_id: voice.voice_id,
      plataforma: voice.plataforma,
      idioma: voice.idioma || '',
      genero: voice.genero || ''
    });
    setEditingVoice(voice);
    setShowVoiceForm(true);
    setVoiceSearchError('');
  };

  const editApi = (api: API) => {
    setApiForm({
      plataforma: api.plataforma,
      api_key: api.api_key
    });
    setEditingApi(api);
    setShowApiForm(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
            <button
              onClick={() => {
                loadVoices();
                loadApis();
              }}
              className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar</span>
            </button>
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
          {/* Voices Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">Vozes</h2>
                  <p className="text-sm text-gray-400">Gerencie as vozes disponíveis</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Voices List */}
            <div className="space-y-4">
              {isLoadingVoices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : voices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma voz cadastrada</p>
                </div>
              ) : (
                voices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    onEdit={() => editVoice(voice)}
                    onDelete={() => deleteVoice(voice.id)}
                    onPlayPreview={() => playVoicePreview(voice)}
                    isPlaying={isAudioPlaying(`voice-${voice.id}`)}
                  />
                ))
              )}
            </div>
          </div>

          {/* APIs Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-white">APIs</h2>
                  <p className="text-sm text-gray-400">Configure as chaves de API</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* APIs List */}
            <div className="space-y-4">
              {isLoadingApis ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : apis.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma API cadastrada</p>
                </div>
              ) : (
                apis.map((api) => (
                  <ApiCard
                    key={api.id}
                    api={api}
                    onEdit={() => editApi(api)}
                    onDelete={() => deleteApi(api.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Form Modal */}
      {showVoiceForm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => resetVoiceForm()}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">
                  {editingVoice ? 'Editar Voz' : 'Adicionar Voz'}
                </h3>
                <button
                  onClick={resetVoiceForm}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVoiceSubmit} className="space-y-4">
                {/* Platform Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Plataforma
                  </label>
                  <select
                    value={voiceForm.plataforma}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, plataforma: e.target.value }))}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="ElevenLabs">ElevenLabs</option>
                    <option value="Fish-Audio">Fish-Audio</option>
                  </select>
                </div>

                {/* Voice ID with Search */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Voice ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={voiceForm.voice_id}
                      onChange={(e) => setVoiceForm(prev => ({ ...prev, voice_id: e.target.value }))}
                      placeholder="Digite o Voice ID"
                      className="flex-1 p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      disabled={isSearchingVoice || !voiceForm.voice_id.trim()}
                      className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                        isSearchingVoice || !voiceForm.voice_id.trim()
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSearchingVoice ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {voiceSearchError && (
                    <p className={`text-xs ${
                      voiceSearchError.includes('sucesso') 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {voiceSearchError}
                    </p>
                  )}
                </div>

                {/* Voice Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Nome da Voz
                  </label>
                  <input
                    type="text"
                    value={voiceForm.nome_voz}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, nome_voz: e.target.value }))}
                    placeholder="Nome da voz"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Idioma
                  </label>
                  <input
                    type="text"
                    value={voiceForm.idioma}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, idioma: e.target.value }))}
                    placeholder="Ex: Português, English"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Gênero
                  </label>
                  <select
                    value={voiceForm.genero}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, genero: e.target.value }))}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="">Selecione o gênero</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Neutro">Neutro</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetVoiceForm}
                    className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingVoice}
                    className={`
                      flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                      ${isSubmittingVoice
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }
                    `}
                  >
                    {isSubmittingVoice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingVoice ? 'Atualizar' : 'Salvar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* API Form Modal */}
      {showApiForm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => resetApiForm()}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">
                  {editingApi ? 'Editar API' : 'Adicionar API'}
                </h3>
                <button
                  onClick={resetApiForm}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApiSubmit} className="space-y-4">
                {/* Platform Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Plataforma
                  </label>
                  <select
                    value={apiForm.plataforma}
                    onChange={(e) => setApiForm(prev => ({ ...prev, plataforma: e.target.value }))}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="ElevenLabs">ElevenLabs</option>
                    <option value="Fish-Audio">Fish-Audio</option>
                  </select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiForm.api_key}
                    onChange={(e) => setApiForm(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Cole sua API key aqui"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetApiForm}
                    className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingApi}
                    className={`
                      flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all duration-200
                      ${isSubmittingApi
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                      }
                    `}
                  >
                    {isSubmittingApi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingApi ? 'Atualizar' : 'Salvar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Voice Card Component
interface VoiceCardProps {
  voice: Voice;
  onEdit: () => void;
  onDelete: () => void;
  onPlayPreview: () => void;
  isPlaying: boolean;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, onEdit, onDelete, onPlayPreview, isPlaying }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{voice.nome_voz}</h4>
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full text-xs">
              {voice.plataforma}
            </span>
            {voice.idioma && (
              <span className="text-xs">{voice.idioma}</span>
            )}
            {voice.genero && (
              <span className="text-xs">{voice.genero}</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onPlayPreview}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={isPlaying ? 'Parar' : 'Testar Voz'}
          >
            {isPlaying ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <p className="mb-1">ID: {voice.voice_id}</p>
        <p>Criado em {formatDate(voice.created_at)}</p>
      </div>
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{api.plataforma}</h4>
          <p className="text-sm text-gray-400 font-mono">
            {maskApiKey(api.api_key)}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <p>Criado em {formatDate(api.created_at)}</p>
      </div>
    </div>
  );
};

export default SettingsPage;