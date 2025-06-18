import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

interface UseTextToSpeechOptions {
  voiceId?: string
  model?: string
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTextRef = useRef<string>('')

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast.error('No text to read')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      currentTextRef.current = text

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voiceId: options.voiceId,
          model: options.model
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate speech')
      }

      // Create audio blob and play
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onloadstart = () => setIsLoading(false)
      audio.onplay = () => setIsPlaying(true)
      audio.onpause = () => setIsPlaying(false)
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }
      audio.onerror = () => {
        setError('Failed to play audio')
        setIsPlaying(false)
        setIsLoading(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
        toast.error('Failed to play audio')
      }

      await audio.play()

    } catch (error) {
      console.error('Text-to-speech error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [options.voiceId, options.model])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isLoading,
    isPlaying,
    error,
    currentText: currentTextRef.current
  }
}
