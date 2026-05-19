// lib/hooks/useCallScheduler.ts
// Runs in the browser every minute while the app is open.
// Fires scheduled appointment calls and medication reminder calls at the right IST time.
// No Vercel Cron, no external service needed.

'use client'

import { useEffect, useRef } from 'react'

export function useCallScheduler() {
  const lastFiredMinute = useRef<string>('')

  useEffect(() => {
    const tick = async () => {
      // Get current IST HH:MM
      const nowIST = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).slice(0, 5) // "09:47"

      // Deduplicate — only run once per minute
      if (nowIST === lastFiredMinute.current) return
      lastFiredMinute.current = nowIST

      try {
        const res = await fetch('/api/cron/scheduled-calls', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'local'}`,
          },
        })
        const data = await res.json()
        if (data.fired > 0) {
          console.log(`[Scheduler] ${data.fired} call(s) fired at IST ${nowIST}`, data.results)
        }
      } catch (err) {
        console.error('[Scheduler] tick failed:', err)
      }
    }

    // Run immediately on mount, then every 30 seconds
    // (30s interval means we never miss a minute even if the tab was slightly idle)
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
}