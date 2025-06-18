interface ElevenLabsConfig {
    apiKey: string
    voiceId?: string
    model?: string
  }
  
  interface SpeechOptions {
    text: string
    voiceId?: string
    model?: string
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
  
  export class ElevenLabsService {
    private apiKey: string
    private baseUrl = 'https://api.elevenlabs.io/v1'
    private defaultVoiceId = 'pNInz6obpgDQGcFmaJgB' // Adam voice
    private defaultModel = 'eleven_monolingual_v1'
  
    constructor(config: ElevenLabsConfig) {
      this.apiKey = config.apiKey
      if (config.voiceId) this.defaultVoiceId = config.voiceId
      if (config.model) this.defaultModel = config.model
    }
  
    async textToSpeech(options: SpeechOptions): Promise<ArrayBuffer> {
      const {
        text,
        voiceId = this.defaultVoiceId,
        model = this.defaultModel,
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0,
        useSpeakerBoost = true
      } = options
  
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost
          }
        })
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }
  
      return response.arrayBuffer()
    }
  
    async getVoices() {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      })
  
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`)
      }
  
      return response.json()
    }
  }
  
  // Utility function to clean text for speech
  export function cleanTextForSpeech(text: string): string {
    // Remove markdown formatting
    let cleanText = text
      .replace(/```[\s\S]*?```/g, '[code block]') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code backticks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
      .replace(/\[([^\]]+)\]$$[^)]+$$/g, '$1') // Replace links with just the text
      .replace(/#{1,6}\s+/g, '') // Remove heading markers
      .replace(/>\s+/g, '') // Remove blockquote markers
      .replace(/\n{2,}/g, '. ') // Replace multiple newlines with periods
      .replace(/\n/g, ' ') // Replace single newlines with spaces
      .trim()
  
    // Limit length to avoid very long audio
    if (cleanText.length > 2000) {
      cleanText = cleanText.substring(0, 2000) + '...'
    }
  
    return cleanText
  }
  