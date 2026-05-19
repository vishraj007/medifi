// lib/hooks/useSessionStream.ts

import { useEffect, useState } from 'react'

interface SessionUpdate {
  transcript?: string
  translatedText?: string
  extractedData?: any
  nerEntities?: any
  finalReport?: string
  updatedAt?: string
}

export function useSessionStream(sessionId: string) {
  const [data, setData] = useState<SessionUpdate | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource(`/api/session/${sessionId}/stream`)

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('SSE Connected')
    }

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        setData(update)
      } catch (error) {
        console.error('Parse error:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setIsConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [sessionId])

  return { data, isConnected }
}