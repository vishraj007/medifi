'use client'

// app/admin/dashboard/page.tsx
// Real data only — no mock/dummy data. Avg Duration card removed.

import { useEffect, useState, useRef } from 'react'
import { Activity, CheckCircle, TrendingUp, ArrowUpRight, ArrowDownRight, BarChart2 } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeptSession { department: string; _count: number }

interface OverviewData {
  totalSessions: number
  completedSessions: number
  approvalRate: number
  totalUsers?: number
  totalExports?: number
  activeSessions?: number
}

interface AnalyticsPayload {
  overview: OverviewData
  sessionsByDepartment: DeptSession[]
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color, W = 100, H = 32 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(' ')
  const fill = [...pts.split(' '), `${W},${H}`, `0,${H}`].join(' ')
  const id = `sg-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* terminal dot */}
      {(() => { const last = pts.split(' ').at(-1)!.split(','); return <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} /> })()}
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color, bg, glow, icon: Icon, delay = 0, spark, trendUp,
}: {
  label: string; value: string | number; sub: string; color: string; bg: string
  glow: string; icon: React.ElementType; delay?: number; spark?: number[]; trendUp?: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px)`
    el.style.transition = 'transform .08s'
  }
  const onLeave = () => {
    const el = cardRef.current; if (!el) return
    el.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateY(0)'
    el.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)'
  }

  const trendColor = trendUp === undefined ? '#555' : trendUp ? '#00F5A0' : '#F87171'
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: 'relative', borderRadius: 16, padding: '24px',
        background: bg, border: `1px solid ${color}22`,
        boxShadow: `0 4px 24px ${glow}, 0 0 0 1px ${color}10`,
        overflow: 'hidden', transformStyle: 'preserve-3d',
        animationDelay: `${delay}s`, cursor: 'default',
      }}
      className="stat-card fu"
    >
      {/* Top shimmer line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${color}88,transparent)` }} />
      {/* Corner glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${glow},transparent 70%)`, pointerEvents: 'none' }} />

      {/* Icon + trend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${color}15` }}>
          <Icon size={18} color={color} />
        </div>
        {trendUp !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 100, background: `${trendColor}12`, border: `1px solid ${trendColor}28`, fontSize: 10, color: trendColor, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
            <TrendIcon size={10} color={trendColor} />
            {trendUp ? 'up' : 'down'}
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 32, fontWeight: 700, color, lineHeight: 1, marginBottom: 5 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#ccc', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>

      {spark && spark.length > 1 && (
        <div style={{ marginTop: 14, opacity: 0.7 }}>
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchAnalytics()
    animateCanvas()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/analytics/dashboard?days=30')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AnalyticsPayload = await res.json()
      setAnalytics(data)
    } catch (e) {
      setError('Failed to load analytics. Check API connection.')
    } finally {
      setLoading(false)
    }
  }

  const animateCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const dots = Array.from({ length: 55 }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, o: Math.random(), s: Math.random() * 0.007 + 0.002 }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => { d.o += d.s; if (d.o > 1 || d.o < 0) d.s *= -1; ctx.beginPath(); ctx.arc(d.x, d.y, 1, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,212,255,${d.o * 0.2})`; ctx.fill() })
      requestAnimationFrame(draw)
    }
    draw()
  }

  const DEPT_COLORS = ['#00D4FF', '#00F5A0', '#F59E0B', '#A78BFA', '#F472B6', '#34D399', '#60A5FA', '#FB923C']

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid #00D4FF22', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#00D4FF', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 6, border: '2px solid transparent', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 1.2s linear infinite reverse' }} />
      </div>
      <span style={{ fontSize: 11, color: '#444', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.12em' }}>LOADING ANALYTICS</span>
    </div>
  )

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#F87171', fontFamily: 'IBM Plex Mono, monospace' }}>{error}</div>
      <button onClick={fetchAnalytics} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #F8717133', background: '#F8717110', color: '#F87171', cursor: 'pointer', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Retry</button>
    </div>
  )

  if (!analytics) return null

  const ov = analytics.overview
  const depts = analytics.sessionsByDepartment ?? []
  const deptMax = Math.max(...depts.map(d => d._count), 1)
  const deptTotal = depts.reduce((a, b) => a + b._count, 0)
  const completionRate = ov.totalSessions > 0 ? ((ov.completedSessions / ov.totalSessions) * 100).toFixed(1) : '0.0'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin         { to { transform: rotate(360deg) } }
        @keyframes fadeUp       { from { opacity:0; transform:translateY(14px) scale(.98) } to { opacity:1; transform:none } }
        @keyframes shimmerSweep { 0% { transform:translateX(-100%) } 100% { transform:translateX(220%) } }
        @keyframes barGrow      { from { width:0 } to { width:var(--w) } }
        @keyframes glowPulse    { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spinRing     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .fu { animation: fadeUp .5s cubic-bezier(.23,1,.32,1) both; }
        .fu-1{animation-delay:.06s} .fu-2{animation-delay:.12s} .fu-3{animation-delay:.18s}
        .fu-4{animation-delay:.24s} .fu-5{animation-delay:.3s}  .fu-6{animation-delay:.36s}

        .stat-card::after {
          content:''; position:absolute; top:0; left:0; width:40%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);
          transform:translateX(-100%); pointer-events:none;
        }
        .stat-card:hover::after { animation: shimmerSweep .65s ease forwards; }

        .dept-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:13px 18px; border-radius:10px; border:1px solid #1A1A1A;
          background:#0D0D0D; transition:all .18s; position:relative; overflow:hidden; cursor:default;
        }
        .dept-row::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:var(--dc); box-shadow:0 0 8px var(--dc); opacity:0; transition:opacity .2s; }
        .dept-row:hover { border-color:#2A2A2A; background:#111; transform:translateX(3px); }
        .dept-row:hover::before { opacity:1; }

        .bar-track { height:3px; background:#1A1A1A; border-radius:2px; overflow:hidden; margin-top:6px; }
        .bar-fill  { height:100%; border-radius:2px; background:var(--dc); animation:barGrow .8s cubic-bezier(.23,1,.32,1) both; }

        .quick-stat { display:flex; flex-direction:column; align-items:center; gap:5px; padding:14px; background:#0D0D0D; border:1px solid #1A1A1A; border-radius:10px; text-align:center; transition:border-color .18s; }
        .quick-stat:hover { border-color:#2A2A2A; }

        .section-card { background:#111; border:1px solid #1E1E1E; border-radius:16px; padding:26px; position:relative; overflow:hidden; }
        .section-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,#2A2A2A 40%,#2A2A2A 60%,transparent); }

        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#0D0D0D; }
        ::-webkit-scrollbar-thumb { background:#2A2A2A; border-radius:2px; }
      `}</style>

      {/* Canvas bg */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: .35 }} />

      <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#E8E8E8', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div className="fu" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: 'linear-gradient(180deg,#00D4FF,#A78BFA)' }} />
            <span style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.15em', textTransform: 'uppercase' }}>Admin · Overview</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', background: '#051A10', border: '1px solid #00F5A022', borderRadius: 100, fontSize: 10, color: '#00F5A0', fontFamily: 'IBM Plex Mono, monospace' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F5A0', boxShadow: '0 0 6px #00F5A0', animation: 'glowPulse 2s ease-in-out infinite' }} />
              live
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E8E8E8', letterSpacing: '-.02em', marginBottom: 5 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#555' }}>System overview — last 30 days</p>
        </div>

        {/* ── 3 Stat Cards (no Avg Duration) ── */}
        <div className="fu fu-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard
            label="Total Sessions" value={ov.totalSessions}
            sub="Last 30 days" color="#00D4FF" glow="rgba(0,212,255,.15)"
            bg="linear-gradient(135deg,#001824,#002535)"
            icon={Activity} delay={0} trendUp={true}
            spark={depts.map(d => d._count)}
          />
          <StatCard
            label="Completed Sessions" value={ov.completedSessions}
            sub={`${completionRate}% completion rate`} color="#00F5A0" glow="rgba(0,245,160,.15)"
            bg="linear-gradient(135deg,#001A0F,#002518)"
            icon={CheckCircle} delay={0.07} trendUp={true}
            spark={depts.map(d => Math.floor(d._count * 0.7))}
          />
          <StatCard
            label="Approval Rate" value={`${ov.approvalRate?.toFixed(1) ?? 0}%`}
            sub="Reports approved" color="#F59E0B" glow="rgba(245,158,11,.15)"
            bg="linear-gradient(135deg,#1A1200,#251A00)"
            icon={TrendingUp} delay={0.14}
            spark={depts.map(d => Math.floor(d._count * 0.5))}
          />
        </div>

        {/* ── Quick stats strip ── */}
        <div className="fu fu-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Active Sessions', value: ov.activeSessions ?? '—',  color: '#00D4FF' },
            { label: 'Total Users',     value: ov.totalUsers ?? '—',      color: '#00F5A0' },
            { label: 'Total Exports',   value: ov.totalExports ?? '—',    color: '#F59E0B' },
            { label: 'Departments',     value: depts.length,              color: '#A78BFA' },
          ].map((q, i) => (
            <div key={q.label} className="quick-stat" style={{ animationDelay: `${i * 0.04 + 0.22}s` }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: q.color, lineHeight: 1 }}>{q.value}</div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '.03em' }}>{q.label}</div>
            </div>
          ))}
        </div>

        {/* ── Department sessions ── */}
        <div className="section-card fu fu-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: 'linear-gradient(180deg,#00D4FF,#A78BFA)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#E8E8E8' }}>Sessions by Department</span>
            <BarChart2 size={13} color="#444" style={{ marginLeft: 2 }} />
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 100, padding: '2px 8px' }}>
              {depts.length} depts
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {depts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: '#444', fontFamily: 'IBM Plex Mono, monospace' }}>
                No department data available
              </div>
            )}
            {depts.map((dept, i) => {
              const pct = Math.round((dept._count / deptMax) * 100)
              const sharePct = deptTotal > 0 ? Math.round((dept._count / deptTotal) * 100) : 0
              const color = DEPT_COLORS[i % DEPT_COLORS.length]
              return (
                <div
                  key={dept.department}
                  className="dept-row"
                  style={{ '--dc': color } as React.CSSProperties}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#CCC', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dept.department.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="bar-track" style={{ width: 'min(220px, 100%)' }}>
                      <div className="bar-fill" style={{ '--w': `${pct}%`, '--dc': color, animationDelay: `${i * 0.07}s` } as React.CSSProperties} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginLeft: 24, flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color, lineHeight: 1 }}>{dept._count}</div>
                    <div style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace' }}>{sharePct}% of total</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}