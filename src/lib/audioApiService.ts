import { supabase } from './supabase';

export interface VoiceData {
  voice_id: string;
  nome_voz: string;
  plataforma: string;
  idioma: string;
  genero: string;
  preview_url: string;
  description: string;
  [key: string]: any; // Para campos específicos de cada plataforma
}

export interface VoiceListResponse {
  voices: VoiceData[];
  pagination?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  total?: number;
}

class AudioApiService {
  private getSupabaseUrl() {
    return import.meta.env.VITE_SUPABASE_URL;
  }

  private getSupabaseAnonKey() {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  /**
   * Busca detalhes de uma voz específica do Fish-Audio
   */
  async fetchFishAudioVoice(voiceId: string, apiKey: string): Promise<VoiceData> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/fetch-fish-audio-voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        api_key: apiKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar voz Fish-Audio');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Busca detalhes de uma voz específica do ElevenLabs
   */
  async fetchElevenLabsVoice(voiceId: string, apiKey: string): Promise<VoiceData> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/fetch-elevenlabs-voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_id: voiceId,
        api_key: apiKey
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar voz ElevenLabs');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Lista vozes disponíveis do Fish-Audio
   */
  async listFishAudioVoices(
    apiKey: string, 
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      language?: string;
    } = {}
  ): Promise<VoiceListResponse> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/list-fish-audio-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        page: options.page || 1,
        page_size: options.pageSize || 20,
        search: options.search || '',
        language: options.language || ''
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao listar vozes Fish-Audio');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Lista vozes disponíveis do ElevenLabs
   */
  async listElevenLabsVoices(
    apiKey: string,
    options: {
      showLegacy?: boolean;
    } = {}
  ): Promise<VoiceListResponse> {
    const response = await fetch(`${this.getSupabaseUrl()}/functions/v1/list-elevenlabs-voices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        show_legacy: options.showLegacy || false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao listar vozes ElevenLabs');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Busca detalhes de uma voz baseado na plataforma
   */
  async fetchVoiceDetails(platform: string, voiceId: string, apiKey: string): Promise<VoiceData> {
    switch (platform.toLowerCase()) {
      case 'fish-audio':
        return this.fetchFishAudioVoice(voiceId, apiKey);
      case 'elevenlabs':
        return this.fetchElevenLabsVoice(voiceId, apiKey);
      default:
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  }

  /**
   * Lista vozes baseado na plataforma
   */
  async listVoices(platform: string, apiKey: string, options: any = {}): Promise<VoiceListResponse> {
    switch (platform.toLowerCase()) {
      case 'fish-audio':
        return this.listFishAudioVoices(apiKey, options);
      case 'elevenlabs':
        return this.listElevenLabsVoices(apiKey, options);
      default:
        throw new Error(`Plataforma não suportada: ${platform}`);
    }
  }

  /**
   * Salva uma voz no banco de dados local
   */
  async saveVoiceToDatabase(voiceData: VoiceData): Promise<void> {
    const { error } = await supabase
      .from('vozes')
      .insert([{
        nome_voz: voiceData.nome_voz,
        voice_id: voiceData.voice_id,
        plataforma: voiceData.plataforma,
        idioma: voiceData.idioma,
        genero: voiceData.genero,
        preview_url: voiceData.preview_url
      }]);

    if (error) {
      throw new Error(`Erro ao salvar voz: ${error.message}`);
    }
  }

  /**
   * Busca e salva uma voz automaticamente
   */
  async fetchAndSaveVoice(platform: string, voiceId: string, apiKey: string): Promise<VoiceData> {
    const voiceData = await this.fetchVoiceDetails(platform, voiceId, apiKey);
    await this.saveVoiceToDatabase(voiceData);
    return voiceData;
  }
}

export const audioApiService = new AudioApiService();