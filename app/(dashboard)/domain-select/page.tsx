'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function DomainSelectPage() {
  const router = useRouter()
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

  const domains = [
    {
      id: 'HEALTHCARE',
      name: 'Healthcare',
      description: 'AI-powered medical consultations with real-time entity extraction, clinical NER, and automated SOAP notes.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      accent: '#22d3ee',
      accentRgb: '34,211,238',
      accent2: '#818cf8',
      accent2Rgb: '129,140,248',
      departments: ['General Medicine', 'Cardiology', 'Orthopaedics', 'Paediatrics'],
      stats: [
        { label: 'Departments', value: '4', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { label: 'NER Models', value: 'HF+Groq', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
        { label: 'Languages', value: '3', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      ],
      features: ['Symptom extraction', 'ICD-10 coding', 'SOAP note generation', 'Multi-language support'],
    },
    {
      id: 'FINANCE',
      name: 'Finance',
      description: 'Intelligent financial advisory with automated tax analysis, investment profiling, and compliance reporting.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      accent: '#34d399',
      accentRgb: '52,211,153',
      accent2: '#f59e0b',
      accent2Rgb: '245,158,11',
      departments: ['Taxation', 'Investment', 'Insurance', 'Loans'],
      stats: [
        { label: 'Departments', value: '4', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { label: 'Reports', value: 'Auto', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { label: 'Languages', value: '3', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
      ],
      features: ['Income analysis', 'Tax optimisation', 'Risk profiling', 'Compliance alerts'],
    }
  ]

  const handleSelect = (domainId: string) => {
    setSelectedDomain(domainId)
    setTimeout(() => {
      router.push(`/person-lookup?domain=${domainId}`)
    }, 600)
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        /* ── Background ── */
        .domain-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
        }
        .domain-bg .dot-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .domain-bg .scanlines {
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.012) 2px, rgba(0,0,0,.012) 4px);
        }
        .domain-bg .vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.6) 100%);
        }
        .domain-bg .perspective-floor {
          position: absolute; bottom: 0; left: 0; right: 0; height: 260px;
          background-image:
            linear-gradient(rgba(34,211,238,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,.03) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(500px) rotateX(68deg);
          transform-origin: bottom;
          mask-image: linear-gradient(to top, rgba(0,0,0,.4), transparent);
        }
        .domain-bg .orb {
          position: absolute; border-radius: 50%; filter: blur(1px);
        }
        .domain-bg .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(34,211,238,.07) 0%, transparent 70%);
          top: -200px; left: -150px;
          animation: orbDrift 18s ease-in-out infinite;
        }
        .domain-bg .orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(52,211,153,.06) 0%, transparent 70%);
          bottom: -150px; right: -100px;
          animation: orbDrift 22s ease-in-out infinite reverse;
        }
        .domain-bg .orb-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(129,140,248,.05) 0%, transparent 70%);
          top: 40%; left: 50%; transform: translate(-50%, -50%);
          animation: orbDrift 26s ease-in-out infinite 5s;
        }

        /* particles */
        .domain-bg .particle {
          position: absolute; border-radius: 50%;
          animation: particleFloat linear infinite;
          opacity: 0;
        }
        @keyframes particleFloat {
          0%{transform:translateY(0) translateX(0);opacity:0}
          10%{opacity:.6}
          90%{opacity:.3}
          100%{transform:translateY(-500px) translateX(60px);opacity:0}
        }

        /* floating orb decorations */
        .float-orb-deco {
          position: absolute; border-radius: 50%; pointer-events: none;
        }

        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,-40px) scale(1.04)} }
        @keyframes spinRing { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blink2 { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes shimmer { 0%{left:-100%} 100%{left:250%} }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes scanLine { 0%{top:-2%;opacity:0} 5%{opacity:1} 95%{opacity:1} 100%{top:102%;opacity:0} }
        @keyframes cubeY { from{transform:rotateX(16deg) rotateY(0deg)} to{transform:rotateX(16deg) rotateY(360deg)} }
        @keyframes floatUp { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes domainPulse { 0%,100%{opacity:.06} 50%{opacity:.14} }
        @keyframes selectPulse { 0%{box-shadow:0 0 0 0 var(--pulse-color)} 70%{box-shadow:0 0 0 20px transparent} 100%{box-shadow:0 0 0 0 transparent} }
        @keyframes checkDraw { from{stroke-dashoffset:24} to{stroke-dashoffset:0} }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px) scale(.97); }
          to { opacity: 1; transform: none; }
        }
        .fade-up { animation: fadeUp .7s cubic-bezier(.23,1,.32,1) both; }
        .fade-up-1 { animation-delay: .08s; }
        .fade-up-2 { animation-delay: .18s; }
        .fade-up-3 { animation-delay: .28s; }

        /* ── Domain Card ── */
        .domain-card {
          position: relative;
          background: linear-gradient(165deg, rgba(8,12,24,.97), rgba(3,6,15,.99));
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 28px;
          padding: 0;
          cursor: pointer;
          transform-style: preserve-3d;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,.02),
            16px 16px 48px rgba(0,0,0,.7),
            -4px -4px 14px rgba(255,255,255,.015),
            inset 0 1px 0 rgba(255,255,255,.06);
          transition: border-color .4s, box-shadow .5s, transform .5s cubic-bezier(.23,1,.32,1);
        }
        .domain-card:hover {
          border-color: rgba(var(--card-rgb), .2);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.03),
            0 40px 80px rgba(0,0,0,.8),
            0 0 60px rgba(var(--card-rgb), .06);
          transform: perspective(1200px) translateY(-4px) translateZ(10px);
        }
        .domain-card.selected {
          border-color: rgba(var(--card-rgb), .4);
          box-shadow:
            0 0 0 2px rgba(var(--card-rgb), .2),
            0 40px 80px rgba(0,0,0,.8),
            0 0 80px rgba(var(--card-rgb), .1);
          animation: selectPulse .8s ease;
          --pulse-color: rgba(var(--card-rgb), .3);
        }

        /* card internal layers */
        .card-shine {
          position: absolute; inset: 0; border-radius: 28px;
          opacity: 0; transition: opacity .4s; pointer-events: none; z-index: 10;
        }
        .domain-card:hover .card-shine { opacity: 1; }

        .card-accent-top {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(var(--card-rgb),.6), rgba(var(--card-rgb2),.3), transparent);
          z-index: 5;
        }
        .card-accent-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 2.5px;
          background: linear-gradient(90deg, transparent 5%, rgba(var(--card-rgb),.35) 30%, rgba(var(--card-rgb2),.2) 70%, transparent 95%);
          border-radius: 0 0 28px 28px;
        }
        .card-grid-pattern {
          position: absolute; inset: 0; opacity: .02;
          background-image:
            linear-gradient(rgba(var(--card-rgb),1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(var(--card-rgb),1) 1px, transparent 1px);
          background-size: 36px 36px;
          border-radius: 28px; pointer-events: none;
        }
        .card-corner-glow {
          position: absolute; border-radius: 50%; pointer-events: none; filter: blur(25px);
        }
        .card-scan-line {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(var(--card-rgb),.12), transparent);
          animation: scanLine 7s linear infinite; pointer-events: none; z-index: 6;
        }

        /* wire cube inside card */
        .card-wire-cube {
          position: absolute; transform-style: preserve-3d;
          animation: cubeY 14s linear infinite; pointer-events: none;
        }
        .card-cube-face {
          position: absolute; border: 1px solid; background: transparent;
        }

        /* ── Continue Button ── */
        .continue-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, rgba(var(--card-rgb),.12), rgba(var(--card-rgb),.04));
          border: 1px solid rgba(var(--card-rgb),.2);
          border-radius: 14px;
          font-size: .88rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          letter-spacing: .02em;
          color: var(--card-accent);
          transition: all .3s;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04);
        }
        .continue-btn::after {
          content: '';
          position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(var(--card-rgb),.12), transparent);
          animation: shimmer 3.5s ease-in-out infinite;
        }
        .continue-btn:hover {
          background: linear-gradient(135deg, rgba(var(--card-rgb),.18), rgba(var(--card-rgb),.08));
          border-color: rgba(var(--card-rgb),.35);
          box-shadow: 0 8px 28px rgba(0,0,0,.4), 0 0 20px rgba(var(--card-rgb),.08), inset 0 1px 0 rgba(255,255,255,.06);
          transform: translateY(-1px);
        }

        /* ── Department tags ── */
        .dept-tag {
          padding: 5px 14px;
          background: rgba(var(--card-rgb),.04);
          border: 1px solid rgba(var(--card-rgb),.12);
          border-radius: 100px;
          font-size: .68rem;
          font-weight: 600;
          color: var(--card-accent);
          font-family: 'JetBrains Mono', monospace;
          transition: all .25s;
          letter-spacing: .04em;
          box-shadow: 0 0 8px rgba(var(--card-rgb),.03);
        }
        .domain-card:hover .dept-tag {
          border-color: rgba(var(--card-rgb),.22);
          background: rgba(var(--card-rgb),.07);
          box-shadow: 0 0 14px rgba(var(--card-rgb),.06);
        }

        /* ── Stat Card ── */
        .stat-card {
          flex: 1;
          padding: 14px 12px;
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.05);
          border-radius: 14px;
          text-align: center;
          transition: all .3s;
          position: relative;
          overflow: hidden;
        }
        .domain-card:hover .stat-card {
          border-color: rgba(var(--card-rgb),.12);
          background: rgba(var(--card-rgb),.03);
        }

        /* ── Feature list ── */
        .feature-check {
          width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all .3s;
        }

        /* ── Holo Badge ── */
        .domain-holo-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 100px;
          font-family: 'JetBrains Mono', monospace;
          font-size: .6rem; font-weight: 600;
          letter-spacing: .1em; text-transform: uppercase;
          position: relative; overflow: hidden;
        }
        .domain-holo-badge::after {
          content: '';
          position: absolute; top: 0; left: -100%; width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(var(--card-rgb),.15), transparent);
          animation: shimmer 4s ease-in-out infinite;
        }

        /* ── Connector ── */
        .domain-connector {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; margin-bottom: 36;
        }
        .connector-line {
          width: 60px; height: 1px;
          background: linear-gradient(90deg, rgba(34,211,238,.15), rgba(129,140,248,.2), rgba(52,211,153,.15));
          position: relative;
        }
        .connector-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #22d3ee, #818cf8);
          box-shadow: 0 0 12px rgba(34,211,238,.3);
          animation: blink2 2.5s ease-in-out infinite;
        }

        /* sec label */
        .sec-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: .64rem; font-weight: 600;
          letter-spacing: .16em; text-transform: uppercase;
          color: #22d3ee; font-family: 'JetBrains Mono', monospace;
        }
        .sec-label::before {
          content: ''; width: 20px; height: 1px;
          background: linear-gradient(90deg, #22d3ee, transparent);
        }

        @media (max-width: 900px) {
          .domain-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Background */}
      <div className="domain-bg">
        <div className="dot-grid" />
        <div className="scanlines" />
        <div className="vignette" />
        <div className="perspective-floor" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Floating orb particles */}
        {[
          { x: '12%', y: '22%', size: 55, color: '#22d3ee' },
          { x: '82%', y: '18%', size: 40, color: '#818cf8' },
          { x: '70%', y: '72%', size: 48, color: '#34d399' },
          { x: '25%', y: '78%', size: 35, color: '#f59e0b' },
        ].map((orb, i) => (
          <div key={i} className="float-orb-deco" style={{
            left: orb.x, top: orb.y, width: orb.size, height: orb.size,
            background: `radial-gradient(circle at 30% 30%, ${orb.color}28, ${orb.color}06, transparent 70%)`,
            border: `1px solid ${orb.color}10`,
            animation: `orbDrift ${8 + i * 2.5}s ease-in-out infinite`,
            animationDelay: `${-i * 2}s`,
            boxShadow: `0 0 ${orb.size / 3}px ${orb.color}08`,
          }} />
        ))}

        {/* Particles */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="particle" style={{
            width: i % 2 === 0 ? 3 : 2, height: i % 2 === 0 ? 3 : 2,
            background: ['#22d3ee', '#818cf8', '#34d399', '#f59e0b'][i % 4],
            left: `${10 + i * 11}%`, bottom: 0,
            animationDuration: `${13 + i * 3}s`,
            animationDelay: `${i * 1.5}s`,
          }} />
        ))}
      </div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '48px 40px 60px' }}>
        {/* Header */}
        <div className="fade-up fade-up-1" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="sec-label" style={{ justifyContent: 'center', marginBottom: 14 }}>
            Consultation Domain
          </div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
            fontWeight: 900, color: '#f8fafc', lineHeight: 1.08,
            letterSpacing: '-.025em', marginBottom: 14,
          }}>
            Choose Your{' '}
            <span style={{
              background: 'linear-gradient(135deg, #22d3ee, #818cf8, #34d399)',
              backgroundSize: '200% 200%',
              animation: 'gradShift 5s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Domain</span>
          </h1>
          <p style={{
            fontSize: '.95rem', lineHeight: 1.7, color: '#64748b',
            maxWidth: 480, margin: '0 auto',
          }}>
            Select your consultation type — AI models, entity vocabularies, and report templates load instantly for your speciality.
          </p>
        </div>

        {/* Connector */}
        <div className="domain-connector fade-up fade-up-2">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100,
            background: 'rgba(34,211,238,.04)', border: '1px solid rgba(34,211,238,.12)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee66', animation: 'blink2 2s infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.6rem', fontWeight: 600, color: '#22d3ee', letterSpacing: '.08em' }}>HEALTHCARE</span>
          </div>

          <div className="connector-line" />
          <div className="connector-dot" />
          <div className="connector-line" />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 100,
            background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d39966', animation: 'blink2 2.5s infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.6rem', fontWeight: 600, color: '#34d399', letterSpacing: '.08em' }}>FINANCE</span>
          </div>
        </div>

        {/* Domain Cards Grid */}
        <div className="domain-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          {domains.map((domain, i) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              index={i}
              isHovered={hoveredDomain === domain.id}
              isSelected={selectedDomain === domain.id}
              onHover={() => setHoveredDomain(domain.id)}
              onLeave={() => setHoveredDomain(null)}
              onSelect={() => handleSelect(domain.id)}
            />
          ))}
        </div>

        {/* Bottom unified engine badge */}
        <div className="fade-up fade-up-3" style={{ display: 'flex', justifyContent: 'center', marginTop: 44 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, padding: '14px 28px',
            borderRadius: 18, background: 'rgba(5,8,18,.88)',
            border: '1px solid rgba(255,255,255,.05)', backdropFilter: 'blur(24px)',
            boxShadow: '0 16px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #818cf8)', boxShadow: '0 0 10px rgba(34,211,238,.25)' }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: '#475569', letterSpacing: '.08em' }}>UNIFIED ENGINE</span>
            </div>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,.06)' }} />
            {[
              { icon: '🎙️', label: 'Voice', color: '#22d3ee' },
              { icon: '🧠', label: 'NER', color: '#818cf8' },
              { icon: '📄', label: 'Reports', color: '#34d399' },
              { icon: '⚡', label: 'Groq', color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '.72rem' }}>{item.icon}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.56rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Domain Card Component ────────────────────────────────────────────────────
interface DomainProps {
  domain: {
    id: string; name: string; description: string;
    icon: React.ReactNode; accent: string; accentRgb: string;
    accent2: string; accent2Rgb: string;
    departments: string[];
    stats: { label: string; value: string; icon: string }[];
    features: string[];
  }
  index: number
  isHovered: boolean
  isSelected: boolean
  onHover: () => void
  onLeave: () => void
  onSelect: () => void
}

function DomainCard({ domain, index, isHovered, isSelected, onHover, onLeave, onSelect }: DomainProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const rx = (y - 0.5) * -10
    const ry = (x - 0.5) * 10
    el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px) translateZ(16px)`
    el.style.transition = 'transform .08s ease-out'
    if (shineRef.current) {
      shineRef.current.style.opacity = '1'
      shineRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${domain.accentRgb},.07) 0%, transparent 55%)`
    }
  }

  const onMouseLeave = () => {
    const el = cardRef.current
    if (!el) return
    el.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateY(0) translateZ(0)'
    el.style.transition = 'transform .7s cubic-bezier(.23,1,.32,1)'
    if (shineRef.current) shineRef.current.style.opacity = '0'
    onLeave()
  }

  const cubeSize = 28
  const h = cubeSize / 2

  return (
    <div
      className={`fade-up fade-up-${index + 2}`}
      style={{ perspective: 1200 }}
    >
      <div
        ref={cardRef}
        className={`domain-card ${isSelected ? 'selected' : ''}`}
        style={{
          '--card-rgb': domain.accentRgb,
          '--card-rgb2': domain.accent2Rgb,
          '--card-accent': domain.accent,
        } as React.CSSProperties}
        onMouseMove={onMove}
        onMouseEnter={onHover}
        onMouseLeave={onMouseLeave}
        onClick={onSelect}
      >
        {/* Layers */}
        <div ref={shineRef} className="card-shine" />
        <div className="card-accent-top" />
        <div className="card-accent-bottom" />
        <div className="card-grid-pattern" />
        <div className="card-scan-line" />

        {/* Corner glows */}
        <div className="card-corner-glow" style={{
          top: -50, right: -50, width: 160, height: 160,
          background: `radial-gradient(circle, rgba(${domain.accentRgb},.08), transparent 65%)`,
        }} />
        <div className="card-corner-glow" style={{
          bottom: -30, left: -30, width: 100, height: 100,
          background: `radial-gradient(circle, rgba(${domain.accent2Rgb},.05), transparent 65%)`,
        }} />

        {/* Decorative wire cube */}
        <div className="card-wire-cube" style={{
          top: 24, right: 24, width: cubeSize, height: cubeSize,
          opacity: .1, animationDuration: `${14 + index * 4}s`,
          animationDelay: `${-index * 3}s`,
        }}>
          {[
            `rotateY(0deg) translateZ(${h}px)`,
            `rotateY(90deg) translateZ(${h}px)`,
            `rotateY(180deg) translateZ(${h}px)`,
            `rotateY(-90deg) translateZ(${h}px)`,
            `rotateX(90deg) translateZ(${h}px)`,
            `rotateX(-90deg) translateZ(${h}px)`,
          ].map((t, fi) => (
            <div key={fi} className="card-cube-face" style={{
              width: cubeSize, height: cubeSize, transform: t,
              borderColor: `rgba(${domain.accentRgb},.35)`,
              background: `rgba(${domain.accentRgb},.02)`,
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '36px 36px 0', position: 'relative', zIndex: 4 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Icon */}
              <div style={{
                width: 60, height: 60, borderRadius: 18,
                background: `linear-gradient(135deg, rgba(${domain.accentRgb},.12), rgba(${domain.accentRgb},.04))`,
                border: `1px solid rgba(${domain.accentRgb},.22)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                boxShadow: `6px 6px 20px rgba(0,0,0,.5), -3px -3px 10px rgba(255,255,255,.02), 0 0 30px rgba(${domain.accentRgb},.08), inset 0 1px 0 rgba(255,255,255,.08)`,
              }}>
                <div style={{
                  position: 'absolute', inset: -8, borderRadius: 24,
                  border: `1px dashed rgba(${domain.accentRgb},.18)`,
                  animation: 'spinRing 12s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: -6, borderRadius: 22,
                  animation: `spinRing ${8 + index * 2}s linear infinite`,
                }}>
                  <div style={{
                    position: 'absolute', top: -2, left: '50%',
                    width: 4, height: 4, borderRadius: '50%',
                    background: domain.accent,
                    boxShadow: `0 0 8px ${domain.accent}`,
                    transform: 'translateX(-50%)',
                  }} />
                </div>
                <div style={{ filter: `drop-shadow(0 0 8px rgba(${domain.accentRgb},.5))` }}>
                  {domain.icon}
                </div>
              </div>

              <div>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                  fontSize: '1.55rem', color: '#f8fafc',
                  letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 6,
                }}>{domain.name}</h2>
                <div className="domain-holo-badge" style={{
                  background: `rgba(${domain.accentRgb},.04)`,
                  border: `1px solid rgba(${domain.accentRgb},.16)`,
                  color: domain.accent,
                  '--card-rgb': domain.accentRgb,
                } as React.CSSProperties}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: domain.accent,
                    boxShadow: `0 0 6px ${domain.accent}`,
                    animation: 'blink2 2s infinite', flexShrink: 0,
                  }} />
                  Ready
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {isSelected && (
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: `rgba(${domain.accentRgb},.12)`,
                border: `1px solid rgba(${domain.accentRgb},.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={domain.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, animation: 'checkDraw .5s ease forwards' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Description */}
          <p style={{
            fontSize: '.85rem', lineHeight: 1.7, color: '#64748b',
            marginBottom: 24, maxWidth: 400,
          }}>{domain.description}</p>
        </div>

        {/* Stats row */}
        <div style={{ padding: '0 36px', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {domain.stats.map(s => (
              <div key={s.label} className="stat-card" style={{ '--card-rgb': domain.accentRgb } as React.CSSProperties}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: `rgba(${domain.accentRgb},.06)`,
                  border: `1px solid rgba(${domain.accentRgb},.12)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 8px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={domain.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .7 }}>
                    <path d={s.icon} />
                  </svg>
                </div>
                <div style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: '1.05rem', color: domain.accent, lineHeight: 1,
                  filter: `drop-shadow(0 0 6px rgba(${domain.accentRgb},.35))`,
                  marginBottom: 4,
                }}>{s.value}</div>
                <div style={{
                  fontSize: '.58rem', color: '#475569',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '.05em', textTransform: 'uppercase',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '0 36px', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '.55rem',
              color: `rgba(${domain.accentRgb},.45)`,
              letterSpacing: '.14em', fontWeight: 600,
            }}>CAPABILITIES</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(${domain.accentRgb},.12), transparent)` }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 24 }}>
            {domain.features.map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="feature-check" style={{
                  background: `rgba(${domain.accentRgb},.06)`,
                  border: `1px solid rgba(${domain.accentRgb},.14)`,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={domain.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: '.78rem', color: '#7f8ea0' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div style={{ padding: '0 36px', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '.55rem',
              color: `rgba(${domain.accentRgb},.45)`,
              letterSpacing: '.14em', fontWeight: 600,
            }}>DEPARTMENTS</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(${domain.accentRgb},.12), transparent)` }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
            {domain.departments.map(d => (
              <span key={d} className="dept-tag" style={{
                '--card-rgb': domain.accentRgb,
                '--card-accent': domain.accent,
              } as React.CSSProperties}>{d}</span>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <div style={{ padding: '0 36px 36px', position: 'relative', zIndex: 4 }}>
          <button
            className="continue-btn"
            style={{
              '--card-rgb': domain.accentRgb,
              '--card-accent': domain.accent,
            } as React.CSSProperties}
            onClick={e => { e.stopPropagation(); onSelect() }}
          >
            {isSelected ? (
              <>
                <span className="spinner" style={{
                  width: 14, height: 14,
                  border: `2px solid rgba(${domain.accentRgb},.2)`,
                  borderTopColor: domain.accent,
                  borderRadius: '50%',
                  animation: 'spin .6s linear infinite',
                }} />
                <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
                Launching {domain.name}...
              </>
            ) : (
              <>
                Continue with {domain.name}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}