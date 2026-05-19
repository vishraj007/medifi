// components/session/VoiceRecorder.tsx

'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceRecorderProps {
  onTranscript: (original: string, translated: string) => void
  language: 'ENGLISH' | 'HINDI' | 'KANNADA'
}

export function VoiceRecorder({ onTranscript, language }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      // Transcribe
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('language', language)

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!transcribeRes.ok) {
        throw new Error('Transcription failed')
      }

      const { transcript } = await transcribeRes.json()

      // Translate if needed
      const langCode = { 
        ENGLISH: 'en-IN', 
        HINDI: 'hi-IN', 
        KANNADA: 'kn-IN' 
      }[language]
      
      const translateRes = await fetch('/api/voice/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript, sourceLang: langCode })
      })

      const { translated } = await translateRes.json()

      onTranscript(transcript, translated)
    } catch (error) {
      console.error('Audio processing failed:', error)
      alert('Failed to process audio. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        size="lg"
        variant={isRecording ? 'destructive' : 'default'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className="rounded-full w-20 h-20 shadow-lg hover:shadow-xl transition-all"
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      <p className="text-sm font-medium">
        {isProcessing ? 'Processing...' : isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
      </p>
      {isRecording && (
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75"></span>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-150"></span>
        </div>
      )}
    </div>
  )
}