import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  ArrowLeft, 
  Mic, 
  Key, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  X,
  RefreshCw,
  Search,
  Play,
  Volume2,
  Square
} from 'lucide-react';

interface Voice {
  id: number;
  nome_voz: string;
  voice_id: string;
  plataforma: string;
  idioma?: string;
  genero?: string;
  preview_url?: string;
  audio_file_path?: string;
  created_at: string;
}

interface ApiKey {
  id: number;
  plataforma: string;
  api_key: string;
  created_at: string;
}

interface VoiceData {
  voice_id: string;
  name: string;
  language?: string;
  gender?: string;
  preview_url?: string;
}

interface SettingsPageProps {
  user: any;
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isLoadingApis, setIsLoadingApis] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<string | null>(null);

  // Voice form state
  const [showVoiceForm, setShowVoiceForm] = useState(false);
  const [voiceForm, setVoiceForm] = useState({
    plataforma: 'ElevenLabs',
    voice_id: '',
    nome_voz: '',
    idioma: '',
    genero: '',
    preview_url: '',
    audio_file_path: null as string | null
  });
  const [isAddingVoice, setIsAddingVoice] = useState(false);
  const [isSearchingVoice, setIsSearchingVoice] = useState(false);
  const [voiceSearchError, setVoiceSearchError] = useState('');

  // Function to download and upload audio to Supabase bucket
  const downloadAndUploadAudio = async (audioUrl: string, voiceId: string, voiceName: string, platform: string): Promise<{ bucketUrl: string | null; filePath: string | null }> => {
    try {
      console.log('🔄 Iniciando processo de download via proxy para:', audioUrl);
      
      // Obtenha a API Key para a plataforma
      const apiKey = getApiKeyForPlatform(platform);

      // 1. Crie o nome do arquivo AQUI no frontend
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedVoiceName = voiceName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedVoiceName}_${voiceId}_${timestamp}.mp3`;
      
      console.log('📡 Tentando invocar Edge Function com:', {
        audioUrl: audioUrl.substring(0, 100) + '...',
        fileName,
        platform,
        hasApiKey: !!apiKey
      });
      
      // Chama a Edge Function do Supabase com timeout
      const invokePromise = supabase.functions.invoke('proxy-download-audio', {
        body: {
          audioUrl: audioUrl,
          fileName: fileName,
          platformApiKey: apiKey,
          platform: platform
        }
      });
      
      // Adiciona timeout de 45 segundos para a invocação
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na invocação da Edge Function')), 45000);
      });
      
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erro detalhado da Edge Function:', {
          message: error.message,
          context: error.context,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Se for erro de função não encontrada, tenta fallback direto
        if (error.message?.includes('Failed to send a request') || 
            error.message?.includes('Function not found') ||
            error.code === 'FunctionsError') {
          console.log('🔄 Edge Function não disponível, tentando download direto...');
          return await downloadDirectly(audioUrl, fileName, apiKey, platform);
        }
        
        throw new Error(`Edge Function error: ${error.message}`);
      }

      console.log('✅ Edge Function retornou com sucesso:', data);
      
      // A função agora retorna a URL e o caminho do arquivo
      return { bucketUrl: data.publicUrl, filePath: data.filePath };

    } catch (err) {
      console.log('⚠️ Falha no processo do proxy:', err);
      
      // Se for timeout ou erro de rede, tenta download direto
      if (err.message?.includes('Timeout') || err.message?.includes('Failed to send')) {
        console.log('🔄 Tentando download direto como fallback...');
        try {
          return await downloadDirectly(audioUrl, fileName, apiKey, platform);
        } catch (directError) {
          console.log('❌ Download direto também falhou:', directError);
          return { bucketUrl: audioUrl, filePath: null };
        }
      }
      
      return { bucketUrl: audioUrl, filePath: null };
    }
  };

  // Função de fallback para download direto
  const downloadDirectly = async (audioUrl: string, fileName: string, apiKey: string | null, platform: string): Promise<{ bucketUrl: string | null; filePath: string | null }> => {
    try {
      console.log('📥 Iniciando download direto do áudio...');
      
      // Headers para download baseado na plataforma
      const headers: HeadersInit = {
        'Accept': 'audio/mpeg, audio/mp3, audio/wav, audio/*',
        'User-Agent': 'Mozilla/5.0 (compatible; SupabaseClient/1.0)'
      };
      
      if (apiKey && platform) {
        if (platform === 'ElevenLabs') {
          headers['xi-api-key'] = apiKey;
        } else if (platform === 'Fish-Audio') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
      }
      
      // Download com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(audioUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      console.log('📁 Download direto concluído, tamanho:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Arquivo de áudio vazio');
      }
      
      // Upload para Supabase Storage
      console.log('☁️ Fazendo upload direto para Supabase Storage...');
      const { data, error } = await supabase.storage
        .from('audios')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload error: ${error.message}`);
      }

      // Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('audios')
        .getPublicUrl(data.path);

      console.log('✅ Upload direto bem-sucedido:', publicUrl);
      return { bucketUrl: publicUrl, filePath: data.path };
      
    } catch (error) {
      console.error('❌ Erro no download direto:', error);
      throw error;
    }
  };

  const [showApiForm, setShowApiForm] = useState(false);
  const [apiForm, setApiForm] = useState({
    plataforma: 'ElevenLabs',
    api_key: ''
  });
  const [isAddingApi, setIsAddingApi] = useState(false);

  // Real-time voice preview functions
  const getVoicePreviewUrl = async (voice: Voice): Promise<string | null> => {
    const apiKey = getApiKeyForPlatform(voice.plataforma);
    if (!apiKey) {
      setMessage({ type: 'error', text: `API key não encontrada para ${voice.plataforma}` });
      return null;
    }

    try {
      if (voice.plataforma === 'ElevenLabs') {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const data = await response.json();
        const voiceData = data.voices?.find((v: any) => v.voice_id === voice.voice_id);
        return voiceData?.preview_url || null;

      } else if (voice.plataforma === 'Fish-Audio') {
        const response = await fetch(`https://api.fish.audio/model/${voice.voice_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Fish Audio API error: ${response.status}`);
        }

        const data = await response.json();
        return data.samples?.[0]?.audio || null;
      }
    } catch (error) {
      console.error('Erro ao obter preview URL:', error);
      setMessage({ type: 'error', text: `Erro ao obter preview de ${voice.plataforma}` });
    }

    return null;
  };

  const playVoicePreview = async (voice: Voice) => {
    const audioId = `voice-${voice.id}`;
    
    // Se já está tocando, para o áudio
    if (isAudioPlaying(audioId)) {
      pauseAudio();
      return;
    }

    // Para qualquer áudio que esteja tocando
    if (playingAudio) {
      playingAudio.audio.pause();
      playingAudio.audio.currentTime = 0;
    }

    try {
      // Busca URL de preview em tempo real
      const previewUrl = await getVoicePreviewUrl(voice);
      
      if (!previewUrl) {
        setMessage({ type: 'error', text: 'Preview não disponível para esta voz' });
        return;
      }

      // Cria e reproduz o áudio
      const audio = new Audio(previewUrl);
      
      audio.addEventListener('ended', () => {
        setPlayingAudio(null);
      });

      audio.addEventListener('error', () => {
        setPlayingAudio(null);
        setMessage({ type: 'error', text: 'Erro ao reproduzir áudio' });
      });

      await audio.play();
      setPlayingAudio({ id: audioId, audio });
      
    } catch (error) {
      console.error('Erro ao reproduzir preview:', error);
      setMessage({ type: 'error', text: 'Erro ao reproduzir preview da voz' });
    }
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

  useEffect(() => {
    loadVoices();
    loadApiKeys();
  }, []);

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
      setMessage({ type: 'error', text: 'Erro de conexão ao carregar vozes.' });
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const loadApiKeys = async () => {
    setIsLoadingApis(true);
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar APIs.' });
      } else {
        setApiKeys(data || []);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao carregar APIs.' });
    } finally {
      setIsLoadingApis(false);
    }
  };

  const getApiKeyForPlatform = (platform: string): string | null => {
    const apiKey = apiKeys.find(api => api.plataforma === platform);
    return apiKey?.api_key || null;
  };

  const searchVoiceData = async (voiceId: string, platform: string): Promise<VoiceData | null> => {
    if (!voiceId.trim()) return null;

    const apiKey = getApiKeyForPlatform(platform);
    console.log('🔍 Searching voice data:', { voiceId, platform, hasApiKey: !!apiKey });
    
    if (!apiKey) {
      throw new Error(`API key não encontrada para ${platform}`);
    }

    try {
      if (platform === 'ElevenLabs') {
        const url = 'https://api.elevenlabs.io/v1/voices';
        const headers = {
          'Accept': 'application/json',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        };
        
        const fileName = `${platform.toLowerCase()}-${voiceId}-${Date.now()}.mp3`;
        console.log('📡 ElevenLabs Request:', { url, headers: { ...headers, 'xi-api-key': '***' } });
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          mode: 'cors'
        });

        console.log('📥 ElevenLabs Response:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ ElevenLabs Error Response:', errorText);
          throw new Error(`Erro ElevenLabs (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 ElevenLabs Data:', data);
        
        const voice = data.voices?.find((v: any) => v.voice_id === voiceId);
        console.log('🎤 Found voice:', voice);
        
        if (!voice) {
          throw new Error('Voice ID não encontrado no ElevenLabs');
        }

        return {
          voice_id: voice.voice_id,
          name: voice.name,
          language: voice.labels?.accent || voice.labels?.language || 'English',
          preview_url: voice.preview_url
        };

      } else if (platform === 'Fish-Audio') {
        const url = `https://api.fish.audio/model/${voiceId}`;
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        
        console.log('📡 Fish Audio Request:', { url, headers: { ...headers, 'Authorization': 'Bearer ***' } });
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          mode: 'cors'
        });

        console.log('📥 Fish Audio Response:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Fish Audio Error Response:', errorText);
          throw new Error(`Erro Fish Audio (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 Fish Audio Data:', data);

        console.log('🎤 Found voice:', data);

        // Extrair idioma e gênero das tags (se existirem)
        const languageTag = data.tags?.find((tag: string) => 
          ['portuguese', 'english', 'spanish', 'french', 'german', 'italian', 'chinese', 'japanese', 'korean'].includes(tag.toLowerCase())
        ) || 'English';
        
        const genderTag = data.tags?.find((tag: string) => 
          ['masculino', 'feminino', 'male', 'female'].includes(tag.toLowerCase())
        ) || 'Não especificado';
        
        // Se não encontrar nas tags, tentar extrair do título
        const titleLanguage = data.title?.toLowerCase().includes('portuguese') ? 'Portuguese' :
                             data.title?.toLowerCase().includes('english') ? 'English' :
                             data.title?.toLowerCase().includes('spanish') ? 'Spanish' :
                             languageTag;
        
        return {
          voice_id: data._id,
          name: data.title,
          language: data.languages?.[0] || titleLanguage,
          gender: genderTag,
          preview_url: data.samples?.[0]?.audio || ''
        };
      }
    } catch (error) {
      setVoiceSearchError((error as Error).message);
      // Clear auto-filled fields on error
      throw error;
    }

    return null;
  };

  const handlePlatformChange = (platform: string) => {
    setVoiceForm({
      plataforma: platform,
      voice_id: '',
      nome_voz: '',
      idioma: '',
      genero: '',
      preview_url: '',
      audio_file_path: null
    });
    setVoiceSearchError('');
  };

  const handleVoiceIdChange = async (voiceId: string) => {
    setVoiceForm(prev => ({ ...prev, voice_id: voiceId }));
    setVoiceSearchError('');
    
    if (voiceId.trim()) {
      setIsSearchingVoice(true);
      try {
        const voiceData = await searchVoiceData(voiceId, voiceForm.plataforma);
        if (voiceData) {
          setVoiceForm(prev => ({
            ...prev,
            nome_voz: voiceData.name,
            idioma: voiceData.language || '',
            genero: voiceData.gender || '',
            preview_url: voiceData.preview_url || ''
          }));
        }
      } catch (error) {
        // Error is already handled in searchVoiceData
        setVoiceForm(prev => ({
          ...prev,
          nome_voz: '',
          idioma: '',
          genero: '',
          preview_url: '',
          audio_file_path: null
        }));
      } finally {
        setIsSearchingVoice(false);
      }
    } else {
      setVoiceForm(prev => ({
        ...prev,
        nome_voz: '',
        idioma: '',
        genero: '',
        preview_url: '',
        audio_file_path: null
      }));
    }
  };

  const playVoicePreview = () => {
    if (voiceForm.voice_id && voiceForm.nome_voz) {
      const tempVoice: Voice = {
        id: 0, // Temporary ID for preview
        voice_id: voiceForm.voice_id,
        nome_voz: voiceForm.nome_voz,
        plataforma: voiceForm.plataforma,
        idioma: voiceForm.idioma,
        genero: voiceForm.genero,
        preview_url: voiceForm.preview_url,
        created_at: new Date().toISOString()
      };
      playVoicePreview(tempVoice);
    }
  };

  const addVoice = async () => {
    if (!voiceForm.voice_id.trim() || !voiceForm.nome_voz.trim()) {
      setVoiceSearchError('Voice ID e Nome da Voz são obrigatórios.');
      return;
    }

    setIsAddingVoice(true);
    setVoiceSearchError('');
    
    try {
      let finalPreviewUrl = voiceForm.preview_url;
      let audioFilePath: string | null = null;
      
      // Re-fetch voice data to get fresh preview URL before downloading
      if (voiceForm.preview_url) {
        setVoiceSearchError('Obtendo URL de áudio atualizada...');
        try {
          const freshVoiceData = await searchVoiceData(voiceForm.voice_id, voiceForm.plataforma);
          if (freshVoiceData?.preview_url) {
            finalPreviewUrl = freshVoiceData.preview_url;
            setVoiceSearchError('Processando áudio com URL atualizada...');
          } else {
            setVoiceSearchError('⚠️ Não foi possível obter URL de áudio atualizada. Usando URL original...');
          }
        } catch (refreshError) {
          console.warn('⚠️ Erro ao atualizar URL do áudio:', refreshError);
          setVoiceSearchError('⚠️ Erro ao atualizar URL. Usando URL original...');
        }
        
        setVoiceSearchError('Processando áudio...');
        const { bucketUrl, filePath } = await downloadAndUploadAudio(
          finalPreviewUrl, 
          voiceForm.voice_id, 
          voiceForm.nome_voz,
          voiceForm.plataforma
        );
        
        finalPreviewUrl = bucketUrl;
        audioFilePath = filePath;
        
        if (filePath) {
          setVoiceSearchError('✅ Áudio salvo no bucket');
        } else {
          setVoiceSearchError('⚠️ Erro ao processar áudio. Usando URL original.');
        }
      }
      
      const { error } = await supabase
        .from('vozes')
        .insert([{
          plataforma: voiceForm.plataforma,
          voice_id: voiceForm.voice_id,
          nome_voz: voiceForm.nome_voz,
          idioma: voiceForm.idioma,
          genero: voiceForm.genero,
          preview_url: finalPreviewUrl,
          audio_file_path: audioFilePath
        }]);

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao adicionar voz.' });
      } else {
        setMessage({ type: 'success', text: 'Voz adicionada com sucesso!' });
        setVoiceForm({ 
          plataforma: 'ElevenLabs',
          voice_id: '', 
          nome_voz: '', 
          idioma: '', 
          genero: '', 
          preview_url: '',
          audio_file_path: null
        });
        setShowVoiceForm(false);
        loadVoices();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao adicionar voz.' });
    } finally {
      setIsAddingVoice(false);
    }
  };

  const deleteVoice = async (id: number) => {
    // 1. Encontra os dados da voz que será deletada para pegar o caminho do arquivo
    const voiceToDelete = voices.find(v => v.id === id);

    try {
      // 2. Se houver um caminho de arquivo, remove o arquivo do Storage primeiro
      if (voiceToDelete?.audio_file_path) {
        console.log('🗑️ Deletando arquivo do bucket:', voiceToDelete.audio_file_path);
        const { error: storageError } = await supabase.storage
          .from('audios')
          .remove([voiceToDelete.audio_file_path]);
        
        if (storageError) {
          // Apenas avisa sobre o erro, mas continua para deletar do banco de dados
          console.warn('⚠️ Erro ao deletar arquivo do bucket:', storageError);
        }
      }
      
      // 3. Deleta o registro da voz do banco de dados
      const { error } = await supabase
        .from('vozes')
        .delete()
        .eq('id', id);

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao remover voz.' });
      } else {
        setMessage({ type: 'success', text: 'Voz removida com sucesso!' });
        loadVoices(); // Recarrega a lista
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao remover voz.' });
    }
  };

  const addApiKey = async () => {
    if (!apiForm.api_key.trim()) {
      setMessage({ type: 'error', text: 'Preencha a API Key.' });
      return;
    }

    setIsAddingApi(true);
    try {
      const { error } = await supabase
        .from('apis')
        .insert([apiForm]);

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao adicionar API.' });
      } else {
        setMessage({ type: 'success', text: 'API adicionada com sucesso!' });
        setApiForm({ plataforma: 'ElevenLabs', api_key: '' });
        setShowApiForm(false);
        loadApiKeys();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao adicionar API.' });
    } finally {
      setIsAddingApi(false);
    }
  };

  const deleteApiKey = async (id: number) => {
    try {
      const { error } = await supabase
        .from('apis')
        .delete()
        .eq('id', id);

      if (error) {
        setMessage({ type: 'error', text: 'Erro ao remover API.' });
      } else {
        setMessage({ type: 'success', text: 'API removida com sucesso!' });
        loadApiKeys();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao remover API.' });
    }
  };

  const platformOptions = ['ElevenLabs', 'Fish-Audio'];

  // Filter voices based on selected platform
  const filteredVoices = voiceFilter 
    ? voices.filter(voice => voice.plataforma === voiceFilter)
    : voices;

  // Get voice counts by platform
  const voiceCounts = {
    total: voices.length,
    ElevenLabs: voices.filter(v => v.plataforma === 'ElevenLabs').length,
    'Fish-Audio': voices.filter(v => v.plataforma === 'Fish-Audio').length
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { loadVoices(); loadApiKeys(); }}
                disabled={isLoadingVoices || isLoadingApis}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${(isLoadingVoices || isLoadingApis) ? 'animate-spin' : ''}`} />
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
          <div className={`max-w-md mx-auto mb-8 p-4 rounded-xl text-center border ${
            message.type === 'success' 
              ? 'bg-green-900/20 text-green-400 border-green-800' 
              : 'bg-red-900/20 text-red-400 border-red-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Models Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Modelos de Voz</h2>
                  <p className="text-gray-400 text-sm">Configure vozes para narração</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Voz</span>
              </button>
            </div>

            {/* Platform Filters */}
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setVoiceFilter(null)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    voiceFilter === null
                      ? 'bg-gray-700 text-white border border-gray-600'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  <span>Todas</span>
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                    {voiceCounts.total}
                  </span>
                </button>
                
                <button
                  onClick={() => setVoiceFilter('ElevenLabs')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    voiceFilter === 'ElevenLabs'
                      ? 'bg-purple-600 text-white border border-purple-500'
                      : 'bg-purple-900/20 text-purple-400 hover:text-purple-300 hover:bg-purple-800/30 border border-purple-800'
                  }`}
                >
                  <span>ElevenLabs</span>
                  <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    {voiceCounts.ElevenLabs}
                  </span>
                </button>
                
                <button
                  onClick={() => setVoiceFilter('Fish-Audio')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    voiceFilter === 'Fish-Audio'
                      ? 'bg-cyan-600 text-white border border-cyan-500'
                      : 'bg-cyan-900/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-800/30 border border-cyan-800'
                  }`}
                >
                  <span>Fish-Audio</span>
                  <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                    {voiceCounts['Fish-Audio']}
                  </span>
                </button>
              </div>
            </div>

            {/* Voice List */}
            {isLoadingVoices ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando vozes...</span>
                </div>
              </div>
            ) : filteredVoices.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">
                  {voiceFilter ? `Nenhuma voz encontrada para ${voiceFilter}` : 'Nenhuma voz configurada'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVoices.map((voice) => (
                  <VoiceCard
                    key={voice.id}
                    voice={voice}
                    onDelete={() => deleteVoice(voice.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* API Keys Section */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-light text-white">Chaves de API</h2>
                  <p className="text-gray-400 text-sm">Gerencie suas chaves de API</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar API</span>
              </button>
            </div>

            {/* API List */}
            {isLoadingApis ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Carregando APIs...</span>
                </div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma API configurada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((api) => (
                  <ApiCard
                    key={api.id}
                    api={api}
                    onDelete={() => deleteApiKey(api.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Voice Modal */}
      {showVoiceForm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => {
            setShowVoiceForm(false);
            setVoiceForm({ 
              plataforma: 'ElevenLabs',
              voice_id: '', 
              nome_voz: '', 
              idioma: '', 
              genero: '', 
              preview_url: '',
              audio_file_path: null
            });
            setVoiceSearchError('');
          }}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-medium text-white">Adicionar Nova Voz</h3>
              <button
                onClick={() => {
                  setShowVoiceForm(false);
                  setVoiceForm({ 
                    plataforma: 'ElevenLabs',
                    voice_id: '', 
                    nome_voz: '', 
                    idioma: '', 
                    genero: '', 
                    preview_url: '',
                    audio_file_path: null
                  });
                  setVoiceSearchError('');
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Plataforma
                </label>
                <select
                  value={voiceForm.plataforma}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white"
                >
                  {platformOptions.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>

              {/* Voice ID */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={voiceForm.voice_id}
                    onChange={(e) => handleVoiceIdChange(e.target.value)}
                    placeholder={voiceForm.plataforma === 'ElevenLabs' ? 'Ex: 21m00Tcm4TlvDq8ikWAM' : 'Ex: 6b8d2c9f8e3g4h5i6j7k8l9m'}
                    className="w-full p-3 pr-12 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                  {isSearchingVoice && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                    </div>
                  )}
                  {!isSearchingVoice && voiceForm.voice_id && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                {voiceSearchError && (
                  <p className="text-red-400 text-xs mt-1">{voiceSearchError}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Cole o Voice ID da plataforma selecionada
                </p>
              </div>

              {/* Auto-filled fields */}
              <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Dados Auto-preenchidos</span>
                </div>

                {/* Nome da Voz */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Voz
                  </label>
                  <input
                    type="text"
                    value={voiceForm.nome_voz}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, nome_voz: e.target.value }))}
                    placeholder="Nome será preenchido automaticamente"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma
                  </label>
                  <input
                    type="text"
                    value={voiceForm.idioma}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, idioma: e.target.value }))}
                    placeholder="Idioma será preenchido automaticamente"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Gênero */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gênero
                  </label>
                  <input
                    type="text"
                    value={voiceForm.genero}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, genero: e.target.value }))}
                    placeholder="Gênero será preenchido automaticamente"
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Voice Preview */}
                {voiceForm.preview_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Teste de Voz
                    </label>
                    <button
                      onClick={playVoicePreview}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                        isAudioPlaying(`voice-0`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isAudioPlaying(`voice-0`) ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Reproduzir Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* API Key Warning */}
              {!getApiKeyForPlatform(voiceForm.plataforma) && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <X className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-medium">
                      API Key não encontrada para {voiceForm.plataforma}
                    </span>
                  </div>
                  <p className="text-yellow-300 text-xs mt-1">
                    Adicione uma API Key para esta plataforma primeiro
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowVoiceForm(false);
                  setVoiceForm({ 
                    plataforma: 'ElevenLabs',
                    voice_id: '', 
                    nome_voz: '', 
                    idioma: '', 
                    genero: '', 
                    preview_url: '',
                    audio_file_path: null
                  });
                  setVoiceSearchError('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={addVoice}
                disabled={isAddingVoice || !voiceForm.voice_id.trim() || !voiceForm.nome_voz.trim()}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${isAddingVoice || !voiceForm.voice_id.trim() || !voiceForm.nome_voz.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                `}
              >
                {isAddingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adicionando...</span>
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

      {/* Add API Modal */}
      {showApiForm && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setShowApiForm(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-medium text-white">Adicionar Nova API</h3>
              <button
                onClick={() => setShowApiForm(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Plataforma
                </label>
                <select
                  value={apiForm.plataforma}
                  onChange={(e) => setApiForm(prev => ({ ...prev, plataforma: e.target.value }))}
                  className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                >
                  {platformOptions.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                onClick={() => setShowApiForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={addApiKey}
                disabled={isAddingApi}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${isAddingApi
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {isAddingApi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adicionando...</span>
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

// Voice Card Component
interface VoiceCardProps {
  voice: Voice;
  onDelete: () => void;
}

const VoiceCard: React.FC<VoiceCardProps> = ({ voice, onDelete }) => {
  const getPlatformColor = (platform: string) => {
    return platform === 'ElevenLabs' ? 'bg-purple-500' : 'bg-cyan-500';
  };

  // Use bucket URL if available, otherwise use preview_url
  const audioUrl = voice.audio_file_path 
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/audios/${voice.audio_file_path}`
    : voice.preview_url;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h4 className="font-medium text-white">{voice.nome_voz}</h4>
              <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPlatformColor(voice.plataforma)}`}>
                {voice.plataforma}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span className="font-mono">{voice.voice_id}</span>
              {voice.idioma && <span>• {voice.idioma}</span>}
              {voice.genero && <span>• {voice.genero}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {voice && (
            <VoicePreviewButton 
              voice={voice} 
              onPlay={() => playVoicePreview(voice)}
              isPlaying={isAudioPlaying(`voice-${voice.id}`)}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Voice Preview Button Component
interface VoicePreviewButtonProps {
  voice: Voice;
  onPlay: () => void;
  isPlaying: boolean;
}

const VoicePreviewButton: React.FC<VoicePreviewButtonProps> = ({ voice, onPlay, isPlaying }) => {

  return (
    <button
      onClick={onPlay}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isPlaying
          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
          : 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
      }`}
      title={isPlaying ? "Parar preview" : "Reproduzir preview"}
    >
      {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
    </button>
  );
};

// API Card Component
interface ApiCardProps {
  api: ApiKey;
  onDelete: () => void;
}

const ApiCard: React.FC<ApiCardProps> = ({ api, onDelete }) => {
  const getPlatformColor = (platform: string) => {
    return platform === 'ElevenLabs' ? 'bg-purple-500' : 'bg-cyan-500';
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <div>
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPlatformColor(api.plataforma)}`}>
                {api.plataforma}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{maskApiKey(api.api_key)}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;