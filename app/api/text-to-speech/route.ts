import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsService, cleanTextForSpeech } from '@/lib/elevenlabs'

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, model } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Get ElevenLabs API key from environment variables
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    // Clean the text for speech
    const cleanText = cleanTextForSpeech(text)
    
    if (cleanText.length === 0) {
      return NextResponse.json({ error: 'No readable text found' }, { status: 400 })
    }

    // Initialize ElevenLabs service
    const elevenLabs = new ElevenLabsService({ apiKey })

    // Generate speech
    const audioBuffer = await elevenLabs.textToSpeech({
      text: cleanText,
      voiceId,
      model
    })

    // Return the audio as a response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Text-to-speech error:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    )
  }
}
