'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Language Cycler ────────────────────────────────────────────────────────────
function LanguageCycler({ texts, interval = 3000, style = {} }: { texts: string[]; interval?: number; style?: React.CSSProperties }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % texts.length)
        setVisible(true)
      }, 400)
    }, interval)
    return () => clearInterval(timer)
  }, [texts.length, interval])

  return (
    <span style={{
      ...style,
      display: 'inline-block',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
    }}>
      {texts[index]}
    </span>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activityIndex, setActivityIndex] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const activityFeed = [
    { icon: '⬡', color: '#22d3ee', label: 'NLP Engine', msg: 'Transcription complete — 98.4% accuracy', time: 'just now', domain: 'HEALTHCARE' },
    { icon: '⬡', color: '#818cf8', label: 'Risk Model', msg: 'Portfolio delta hedged — exposure reduced', time: '12s ago', domain: 'FINANCE' },
    { icon: '⬡', color: '#34d399', label: 'Entity Extract', msg: 'ICD-10 codes mapped: E11.9, I10, J45.50', time: '28s ago', domain: 'HEALTHCARE' },
    { icon: '⬡', color: '#818cf8', label: 'Compliance', msg: 'SEBI disclosure flagged for review', time: '44s ago', domain: 'FINANCE' },
    { icon: '⬡', color: '#22d3ee', msg: 'Voice session ended — summary generated', label: 'Session', time: '1m ago', domain: 'HEALTHCARE' },
  ]

  const features = [
    { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', color: '#22d3ee', title: 'Real-time Transcription', desc: '98.4% accuracy across medical & financial terminology' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#818cf8', title: 'Domain Intelligence', desc: 'Dual-mode: Healthcare & Finance in one platform' },
    { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: '#34d399', title: 'HIPAA & SEBI Compliant', desc: 'End-to-end encrypted, audit-logged, role-gated' },
    { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: '#f59e0b', title: 'Instant Summaries', desc: 'AI-generated SOAP notes & trade reports in seconds' },
  ]

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActivityIndex(i => (i + 1) % activityFeed.length)
    }, 2800)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Card 3D tilt effect
  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `perspective(1200px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) translateZ(8px)`
      card.style.transition = 'transform .08s ease-out'

      const shine = card.querySelector('.card-shine') as HTMLDivElement
      if (shine) {
        shine.style.opacity = '1'
        shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(34,211,238,.06) 0%, transparent 55%)`
      }
    }

    const handleLeave = () => {
      card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateZ(0)'
      card.style.transition = 'transform .6s cubic-bezier(.23,1,.32,1)'
      const shine = card.querySelector('.card-shine') as HTMLDivElement
      if (shine) shine.style.opacity = '0'
    }

    card.addEventListener('mousemove', handleMove)
    card.addEventListener('mouseleave', handleLeave)
    return () => {
      card.removeEventListener('mousemove', handleMove)
      card.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Login failed')
      }
      const { user } = await res.json()
      if (user.role === 'ADMIN') window.location.href = '/admin/analytics'
      else window.location.href = '/domain-select'
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type: 'doctor' | 'finance' | 'admin') => {
    const creds = {
      doctor: { email: 'doctor@hospital.com', password: 'doctor123' },
      finance: { email: 'agent@finance.com', password: 'agent123' },
      admin: { email: 'admin@hospital.com', password: 'admin123' },
    }
    setEmail(creds[type].email)
    setPassword(creds[type].password)
  }

  const activity = activityFeed[activityIndex]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020408',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020408 !important; cursor: none; }

        /* custom cursor */
        .cursor-dot {
          width: 12px; height: 12px; background: #22d3ee; border-radius: 50%;
          position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999;
          mix-blend-mode: difference; transition: transform .02s;
        }
        .cursor-ring {
          width: 36px; height: 36px; border: 1.5px solid rgba(34,211,238,.5);
          border-radius: 50%; position: fixed; top: 0; left: 0;
          pointer-events: none; z-index: 9998; transition: transform .08s ease-out;
        }

        /* dot grid */
        .dot-grid {
          position: fixed; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none; z-index: 0;
        }

        /* scan lines overlay */
        .scanlines {
          position: fixed; inset: 0;
          background-image: repeating-linear-gradient(
            0deg, transparent, transparent 2px, rgba(0,0,0,.012) 2px, rgba(0,0,0,.012) 4px
          );
          pointer-events: none; z-index: 0;
        }

        /* vignette */
        .vignette {
          position: fixed; inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.65) 100%);
          pointer-events: none; z-index: 0;
        }

        /* ambient orbs */
        .orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(1px); }
        .orb-c { width:700px;height:700px;background:radial-gradient(circle,rgba(34,211,238,.08) 0%,transparent 70%);top:-200px;left:-200px;animation:orbDrift 18s ease-in-out infinite; }
        .orb-i { width:600px;height:600px;background:radial-gradient(circle,rgba(129,140,248,.07) 0%,transparent 70%);bottom:-150px;right:-150px;animation:orbDrift 22s ease-in-out infinite reverse; }
        .orb-e { width:400px;height:400px;background:radial-gradient(circle,rgba(52,211,153,.06) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);animation:orbDrift 26s ease-in-out infinite 4s; }
        .orb-f { width:300px;height:300px;background:radial-gradient(circle,rgba(245,158,11,.04) 0%,transparent 70%);top:20%;right:30%;animation:orbDrift 30s ease-in-out infinite 8s; }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-50px) scale(1.05)} }

        /* floating orb particles */
        .float-orb {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
        }

        /* torus ring */
        .torus-ring {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          animation: torusRotate 20s linear infinite;
        }
        @keyframes torusRotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        /* wire cube */
        .wire-cube-deco {
          position: fixed; transform-style: preserve-3d;
          animation: cubeY 14s linear infinite; pointer-events: none; z-index: 0;
        }
        .cube-face {
          position: absolute; border: 1px solid; background: transparent;
        }
        @keyframes cubeY { from{transform:rotateX(16deg) rotateY(0deg)} to{transform:rotateX(16deg) rotateY(360deg)} }

        /* perspective grid */
        .perspective-grid {
          position: fixed; bottom: 0; left: 0; right: 0; height: 280px;
          background-image:
            linear-gradient(rgba(34,211,238,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,.035) 1px, transparent 1px);
          background-size: 70px 70px;
          transform: perspective(600px) rotateX(68deg);
          transform-origin: bottom;
          mask-image: linear-gradient(to top, rgba(0,0,0,.5), transparent);
          pointer-events: none; z-index: 0;
        }

        /* DNA helix dots */
        .dna-container { position: fixed; pointer-events: none; z-index: 0; }

        /* floating particles */
        .particle {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          animation: particleFloat linear infinite;
          opacity: 0;
        }
        @keyframes particleFloat {
          0%{transform:translateY(0) translateX(0);opacity:0}
          10%{opacity:.6}
          90%{opacity:.3}
          100%{transform:translateY(-600px) translateX(80px);opacity:0}
        }

        /* ── login card ── */
        .card {
          width: 100%; max-width: 460px;
          background: linear-gradient(165deg, rgba(8,12,24,.96), rgba(3,6,15,.98));
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 28px; padding: 48px 44px 40px;
          position: relative; z-index: 2;
          backdrop-filter: blur(40px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.02),
            16px 16px 48px rgba(0,0,0,.8),
            -4px -4px 16px rgba(255,255,255,.02),
            inset 0 1px 0 rgba(255,255,255,.06),
            inset 0 -1px 0 rgba(0,0,0,.4);
          overflow: hidden;
          transform-style: preserve-3d;
          transition: border-color .4s, box-shadow .5s;
        }
        .card:hover {
          border-color: rgba(34,211,238,.12);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.03),
            0 40px 80px rgba(0,0,0,.85),
            0 0 60px rgba(34,211,238,.04),
            inset 0 1px 0 rgba(255,255,255,.07);
        }

        /* card shine overlay */
        .card-shine {
          position: absolute; inset: 0; border-radius: 28px;
          opacity: 0; transition: opacity .4s; pointer-events: none; z-index: 10;
        }

        /* top accent line */
        .card-accent-top {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #22d3ee88, #818cf855, transparent);
          z-index: 5;
        }

        /* bottom accent line */
        .card-accent-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2.5px;
          background: linear-gradient(90deg, transparent 5%, #22d3ee44 30%, #818cf833 60%, #34d39933 80%, transparent 95%);
          border-radius: 0 0 28px 28px;
        }

        /* grid pattern overlay */
        .card-grid {
          position: absolute; inset: 0; opacity: .02;
          background-image:
            linear-gradient(rgba(34,211,238,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px);
          background-size: 36px 36px;
          border-radius: 28px; pointer-events: none;
        }

        /* corner glow */
        .card-corner-glow {
          position: absolute; top: -50px; right: -50px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(34,211,238,.08), transparent 65%);
          border-radius: 50%; pointer-events: none; filter: blur(20px);
        }
        .card-corner-glow-bl {
          position: absolute; bottom: -30px; left: -30px;
          width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(129,140,248,.06), transparent 65%);
          border-radius: 50%; pointer-events: none; filter: blur(15px);
        }

        /* scan line */
        .scan-line {
          position: absolute; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.12),transparent);
          animation: scanLine 7s linear infinite; pointer-events:none; z-index: 6;
        }
        @keyframes scanLine { 0%{top:-2%;opacity:0} 5%{opacity:1} 95%{opacity:1} 100%{top:102%;opacity:0} }

        /* logo */
        .logo-icon {
          width:58px;height:58px;border-radius:18px;
          background:linear-gradient(135deg,rgba(34,211,238,.1),rgba(129,140,248,.08));
          border:1px solid rgba(34,211,238,.22);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 18px; position:relative;
          box-shadow:
            6px 6px 20px rgba(0,0,0,.5),
            -3px -3px 10px rgba(255,255,255,.03),
            0 0 30px rgba(34,211,238,.08),
            inset 0 1px 0 rgba(255,255,255,.08);
        }
        .logo-ring {
          position: absolute; inset: -8px; border-radius: 24px;
          border: 1px dashed rgba(34,211,238,.2);
          animation: spinRing 12s linear infinite;
        }
        .logo-orbit-dot {
          position: absolute; inset: -6px; border-radius: 22px;
          animation: spinRing 8s linear infinite;
        }
        .logo-orbit-dot::after {
          content: ''; position: absolute; top: -2px; left: 50%;
          width: 4px; height: 4px; border-radius: 50%;
          background: #22d3ee; box-shadow: 0 0 8px #22d3ee;
          transform: translateX(-50%);
        }
        @keyframes spinRing { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .live-dot {
          position:absolute;top:-4px;right:-4px;
          width:10px;height:10px;border-radius:50%;
          background:#22d3ee;box-shadow:0 0 8px #22d3ee, 0 0 16px rgba(34,211,238,.3);
          animation:blink2 1.5s ease-in-out infinite;
          border:2px solid rgba(5,8,18,1);
        }
        @keyframes blink2 { 0%,100%{opacity:1} 50%{opacity:.2} }

        .grad-span {
          background:linear-gradient(135deg,#22d3ee,#818cf8);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }

        /* inputs */
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          pointer-events: none; z-index: 2;
        }
        .login-input {
          width:100%; background:rgba(3,6,15,.85);
          border:1px solid rgba(255,255,255,.07); border-radius:14px;
          padding:14px 16px 14px 46px; color:#f8fafc; font-size:.88rem;
          font-family:'Outfit',sans-serif; outline:none;
          transition:border-color 0.3s, box-shadow 0.3s, background 0.3s;
        }
        .login-input:focus {
          border-color:rgba(34,211,238,.3);
          box-shadow:0 0 0 4px rgba(34,211,238,.05), 0 0 20px rgba(34,211,238,.04);
          background:rgba(3,6,15,.95);
        }
        .login-input::placeholder { color:#2a3444; }

        .input-label {
          display:flex; align-items:center; gap:8px;
          font-family:'JetBrains Mono',monospace; font-size:.65rem;
          color:#475569; letter-spacing:.12em; text-transform:uppercase;
          margin-bottom:10px;
        }
        .input-label-dot {
          width:4px; height:4px; border-radius:50%;
          transition: background .3s, box-shadow .3s;
        }

        /* password toggle */
        .pass-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #475569; transition: color .2s;
          z-index: 2;
        }
        .pass-toggle:hover { color: #22d3ee; }

        /* submit */
        .submit-btn {
          width:100%; padding:15px;
          background:linear-gradient(135deg,#22d3ee,#818cf8,#34d399);
          background-size:200% 200%; border:none; border-radius:100px;
          color:#000; font-size:.9rem; font-weight:700; font-family:'Outfit',sans-serif;
          cursor:pointer; letter-spacing:.03em;
          box-shadow:0 0 28px rgba(34,211,238,.3), 0 12px 28px rgba(0,0,0,.5);
          animation:gradShift 4s ease infinite;
          transition:transform 0.2s,box-shadow 0.3s;
          margin-top:10px; position:relative; overflow:hidden;
        }
        .submit-btn::after {
          content:''; position:absolute; top:0; left:-100%; width:50%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
          animation:shimmer 3s ease-in-out infinite;
        }
        .submit-btn:hover:not(:disabled) {
          transform:translateY(-2px) scale(1.01);
          box-shadow:0 0 50px rgba(34,211,238,.45), 0 20px 40px rgba(0,0,0,.6);
        }
        .submit-btn:active:not(:disabled) { transform:translateY(0) scale(.99); }
        .submit-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes shimmer { 0%{left:-100%} 100%{left:250%} }

        /* demo btns */
        .demo-section-label {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 14px;
        }
        .demo-section-label::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,.06), transparent);
        }
        .demo-btn {
          padding:8px 18px; flex:1;
          background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06);
          border-radius:12px; color:#64748b; font-size:.72rem;
          font-family:'JetBrains Mono',monospace; letter-spacing:.06em;
          text-transform:uppercase; cursor:pointer;
          transition:all 0.3s; position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .demo-btn::after {
          content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.08),transparent);
          animation:shimmer 3s ease infinite;
        }
        .demo-btn:hover {
          background:rgba(34,211,238,.05);border-color:rgba(34,211,238,.2);
          color:#22d3ee;transform:translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,.3), 0 0 12px rgba(34,211,238,.06);
        }
        .demo-btn-doctor:hover { border-color:rgba(34,211,238,.25); color:#22d3ee; }
        .demo-btn-finance:hover { border-color:rgba(52,211,153,.25); color:#34d399; }
        .demo-btn-admin:hover { border-color:rgba(129,140,248,.25); color:#818cf8; }

        /* error */
        .error-box {
          padding:12px 16px;
          background:rgba(248,113,113,.05);
          border:1px solid rgba(248,113,113,.2);
          border-radius:14px;color:#f87171;font-size:.82rem;
          display:flex;align-items:center;gap:10px;
          animation: shakeError .4s ease;
        }
        @keyframes shakeError {
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-6px)}
          75%{transform:translateX(6px)}
        }

        /* spinner */
        .spinner {
          width:15px;height:15px;
          border:2px solid rgba(0,0,0,.2);border-top-color:#000;
          border-radius:50%;animation:spin .6s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* ── floating cards ── */
        .float-card {
          position: absolute;
          background: linear-gradient(165deg, rgba(8,12,24,.95), rgba(3,6,15,.98));
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 22px;
          backdrop-filter: blur(30px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.02),
            12px 12px 36px rgba(0,0,0,.7),
            -2px -2px 10px rgba(255,255,255,.02),
            inset 0 1px 0 rgba(255,255,255,.05);
          overflow: hidden; z-index: 1;
          transition: border-color .3s, box-shadow .4s;
        }
        .float-card:hover {
          border-color: rgba(34,211,238,.1);
          box-shadow: 0 30px 60px rgba(0,0,0,.7), 0 0 40px rgba(34,211,238,.04);
        }
        .float-card::before {
          content:'';position:absolute;top:0;left:0;right:0;height:2px;
          background:linear-gradient(90deg,transparent,var(--accent-color),transparent);
        }

        /* activity feed card — left */
        .activity-card {
          top: 50%; left: calc(50% - 540px);
          transform: translateY(-50%);
          width: 280px; padding: 22px 24px;
          --accent-color: rgba(34,211,238,.6);
          animation: floatCard1 7s ease-in-out infinite;
        }
        @keyframes floatCard1 {
          0%,100%{transform:translateY(-50%) rotate(-.3deg)}
          50%{transform:translateY(calc(-50% - 14px)) rotate(.3deg)}
        }

        /* features card — right */
        .features-card {
          top: 50%; right: calc(50% - 540px);
          transform: translateY(-50%);
          width: 260px; padding: 22px 24px;
          --accent-color: rgba(129,140,248,.5);
          animation: floatCard2 8s ease-in-out infinite;
          animation-delay: -2s;
        }
        @keyframes floatCard2 {
          0%,100%{transform:translateY(-50%) rotate(.2deg)}
          50%{transform:translateY(calc(-50% - 18px)) rotate(-.2deg)}
        }

        /* stats pill — bottom */
        .stats-pill {
          bottom: 50px; left: 50%; transform: translateX(-50%);
          padding: 16px 28px;
          display: flex; gap: 28px; align-items: center;
          --accent-color: rgba(52,211,153,.5);
          animation: floatCard3 6s ease-in-out infinite;
          animation-delay: -1s;
        }
        @keyframes floatCard3 {
          0%,100%{transform:translateX(-50%) translateY(0)}
          50%{transform:translateX(-50%) translateY(-10px)}
        }

        /* holo badge */
        .holo-badge {
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 12px;border-radius:100px;
          background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.18);
          color:#67e8f9;font-family:'JetBrains Mono',monospace;
          font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;
          position:relative;overflow:hidden;
          box-shadow:0 0 12px rgba(34,211,238,.04);
        }
        .holo-badge::after {
          content:''; position:absolute; top:0; left:-100%; width:40%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(34,211,238,.15),transparent);
          animation:shimmer 4s ease-in-out infinite;
        }

        /* activity dot */
        .act-dot { width:6px;height:6px;border-radius:50%;flex-shrink:0; }

        /* feature item */
        .feat-item {
          display:flex;align-items:flex-start;gap:12px;
          padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);
          transition: background .2s;
        }
        .feat-item:last-child { border-bottom:none;padding-bottom:0; }
        .feat-item:hover { background: rgba(255,255,255,.01); }
        .feat-icon {
          width:30px;height:30px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;border:1px solid;
          box-shadow: 4px 4px 12px rgba(0,0,0,.4), -2px -2px 6px rgba(255,255,255,.02);
        }

        /* activity slide animation */
        .act-content { animation: fadeSlide .5s cubic-bezier(.23,1,.32,1); }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        /* responsive */
        @media (max-width: 1200px) {
          .activity-card, .features-card, .stats-pill { display: none !important; }
        }
        @media (max-width: 520px) {
          .card { margin: 16px; padding: 32px 24px 28px; border-radius: 22px; }
        }
      `}</style>

      {/* Custom cursor */}
      <CursorTracker />

      {/* Background layers */}
      <div className="dot-grid" />
      <div className="scanlines" />
      <div className="vignette" />
      <div className="perspective-grid" />

      {/* Ambient orbs */}
      <div className="orb orb-c" />
      <div className="orb orb-i" />
      <div className="orb orb-e" />
      <div className="orb orb-f" />

      {/* Floating orb particles */}
      {[
        { x: '10%', y: '25%', size: 60, color: '#22d3ee', delay: '0s', dur: '9s' },
        { x: '85%', y: '18%', size: 45, color: '#818cf8', delay: '-3s', dur: '11s' },
        { x: '75%', y: '70%', size: 50, color: '#34d399', delay: '-5s', dur: '8s' },
        { x: '20%', y: '75%', size: 40, color: '#f59e0b', delay: '-2s', dur: '10s' },
      ].map((orb, i) => (
        <div key={i} className="float-orb" style={{
          left: orb.x, top: orb.y, width: orb.size, height: orb.size,
          background: `radial-gradient(circle at 30% 30%, ${orb.color}30, ${orb.color}06, transparent 70%)`,
          border: `1px solid ${orb.color}10`,
          animation: `orbDrift ${orb.dur} ease-in-out infinite`,
          animationDelay: orb.delay,
          boxShadow: `0 0 ${orb.size / 3}px ${orb.color}08`,
        }} />
      ))}

      {/* Torus rings */}
      <div className="torus-ring" style={{
        top: -50, left: -50, width: 200, height: 200,
        border: '1px solid rgba(34,211,238,.06)', opacity: .12,
        animationDuration: '18s',
      }} />
      <div className="torus-ring" style={{
        bottom: -40, right: -40, width: 160, height: 160,
        border: '1px solid rgba(129,140,248,.05)', opacity: .1,
        animationDuration: '24s', animationDirection: 'reverse',
      }} />

      {/* Wire cubes */}
      <div className="wire-cube-deco" style={{ top: '15%', right: '8%', width: 50, height: 50, opacity: .1, perspective: '260px' }}>
        {['rotateY(0deg) translateZ(25px)', 'rotateY(90deg) translateZ(25px)', 'rotateY(180deg) translateZ(25px)', 'rotateY(-90deg) translateZ(25px)', 'rotateX(90deg) translateZ(25px)', 'rotateX(-90deg) translateZ(25px)'].map((t, i) => (
          <div key={i} className="cube-face" style={{ width: 50, height: 50, transform: t, borderColor: 'rgba(34,211,238,.35)', background: 'rgba(34,211,238,.02)' }} />
        ))}
      </div>
      <div className="wire-cube-deco" style={{ bottom: '20%', left: '6%', width: 35, height: 35, opacity: .08, perspective: '200px', animationDuration: '18s', animationDelay: '-5s' }}>
        {['rotateY(0deg) translateZ(17.5px)', 'rotateY(90deg) translateZ(17.5px)', 'rotateY(180deg) translateZ(17.5px)', 'rotateY(-90deg) translateZ(17.5px)', 'rotateX(90deg) translateZ(17.5px)', 'rotateX(-90deg) translateZ(17.5px)'].map((t, i) => (
          <div key={i} className="cube-face" style={{ width: 35, height: 35, transform: t, borderColor: 'rgba(129,140,248,.3)', background: 'rgba(129,140,248,.02)' }} />
        ))}
      </div>

      {/* Particles */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="particle" style={{
          width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
          background: ['#22d3ee', '#818cf8', '#34d399', '#f59e0b'][i % 4],
          left: `${8 + i * 9}%`, bottom: 0,
          animationDuration: `${12 + i * 2.5}s`,
          animationDelay: `${i * 1.4}s`,
        }} />
      ))}

      {/* ── FLOATING CARD 1: Activity Feed (left) ── */}
      <div className="float-card activity-card">
        {/* Card grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: .02, backgroundImage: 'linear-gradient(rgba(34,211,238,1) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,1) 1px,transparent 1px)', backgroundSize: '28px 28px', borderRadius: 22, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <span className="holo-badge">
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee', animation: 'blink2 1.5s infinite', flexShrink: 0 }} />
            Live Feed
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.6rem', color: '#334155', letterSpacing: '.08em' }}>real-time</span>
        </div>

        <div className="act-content" key={activityIndex} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div className="act-dot" style={{ background: activity.color, boxShadow: `0 0 6px ${activity.color}`, marginTop: 5 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.63rem', color: activity.color, letterSpacing: '.08em', fontWeight: 600 }}>{activity.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: '#334155' }}>{activity.time}</span>
              </div>
              <p style={{ fontSize: '.76rem', color: '#94a3b8', lineHeight: 1.55 }}>{activity.msg}</p>
              <span style={{
                display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 100,
                background: activity.domain === 'HEALTHCARE' ? 'rgba(34,211,238,.06)' : 'rgba(129,140,248,.06)',
                border: `1px solid ${activity.domain === 'HEALTHCARE' ? 'rgba(34,211,238,.18)' : 'rgba(129,140,248,.18)'}`,
                color: activity.domain === 'HEALTHCARE' ? '#22d3ee' : '#818cf8',
                fontFamily: 'JetBrains Mono', fontSize: '.58rem', letterSpacing: '.08em', fontWeight: 600
              }}>{activity.domain}</span>
            </div>
          </div>
        </div>

        {/* mini waveform */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22, marginTop: 14, opacity: .5, position: 'relative', zIndex: 1 }}>
          {[4, 7, 12, 18, 10, 14, 8, 16, 6, 11, 15, 9, 13, 7, 10, 4, 8, 12, 16, 6].map((h, i) => (
            <div key={i} style={{
              width: 5, height: h, borderRadius: 2,
              background: `linear-gradient(180deg, ${activity.color}, transparent)`,
              animation: `waveB ${0.4 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
            }} />
          ))}
        </div>
        <style>{`@keyframes waveB { from{transform:scaleY(1)} to{transform:scaleY(.2)} }`}</style>

        {/* bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: 'linear-gradient(90deg,transparent,#22d3ee44,#818cf833,transparent)', borderRadius: '0 0 22px 22px' }} />
      </div>

      {/* ── FLOATING CARD 2: Features (right) ── */}
      <div className="float-card features-card">
        <div style={{ position: 'absolute', inset: 0, opacity: .02, backgroundImage: 'linear-gradient(rgba(129,140,248,1) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,1) 1px,transparent 1px)', backgroundSize: '28px 28px', borderRadius: 22, pointerEvents: 'none' }} />

        <div style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <div className="holo-badge" style={{ background: 'rgba(129,140,248,.04)', borderColor: 'rgba(129,140,248,.18)', color: '#a5b4fc', marginBottom: 10 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 5px #818cf8', animation: 'blink2 2s infinite', flexShrink: 0 }} />
            Platform
          </div>
          <p style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '.9rem', color: '#f8fafc', letterSpacing: '-.01em', lineHeight: 1.3 }}>
            Everything you need.<br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One platform.</span>
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {features.map((f, i) => (
            <div key={i} className="feat-item">
              <div className="feat-icon" style={{
                background: `${f.color}0c`,
                borderColor: `${f.color}22`,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '.76rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 3, letterSpacing: '-.01em' }}>{f.title}</p>
                <p style={{ fontSize: '.68rem', color: '#4a5568', lineHeight: 1.45 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: 'linear-gradient(90deg,transparent,#818cf844,#34d39933,transparent)', borderRadius: '0 0 22px 22px' }} />
      </div>

      {/* ── FLOATING CARD 3: Stats pill (bottom) ── */}
      <div className="float-card stats-pill">
        <div style={{ position: 'absolute', inset: 0, opacity: .015, backgroundImage: 'linear-gradient(rgba(52,211,153,1) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,1) 1px,transparent 1px)', backgroundSize: '24px 24px', borderRadius: 22, pointerEvents: 'none' }} />

        {[
          { value: '99.5%', label: 'Accuracy', color: '#22d3ee' },
          { value: '<0.4s', label: 'Response', color: '#818cf8' },
          { value: '500+', label: 'Active Users', color: '#34d399' },
          { value: '10K+', label: 'Reports', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{
              fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: s.color,
              lineHeight: 1, filter: `drop-shadow(0 0 6px ${s.color}44)`, marginBottom: 4,
            }}>{s.value}</div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: '#475569',
              letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{s.label}</div>
          </div>
        ))}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#34d39944,#22d3ee33,transparent)', borderRadius: '0 0 22px 22px' }} />
      </div>


      {/* ── LOGIN CARD ── */}
      <div className="card" ref={cardRef}>
        <div className="card-shine" />
        <div className="card-accent-top" />
        <div className="card-accent-bottom" />
        <div className="card-grid" />
        <div className="card-corner-glow" />
        <div className="card-corner-glow-bl" />
        <div className="scan-line" />

        <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 4 }}>
          <div className="logo-icon">
            <div className="logo-ring" />
            <div className="logo-orbit-dot" />
            <div className="live-dot" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,.5))' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.6rem', color: '#f8fafc',
            letterSpacing: '-.025em', marginBottom: 6, lineHeight: 1.1,
          }}>
            <LanguageCycler texts={['MediFi', 'ಮೆಡಿಫಿ']} interval={3500} /> <span className="grad-span"><LanguageCycler texts={['Voice', 'ಧ್ವನಿ']} interval={3500} /></span>
          </h1>
          <p style={{
            fontFamily: 'JetBrains Mono', fontSize: '.68rem', color: '#475569',
            letterSpacing: '.12em', textTransform: 'uppercase',
          }}><LanguageCycler texts={['Sign in to continue', 'ಮುಂದುವರಿಯಲು ಸೈನ್ ಇನ್ ಮಾಡಿ']} interval={3500} /></p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 4 }}>
          <div>
            <div className="input-label">
              <div className="input-label-dot" style={{
                background: focusedField === 'email' ? '#22d3ee' : '#334155',
                boxShadow: focusedField === 'email' ? '0 0 6px #22d3ee' : 'none',
              }} />
              <LanguageCycler texts={['Email', 'ಇಮೇಲ್']} interval={3500} />
            </div>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'email' ? '#22d3ee' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke .3s' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                className="login-input"
                type="email"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
              />
            </div>
          </div>

          <div>
            <div className="input-label">
              <div className="input-label-dot" style={{
                background: focusedField === 'password' ? '#818cf8' : '#334155',
                boxShadow: focusedField === 'password' ? '0 0 6px #818cf8' : 'none',
              }} />
              <LanguageCycler texts={['Password', 'ಪಾಸ್‌ವರ್ಡ್']} interval={3500} />
            </div>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focusedField === 'password' ? '#818cf8' : '#334155'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke .3s' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                className="login-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                style={{ paddingRight: 46 }}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span className="spinner" />
                <LanguageCycler texts={['Authenticating...', 'ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...']} interval={3500} />
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <LanguageCycler texts={['Sign In', 'ಸೈನ್ ಇನ್ ಮಾಡಿ']} interval={3500} />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
          </button>
        </form>

        <div style={{ marginTop: 30, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.05)', position: 'relative', zIndex: 4 }}>
          <div className="demo-section-label">
            <span style={{
              fontFamily: 'JetBrains Mono', fontSize: '.62rem', color: '#334155',
              letterSpacing: '.12em', textTransform: 'uppercase',
            }}><LanguageCycler texts={['Demo Accounts', 'ಡೆಮೋ ಖಾತೆಗಳು']} interval={3500} /></span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="demo-btn demo-btn-doctor" onClick={() => fillDemo('doctor')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" style={{ opacity: .7 }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <LanguageCycler texts={['Doctor', 'ವೈದ್ಯರು']} interval={3500} />
            </button>
            <button className="demo-btn demo-btn-finance" onClick={() => fillDemo('finance')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" style={{ opacity: .7 }}>
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <LanguageCycler texts={['Finance', 'ಹಣಕಾಸು']} interval={3500} />
            </button>
            <button className="demo-btn demo-btn-admin" onClick={() => fillDemo('admin')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ opacity: .7 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <LanguageCycler texts={['Admin', 'ನಿರ್ವಾಹಕ']} interval={3500} />
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 24, position: 'relative', zIndex: 4,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: '#1e293b', letterSpacing: '.08em' }}>
            <LanguageCycler texts={['256-BIT ENCRYPTED · HIPAA COMPLIANT', '256-ಬಿಟ್ ಎನ್‌ಕ್ರಿಪ್ಟೆಡ್ · HIPAA ಅನುಸರಣೆ']} interval={3500} />
          </span>
        </div>
      </div>
    </div>
  )
}

// Custom cursor component
function CursorTracker() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mx = useRef(0)
  const my = useRef(0)
  const rx = useRef(0)
  const ry = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX
      my.current = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`
      }
    }
    window.addEventListener('mousemove', onMove)

    let raf: number
    const loop = () => {
      rx.current += (mx.current - rx.current) * 0.1
      ry.current += (my.current - ry.current) * 0.1
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx.current - 18}px, ${ry.current - 18}px)`
      }
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}