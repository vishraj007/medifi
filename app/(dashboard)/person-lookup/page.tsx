'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns/format'

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

// ─── ECG Line SVG ──────────────────────────────────────────────────────────────
function ECGLine({ color = '#22d3ee', width = 300, opacity = 0.6 }: { color?: string; width?: number; opacity?: number }) {
  const id = `ecg-${color.replace('#', '')}-${width}`
  return (
    <svg width={width} height="50" viewBox={`0 0 ${width} 50`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="30%" stopColor={color} stopOpacity="1" />
          <stop offset="70%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,25 20,25 30,25 38,8 44,42 50,25 58,25 70,25 80,25 88,4 92,46 96,25 106,25 140,25 150,25 158,10 164,40 170,25 178,25 ${width},25`}
        fill="none"
        stroke={`url(#${id}-grad)`}
        strokeWidth="1.5"
        filter={`url(#${id}-glow)`}
        opacity={opacity}
        style={{ animation: `ecgDraw 4s linear infinite` }}
      />
    </svg>
  )
}

// ─── DNA Helix SVG ─────────────────────────────────────────────────────────────
function DNAHelix({ color1 = '#22d3ee', color2 = '#818cf8', count = 20, height = 320 }: { color1?: string; color2?: string; count?: number; height?: number }) {
  const spacing = height / count
  return (
    <svg width="60" height={height} viewBox={`0 0 60 ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`dna-glow-${color1.replace('#', '')}`}>
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {Array.from({ length: count }, (_, i) => {
        const y = i * spacing + spacing / 2
        const x1 = 30 + Math.sin(i * 0.65) * 22
        const x2 = 30 - Math.sin(i * 0.65) * 22
        const alpha = Math.abs(Math.sin(i * 0.65))
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={`rgba(255,255,255,${alpha * 0.06})`} strokeWidth="1" />
            <circle cx={x1} cy={y} r="3.5" fill={color1}
              filter={`url(#dna-glow-${color1.replace('#', '')})`}
              opacity={0.5 + alpha * 0.4}
              style={{ animation: `dnaBlink 3s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
            <circle cx={x2} cy={y} r="3.5" fill={color2}
              filter={`url(#dna-glow-${color1.replace('#', '')})`}
              opacity={0.5 + (1 - alpha) * 0.4}
              style={{ animation: `dnaBlink 3s ease-in-out infinite`, animationDelay: `${i * 0.12 + 1.5}s` }} />
          </g>
        )
      })}
    </svg>
  )
}

// ─── Candlestick Chart (Finance) ───────────────────────────────────────────────
function CandlestickChart({ color = '#34d399', width = 280, opacity = 0.5 }: { color?: string; width?: number; opacity?: number }) {
  const candles = [
    { x: 20, open: 60, close: 40, high: 35, low: 70 },
    { x: 50, open: 42, close: 30, high: 25, low: 48 },
    { x: 80, open: 32, close: 50, high: 28, low: 55 },
    { x: 110, open: 48, close: 35, high: 30, low: 52 },
    { x: 140, open: 37, close: 22, high: 18, low: 42 },
    { x: 170, open: 24, close: 38, high: 20, low: 45 },
    { x: 200, open: 36, close: 20, high: 15, low: 40 },
    { x: 230, open: 22, close: 15, high: 10, low: 28 },
    { x: 260, open: 17, close: 28, high: 12, low: 32 },
  ]
  const id = `candle-${color.replace('#', '')}`
  return (
    <svg width={width} height="80" viewBox={`0 0 ${width} 80`} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="20%" stopColor={color} stopOpacity="1" />
          <stop offset="80%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {candles.map((c, i) => {
        const isBull = c.close < c.open
        const candleColor = isBull ? color : '#f87171'
        return (
          <g key={i} opacity={opacity} filter={`url(#${id}-glow)`}
            style={{ animation: `candleRise 0.6s ease both`, animationDelay: `${i * 0.08}s` }}>
            <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={candleColor} strokeWidth="1.2" opacity="0.7" />
            <rect x={c.x - 5} y={Math.min(c.open, c.close)} width="10"
              height={Math.max(Math.abs(c.open - c.close), 2)}
              fill={candleColor} rx="1.5" opacity="0.85" />
          </g>
        )
      })}
      {/* Trend line */}
      <polyline
        points={candles.map(c => `${c.x},${(c.open + c.close) / 2}`).join(' ')}
        fill="none" stroke={`url(#${id}-fade)`} strokeWidth="1"
        strokeDasharray="4 3" opacity="0.4"
      />
    </svg>
  )
}

// ─── Stock Ticker Line ─────────────────────────────────────────────────────────
function StockLine({ color = '#34d399', width = 280 }: { color?: string; width?: number }) {
  const points = [0, 30, 22, 45, 18, 38, 55, 25, 42, 15, 35, 28, 48, 20, 38, 52, 30, 44, 22, 35].map((v, i) => `${i * (width / 19)},${v}`)
  const id = `stock-${color.replace('#', '')}`
  return (
    <svg width={width} height="60" viewBox={`0 0 ${width} 60`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="20%" stopColor={color} stopOpacity="1" />
          <stop offset="80%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,60 ${points.join(' ')} ${width},60`} fill={`url(#${id}-g)`} />
      <polyline points={points.join(' ')} fill="none" stroke={`url(#${id}-l)`} strokeWidth="1.8" />
    </svg>
  )
}

// ─── Floating Orb ──────────────────────────────────────────────────────────────
function FloatingOrb({ x, y, size, color, delay, duration }: { x: string; y: string; size: number; color: string; delay: string; duration: string }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${color}35, ${color}08, transparent 68%)`,
      border: `1px solid ${color}12`,
      animation: `orbFloat ${duration} ease-in-out infinite`, animationDelay: delay,
      pointerEvents: 'none',
      boxShadow: `0 0 ${size / 2.5}px ${color}10, inset 0 0 ${size / 3}px ${color}06`,
    }} />
  )
}

// ─── Background Scene ──────────────────────────────────────────────────────────
function BackgroundScene({ isHC }: { isHC: boolean }) {
  const accent = isHC ? '#22d3ee' : '#34d399'
  const accentRgb = isHC ? '34,211,238' : '52,211,153'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Base gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #020408 0%, #030609 50%, #020408 100%)' }} />

      {/* Dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.038) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Scanlines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.01) 2px,rgba(0,0,0,.01) 4px)', pointerEvents: 'none' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center,transparent 28%,rgba(0,0,0,.72) 100%)' }} />

      {/* Ambient blobs */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', filter: 'blur(200px)', opacity: .065, background: `radial-gradient(circle,${accent},transparent 70%)`, top: -300, left: -250, animation: 'blobDrift 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 650, height: 650, borderRadius: '50%', filter: 'blur(180px)', opacity: .05, background: 'radial-gradient(circle,#818cf8,transparent 70%)', bottom: -250, right: -200, animation: 'blobDrift 25s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', filter: 'blur(160px)', opacity: .04, background: 'radial-gradient(circle,#f59e0b,transparent 70%)', top: '40%', right: '10%', animation: 'blobDrift 30s ease-in-out infinite 8s' }} />

      {/* Floating orbs */}
      <FloatingOrb x="6%" y="18%" size={70} color={accent} delay="0s" duration="9s" />
      <FloatingOrb x="84%" y="14%" size={55} color="#818cf8" delay="-3s" duration="11s" />
      <FloatingOrb x="10%" y="68%" size={48} color="#34d399" delay="-6s" duration="8s" />
      <FloatingOrb x="82%" y="62%" size={42} color="#f59e0b" delay="-2s" duration="10s" />
      <FloatingOrb x="50%" y="85%" size={38} color={accent} delay="-4s" duration="7.5s" />

      {/* Perspective floor grid */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260, backgroundImage: `linear-gradient(rgba(${accentRgb},.028) 1px,transparent 1px),linear-gradient(90deg,rgba(${accentRgb},.028) 1px,transparent 1px)`, backgroundSize: '55px 55px', transform: 'perspective(500px) rotateX(68deg)', transformOrigin: 'bottom', maskImage: 'linear-gradient(to top,rgba(0,0,0,.5),transparent)' }} />

      {/* LEFT SIDE — DNA Helix */}
      <div style={{ position: 'absolute', left: 14, top: '8%', opacity: .12, animation: 'floatSlow 14s ease-in-out infinite' }}>
        <DNAHelix color1={accent} color2="#818cf8" count={22} height={350} />
      </div>

      {/* RIGHT SIDE — depends on domain */}
      {isHC ? (
        /* Healthcare: second DNA */
        <div style={{ position: 'absolute', right: 14, top: '30%', opacity: .09, animation: 'floatSlow 16s ease-in-out infinite', animationDelay: '-7s' }}>
          <DNAHelix color1="#34d399" color2="#f59e0b" count={16} height={260} />
        </div>
      ) : (
        /* Finance: Candlestick chart */
        <div style={{ position: 'absolute', right: 20, top: '28%', opacity: .12, animation: 'floatSlow 12s ease-in-out infinite', animationDelay: '-4s' }}>
          <CandlestickChart color="#34d399" width={180} opacity={0.7} />
        </div>
      )}

      {/* ECG lines — healthcare gets more */}
      {isHC ? (
        <>
          <div style={{ position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)', opacity: .11 }}>
            <ECGLine color={accent} width={320} opacity={0.9} />
          </div>
          <div style={{ position: 'absolute', bottom: '28%', left: '8%', opacity: .08, transform: 'rotate(-2deg)' }}>
            <ECGLine color="#818cf8" width={200} opacity={0.8} />
          </div>
          <div style={{ position: 'absolute', top: '62%', right: '6%', opacity: .07, transform: 'rotate(1.5deg)' }}>
            <ECGLine color="#34d399" width={180} opacity={0.7} />
          </div>
        </>
      ) : (
        /* Finance gets stock lines */
        <>
          <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', opacity: .1 }}>
            <StockLine color={accent} width={300} />
          </div>
          <div style={{ position: 'absolute', bottom: '30%', left: '6%', opacity: .08 }}>
            <StockLine color="#818cf8" width={180} />
          </div>
          <div style={{ position: 'absolute', top: '58%', right: '4%', opacity: .08 }}>
            <CandlestickChart color="#f59e0b" width={160} opacity={0.6} />
          </div>
        </>
      )}

      {/* Rising particles */}
      {[...Array(14)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, borderRadius: '50%',
          background: [accent, '#818cf8', '#34d399', '#f59e0b', '#a78bfa'][i % 5],
          left: `${5 + i * 6.5}%`, bottom: 0,
          animation: `particleRise ${11 + i * 2.5}s linear infinite`,
          animationDelay: `${i * 1.3}s`, opacity: 0,
        }} />
      ))}
    </div>
  )
}

// ─── Input Field ───────────────────────────────────────────────────────────────
function InputField({
  label, placeholder, value, onChange, onKeyDown, type = 'text',
  icon, focused, onFocus, onBlur, accentRgb, accent, required = false, maxLength,
}: {
  label: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent) => void;
  type?: string; icon: React.ReactNode; focused: boolean;
  onFocus: () => void; onBlur: () => void;
  accentRgb: string; accent: string; required?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: focused ? accent : '#334155', boxShadow: focused ? `0 0 6px ${accent}` : 'none', transition: 'background .3s, box-shadow .3s' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '.61rem', color: '#475569', letterSpacing: '.11em', textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: accent, marginLeft: 2 }}>*</span>}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2, color: focused ? accent : '#334155', transition: 'color .3s' }}>
          {icon}
        </div>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          maxLength={maxLength}
          style={{
            width: '100%',
            border: `1px solid ${focused ? `rgba(${accentRgb},.28)` : 'rgba(255,255,255,.062)'}`,
            borderRadius: 13, padding: '13px 16px 13px 44px',
            color: '#f8fafc', fontSize: '.88rem', fontFamily: 'Outfit, sans-serif',
            outline: 'none', transition: 'border-color .3s, box-shadow .3s, background .3s',
            boxShadow: focused ? `0 0 0 4px rgba(${accentRgb},.055), 0 0 18px rgba(${accentRgb},.04)` : 'none',
            background: focused ? 'rgba(3,6,15,.96)' : 'rgba(3,6,15,.88)',
          }}
        />
      </div>
    </div>
  )
}

// ─── Select Field ──────────────────────────────────────────────────────────────
function SelectField({
  label, value, onChange, onFocus, onBlur, focused, accent, accentRgb, icon, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  onFocus: () => void; onBlur: () => void; focused: boolean;
  accent: string; accentRgb: string; icon: React.ReactNode;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: focused ? accent : '#334155', boxShadow: focused ? `0 0 6px ${accent}` : 'none', transition: 'background .3s, box-shadow .3s' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '.61rem', color: '#475569', letterSpacing: '.11em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2, color: focused ? accent : '#334155', transition: 'color .3s' }}>
          {icon}
        </div>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            width: '100%', background: 'rgba(3,6,15,.88)',
            border: `1px solid ${focused ? `rgba(${accentRgb},.28)` : 'rgba(255,255,255,.062)'}`,
            borderRadius: 13, padding: '13px 40px 13px 44px',
            color: value ? '#f8fafc' : '#1e2a38', fontSize: '.88rem',
            fontFamily: 'Outfit, sans-serif', outline: 'none', appearance: 'none', cursor: 'pointer',
            transition: 'border-color .3s, box-shadow .3s',
            boxShadow: focused ? `0 0 0 4px rgba(${accentRgb},.055)` : 'none',
          }}
        >
          {options.map(o => <option key={o.value} value={o.value} style={{ background: '#080c18', color: o.value ? '#f8fafc' : '#475569' }}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Static Card ──────────────────────────────────────────────────────────────
function StaticCard({ children, accentRgb, accent2Rgb, style = {} }: {
  children: React.ReactNode; accentRgb: string; accent2Rgb?: string; style?: React.CSSProperties
}) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 24,
      background: 'linear-gradient(165deg, rgba(8,12,24,.97), rgba(3,6,15,.99))',
      border: '1px solid rgba(255,255,255,.055)',
      backdropFilter: 'blur(36px)',
      boxShadow: '0 0 0 1px rgba(255,255,255,.02), 14px 14px 44px rgba(0,0,0,.7), -3px -3px 12px rgba(255,255,255,.014), inset 0 1px 0 rgba(255,255,255,.055)',
      ...style,
    }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,rgba(${accentRgb},.55),rgba(${accent2Rgb ?? accentRgb},.28),transparent)`, zIndex: 5 }} />
      {/* Bottom accent line */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent 5%,rgba(${accentRgb},.26) 35%,rgba(${accentRgb},.12) 65%,transparent 95%)`, borderRadius: '0 0 24px 24px' }} />
      {/* Grid pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: .02, backgroundImage: `linear-gradient(rgba(${accentRgb},1) 1px,transparent 1px),linear-gradient(90deg,rgba(${accentRgb},1) 1px,transparent 1px)`, backgroundSize: '34px 34px', borderRadius: 24, pointerEvents: 'none' }} />
      {/* Scan line */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,rgba(${accentRgb},.1),transparent)`, animation: 'scanLine 8s linear infinite', pointerEvents: 'none', zIndex: 6 }} />
      {/* Corner glows */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: `radial-gradient(circle,rgba(${accentRgb},.08),transparent 65%)`, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(20px)' }} />
      <div style={{ position: 'absolute', bottom: -25, left: -25, width: 90, height: 90, background: `radial-gradient(circle,rgba(${accentRgb},.05),transparent 65%)`, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(14px)' }} />
      {children}
    </div>
  )
}

// ─── Entity color palette (shared with session page) ─────────────────────────
const ENTITY_COLORS: Record<string, string> = {
  symptoms: '#F87171', medications: '#2dd4bf', diseases: '#F59E0B',
  procedures: '#60A5FA', bodyParts: '#A78BFA', severity: '#F87171',
  duration: '#6EE7B7', frequency: '#FCD34D',
  income: '#34D399', expenses: '#F87171', investments: '#60A5FA',
  taxes: '#FBBF24', loans: '#F472B6', insurance: '#A78BFA',
  goals: '#6EE7B7', amounts: '#FCD34D', timeframes: '#93C5FD', taxSections: '#86EFAC',
}

// ─── Health / Finance Timeline ────────────────────────────────────────────────
function HealthTimeline({ sessions, accent, accentRgb, accent2Rgb, isHC, router, personName, domain }: {
  sessions: any[]; accent: string; accentRgb: string; accent2Rgb: string; isHC: boolean; router: any; personName: string; domain: string
}) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'symptoms' | 'medications' | 'summary'>('timeline')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryLang, setSummaryLang] = useState<'KANNADA' | 'ENGLISH' | 'HINDI'>('KANNADA')

  // ── Aggregate entities across all sessions ──
  const entityAgg: Record<string, Map<string, number>> = {}
  const allMeds: Map<string, { count: number; lastSeen: string }> = new Map()
  const allSymptoms: Map<string, { count: number; sessions: string[] }> = new Map()

  sessions.forEach(s => {
    const ner = s.nerEntities as Record<string, string[]> | null
    if (!ner) return
    Object.entries(ner).forEach(([cat, vals]) => {
      if (!Array.isArray(vals) || vals.length === 0) return
      if (!entityAgg[cat]) entityAgg[cat] = new Map()
      vals.forEach(v => {
        const key = String(v).trim()
        if (!key) return
        const lower = key.toLowerCase()
        entityAgg[cat]!.set(lower, (entityAgg[cat]!.get(lower) || 0) + 1)

        // Track medications separately
        if (cat === 'medications') {
          const existing = allMeds.get(lower)
          allMeds.set(lower, {
            count: (existing?.count || 0) + 1,
            lastSeen: s.createdAt,
          })
        }
        // Track symptoms separately
        if (cat === 'symptoms') {
          const existing = allSymptoms.get(lower)
          allSymptoms.set(lower, {
            count: (existing?.count || 0) + 1,
            sessions: [...(existing?.sessions || []), format(new Date(s.createdAt), 'MMM dd')],
          })
        }
      })
    })
  })

  // Stats
  const recurringSymptoms = [...allSymptoms.values()].filter(s => s.count > 1).length
  const activeMedCount = allMeds.size
  const lastSeenDate = sessions.length > 0 ? new Date(sessions[0].createdAt) : null
  const daysSinceLastVisit = lastSeenDate ? Math.floor((Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24)) : null
  const lastSeenText = daysSinceLastVisit !== null
    ? daysSinceLastVisit === 0 ? 'Today' : daysSinceLastVisit === 1 ? '1 day ago' : `${daysSinceLastVisit} days ago`
    : '—'

  if (sessions.length === 0) return null

  // Get chief complaint for a session
  const getChiefComplaint = (s: any): string => {
    const ed = s.extractedData as any
    if (ed?.chiefComplaint) return ed.chiefComplaint
    // Fallback: combine top symptoms
    const ner = s.nerEntities as Record<string, string[]> | null
    if (ner?.symptoms?.length) return ner.symptoms.slice(0, 3).join(', ')
    if (ner?.goals?.length) return ner.goals.slice(0, 2).join(', ')
    return s.department.replace(/_/g, ' ') + ' consultation'
  }

  // Get all entity tags for a session (for timeline display)
  const getSessionTags = (s: any): { label: string; color: string }[] => {
    const ner = s.nerEntities as Record<string, string[]> | null
    if (!ner) return []
    const tags: { label: string; color: string }[] = []
    const priorityKeys = isHC
      ? ['symptoms', 'medications', 'diseases', 'procedures']
      : ['investments', 'goals', 'taxes', 'income']
    priorityKeys.forEach(k => {
      if (ner[k]?.length) {
        ner[k].slice(0, 3).forEach(v => {
          if (tags.length < 5) {
            // Mark diseases with " — suspected" suffix
            const suffix = k === 'diseases' ? ' — suspected' : ''
            tags.push({ label: v + suffix, color: ENTITY_COLORS[k] || '#94a3b8' })
          }
        })
      }
    })
    return tags
  }

  const TABS = [
    { id: 'timeline' as const, label: 'Timeline' },
    { id: 'symptoms' as const, label: 'Symptom trends' },
    { id: 'medications' as const, label: 'Medications' },
    { id: 'summary' as const, label: 'AI summary' },
  ]

  return (
    <div className="pl-fade pl-d4" style={{ marginBottom: 16 }}>
      <StaticCard accentRgb={accentRgb} accent2Rgb={accent2Rgb}>
        <div style={{ padding: '28px 28px 24px', position: 'relative', zIndex: 4 }}>

          {/* ── Stats Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, marginBottom: 22 }}>
            {[
              { label: 'Total visits', val: String(sessions.length), color: accent },
              { label: 'Recurring symptoms', val: String(recurringSymptoms), color: '#F87171' },
              { label: isHC ? 'Active medications' : 'Active investments', val: String(activeMedCount), color: '#2dd4bf' },
              { label: 'Last seen', val: lastSeenText, color: '#94a3b8' },
            ].map((stat, i) => (
              <div key={stat.label} style={{ textAlign: i === 0 ? 'left' : 'left', padding: '0 12px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.56rem', color: '#64748b', letterSpacing: '.04em', marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: stat.color, lineHeight: 1 }}>
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab Bar ── */}
          <div style={{
            display: 'flex', gap: 2, padding: 3, marginBottom: 20,
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)',
            borderRadius: 10,
          }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none',
                background: activeTab === tab.id ? 'rgba(255,255,255,.06)' : 'transparent',
                color: activeTab === tab.id ? '#f1f5f9' : '#475569',
                fontSize: '.72rem', fontFamily: 'Outfit', fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer', transition: 'all .2s',
                borderBottom: activeTab === tab.id ? `2px solid ${accent}` : '2px solid transparent',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════ TIMELINE TAB ═══════ */}
          {activeTab === 'timeline' && (
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute', left: 8, top: 6, bottom: 6, width: 2,
                background: `linear-gradient(180deg, rgba(${accentRgb},.28), rgba(${accentRgb},.05))`,
                borderRadius: 2,
              }} />

              {sessions.map((s: any, i: number) => {
                const chiefComplaint = getChiefComplaint(s)
                const tags = getSessionTags(s)
                const dotColors = ['#22d3ee', '#60a5fa', '#f59e0b', '#a78bfa', '#34d399', '#f472b6']
                const dotColor = dotColors[i % dotColors.length]

                return (
                  <div key={s.id} style={{
                    position: 'relative', paddingBottom: i < sessions.length - 1 ? 14 : 0,
                    animation: 'fadeSlide .4s ease both',
                    animationDelay: `${i * 60}ms`,
                    cursor: 'pointer',
                  }} onClick={() => router.push(`/session/${s.id}`)}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: -24, top: 14,
                      width: 10, height: 10, borderRadius: '50%',
                      background: dotColor, border: `2px solid ${dotColor}`,
                      boxShadow: `0 0 10px ${dotColor}55`,
                    }} />

                    {/* Visit card */}
                    <div style={{
                      padding: '14px 18px', borderRadius: 12,
                      background: 'rgba(255,255,255,.018)',
                      border: '1px solid rgba(255,255,255,.05)',
                      transition: 'border-color .2s, background .2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},.18)`; e.currentTarget.style.background = `rgba(${accentRgb},.025)` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)'; e.currentTarget.style.background = 'rgba(255,255,255,.018)' }}
                    >
                      {/* Date · Department */}
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: '#64748b', letterSpacing: '.03em', marginBottom: 5 }}>
                        {format(new Date(s.createdAt), 'dd MMM yyyy')} <span style={{ color: '#334155' }}>·</span> <span style={{ color: '#94a3b8' }}>{s.department.replace(/_/g, ' ')}</span>
                      </div>

                      {/* Chief complaint — bold title */}
                      <div style={{
                        fontFamily: 'Outfit', fontWeight: 700, fontSize: '.92rem',
                        color: '#e2e8f0', lineHeight: 1.3, marginBottom: tags.length > 0 ? 10 : 0,
                        letterSpacing: '-.01em',
                      }}>
                        {chiefComplaint}
                      </div>

                      {/* Entity tags */}
                      {tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {tags.map((t, j) => (
                            <span key={j} style={{
                              padding: '3px 10px', borderRadius: 6,
                              background: `${t.color}18`, color: t.color,
                              fontFamily: 'JetBrains Mono', fontSize: '.6rem', fontWeight: 500,
                            }}>{t.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══════ SYMPTOM TRENDS TAB ═══════ */}
          {activeTab === 'symptoms' && (
            <div>
              {allSymptoms.size === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '.65rem', color: '#334155' }}>No symptoms recorded yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...allSymptoms.entries()]
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([symptom, data], i) => {
                      const barWidth = Math.max(20, (data.count / sessions.length) * 100)
                      const isRecurring = data.count > 1
                      return (
                        <div key={symptom} style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.04)',
                          animation: 'fadeSlide .3s ease both', animationDelay: `${i * 40}ms`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontFamily: 'Outfit', fontWeight: 700, fontSize: '.82rem',
                                color: '#e2e8f0', textTransform: 'capitalize',
                              }}>{symptom}</span>
                              {isRecurring && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: 4,
                                  background: '#F8717118', color: '#F87171',
                                  fontFamily: 'JetBrains Mono', fontSize: '.5rem', fontWeight: 700,
                                }}>RECURRING</span>
                              )}
                            </div>
                            <span style={{
                              fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: accent,
                              fontWeight: 700,
                            }}>{data.count}×</span>
                          </div>
                          {/* Bar */}
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 2, width: `${barWidth}%`,
                              background: isRecurring
                                ? 'linear-gradient(90deg, #F87171, #fb923c)'
                                : `linear-gradient(90deg, ${accent}, rgba(${accentRgb},.4))`,
                              transition: 'width .6s ease',
                            }} />
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.48rem', color: '#475569', marginTop: 4, letterSpacing: '.03em' }}>
                            Seen: {data.sessions.join(' → ')}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* ═══════ MEDICATIONS TAB ═══════ */}
          {activeTab === 'medications' && (
            <div>
              {allMeds.size === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '.65rem', color: '#334155' }}>No medications recorded yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...allMeds.entries()]
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([med, data], i) => (
                      <div key={med} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.04)',
                        animation: 'fadeSlide .3s ease both', animationDelay: `${i * 40}ms`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#2dd4bf12', border: '1px solid #2dd4bf22',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '.82rem', color: '#e2e8f0', textTransform: 'capitalize' }}>{med}</div>
                            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.48rem', color: '#475569', marginTop: 2 }}>
                              Last: {format(new Date(data.lastSeen), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '.9rem', color: '#2dd4bf' }}>{data.count}×</div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.44rem', color: '#475569', marginTop: 1 }}>prescribed</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ AI SUMMARY TAB ═══════ */}
          {activeTab === 'summary' && (
            <div>
              {/* Language selector — always visible */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
                {[
                  { key: 'KANNADA' as const, label: 'ಕನ್ನಡ', short: 'ಕ' },
                  { key: 'ENGLISH' as const, label: 'English', short: 'EN' },
                  { key: 'HINDI' as const, label: 'हिंदी', short: 'हि' },
                ].map(lang => (
                  <button key={lang.key} onClick={() => { setSummaryLang(lang.key); setAiSummary(null); setSummaryError(null) }} style={{
                    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: summaryLang === lang.key ? `rgba(${accentRgb},.12)` : 'rgba(255,255,255,.02)',
                    color: summaryLang === lang.key ? accent : '#475569',
                    fontFamily: 'Outfit', fontSize: '.74rem', fontWeight: summaryLang === lang.key ? 700 : 500,
                    transition: 'all .2s',
                    borderBottom: summaryLang === lang.key ? `2px solid ${accent}` : '2px solid transparent',
                  }}>
                    <span style={{ marginRight: 4, fontSize: '.8rem' }}>{lang.short}</span> {lang.label}
                  </button>
                ))}
              </div>

              {/* Generate button or loading state */}
              {!aiSummary && !summaryLoading && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: '.82rem', color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                    Generate a comprehensive AI-powered {isHC ? 'health' : 'financial'} summary by analyzing <strong style={{ color: '#e2e8f0' }}>all {sessions.length} {sessions.length === 1 ? 'visit' : 'visits'}</strong> in <strong style={{ color: accent }}>{summaryLang === 'KANNADA' ? 'ಕನ್ನಡ' : summaryLang === 'HINDI' ? 'हिंदी' : 'English'}</strong>.
                  </p>
                  {summaryError && (
                    <div style={{
                      padding: '8px 14px', borderRadius: 8, marginBottom: 14,
                      background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.18)',
                      fontFamily: 'JetBrains Mono', fontSize: '.6rem', color: '#F87171',
                    }}>{summaryError}</div>
                  )}
                  <button
                    onClick={async () => {
                      setSummaryLoading(true)
                      setSummaryError(null)
                      try {
                        const res = await fetch('/api/ai/patient-summary', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ sessions, personName, domain, language: summaryLang }),
                        })
                        if (!res.ok) {
                          const err = await res.json()
                          throw new Error(err.error || 'Failed to generate')
                        }
                        const { summary } = await res.json()
                        setAiSummary(summary)
                      } catch (e: any) {
                        setSummaryError(e.message || 'Something went wrong')
                      } finally {
                        setSummaryLoading(false)
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 9,
                      padding: '12px 28px', borderRadius: 12,
                      background: `linear-gradient(135deg, rgba(${accentRgb},.14), rgba(${accentRgb},.05))`,
                      border: `1px solid rgba(${accentRgb},.2)`,
                      color: accent, fontSize: '.82rem', fontFamily: 'Outfit', fontWeight: 700,
                      cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      boxShadow: `0 4px 16px rgba(0,0,0,.3), 0 0 20px rgba(${accentRgb},.06)`,
                      transition: 'all .25s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,.4),0 0 28px rgba(${accentRgb},.1)` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,.3),0 0 20px rgba(${accentRgb},.06)` }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Generate AI Summary
                  </button>
                </div>
              )}

              {/* Loading state */}
              {summaryLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `3px solid rgba(${accentRgb},.12)`, borderTopColor: accent,
                    animation: 'spin .8s linear infinite',
                    margin: '0 auto 14px',
                  }} />
                  <p style={{ fontFamily: 'Outfit', fontSize: '.82rem', color: '#94a3b8', marginBottom: 4 }}>
                    Analyzing {sessions.length} {sessions.length === 1 ? 'visit' : 'visits'}...
                  </p>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '.56rem', color: '#334155', letterSpacing: '.04em' }}>
                    AI is reviewing all reports, symptoms, and medications
                  </p>
                </div>
              )}

              {/* Generated summary */}
              {aiSummary && !summaryLoading && (
                <div>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '.82rem', color: '#e2e8f0' }}>
                        AI-Generated {isHC ? 'Patient' : 'Client'} Summary
                      </span>
                    </div>
                    <button
                      onClick={() => { setAiSummary(null); setSummaryError(null) }}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)',
                        background: 'rgba(255,255,255,.02)', color: '#64748b',
                        fontFamily: 'JetBrains Mono', fontSize: '.52rem', cursor: 'pointer',
                        transition: 'all .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},.2)`; e.currentTarget.style.color = accent }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#64748b' }}
                    >
                      ↻ Regenerate
                    </button>
                  </div>

                  {/* Summary content */}
                  <div
                    className="ai-summary-content"
                    style={{
                      padding: '18px 20px', borderRadius: 12,
                      background: `linear-gradient(135deg, rgba(${accentRgb},.03), rgba(${accent2Rgb},.015))`,
                      border: `1px solid rgba(${accentRgb},.08)`,
                    }}
                    dangerouslySetInnerHTML={{ __html: aiSummary }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </StaticCard>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PersonLookupPage() {
  const router = useRouter()
  const params = useSearchParams()
  const domain = params.get('domain')

  const [phone, setPhone] = useState('')
  const [person, setPerson] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPerson, setNewPerson] = useState({ name: '', email: '', age: '', gender: '' })
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [showSessionTypeModal, setShowSessionTypeModal] = useState(false)
  const [selectedSessionMode, setSelectedSessionMode] = useState<string | null>(null)

  const isHC = domain === 'HEALTHCARE'
  const accent = isHC ? '#22d3ee' : '#34d399'
  const accentRgb = isHC ? '34,211,238' : '52,211,153'
  const accent2 = isHC ? '#818cf8' : '#f59e0b'
  const accent2Rgb = isHC ? '129,140,248' : '245,158,11'

  const searchPerson = async () => {
    if (!phone || phone.length < 10) return
    setLoading(true); setNotFound(false); setPerson(null); setShowNewForm(false)
    try {
      const res = await fetch(`/api/person/${phone}`)
      if (res.ok) {
        const data = await res.json()
        if (data.exists) { setPerson(data.person); setShowNewForm(false) }
        else { setNotFound(true); setShowNewForm(true) }
      } else { setNotFound(true); setShowNewForm(true) }
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }

  const createPerson = async () => {
    if (!newPerson.name) return
    setCreateLoading(true)
    try {
      const res = await fetch('/api/person/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPerson, phone })
      })
      if (res.ok) { const p = await res.json(); setPerson(p); setShowNewForm(false); setNotFound(false) }
    } catch (e) { console.error(e) }
    finally { setCreateLoading(false) }
  }

  const startSession = async (sessionMode: 'SINGLE' | 'MULTI') => {
    setSelectedSessionMode(sessionMode)
    setSessionLoading(true)
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: person.id, domain, language: 'ENGLISH', sessionMode })
      })
      if (res.ok) {
        const s = await res.json()
        if (sessionMode === 'SINGLE') {
          router.push(`/session/${s.id}/single`)
        } else {
          router.push(`/session/${s.id}`)
        }
      }
    } catch (e) { console.error(e) }
    finally { setSessionLoading(false); setShowSessionTypeModal(false); setSelectedSessionMode(null) }
  }

  const f = (field: string) => ({
    focused: focusedField === field,
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Outfit',sans-serif;background:#020408;color:#cbd5e1;overflow-x:hidden;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#000}::-webkit-scrollbar-thumb{background:rgba(${accentRgb},.18);border-radius:2px}

        @keyframes blobDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(25px,-42px) scale(1.06)}}
        @keyframes orbFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-28px) rotate(180deg)}}
        @keyframes floatSlow{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
        @keyframes dnaBlink{0%,100%{opacity:.65}50%{opacity:1}}
        @keyframes ecgDraw{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
        @keyframes candleRise{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}
        @keyframes scanLine{0%{top:-2%;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:102%;opacity:0}}
        @keyframes particleRise{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.65}90%{opacity:.3}100%{transform:translateY(-520px) translateX(55px);opacity:0}}
        @keyframes shimmer{0%{left:-100%}100%{left:250%}}
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.18}}
        @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes progressFill{from{width:0}to{width:var(--target-width)}}

        /* AI Summary content styling */
        .ai-summary-content h3{font-family:'Outfit',sans-serif;font-weight:700;font-size:.88rem;color:#e2e8f0;margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.04);}
        .ai-summary-content h3:first-child{margin-top:0;}
        .ai-summary-content p{font-family:'Outfit',sans-serif;font-size:.78rem;color:#94a3b8;line-height:1.65;margin:0 0 8px;}
        .ai-summary-content ul{margin:4px 0 12px 16px;padding:0;}
        .ai-summary-content li{font-family:'Outfit',sans-serif;font-size:.76rem;color:#94a3b8;line-height:1.6;margin-bottom:4px;}
        .ai-summary-content strong{color:#e2e8f0;font-weight:700;}

        .pl-fade{animation:fadeSlide .5s cubic-bezier(.23,1,.32,1) both;}
        .pl-d1{animation-delay:.05s}.pl-d2{animation-delay:.12s}.pl-d3{animation-delay:.19s}.pl-d4{animation-delay:.26s}.pl-d5{animation-delay:.33s}

        .pl-holo{
          display:inline-flex;align-items:center;gap:6px;
          padding:5px 13px;border-radius:100px;
          font-family:'JetBrains Mono',monospace;font-size:.6rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
          position:relative;overflow:hidden;
        }
        .pl-holo::after{content:'';position:absolute;top:0;left:-100%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);animation:shimmer 4.5s ease-in-out infinite;}

        .pl-sec-label{display:inline-flex;align-items:center;gap:8px;font-size:.59rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
        .pl-sec-label::before{content:'';width:16px;height:1px;background:linear-gradient(90deg,currentColor,transparent);}

        /* ── Primary Action Button ── */
        .pl-btn-search{
          display:inline-flex;align-items:center;justify-content:center;gap:9px;
          padding:13.5px 26px;
          background:linear-gradient(135deg,rgba(${accentRgb},.12),rgba(${accentRgb},.04));
          border:1px solid rgba(${accentRgb},.22);border-radius:13px;
          color:${accent};font-size:.88rem;font-weight:700;font-family:'Outfit',sans-serif;
          cursor:pointer;letter-spacing:.02em;
          transition:background .3s,border-color .3s,box-shadow .3s,transform .2s;
          position:relative;overflow:hidden;white-space:nowrap;
          box-shadow:0 4px 16px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04);
        }
        .pl-btn-search::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(${accentRgb},.12),transparent);animation:shimmer 3.2s ease-in-out infinite;}
        .pl-btn-search:hover:not(:disabled){background:linear-gradient(135deg,rgba(${accentRgb},.2),rgba(${accentRgb},.08));border-color:rgba(${accentRgb},.36);box-shadow:0 8px 24px rgba(0,0,0,.4),0 0 18px rgba(${accentRgb},.08);transform:translateY(-1px);}
        .pl-btn-search:active:not(:disabled){transform:translateY(0) scale(.99);}
        .pl-btn-search:disabled{opacity:.38;cursor:not-allowed;}

        /* ── Gradient CTA Button ── */
        .pl-btn-cta{
          display:flex;align-items:center;justify-content:center;gap:10px;
          width:100%;padding:15.5px;
          background:linear-gradient(135deg,${accent},${accent2},${accent});
          background-size:220% 220%;animation:gradShift 4.5s ease infinite;
          border:none;border-radius:14px;color:#000;
          font-size:.92rem;font-weight:800;font-family:'Outfit',sans-serif;
          cursor:pointer;letter-spacing:.03em;
          box-shadow:0 0 28px rgba(${accentRgb},.28),0 10px 28px rgba(0,0,0,.55);
          transition:transform .25s,box-shadow .3s;
          position:relative;overflow:hidden;
        }
        .pl-btn-cta::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);animation:shimmer 3s ease-in-out infinite;}
        .pl-btn-cta:hover:not(:disabled){transform:translateY(-2px) scale(1.01);box-shadow:0 0 44px rgba(${accentRgb},.44),0 18px 38px rgba(0,0,0,.65);}
        .pl-btn-cta:active:not(:disabled){transform:translateY(0) scale(.99);}
        .pl-btn-cta:disabled{opacity:.45;cursor:not-allowed;}

        /* ── Amber Button ── */
        .pl-btn-amber{
          display:inline-flex;align-items:center;gap:9px;
          padding:13.5px 26px;background:rgba(245,158,11,.07);
          border:1px solid rgba(245,158,11,.22);border-radius:13px;
          color:#f59e0b;font-size:.88rem;font-weight:700;font-family:'Outfit',sans-serif;
          cursor:pointer;transition:all .3s;position:relative;overflow:hidden;
          box-shadow:0 4px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04);
        }
        .pl-btn-amber::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(245,158,11,.1),transparent);animation:shimmer 3.8s ease-in-out infinite;}
        .pl-btn-amber:hover:not(:disabled){background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35);transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.38),0 0 14px rgba(245,158,11,.08);}
        .pl-btn-amber:active:not(:disabled){transform:translateY(0);}
        .pl-btn-amber:disabled{opacity:.38;cursor:not-allowed;}

        /* ── Info Tile ── */
        .pl-info-tile{
          background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.048);
          border-radius:14px;padding:14px 16px;
          transition:border-color .3s,background .28s;
        }
        .pl-info-tile:hover{border-color:rgba(${accentRgb},.14);background:rgba(${accentRgb},.022);}

        /* ── Session Row ── */
        .pl-session-row{
          display:flex;justify-content:space-between;align-items:center;
          padding:14px 16px;background:rgba(255,255,255,.018);
          border:1px solid rgba(255,255,255,.045);border-radius:16px;
          cursor:pointer;transition:border-color .28s,background .28s,transform .22s,box-shadow .28s;
        }
        .pl-session-row:hover{border-color:rgba(${accentRgb},.2);background:rgba(${accentRgb},.028);transform:translateX(3px);box-shadow:0 6px 20px rgba(0,0,0,.3),0 0 12px rgba(${accentRgb},.04);}

        /* ── Badge ── */
        .pl-badge{padding:4px 10px;border-radius:100px;font-size:.59rem;font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.06em;display:inline-flex;align-items:center;gap:5px;}

        /* ── Progress bar ── */
        .pl-progress-track{height:2.5px;border-radius:3px;background:rgba(255,255,255,.04);overflow:hidden;margin-top:8px;}
        .pl-progress-fill{height:100%;border-radius:3px;transition:width .3s ease;}

        /* ── Session scroll ── */
        .pl-sessions{max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(${accentRgb},.15) transparent;}
        .pl-sessions::-webkit-scrollbar{width:3px;}
        .pl-sessions::-webkit-scrollbar-thumb{background:rgba(${accentRgb},.18);border-radius:2px;}

        /* ── Warn box ── */
        .pl-warn{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:12px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.16);}

        @media(max-width:580px){
          .pl-two-col{grid-template-columns:1fr!important;}
          .pl-search-flex{flex-direction:column!important;}
          .pl-search-flex .pl-btn-search{width:100%!important;}
        }
      `}</style>

      <BackgroundScene isHC={isHC} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', padding: '48px 22px 72px' }}>

        {/* ══ HEADER ══ */}
        <div className="pl-fade pl-d1" style={{ marginBottom: 36 }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div className="pl-holo" style={{ background: `rgba(${accentRgb},.04)`, border: `1px solid rgba(${accentRgb},.16)`, color: accent }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 7px ${accent}`, animation: 'blink 2s infinite', flexShrink: 0 }} />
              {domain} Mode
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono', fontSize: '.57rem', color: '#334155', letterSpacing: '.07em' }}>
              <span style={{ color: '#475569' }}><LanguageCycler texts={['Domain', 'ಡೊಮೇನ್']} interval={3500} /></span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              <span style={{ color: accent }}><LanguageCycler texts={['Lookup', 'ಹುಡುಕಾಟ']} interval={3500} /></span>
            </div>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(1.9rem,3.2vw,2.6rem)', color: '#f8fafc', lineHeight: 1.07, letterSpacing: '-.026em', marginBottom: 10 }}>
            <LanguageCycler texts={[isHC ? 'Patient' : 'Client', isHC ? 'ರೋಗಿ' : 'ಗ್ರಾಹಕ']} interval={3500} />{' '}
            <span style={{ background: `linear-gradient(135deg,${accent},${accent2})`, backgroundSize: '200% 200%', animation: 'gradShift 5s ease infinite', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}><LanguageCycler texts={['Lookup', 'ಹುಡುಕಾಟ']} interval={3500} /></span>
          </h1>
          <p style={{ fontSize: '.9rem', lineHeight: 1.72, color: '#64748b', maxWidth: 460, marginBottom: 18 }}>
            <LanguageCycler texts={[`Search by mobile number to retrieve an existing ${isHC ? 'patient' : 'client'} record, or register a new profile in seconds.`, `ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ${isHC ? 'ರೋಗಿಯ' : 'ಗ್ರಾಹಕನ'} ದಾಖಲೆಯನ್ನು ಹಿಂಪಡೆಯಲು ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯ ಮೂಲಕ ಹುಡುಕಿ, ಅಥವಾ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಹೊಸ ಪ್ರೊಫೈಲ್ ಅನ್ನು ನೋಂದಾಯಿಸಿ.`]} interval={3500} />
          </p>

         
         
        </div>

        {/* ══ SEARCH CARD ══ */}
        <div className="pl-fade pl-d2" style={{ marginBottom: 16 }}>
          <StaticCard accentRgb={accentRgb} accent2Rgb={accent2Rgb}>
            <div style={{ padding: '30px 30px 28px' }}>

              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, position: 'relative', zIndex: 4 }}>
                <span className="pl-sec-label" style={{ color: accent }}><LanguageCycler texts={['Phone Search', 'ಫೋನ್ ಹುಡುಕಾಟ']} interval={3500} /></span>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${accentRgb},.13),transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 100, background: `rgba(${accentRgb},.04)`, border: `1px solid rgba(${accentRgb},.14)` }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, boxShadow: `0 0 5px ${accent}`, animation: 'blink 1.8s infinite' }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.54rem', color: accent, letterSpacing: '.07em', fontWeight: 600 }}><LanguageCycler texts={['READY', 'ಸಿದ್ಧವಾಗಿದೆ']} interval={3500} /></span>
                </div>
              </div>

              {/* Search row */}
              <div className="pl-search-flex" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', position: 'relative', zIndex: 4 }}>
                <div style={{ flex: 1 }}>
                  <InputField
                    label={<LanguageCycler texts={['Mobile Number', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ']} interval={3500} />} placeholder="10-ಅಂಕಿಯ ಸಂಖ್ಯೆ"
                    value={phone} onChange={v => setPhone(v.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && searchPerson()}
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                    {...f('phone')} accentRgb={accentRgb} accent={accent} maxLength={10}
                  />
                </div>
                <button className="pl-btn-search" onClick={searchPerson} disabled={loading || phone.length < 10} style={{ marginBottom: 0 }}>
                  {loading ? (
                    <><span style={{ width: 13, height: 13, border: `2px solid rgba(${accentRgb},.2)`, borderTopColor: accent, borderRadius: '50%', animation: 'spin .65s linear infinite', flexShrink: 0 }} /><LanguageCycler texts={['Searching', 'ಹುಡುಕುತ್ತಿದೆ']} interval={3500} /></>
                  ) : (
                    <><LanguageCycler texts={['Search', 'ಹುಡುಕಿ']} interval={3500} /> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></>
                  )}
                </button>
              </div>

              {/* Progress bar */}
              {phone.length > 0 && phone.length < 10 && (
                <div style={{ position: 'relative', zIndex: 4 }}>
                  <div className="pl-progress-track">
                    <div className="pl-progress-fill" style={{ width: `${phone.length / 10 * 100}%`, background: `linear-gradient(90deg,${accent},${accent2})` }} />
                  </div>
                  <p style={{ fontFamily: 'JetBrains Mono', fontSize: '.56rem', color: '#475569', marginTop: 5, letterSpacing: '.04em' }}>{phone.length}/10 digits</p>
                </div>
              )}
            </div>
          </StaticCard>
        </div>

        {/* ══ NOT FOUND / CREATE FORM ══ */}
        {notFound && showNewForm && (
          <div className="pl-fade" style={{ marginBottom: 16 }}>
            <StaticCard accentRgb="245,158,11" accent2Rgb="248,113,113">
              <div style={{ padding: '30px 30px 28px' }}>

                {/* Warn */}
                <div className="pl-warn" style={{ marginBottom: 20, position: 'relative', zIndex: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.65rem', color: '#f59e0b', fontWeight: 600 }}>
                    No record found for <span style={{ fontFamily: 'JetBrains Mono', letterSpacing: '.06em' }}>{phone}</span>
                  </span>
                </div>

                {/* Section label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, position: 'relative', zIndex: 4 }}>
                  <span className="pl-sec-label" style={{ color: '#f59e0b' }}><LanguageCycler texts={[`New ${isHC ? 'Patient' : 'Client'} Record`, `ಹೊಸ ${isHC ? 'ರೋಗಿ' : 'ಗ್ರಾಹಕ'} ದಾಖಲೆ`]} interval={3500} /></span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(245,158,11,.14),transparent)' }} />
                </div>

                {/* Form */}
                <div className="pl-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, position: 'relative', zIndex: 4 }}>
                  <InputField label="Full Name" placeholder="John Doe" value={newPerson.name}
                    onChange={v => setNewPerson({ ...newPerson, name: v })}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                    {...f('name')} accentRgb="245,158,11" accent="#f59e0b" required />
                  <InputField label="Email" placeholder="john@example.com" value={newPerson.email} type="email"
                    onChange={v => setNewPerson({ ...newPerson, email: v })}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
                    {...f('email')} accentRgb="245,158,11" accent="#f59e0b" />
                </div>

                <div className="pl-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24, position: 'relative', zIndex: 4 }}>
                  <InputField label="Age" placeholder="e.g. 35" value={newPerson.age} type="number"
                    onChange={v => setNewPerson({ ...newPerson, age: v })}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    {...f('age')} accentRgb="245,158,11" accent="#f59e0b" />
                  <SelectField label="Gender" value={newPerson.gender}
                    onChange={v => setNewPerson({ ...newPerson, gender: v })}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 8v-2M12 18v-2M8 12H6M18 12h-2" /></svg>}
                    {...f('gender')} accentRgb="245,158,11" accent="#f59e0b"
                    options={[{ value: '', label: 'Select gender' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
                </div>

                <button className="pl-btn-amber" onClick={createPerson} disabled={!newPerson.name || createLoading} style={{ position: 'relative', zIndex: 4 }}>
                  {createLoading
                    ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(245,158,11,.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin .65s linear infinite', flexShrink: 0 }} />Creating…</>
                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg><LanguageCycler texts={[`Create ${isHC ? 'Patient' : 'Client'} Record`, `${isHC ? 'ರೋಗಿ' : 'ಗ್ರಾಹಕ'} ದಾಖಲೆ ರಚಿಸಿ`]} interval={3500} /></>}
                </button>
              </div>
            </StaticCard>
          </div>
        )}

        {/* ══ PERSON FOUND ══ */}
        {person && !showNewForm && (
          <>
            {/* Profile + Action */}
            <div className="pl-fade pl-d3" style={{ marginBottom: 16 }}>
              <StaticCard accentRgb={accentRgb} accent2Rgb={accent2Rgb}>
                <div style={{ padding: '30px 30px 0', position: 'relative', zIndex: 4 }}>

                  {/* Profile header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 60, height: 60, borderRadius: 17, background: `linear-gradient(135deg,rgba(${accentRgb},.14),rgba(${accentRgb},.04))`, border: `1px solid rgba(${accentRgb},.22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `6px 6px 20px rgba(0,0,0,.5),0 0 26px rgba(${accentRgb},.07),inset 0 1px 0 rgba(255,255,255,.08)` }}>
                        <div style={{ position: 'absolute', inset: -7, borderRadius: 22, border: `1px dashed rgba(${accentRgb},.18)`, animation: 'spinRing 11s linear infinite' }} />
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px rgba(${accentRgb},.5))` }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', color: '#f8fafc', letterSpacing: '-.02em', marginBottom: 5 }}>{person.name || 'Unknown'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 7px ${accent}`, animation: 'blink 2s infinite' }} />
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.58rem', color: accent, letterSpacing: '.08em', fontWeight: 600 }}>RECORD FOUND</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.72rem', color: '#475569', letterSpacing: '.06em' }}>{person.phone}</span>
                      </div>
                    </div>

                    {person.sessions?.length > 0 && (
                      <div style={{ textAlign: 'center', padding: '10px 15px', borderRadius: 13, background: `rgba(${accentRgb},.05)`, border: `1px solid rgba(${accentRgb},.14)` }}>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.4rem', color: accent, filter: `drop-shadow(0 0 6px rgba(${accentRgb},.38))`, lineHeight: 1 }}>{person.sessions.length}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.52rem', color: '#475569', letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 3 }}>Sessions</div>
                      </div>
                    )}
                  </div>

                  {/* Info tiles */}
                  <div className="pl-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 22 }}>
                    {[
                      { label: 'Phone', val: person.phone, icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z', mono: true },
                      { label: 'Age', val: person.age ?? '—', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', mono: false },
                      { label: 'Gender', val: person.gender ?? '—', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', mono: false },
                      { label: 'Email', val: person.email ?? '—', icon: 'M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z', mono: false, extra: 'M22 6l-10 7L2 6' },
                    ].map(tile => (
                      <div key={tile.label} className="pl-info-tile">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 6, background: `rgba(${accentRgb},.06)`, border: `1px solid rgba(${accentRgb},.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d={tile.icon} />{tile.extra && <path d={tile.extra} />}
                            </svg>
                          </div>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.55rem', color: '#475569', letterSpacing: '.1em', textTransform: 'uppercase' }}>{tile.label}</span>
                        </div>
                        <p style={{ fontSize: tile.mono ? '.78rem' : '.88rem', color: '#e2e8f0', fontWeight: 600, fontFamily: tile.mono ? 'JetBrains Mono' : 'Outfit', paddingLeft: 25, letterSpacing: tile.mono ? '.05em' : '-.01em', wordBreak: 'break-all' }}>{tile.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA button flush to bottom */}
                <div style={{ padding: '0 30px 30px', position: 'relative', zIndex: 4 }}>
                  <button className="pl-btn-cta" onClick={() => setShowSessionTypeModal(true)} disabled={sessionLoading}>
                    <LanguageCycler texts={['Start New Session', 'ಹೊಸ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ']} interval={3500} /> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </button>
                </div>
              </StaticCard>
            </div>

            {/* Health / Finance Timeline */}
            {person.sessions?.length > 0 && (
              <HealthTimeline
                sessions={person.sessions}
                accent={accent}
                accentRgb={accentRgb}
                accent2Rgb={accent2Rgb}
                isHC={isHC}
                router={router}
                personName={person.name || 'Unknown'}
                domain={domain || 'HEALTHCARE'}
              />
            )}

            {/* Session History */}
            {person.sessions?.length > 0 && (
              <div className="pl-fade pl-d4">
                <StaticCard accentRgb={accentRgb} accent2Rgb={accent2Rgb}>
                  <div style={{ padding: '28px 28px 24px', position: 'relative', zIndex: 4 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                      <span className="pl-sec-label" style={{ color: accent }}><LanguageCycler texts={['Session History', 'ಸೆಷನ್ ಇತಿಹಾಸ']} interval={3500} /></span>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${accentRgb},.12),transparent)` }} />
                      <div style={{ padding: '3px 10px', borderRadius: 100, background: `rgba(${accentRgb},.05)`, border: `1px solid rgba(${accentRgb},.14)` }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.56rem', color: accent, fontWeight: 700 }}>{person.sessions.length}</span>
                      </div>
                    </div>

                    <div className="pl-sessions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {person.sessions.map((s: any, i: number) => (
                        <div key={s.id} className="pl-session-row"
                          style={{ animation: 'slideRight .4s ease both', animationDelay: `${i * 55}ms` } as React.CSSProperties}
                          onClick={() => router.push(`/session/${s.id}`)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: `rgba(${accentRgb},.05)`, border: `1px solid rgba(${accentRgb},.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .7 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            </div>
                            <div>
                              <p style={{ fontSize: '.83rem', color: '#e2e8f0', fontWeight: 700, marginBottom: 3, fontFamily: 'Outfit', letterSpacing: '-.01em' }}>
                                {s.department.replace(/_/g, ' ')}
                              </p>
                              <p style={{ fontSize: '.59rem', color: '#475569', fontFamily: 'JetBrains Mono', letterSpacing: '.04em' }}>
                                {format(new Date(s.createdAt), 'MMM dd, yyyy · HH:mm')}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className="pl-badge" style={{ background: s.status === 'COMPLETED' ? `rgba(${accentRgb},.06)` : 'rgba(245,158,11,.06)', border: `1px solid ${s.status === 'COMPLETED' ? `rgba(${accentRgb},.18)` : 'rgba(245,158,11,.18)'}`, color: s.status === 'COMPLETED' ? accent : '#f59e0b' }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                              {s.status}
                            </span>
                            {s.approved && (
                              <span className="pl-badge" style={{ background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.18)', color: '#34d399' }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                APPROVED
                              </span>
                            )}
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaticCard>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ SESSION TYPE MODAL ══ */}
      {showSessionTypeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(12px)',
          animation: 'fadeSlide .25s ease',
        }} onClick={() => !sessionLoading && setShowSessionTypeModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 580, padding: '0 20px',
            animation: 'fadeSlide .3s ease',
          }}>
            {/* Modal Card */}
            <div style={{
              background: 'linear-gradient(165deg, rgba(8,12,24,.98), rgba(3,6,15,.99))',
              border: `1px solid rgba(${accentRgb},.12)`,
              borderRadius: 24, overflow: 'hidden',
              boxShadow: `0 40px 80px rgba(0,0,0,.7), 0 0 60px rgba(${accentRgb},.06)`,
            }}>
              {/* Top accent line */}
              <div style={{
                height: 2,
                background: `linear-gradient(90deg, transparent, rgba(${accentRgb},.6), rgba(${accent2Rgb},.3), transparent)`,
              }} />

              {/* Header */}
              <div style={{ padding: '28px 32px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="pl-sec-label" style={{ color: accent }}>Session Type</span>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${accentRgb},.13),transparent)` }} />
                  <button onClick={() => setShowSessionTypeModal(false)} style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)',
                    color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 14, transition: 'all .2s',
                  }}>
                    ×
                  </button>
                </div>
                <h2 style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.3rem',
                  color: '#f8fafc', letterSpacing: '-.02em', marginBottom: 6,
                }}>
                  Choose Session Mode
                </h2>
                <p style={{ fontSize: '.82rem', color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                  Select how you'd like to conduct this consultation session.
                </p>
              </div>

              {/* Options */}
              <div style={{ padding: '0 32px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* ── Single Language Option ── */}
                <button
                  disabled={sessionLoading}
                  onClick={() => startSession('SINGLE')}
                  style={{
                    width: '100%', padding: '20px 22px', borderRadius: 16,
                    background: selectedSessionMode === 'SINGLE'
                      ? `linear-gradient(135deg, rgba(${accentRgb},.12), rgba(${accentRgb},.04))`
                      : 'rgba(255,255,255,.018)',
                    border: selectedSessionMode === 'SINGLE'
                      ? `1px solid rgba(${accentRgb},.3)`
                      : '1px solid rgba(255,255,255,.06)',
                    cursor: sessionLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'left', transition: 'all .25s',
                    opacity: sessionLoading && selectedSessionMode !== 'SINGLE' ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!sessionLoading) { e.currentTarget.style.borderColor = `rgba(${accentRgb},.22)`; e.currentTarget.style.background = `rgba(${accentRgb},.035)` }}}
                  onMouseLeave={e => { if (!sessionLoading && selectedSessionMode !== 'SINGLE') { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.background = 'rgba(255,255,255,.018)' }}}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, rgba(${accentRgb},.12), rgba(${accentRgb},.04))`,
                      border: `1px solid rgba(${accentRgb},.2)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sessionLoading && selectedSessionMode === 'SINGLE' ? (
                        <span style={{ width: 18, height: 18, border: `2px solid rgba(${accentRgb},.2)`, borderTopColor: accent, borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'block' }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '.95rem', color: '#f8fafc' }}>
                          Single Language Session
                        </span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 100,
                          background: `rgba(${accentRgb},.06)`, border: `1px solid rgba(${accentRgb},.16)`,
                          fontFamily: 'JetBrains Mono', fontSize: '.52rem', fontWeight: 600,
                          color: accent, letterSpacing: '.06em',
                        }}>NEW</span>
                      </div>
                      <p style={{ fontSize: '.76rem', color: '#64748b', lineHeight: 1.55, marginBottom: 10 }}>
                        One continuous recording with auto language detection. NER entity extraction, medical report generation, and full editable transcript at the end.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['Auto-detect', 'Single mic', 'Editable transcript', 'Translate'].map(tag => (
                          <span key={tag} style={{
                            padding: '3px 9px', borderRadius: 6,
                            background: `rgba(${accentRgb},.04)`, border: `1px solid rgba(${accentRgb},.1)`,
                            fontFamily: 'JetBrains Mono', fontSize: '.55rem', color: accent, fontWeight: 500,
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                {/* ── Multi-Language Option ── */}
                <button
                  disabled={sessionLoading}
                  onClick={() => startSession('MULTI')}
                  style={{
                    width: '100%', padding: '20px 22px', borderRadius: 16,
                    background: selectedSessionMode === 'MULTI'
                      ? `linear-gradient(135deg, rgba(${accent2Rgb},.12), rgba(${accent2Rgb},.04))`
                      : 'rgba(255,255,255,.018)',
                    border: selectedSessionMode === 'MULTI'
                      ? `1px solid rgba(${accent2Rgb},.3)`
                      : '1px solid rgba(255,255,255,.06)',
                    cursor: sessionLoading ? 'not-allowed' : 'pointer',
                    textAlign: 'left', transition: 'all .25s',
                    opacity: sessionLoading && selectedSessionMode !== 'MULTI' ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!sessionLoading) { e.currentTarget.style.borderColor = `rgba(${accent2Rgb},.22)`; e.currentTarget.style.background = `rgba(${accent2Rgb},.035)` }}}
                  onMouseLeave={e => { if (!sessionLoading && selectedSessionMode !== 'MULTI') { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.background = 'rgba(255,255,255,.018)' }}}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `linear-gradient(135deg, rgba(${accent2Rgb},.12), rgba(${accent2Rgb},.04))`,
                      border: `1px solid rgba(${accent2Rgb},.2)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sessionLoading && selectedSessionMode === 'MULTI' ? (
                        <span style={{ width: 18, height: 18, border: `2px solid rgba(${accent2Rgb},.2)`, borderTopColor: accent2, borderRadius: '50%', animation: 'spin .6s linear infinite', display: 'block' }} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '.95rem', color: '#f8fafc' }}>
                          Multi-Language Session
                        </span>
                      </div>
                      <p style={{ fontSize: '.76rem', color: '#64748b', lineHeight: 1.55, marginBottom: 10 }}>
                        Doctor and patient speak in different languages. Separate recording channels with real-time translation across all languages.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['Doctor + Patient mics', '3 languages', 'Live translate', 'Cross-lingual'].map(tag => (
                          <span key={tag} style={{
                            padding: '3px 9px', borderRadius: 6,
                            background: `rgba(${accent2Rgb},.04)`, border: `1px solid rgba(${accent2Rgb},.1)`,
                            fontFamily: 'JetBrains Mono', fontSize: '.55rem', color: accent2, fontWeight: 500,
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

              </div>

              {/* Bottom accent */}
              <div style={{
                height: 2,
                background: `linear-gradient(90deg, transparent 5%, rgba(${accentRgb},.25) 30%, rgba(${accent2Rgb},.15) 70%, transparent 95%)`,
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}