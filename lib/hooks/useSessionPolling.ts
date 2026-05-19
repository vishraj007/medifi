// lib/hooks/useSessionPolling.ts

import { useEffect, useState } from 'react'

export function useSessionPolling(sessionId: string, interval = 3000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`)
        const session = await res.json()
        setData(session)
        setLoading(false)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    fetchSession()
    const intervalId = setInterval(fetchSession, interval)

    return () => clearInterval(intervalId)
  }, [sessionId, interval])

  return { data, loading }
}