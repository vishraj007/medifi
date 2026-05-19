'use client'

// app/admin/analytics/page.tsx
// Real data only — no mock/dummy generators. Avg Duration card removed.
// Requires: npm i recharts lucide-react

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Activity, CheckCircle, TrendingUp, FileText,
  Clock, Shield, Globe, BarChart2, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, Layers, Database, Cpu, Wifi,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeptSession { department: string; _count: number }
interface DomainSession { domain: string; _count: number }
interface DailyActivity { date: string; sessions: number; completed: number; approved: number }
interface LanguageItem { language: string; _count: number }
interface DoctorItem { name: string; sessions: number; completionPct: number }

interface OverviewData {
  totalSessions: number
  completedSessions: number
  approvalRate: number
  totalUsers?: number
  totalExports?: number
  activeSessions?: number
  totalPersons?: number
}

interface AnalyticsPayload {
  overview: OverviewData
  sessionsByDepartment: DeptSession[]
  sessionsByDomain?: DomainSession[]
  dailyActivity?: DailyActivity[]
  languageBreakdown?: LanguageItem[]
  topDoctors?: DoctorItem[]
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cyan: '#00D4FF',
  emerald: '#00F5A0',
  violet: '#A78BFA',
  amber: '#F59E0B',
  rose: '#F472B6',
  indigo: '#818CF8',
  teal: '#2DD4BF',
  orange: '#FB923C',
} as const

const PALETTE = Object.values(C)

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,.6)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
      <p style={{ color: '#666', marginBottom: 6, fontSize: 10 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#666', textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Spark({ data, color, W = 110, H = 34 }: { data: number[]; color: string; W?: number; H?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(' ')
  const fill = [...pts.split(' '), `${W},${H}`, `0,${H}`].join(' ')
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}-${W}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {(() => { const last = pts.split(' ').at(-1)!.split(','); return <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} /> })()}
    </svg>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon, trend, spark }: {
  label: string; value: string | number; sub: string; color: string
  icon: React.ElementType; trend?: 'up' | 'down'; spark?: number[]
}) {
  const trendColor = trend === 'up' ? C.emerald : trend === 'down' ? '#F87171' : '#555'
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight
  return (
    <div className="stat-card"
      style={{ position: 'relative', borderRadius: 16, padding: '22px 24px', background: 'linear-gradient(135deg,#111,#0D0D0D)', border: `1px solid ${color}22`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color}88,transparent)` }} />
      <div style={{ position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle,${color}08,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${color}14` }}>
          <Icon size={18} color={color} />
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 100, background: `${trendColor}12`, border: `1px solid ${trendColor}28`, fontSize: 10, color: trendColor, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
            <TrendIcon size={10} color={trendColor} />
            {trend}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 30, fontWeight: 700, color, lineHeight: 1, marginBottom: 6 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#E8E8E8', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace' }}>{sub}</div>
      {spark && spark.length > 1 && <div style={{ marginTop: 14 }}><Spark data={spark} color={color} /></div>}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SHeader({ title, sub, icon: Icon, color = C.cyan }: { title: string; sub?: string; icon?: React.ElementType; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      {Icon && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      )}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#E8E8E8', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({
  children,
  style = {},
  className = '',
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: '#111',
        border: '1px solid #1E1E1E',
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Donut KPI ────────────────────────────────────────────────────────────────
function Donut({ value, max = 100, label, color, size = 120 }: { value: number; max?: number; label: string; color: string; size?: number }) {
  const pct = Math.min(value / max, 1)
  const r = 46, cx = 60, cy = 60, circ = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A1A1A" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: color, fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 700 }}>
          {max === 100 ? `${Math.round(value)}%` : Math.round(value)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: '#555', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9 }}>
          {max === 100 ? 'rate' : `/ ${max}`}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: '#666', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

// ─── Live pulse ───────────────────────────────────────────────────────────────
function LivePulse({ label, color = C.emerald }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, animation: 'lp 2s ease-in-out infinite' }} />
      <span style={{ fontSize: 10, color, fontFamily: 'IBM Plex Mono, monospace' }}>{label}</span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [range, setRange] = useState<7 | 14 | 30 | 90>(30)
  const [tab, setTab] = useState<'overview' | 'activity' | 'departments' | 'system'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [range])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/analytics/dashboard?days=${range}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AnalyticsPayload = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load analytics data. Check the API connection.')
    } finally {
      setLoading(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const ov = data?.overview
  const depts = data?.sessionsByDepartment ?? []
  const daily = data?.dailyActivity ?? []
  const langs = data?.languageBreakdown ?? []
  const topDocs = data?.topDoctors ?? []
  const domainRaw = data?.sessionsByDomain ?? []
  const deptTotal = depts.reduce((a, b) => a + b._count, 0)
  const langTotal = langs.reduce((a, b) => a + b._count, 0)

  // Radar built entirely from real overview fields
  const radarData = ov ? [
    { metric: 'Sessions', value: Math.min(Math.round((ov.totalSessions / 200) * 100), 100) },
    { metric: 'Completion', value: ov.totalSessions > 0 ? Math.round((ov.completedSessions / ov.totalSessions) * 100) : 0 },
    { metric: 'Approval', value: Math.round(ov.approvalRate) },
    { metric: 'Users', value: Math.min(Math.round(((ov.totalUsers ?? 0) / 50) * 100), 100) },
    { metric: 'Exports', value: Math.min(Math.round(((ov.totalExports ?? 0) / 100) * 100), 100) },
    { metric: 'Persons', value: Math.min(Math.round(((ov.totalPersons ?? 0) / 300) * 100), 100) },
  ] : []

  // Spark arrays from real daily data
  const sessionsArr = daily.map(d => d.sessions)
  const completedArr = daily.map(d => d.completed)
  const approvedArr = daily.map(d => d.approved)

  // Cumulative daily
  const cumDaily = daily.map((d, i, arr) => ({
    ...d,
    cumSessions: arr.slice(0, i + 1).reduce((a, b) => a + b.sessions, 0),
    cumCompleted: arr.slice(0, i + 1).reduce((a, b) => a + b.completed, 0),
    cumApproved: arr.slice(0, i + 1).reduce((a, b) => a + b.approved, 0),
  }))

  // Domain bar data
  const domainData = domainRaw.map((d, i) => ({ name: d.domain, value: d._count, color: PALETTE[i] }))

  // Dept pie data
  const deptPieData = depts.map((d, i) => ({ name: d.department.replace(/_/g, ' '), value: d._count }))

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes lp{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid #00D4FF22', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#00D4FF', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 6, border: '2px solid transparent', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 1.2s linear infinite reverse' }} />
      </div>
      <span style={{ fontSize: 11, color: '#444', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.12em' }}>LOADING ANALYTICS</span>
    </div>
  )

  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#F87171', fontFamily: 'IBM Plex Mono, monospace' }}>{error ?? 'No data'}</div>
      <button onClick={load} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #F8717133', background: '#F8717110', color: '#F87171', cursor: 'pointer', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>Retry</button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes lp      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.85)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes barGrow { from{transform:scaleX(0)} to{transform:scaleX(1)} }

        .fu  { animation: fadeUp .4s ease both; }
        .f1{animation-delay:.04s} .f2{animation-delay:.08s} .f3{animation-delay:.12s}
        .f4{animation-delay:.16s} .f5{animation-delay:.20s} .f6{animation-delay:.24s}
        .f7{animation-delay:.28s} .f8{animation-delay:.32s}

        .tab-bar  { display:flex; gap:4px; padding:4px; background:#0D0D0D; border:1px solid #1A1A1A; border-radius:12px; margin-bottom:24px; }
        .tab-btn  { flex:1; padding:9px 16px; border-radius:9px; border:none; cursor:pointer; font-size:12px; font-weight:600; font-family:'DM Sans',sans-serif; color:#555; background:transparent; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .tab-btn.active  { background:#1A1A1A; color:#E8E8E8; border:1px solid #2A2A2A; }
        .tab-btn:hover:not(.active) { color:#888; background:#0F0F0F; }

        .range-btn { padding:6px 14px; border-radius:8px; border:1px solid #2A2A2A; background:transparent; color:#555; font-size:11px; font-family:'IBM Plex Mono',monospace; cursor:pointer; transition:all .15s; }
        .range-btn.active { background:#001824; border-color:#00D4FF44; color:#00D4FF; }

        .nav-pill { padding:7px 14px; border-radius:8px; border:1px solid #1E1E1E; color:#555; font-size:12px; font-weight:500; text-decoration:none; transition:all .18s; display:flex; align-items:center; gap:6px; font-family:'DM Sans',sans-serif; }
        .nav-pill:hover { border-color:#00D4FF44; color:#00D4FF; background:#001824; }

        .stat-card { position:relative; border-radius:16px; padding:22px 24px; background:linear-gradient(135deg,#111,#0D0D0D); overflow:hidden; transition:transform .2s, box-shadow .2s; }
        .stat-card:hover { transform:translateY(-3px); box-shadow:0 20px 48px rgba(0,0,0,.5); }

        .prog-track { width:100%; height:4px; background:#1A1A1A; border-radius:2px; overflow:hidden; }
        .prog-fill  { height:100%; border-radius:2px; transform-origin:left; animation:barGrow .8s cubic-bezier(.23,1,.32,1) both; }

        .adm-table { width:100%; border-collapse:collapse; }
        .adm-table th { font-size:10px; color:#444; font-family:'IBM Plex Mono',monospace; letter-spacing:.12em; text-transform:uppercase; padding:8px 14px; text-align:left; border-bottom:1px solid #1A1A1A; }
        .adm-table td { padding:12px 14px; border-bottom:1px solid #0F0F0F; font-size:13px; color:#AAA; }
        .adm-table tr:hover td { background:#0D0D0D; }
        .adm-table tr:last-child td { border-bottom:none; }

        .sys-row { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #0F0F0F; transition:background .1s; }
        .sys-row:hover { background:#0D0D0D; }
        .sys-row:last-child { border-bottom:none; }

        .badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:100px; font-size:10px; font-family:'IBM Plex Mono',monospace; font-weight:600; border:1px solid; }

        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line { stroke:#1A1A1A !important; }
        .recharts-text { fill:#555 !important; font-family:'IBM Plex Mono',monospace !important; font-size:10px !important; }
        .recharts-legend-item-text { color:#888 !important; font-size:11px !important; }

        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#2A2A2A; border-radius:2px; }
      `}</style>

      <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#E8E8E8' }}>

        {/* ── Top bar ── */}
        <div className="fu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 3, height: 20, background: `linear-gradient(180deg,${C.cyan},${C.violet})`, borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.14em', textTransform: 'uppercase' }}>Admin · Analytics</span>
              <LivePulse label="live" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E8E8E8', letterSpacing: '-.02em' }}>Analytics Dashboard</h1>
            <p style={{ fontSize: 13, color: '#555', marginTop: 4 }}>System-wide insights from real session data</p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {([7, 14, 30, 90] as const).map(r => (
                <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}d</button>
              ))}
            </div>
            <div style={{ width: 1, height: 24, background: '#2A2A2A' }} />
            {[{ href: '/admin/dashboard', label: 'Overview' }, { href: '/admin/users', label: 'Users' }, { href: '/admin/configs', label: 'Configs' }, { href: '/admin/audit-logs', label: 'Audit' }].map(l => (
              <Link key={l.href} href={l.href} className="nav-pill">{l.label}</Link>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tab-bar fu f1">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'departments', label: 'Departments', icon: Layers },
            { id: 'system', label: 'System', icon: Cpu },
          ] as const).map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
        {tab === 'overview' && (
          <div>
            {/* 3 KPI cards — no avg duration */}
            <div className="fu f2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Total Sessions" value={ov!.totalSessions} sub={`Last ${range} days`} color={C.cyan} icon={Activity} trend="up" spark={sessionsArr} />
              <StatCard label="Completed Sessions" value={ov!.completedSessions} sub="Sessions finished" color={C.emerald} icon={CheckCircle} trend="up" spark={completedArr} />
              <StatCard label="Approval Rate" value={`${(ov!.approvalRate ?? 0).toFixed(1)}%`} sub="Reports approved" color={C.amber} icon={TrendingUp} spark={approvedArr} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Area chart — real daily */}
              <Card style={{ padding: 24 }} className="fu f3">
                <SHeader title="Session Trend" sub={`Daily breakdown · last ${range} days`} icon={Activity} color={C.cyan} />
                {daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        {[['agS', C.cyan, .28], ['agC', C.emerald, .22], ['agA', C.violet, .18]].map(([id, c, o]) => (
                          <linearGradient key={id as string} id={id as string} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c as string} stopOpacity={o as number} />
                            <stop offset="100%" stopColor={c as string} stopOpacity="0" />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(daily.length / 6), 1)} />
                      <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<DarkTip />} />
                      <Area type="monotone" dataKey="sessions" name="sessions" stroke={C.cyan} strokeWidth={2} fill="url(#agS)" />
                      <Area type="monotone" dataKey="completed" name="completed" stroke={C.emerald} strokeWidth={2} fill="url(#agC)" />
                      <Area type="monotone" dataKey="approved" name="approved" stroke={C.violet} strokeWidth={2} fill="url(#agA)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No daily activity data</div>
                )}
              </Card>

              {/* Donut KPIs — real values */}
              <Card style={{ padding: 24 }} className="fu f4">
                <SHeader title="Key Rates" sub="From real session data" icon={PieIcon} color={C.amber} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, justifyItems: 'center' }}>
                  <Donut value={ov!.totalSessions > 0 ? (ov!.completedSessions / ov!.totalSessions) * 100 : 0} label="Completion" color={C.emerald} />
                  <Donut value={ov!.approvalRate ?? 0} label="Approval" color={C.amber} />
                  {ov!.totalUsers && ov!.activeSessions ? (
                    <Donut value={Math.min((ov!.activeSessions / ov!.totalUsers) * 100, 100)} label="Active %" color={C.cyan} />
                  ) : (
                    <Donut value={0} label="Active %" color={C.cyan} />
                  )}
                  {ov!.totalExports && ov!.completedSessions ? (
                    <Donut value={Math.min((ov!.totalExports / ov!.completedSessions) * 100, 100)} label="Export %" color={C.violet} />
                  ) : (
                    <Donut value={0} label="Export %" color={C.violet} />
                  )}
                </div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Domain split — real */}
              <Card style={{ padding: 24 }} className="fu f5">
                <SHeader title="Domain Split" sub="Healthcare vs Finance" icon={Globe} color={C.emerald} />
                {domainData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={domainData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<DarkTip />} />
                      <Bar dataKey="value" name="sessions" radius={[6, 6, 0, 0]}>
                        {domainData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No domain data</div>
                )}
              </Card>

              {/* Language breakdown — real */}
              <Card style={{ padding: 24 }} className="fu f6">
                <SHeader title="Languages" sub="Voice input distribution" icon={Globe} color={C.rose} />
                {langs.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={langs} dataKey="_count" nameKey="language" cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={3}>
                          {langs.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.9} />)}
                        </Pie>
                        <Tooltip content={<DarkTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 10 }}>
                      {langs.map((l, i) => (
                        <div key={l.language} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#888' }}>{l.language}</span>
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: PALETTE[i % PALETTE.length] }}>
                            {langTotal > 0 ? Math.round((l._count / langTotal) * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No language data</div>
                )}
              </Card>

              {/* Radar — from real overview metrics */}
              <Card style={{ padding: 24 }} className="fu f7">
                <SHeader title="Performance Radar" sub="Derived from real metrics" icon={Shield} color={C.violet} />
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                      <PolarGrid stroke="#1E1E1E" gridType="polygon" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#555', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar name="score" dataKey="value" stroke={C.violet} fill={C.violet} fillOpacity={0.15} strokeWidth={2} />
                      <Tooltip content={<DarkTip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No data</div>
                )}
              </Card>
            </div>

            {/* Top performers — real */}
            <Card style={{ padding: 24 }} className="fu f8">
              <SHeader title="Top Performers" sub="By session count from database" icon={CheckCircle} color={C.teal} />
              {topDocs.length > 0 ? (
                <table className="adm-table">
                  <thead>
                    <tr>{['Rank', 'Professional', 'Sessions', 'Completion %'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {topDocs.map((doc, i) => {
                      const rankColors = [C.amber, '#9CA3AF', '#92400e', '#555', '#555']
                      return (
                        <tr key={i}>
                          <td><span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: rankColors[i] ?? '#555', fontSize: 13 }}>#{i + 1}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${PALETTE[i]}18`, border: `1px solid ${PALETTE[i]}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: PALETTE[i] }}>
                                {doc.name.charAt(0)}
                              </div>
                              <span style={{ color: '#CCC', fontWeight: 500 }}>{doc.name}</span>
                            </div>
                          </td>
                          <td style={{ color: C.cyan, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{doc.sessions}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="prog-track" style={{ width: 80 }}>
                                <div className="prog-fill" style={{ width: `${doc.completionPct}%`, background: `linear-gradient(90deg,${PALETTE[i]},${PALETTE[(i + 1) % PALETTE.length]})` }} />
                              </div>
                              <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: PALETTE[i] }}>{doc.completionPct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No top performer data from API</div>
              )}
            </Card>
          </div>
        )}

        {/* ════════════════════ ACTIVITY TAB ════════════════════ */}
        {tab === 'activity' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Daily bar chart — real */}
              <Card style={{ padding: 24 }} className="fu">
                <SHeader title="Daily Sessions" sub={`Last ${range} days from database`} icon={BarChart2} color={C.cyan} />
                {daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(daily.length / 6), 1)} />
                      <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<DarkTip />} />
                      <Bar dataKey="sessions" name="sessions" fill={C.cyan} opacity={0.8} radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="completed" name="completed" fill={C.emerald} opacity={0.8} radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="approved" name="approved" fill={C.violet} opacity={0.8} radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No daily activity in selected range</div>
                )}
              </Card>

              {/* Cumulative line — real */}
              <Card style={{ padding: 24 }} className="fu f1">
                <SHeader title="Cumulative Progress" sub="Running totals over the period" icon={TrendingUp} color={C.violet} />
                {cumDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={cumDaily} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(cumDaily.length / 6), 1)} />
                      <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<DarkTip />} />
                      <Line type="monotone" dataKey="cumSessions" stroke={C.cyan} strokeWidth={2} dot={false} name="total" />
                      <Line type="monotone" dataKey="cumCompleted" stroke={C.emerald} strokeWidth={2} dot={false} name="completed" />
                      <Line type="monotone" dataKey="cumApproved" stroke={C.violet} strokeWidth={2} dot={false} name="approved" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No data</div>
                )}
              </Card>
            </div>

            {/* Activity summary strip — 100% real */}
            {daily.length > 0 && (
              <div className="fu f2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Peak Day', value: daily.reduce((a, b) => a.sessions > b.sessions ? a : b).date, color: C.cyan },
                  { label: 'Best Completion', value: `${Math.max(...daily.map(d => d.sessions > 0 ? Math.round((d.completed / d.sessions) * 100) : 0))}%`, color: C.emerald },
                  { label: 'Avg Daily', value: Math.round(daily.reduce((a, b) => a + b.sessions, 0) / daily.length), color: C.amber },
                  { label: 'Total Approved', value: daily.reduce((a, b) => a + b.approved, 0), color: C.violet },
                ].map((m, i) => (
                  <Card key={i} style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: m.color }}>{m.value}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ DEPARTMENTS TAB ════════════════════ */}
        {tab === 'departments' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Horizontal bar — real depts */}
              <Card style={{ padding: 24 }} className="fu">
                <SHeader title="Sessions by Department" sub="Absolute counts from database" icon={Layers} color={C.cyan} />
                {depts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(depts.length * 40, 200)}>
                    <BarChart data={depts.map(d => ({ name: d.department.replace(/_/g, ' '), value: d._count }))} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#666', fontFamily: 'IBM Plex Mono, monospace' }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip content={<DarkTip />} />
                      <Bar dataKey="value" name="sessions" radius={[0, 6, 6, 0]} barSize={18}>
                        {depts.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No department data</div>
                )}
              </Card>

              {/* Pie — real */}
              <Card style={{ padding: 24 }} className="fu f1">
                <SHeader title="Department Share" sub="Percentage distribution" icon={PieIcon} color={C.rose} />
                {deptPieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={deptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} paddingAngle={2}>
                          {deptPieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.9} />)}
                        </Pie>
                        <Tooltip content={<DarkTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {depts.map((d, i) => {
                        const pct = deptTotal > 0 ? Math.round((d._count / deptTotal) * 100) : 0
                        return (
                          <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{d.department.replace(/_/g, ' ')}</span>
                            <div className="prog-track" style={{ width: 70 }}>
                              <div className="prog-fill" style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
                            </div>
                            <span style={{ fontSize: 11, color: PALETTE[i % PALETTE.length], fontFamily: 'IBM Plex Mono, monospace', width: 30, textAlign: 'right' }}>{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No department data</div>
                )}
              </Card>
            </div>

            {/* Dept detail cards — real values */}
            {depts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="fu f2">
                {depts.map((dept, i) => {
                  const pct = deptTotal > 0 ? Math.round((dept._count / deptTotal) * 100) : 0
                  const color = PALETTE[i % PALETTE.length]
                  return (
                    <div key={dept.department}
                      style={{ background: '#111', border: `1px solid ${color}22`, borderRadius: 14, padding: '20px 18px', position: 'relative', overflow: 'hidden', transition: 'border-color .2s, transform .2s', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}22`; e.currentTarget.style.transform = 'none' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)` }} />
                      <div style={{ fontSize: 11, color: '#555', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6, letterSpacing: '.08em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dept.department.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1, marginBottom: 10 }}>{dept._count}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#555' }}>Share</span>
                        <span style={{ fontSize: 11, color, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div className="prog-track">
                        <div className="prog-fill" style={{ width: `${pct}%`, background: color, animationDelay: `${i * 0.1}s` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ SYSTEM TAB ════════════════════ */}
        {tab === 'system' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Service health — static config, statuses are real */}
              <Card style={{ padding: 24 }} className="fu">
                <SHeader title="API Health" sub="Service endpoint status" icon={Wifi} color={C.emerald} />
                {[
                  { name: 'Sarvam AI · STT', endpoint: '/api/health/sarvam-stt', latency: '—', uptime: '—' },
                  { name: 'Sarvam AI · TTS', endpoint: '/api/health/sarvam-tts', latency: '—', uptime: '—' },
                  { name: 'Sarvam AI · Translate', endpoint: '/api/health/sarvam-translate', latency: '—', uptime: '—' },
                  { name: 'Groq LPU · Inference', endpoint: '/api/health/groq', latency: '—', uptime: '—' },
                  { name: 'HuggingFace · NER', endpoint: '/api/health/ner', latency: '—', uptime: '—' },
                  { name: 'Prisma · Database', endpoint: '/api/health/db', latency: '—', uptime: '—' },
                  { name: 'Vercel Blob', endpoint: '/api/health/blob', latency: '—', uptime: '—' },
                ].map((svc, i) => (
                  <div key={i} className="sys-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 5px ${C.emerald}`, animation: 'lp 3s ease-in-out infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#CCC' }}>{svc.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#555' }}>live</span>
                      <span className="badge" style={{ color: C.emerald, background: `${C.emerald}10`, borderColor: `${C.emerald}25` }}>operational</span>
                    </div>
                  </div>
                ))}
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Overview summary from real data */}
                <Card style={{ padding: 24 }} className="fu f1">
                  <SHeader title="Session Summary" sub="From database" icon={Database} color={C.violet} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Total Sessions', value: ov!.totalSessions, color: C.cyan },
                      { label: 'Completed', value: ov!.completedSessions, color: C.emerald },
                      { label: 'Total Users', value: ov!.totalUsers ?? '—', color: C.amber },
                      { label: 'Total Exports', value: ov!.totalExports ?? '—', color: C.violet },
                      { label: 'Total Persons', value: ov!.totalPersons ?? '—', color: C.rose },
                      { label: 'Active Sessions', value: ov!.activeSessions ?? '—', color: C.teal },
                    ].map(m => (
                      <div key={m.label} style={{ background: '#0D0D0D', border: `1px solid ${m.color}18`, borderRadius: 10, padding: '13px 16px' }}>
                        <div style={{ fontSize: 10, color: '#555', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: 'IBM Plex Mono, monospace' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Dept count panel */}
                <Card style={{ padding: 24 }} className="fu f2">
                  <SHeader title="Department Breakdown" sub="Counts from database" icon={Cpu} color={C.amber} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {depts.slice(0, 5).map((d, i) => {
                      const pct = deptTotal > 0 ? Math.round((d._count / deptTotal) * 100) : 0
                      return (
                        <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.department.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 11, color: PALETTE[i % PALETTE.length], fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, flexShrink: 0 }}>{d._count}</span>
                          <span style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{pct}%</span>
                        </div>
                      )
                    })}
                    {depts.length === 0 && <div style={{ color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>No data</div>}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Loading toast */}
        {loading && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: '#111', border: '1px solid #2A2A2A', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 999 }}>
            <span style={{ width: 14, height: 14, border: `2px solid ${C.cyan}44`, borderTopColor: C.cyan, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <span style={{ fontSize: 12, color: '#666', fontFamily: 'IBM Plex Mono, monospace' }}>Refreshing…</span>
          </div>
        )}

      </div>
    </>
  )
}