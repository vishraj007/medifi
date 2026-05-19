'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PatientLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (phone.length < 10) return
    if (mode === 'register' && !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/api/patient/login' : '/api/patient/register'
      const body = mode === 'login' ? { phone } : { phone, name: name.trim() }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      window.location.href = '/patient/dashboard'
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#030712;font-family:'Sora',sans-serif;overflow:hidden;}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-20px) rotate(3deg)}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.8);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes blobPulse{0%,100%{transform:scale(1) rotate(0deg)}50%{transform:scale(1.08) rotate(5deg)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden'
      }}>
        {/* Animated background blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', filter: 'blur(160px)', opacity: .055, background: 'radial-gradient(#6366f1,transparent 70%)', top: -200, left: -200, animation: 'blobPulse 14s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(140px)', opacity: .04, background: 'radial-gradient(#06b6d4,transparent 70%)', bottom: -150, right: -100, animation: 'blobPulse 18s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(99,102,241,.035) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(3,7,18,.85) 100%)' }} />
          {[200, 320, 440].map((r, i) => (
            <div key={r} style={{ position: 'absolute', top: '50%', left: '50%', width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: '50%', border: `1px solid rgba(99,102,241,${0.04 - i * 0.01})`, animation: `float ${12 + i * 3}s ease-in-out infinite`, animationDelay: `${i * 2}s` }} />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, padding: '0 20px', animation: 'fadeUp .6s ease both' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(99,102,241,.35)', margin: '0 auto' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <div style={{ position: 'absolute', inset: -4, borderRadius: 22, border: '1px solid rgba(99,102,241,.2)', animation: 'pulse-ring 2.5s ease-out infinite' }} />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f9fafb', letterSpacing: '-.025em', marginBottom: 6 }}>
              My Health Portal
            </h1>
            <p style={{ fontSize: '.875rem', color: '#6b7280', lineHeight: 1.6 }}>
              Access your consultations, reports<br />and medication reminders
            </p>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(17,24,39,.8)', borderRadius: 14, marginBottom: 20, border: '1px solid rgba(255,255,255,.06)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '.82rem', transition: 'all .2s', background: mode === m ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent', color: mode === m ? '#fff' : '#6b7280', boxShadow: mode === m ? '0 4px 12px rgba(99,102,241,.3)' : 'none' }}>
                {m === 'login' ? '🔑 Sign In' : '✨ Register'}
              </button>
            ))}
          </div>

          {/* Card */}
          <div style={{
            background: 'linear-gradient(165deg, rgba(17,24,39,.95), rgba(9,14,28,.98))',
            border: '1px solid rgba(255,255,255,.06)', borderRadius: 24,
            padding: '32px', position: 'relative',
            boxShadow: '0 40px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)',
            backdropFilter: 'blur(24px)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,.4),transparent)', borderRadius: 1 }} />

            {mode === 'register' && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '.72rem', fontFamily: 'JetBrains Mono', letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    style={{ width: '100%', background: 'rgba(17,24,39,.8)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '13px 16px 13px 44px', color: '#f9fafb', fontSize: '.9rem', outline: 'none', fontFamily: 'Sora', transition: 'border-color .2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '.72rem', fontFamily: 'JetBrains Mono', letterSpacing: '.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </div>
                <input
                  type="tel" maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', background: 'rgba(17,24,39,.8)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '13px 16px 13px 44px', color: '#f9fafb', fontSize: '.9rem', outline: 'none', fontFamily: 'Sora', transition: 'border-color .2s' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,.4)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
                />
              </div>
            </div>

            {error && (
              <p style={{ fontSize: '.8rem', color: '#f87171', marginBottom: 16, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || phone.length < 10 || (mode === 'register' && !name.trim())}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: (phone.length >= 10 && (mode === 'login' || name.trim()))
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'rgba(99,102,241,.15)',
                color: (phone.length >= 10 && (mode === 'login' || name.trim())) ? '#fff' : '#6b7280',
                fontSize: '.9rem', fontWeight: 700, fontFamily: 'Sora', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .3s',
                boxShadow: (phone.length >= 10) ? '0 8px 24px rgba(99,102,241,.35)' : 'none',
                opacity: loading ? 0.7 : 1
              }}>
              {loading
                ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : null}
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Access My Dashboard →' : 'Create Account →')}
            </button>

            <p style={{ textAlign: 'center', fontSize: '.75rem', color: '#4b5563', marginTop: 16 }}>
              {mode === 'login'
                ? 'Enter your registered mobile number to access your health portal'
                : 'Register with the same number your doctor has on file'}
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: '.72rem', color: '#374151', marginTop: 20, fontFamily: 'JetBrains Mono' }}>
            POWERED BY VOICE INTELLIGENCE
          </p>
        </div>
      </div>
    </>
  )
}