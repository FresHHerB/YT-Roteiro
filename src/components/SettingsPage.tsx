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
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [voiceTestError, setVoiceTestError] = useState<string>('');
  
  // Audio preview state
  const [playingAudio, setPlayingAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  
  // Filter state
  const [voiceFilter, setVoiceFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');

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
  const getVoicePreviewUrl = async (voiceId: string, platform: string): Promise<{ preview_url: string | null; voice_data?: any }> => {
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
          throw new Error(`Voice ID não encontrado na ElevenLabs: ${response.status}`);
        }

        const data = await response.json();
        return {
          preview_url: data.preview_url || null,
          voice_data: {
            name: data.name,
            labels: data.labels,
            description: data.description
          }
        };
      } else if (platform === 'Fish-Audio') {
        const response = await fetch(`https://api.fish.audio/model/${voiceId}`, {
          headers: {
            'Authorization': `Bearer ${platformApi.api_key}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Model ID não encontrado na Fish-Audio: ${response.status}`);
        }

        const data = await response.json();
        // Fish-Audio não tem preview_url direto, mas tem samples
        let previewUrl = null;
        if (data.samples && data.samples.length > 0) {
          // Pega o primeiro sample como preview
          previewUrl = data.samples[0].audio_url || null;
        }
        
        return {
          preview_url: previewUrl,
          voice_data: {
            name: data.title,
            description: data.description,
            languages: data.languages,
            type: data.type
          }
        };
      }

      return { preview_url: null };
    } catch (error) {
      console.error('Erro ao obter URL de preview:', error);
      return { preview_url: null };
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
      const { preview_url: freshPreviewUrl } = await getVoicePreviewUrl(voice.voice_id, voice.plataforma);
      
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

  // Voice test function for modal
  const handleVoiceTest = async () => {
    console.log('🎯 handleVoiceTest chamada');
    console.log('🎯 Form data:', { voiceId: voiceForm.voice_id, platform: voiceForm.plataforma });
    
    const audioId = `voice-test-modal`;
    
    if (isAudioPlaying(audioId)) {
      console.log('🎯 Parando áudio atual');
      pauseAudio();
      return;
    }

    if (!voiceForm.voice_id.trim() || !voiceForm.plataforma) {
      console.log('🎯 ❌ Dados insuficientes para teste');
      setVoiceTestError('Voice ID e plataforma são necessários para o teste');
      return;
    }

    console.log('🎯 Iniciando teste de voz...');
    setIsTestingVoice(true);
    setVoiceTestError('');

    try {
      console.log('🎯 Chamando generateVoiceTest...');
      const audioUrl = await generateVoiceTest(voiceForm.voice_id, voiceForm.plataforma);
      console.log('🎯 Audio URL recebida:', audioUrl);
      
      if (audioUrl) {
        console.log('🎯 Reproduzindo áudio...');
        playAudio(audioUrl, audioId);
      } else {
        console.log('🎯 ❌ Audio URL é null');
        setVoiceTestError('Não foi possível gerar o áudio de teste');
      }
    } catch (error) {
      console.error('🎯 ❌ Erro no handleVoiceTest:', error);
      console.error('Erro no teste de voz:', error);
      setVoiceTestError(error instanceof Error ? error.message : 'Erro ao testar voz');
    } finally {
      console.log('🎯 Finalizando teste de voz');
      setIsTestingVoice(false);
    }
  };

  // Generate voice test audio
  const generateVoiceTest = async (voiceId: string, platform: string): Promise<string | null> => {
    console.log('🚀 generateVoiceTest chamada:', { voiceId, platform });
    
    try {
      console.log('📋 APIs disponíveis:', apis);
      
      // Check if API key exists for the platform
      // Get API key for the platform
      const platformApi = apis.find(api => api.plataforma === platform);
      console.log('🔑 API encontrada para', platform, ':', !!platformApi);
      
      if (!platformApi) {
        console.error('❌ API key não encontrada para', platform);
        throw new Error(`API key não encontrada para ${platform}`);
      }

      // Validate API key is not empty
      if (!platformApi.api_key || platformApi.api_key.trim() === '') {
        console.error('❌ API key vazia para', platform);
        throw new Error(`API key para ${platform} está vazia. Configure a API key nas configurações.`);
      }

      console.log('✅ API key válida encontrada para', platform);
      const testText = "Olá! Este é um teste de voz para verificar a qualidade e o som desta voz artificial.";

      if (platform === 'ElevenLabs') {
        console.log('Fazendo requisição para ElevenLabs:', {
          url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          voiceId,
          hasApiKey: !!platformApi.api_key
        });

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': platformApi.api_key
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
          let errorMessage = `Erro ElevenLabs: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage += ` - ${errorData.detail?.message || errorData.message || 'Erro desconhecido'}`;
          } catch {
            const errorText = await response.text();
            errorMessage += ` - ${errorText || 'Erro desconhecido'}`;
          }
          throw new Error(errorMessage);
        }

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) {
          throw new Error('Áudio recebido está vazio');
        }
        return URL.createObjectURL(audioBlob);

      } else if (platform === 'Fish-Audio') {
        console.log('🐟 INICIANDO REQUISIÇÃO FISH-AUDIO');
        console.log('🐟 Voice ID:', voiceId);
        console.log('🐟 API Key presente:', !!platformApi.api_key);
        console.log('🐟 API Key (primeiros 10 chars):', platformApi.api_key.substring(0, 10) + '...');
        
        const requestBody = {
          text: testText,
          reference_id: voiceId,
          format: "mp3",
          mp3_bitrate: 128,
          opus_bitrate: 128,
          latency: "normal"
        };
        
        const requestHeaders = {
          'Authorization': `Bearer ${platformApi.api_key}`,
          'Content-Type': 'application/json'
        };
        
        console.log('Fazendo requisição para Fish-Audio:', {
          url: 'https://api.fish.audio/v1/tts',
          voiceId,
          hasApiKey: !!platformApi.api_key
        });

       console.log('🐟 Fish-Audio Request Body:', requestBody);
       console.log('🐟 Fish-Audio Request Headers:', {
         'Authorization': `Bearer ${platformApi.api_key.substring(0, 10)}...`,
         'Content-Type': 'application/json'
       });

        console.log('🐟 Enviando requisição...');
        
        console.log('🐟 Fish-Audio: Fazendo requisição TTS...');
        const response = await fetch('https://api.fish.audio/v1/tts', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody)
        });
        
       console.log('🐟 Fish-Audio Response Headers:', Object.fromEntries(response.headers.entries()));

        console.log('🐟 Fish-Audio Response Status:', response.status);
        console.log('🐟 Fish-Audio Response Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
         console.log('🐟 ❌ Fish-Audio Error Response Status:', response.status);
         
         // Log da resposta de erro
         const responseText = await response.text();
         console.log('🐟 ❌ Fish-Audio Error Response Text:', responseText);
         
         // Tentar parsear como JSON
         try {
           const errorData = JSON.parse(responseText);
           console.log('🐟 ❌ Fish-Audio Error Data (JSON):', errorData);
         } catch (jsonError) {
           console.log('🐟 ❌ Fish-Audio Error - não é JSON válido');
         }

          let errorMessage = `Erro Fish-Audio: ${response.status}`;
          try {
           const errorData = JSON.parse(responseText);
            errorMessage += ` - ${errorData.error?.message || errorData.message || 'Erro desconhecido'}`;
          } catch {
          let errorMessage = `Status ${response.status}`;
          try {
            const errorText = await response.text();
            console.error('🐟 Fish-Audio Error Response:', errorText);
            
            // Tentar parsear JSON do erro
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorText;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } catch (e) {
            console.error('🐟 Erro ao ler resposta de erro:', e);
          }
          throw new Error(`Erro Fish-Audio: ${errorMessage}`);
        }

        console.log('🐟 Fish-Audio: Convertendo resposta para blob...');
       console.log('🐟 ✅ Fish-Audio Success Response - convertendo para blob...');
        const audioBlob = await response.blob();
        console.log('🐟 Fish-Audio Blob Info:', {
          size: audioBlob.size,
          type: audioBlob.type
        });
        
        if (audioBlob.size === 0) {
          throw new Error('Fish-Audio retornou áudio vazio');
        }

        console.log('🐟 Fish-Audio: Criando URL do áudio...');
       console.log('🐟 ✅ Fish-Audio Audio Blob:', {
         size: audioBlob.size,
         type: audioBlob.type
       });
       
        if (audioBlob.size === 0) {
          console.error('🐟 ❌ Áudio recebido está vazio');
          throw new Error('Áudio recebido está vazio');
        }
       
       console.log('🐟 ✅ Fish-Audio - criando URL do blob...');
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('🐟 ✅ Audio URL criada:', audioUrl);
        return audioUrl;
      }

      console.log('❌ Plataforma não suportada:', platform);
      throw new Error('Plataforma não suportada para teste');
    }
  } catch (error) {
    console.error('💥 Erro completo em generateVoiceTest:', error);
    console.error('Erro ao gerar teste de voz:', error);
    throw error;
  }
};

  const playSelectedVoicePreview = () => {

  // Filter voices based on search and platform
  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.nome_voz.toLowerCase().includes(voiceFilter.toLowerCase()) ||
                         voice.voice_id.toLowerCase().includes(voiceFilter.toLowerCase());
    const matchesPlatform = platformFilter === '' || voice.plataforma === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  // Get unique platforms for filter
  const uniquePlatforms = [...new Set(voices.map(voice => voice.plataforma))];

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
        throw new Error(`Voice ID não encontrado na ElevenLabs: ${response.status}`);
      }

      const data = await response.json();
      return {
        nome_voz: data.name,
        preview_url: data.preview_url,
        idioma: data.labels?.accent || data.verified_languages?.[0]?.language || '',
        genero: data.labels?.gender || ''
      };
    } else if (platform === 'Fish-Audio') {
      const response = await fetch(`https://api.fish.audio/model/${voiceId}`, {
        headers: {
          'Authorization': `Bearer ${platformApi.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Model ID não encontrado na Fish-Audio: ${response.status}`);
      }

      const data = await response.json();
      
      // Fish-Audio não tem preview_url direto, mas tem samples
      let previewUrl = null;
      if (data.samples && data.samples.length > 0) {
        previewUrl = data.samples[0].audio_url || null;
      }
      
      return {
        nome_voz: data.title,
        preview_url: previewUrl,
        idioma: data.languages?.join(', ') || '',
        genero: '' // Fish-Audio não fornece informação de gênero diretamente
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
      
      setVoiceSearchError('✅ Dados da voz carregados com sucesso!');
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
    setVoiceTestError('');
    setIsTestingVoice(false);
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

            {/* Voice Filters */}
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Buscar Vozes
                  </label>
                  <input
                    type="text"
                    value={voiceFilter}
                    onChange={(e) => setVoiceFilter(e.target.value)}
                    placeholder="Nome da voz ou Voice ID..."
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Platform Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Filtrar por Plataforma
                  </label>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="w-full p-3 bg-black border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-white"
                  >
                    <option value="">Todas as plataformas</option>
                    {uniquePlatforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Voices List */}
            <div className="space-y-4">
              {isLoadingVoices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{voices.length === 0 ? 'Nenhuma voz cadastrada' : 'Nenhuma voz encontrada com os filtros aplicados'}</p>
                </div>
              ) : (
                filteredVoices.map((voice) => (
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

                {/* Voice Test Button */}
                {voiceForm.voice_id.trim() && voiceForm.plataforma && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Teste de Voz
                    </label>
                    <button
                      type="button"
                      onClick={handleVoiceTest}
                      disabled={isTestingVoice || !voiceForm.voice_id.trim()}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm transition-all duration-200 w-full justify-center ${
                        isTestingVoice || !voiceForm.voice_id.trim()
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : isAudioPlaying(`voice-test-modal`)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isTestingVoice ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Carregando áudio...</span>
                        </>
                      ) : isAudioPlaying(`voice-test-modal`) ? (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Parar Teste</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Testar Voz</span>
                        </>
                      )}
                    </button>
                    {voiceTestError && (
                      <p className="text-xs text-red-400">
                        {voiceTestError}
                      </p>
                    )}
                  </div>
                )}

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
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                  >
                    {isSubmittingVoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{editingVoice ? 'Atualizar' : 'Salvar'}</span>
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
                    placeholder="Digite a API Key"
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
                    className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                  >
                    {isSubmittingApi ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{editingApi ? 'Atualizar' : 'Salvar'}</span>
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para determinar as cores baseadas na plataforma
  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'ElevenLabs':
        return {
          bg: 'bg-purple-900/30',
          text: 'text-purple-400',
          border: 'border-purple-800'
        };
      case 'Fish-Audio':
        return {
          bg: 'bg-cyan-900/30',
          text: 'text-cyan-400',
          border: 'border-cyan-800'
        };
      default:
        return {
          bg: 'bg-blue-900/30',
          text: 'text-blue-400',
          border: 'border-blue-800'
        };
    }
  };

  const platformColors = getPlatformColors(voice.plataforma);
  return (
    <div className="bg-black/30 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{voice.nome_voz}</h4>
          <p className="text-sm text-gray-400 mb-2">ID: {voice.voice_id}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className={`px-2 py-1 ${platformColors.bg} ${platformColors.text} border ${platformColors.border} rounded-md font-medium`}>
              {voice.plataforma}
            </span>
            {voice.idioma && <span>{voice.idioma}</span>}
            {voice.genero && <span>{voice.genero}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(voice.preview_url || voice.voice_id) && (
            <button
              onClick={onPlayPreview}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={isPlaying ? 'Parar preview' : 'Reproduzir preview'}
            >
              {isPlaying ? (
                <Square className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
            title="Editar voz"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
            title="Excluir voz"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Criado em {formatDate(voice.created_at)}
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  // Função para determinar as cores baseadas na plataforma
  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'ElevenLabs':
        return {
          bg: 'bg-purple-900/30',
          text: 'text-purple-400',
          border: 'border-purple-800'
        };
      case 'Fish-Audio':
        return {
          bg: 'bg-cyan-900/30',
          text: 'text-cyan-400',
          border: 'border-cyan-800'
        };
      default:
        return {
          bg: 'bg-blue-900/30',
          text: 'text-blue-400',
          border: 'border-blue-800'
        };
    }
  };

  const platformColors = getPlatformColors(api.plataforma);
  return (
    <div className="bg-black/30 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-medium text-white">{api.plataforma}</h4>
            <span className={`px-2 py-1 ${platformColors.bg} ${platformColors.text} border ${platformColors.border} rounded-md font-medium text-xs`}>
              {api.plataforma}
            </span>
          </div>
          <p className="text-sm text-gray-400 font-mono">{maskApiKey(api.api_key)}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
            title="Editar API"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200"
            title="Excluir API"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Criado em {formatDate(api.created_at)}
      </div>
    </div>
  );