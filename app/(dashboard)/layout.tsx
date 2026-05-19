// app/(dashboard)/layout.tsx
// UPDATED: Added useCallScheduler — fires scheduled calls while app is open in browser

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCallScheduler } from '@/lib/hooks/useCallScheduler'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  // ── Scheduler runs every 30s while this layout is mounted ──────────────
  useCallScheduler()

  useEffect(() => { verifyAuth() }, [])

  const verifyAuth = async () => {
    try {
      const res = await fetch('/api/auth/verify')
      if (!res.ok) {
        // Middleware handles protection; this is a fallback
        router.replace('/login')
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch {
      router.replace('/login')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #00D4FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <header style={{
        background: '#0D0D0D',
        borderBottom: '1px solid #1A1A1A',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #001824, #003040)',
              border: '1px solid #00D4FF33',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E8E8E8', letterSpacing: '0.01em' }}>Voice Intelligence</div>
              <div style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.1em' }}>
                {user.role.replace('_', ' ')} {user.department ? `· ${user.department.replace(/_/g, ' ')}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Scheduler status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#051A10', border: '1px solid #00F5A022', borderRadius: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F5A0', boxShadow: '0 0 6px #00F5A0', animation: 'pulse 2s infinite', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#00F5A0', fontFamily: 'IBM Plex Mono, monospace' }}>scheduler active</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#141414', border: '1px solid #1E1E1E', borderRadius: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <span style={{ fontSize: 13, color: '#AAA' }}>{user.name}</span>
            </div>

            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', background: '#141414',
              border: '1px solid #2A2A2A', borderRadius: 8,
              color: '#666', fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s'
            }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = '#ef444466'); (e.currentTarget.style.color = '#ef4444') }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = '#2A2A2A'); (e.currentTarget.style.color = '#666') }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Logout
            </button>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}