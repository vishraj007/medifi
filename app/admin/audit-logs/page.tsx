'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Download, Shield, Filter, Clock, User, Globe, RefreshCw, ChevronLeft, ChevronRight as ChevRight, Activity } from 'lucide-react'
import { format } from 'date-fns'

const ACTION_META: Record<string, { color:string; bg:string; border:string; label:string; icon:string }> = {
  LOGIN:          { color:'#00D4FF', bg:'#001824', border:'#00D4FF30', label:'Login',          icon:'→' },
  LOGOUT:         { color:'#555',    bg:'#111',    border:'#2A2A2A',   label:'Logout',         icon:'←' },
  CREATE_SESSION: { color:'#00F5A0', bg:'#001A0F', border:'#00F5A030', label:'New Session',    icon:'+' },
  UPDATE_SESSION: { color:'#F59E0B', bg:'#1A1200', border:'#F59E0B30', label:'Update Session', icon:'↑' },
  APPROVE_REPORT: { color:'#A78BFA', bg:'#0F0A1A', border:'#A78BFA30', label:'Approve Report', icon:'✓' },
  EXPORT_PDF:     { color:'#F472B6', bg:'#1A0510', border:'#F472B630', label:'Export PDF',     icon:'↓' },
  UPDATE_CONFIG:  { color:'#FB923C', bg:'#1A0D05', border:'#FB923C30', label:'Config Update',  icon:'⚙' },
  CREATE_USER:    { color:'#34D399', bg:'#051A10', border:'#34D39930', label:'Create User',    icon:'👤' },
  DELETE_USER:    { color:'#F87171', bg:'#1A0505', border:'#F8717130', label:'Delete User',    icon:'✕' },
}

export default function AuditLogsPage() {
  const [logs, setLogs]     = useState<any[]>([])
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [total, setTotal]   = useState(0)
  const [loading, setLoading]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const LIMIT = 50
  const ACTIONS = Object.keys(ACTION_META)

  useEffect(() => { fetchLogs() }, [page, action])

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    const params = new URLSearchParams({ page:page.toString(), limit:LIMIT.toString(), ...(action && { action }) })
    const res  = await fetch(`/api/admin/audit-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.pagination?.total || 0)
    setLastRefresh(new Date())
    if (isRefresh) setRefreshing(false); else setLoading(false)
  }

  const exportCSV = () => {
    const header = 'Timestamp,User,Email,Action,Resource,IP\n'
    const csv = logs.map(l =>
      `"${l.timestamp}","${l.user?.name}","${l.user?.email}","${l.action}","${l.resource||''}","${l.ipAddress||''}"`
    ).join('\n')
    const blob = new Blob([header + csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = search
    ? logs.filter(l =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        l.resource?.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  // Action counts for the summary strip
  const actionCounts = logs.reduce((acc: Record<string, number>, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1; return acc
  }, {})
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Keyframes ─────────────────── */
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes rowIn     { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes shimmerBg {
          0%  { background-position: -200% 0; }
          100%{ background-position:  200% 0; }
        }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes scanLine  { 0%{top:0} 100%{top:100%} }

        /* ── Root ──────────────────────── */
        .audit-root { font-family:'DM Sans',sans-serif; color:#E8E8E8; }

        /* ── Header ───────────────────── */
        .audit-header {
          display:flex; justify-content:space-between; align-items:flex-end;
          margin-bottom:28px;
          animation:slideUp .4s ease both;
        }
        .audit-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:7px; }
        .audit-eyebrow-bar { width:3px; height:20px; border-radius:2px; background:linear-gradient(180deg,#A78BFA,#F472B6); }
        .audit-eyebrow-text { font-size:10px; color:#444; font-family:'IBM Plex Mono',monospace; letter-spacing:.15em; text-transform:uppercase; }
        .audit-title { font-size:28px; font-weight:700; color:#E8E8E8; letter-spacing:-.02em; margin:0 0 5px; }
        .audit-sub   { font-size:13px; color:#555; }

        /* Header actions */
        .audit-header-actions { display:flex; gap:10px; align-items:center; }
        .audit-refresh-btn {
          display:flex; align-items:center; gap:7px;
          padding:9px 16px; border-radius:10px;
          border:1px solid #2A2A2A; background:#141414;
          color:#666; font-size:12px; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all .15s;
        }
        .audit-refresh-btn:hover { border-color:#333; color:#AAA; }
        .audit-export-btn {
          display:flex; align-items:center; gap:7px;
          padding:9px 16px; border-radius:10px;
          border:1px solid #A78BFA44; background:#0F0A1A;
          color:#A78BFA; font-size:12px; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all .2s;
        }
        .audit-export-btn:hover { border-color:#A78BFA88; box-shadow:0 4px 16px rgba(167,139,250,.12); transform:translateY(-1px); }

        /* ── Summary strip ─────────────── */
        .audit-summary {
          display:grid; grid-template-columns:repeat(4,1fr); gap:12px;
          margin-bottom:20px;
          animation:slideUp .4s ease .05s both;
        }
        .audit-summary-card {
          padding:14px 16px;
          background:#111; border:1px solid #1E1E1E; border-radius:12px;
          display:flex; align-items:center; gap:12px;
          transition:border-color .18s;
          position:relative; overflow:hidden;
        }
        .audit-summary-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,var(--sc-color),transparent);
          opacity:.5;
        }
        .audit-summary-card:hover { border-color:#2A2A2A; }
        .audit-summary-icon {
          width:34px; height:34px; border-radius:9px;
          display:flex; align-items:center; justify-content:center;
          font-size:14px; flex-shrink:0; border:1px solid;
        }

        /* ── Filter bar ────────────────── */
        .audit-filters {
          display:flex; gap:10px; align-items:center;
          padding:14px 18px;
          background:#111; border:1px solid #1E1E1E; border-radius:13px;
          margin-bottom:16px;
          animation:slideUp .4s ease .1s both;
          flex-wrap:wrap;
        }
        .audit-search-wrap { position:relative; flex:1; min-width:200px; }
        .audit-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#444; pointer-events:none; }
        .audit-input {
          width:100%; background:#0D0D0D; border:1px solid #2A2A2A;
          border-radius:9px; padding:9px 12px 9px 36px;
          color:#E8E8E8; font-size:13px; font-family:'DM Sans',sans-serif;
          outline:none; transition:border-color .15s, box-shadow .15s;
        }
        .audit-input:focus { border-color:#A78BFA44; box-shadow:0 0 0 3px rgba(167,139,250,.06); }
        .audit-input::placeholder { color:#333; }
        select.audit-input { padding-left:12px; width:auto; min-width:180px; }
        select.audit-input option { background:#111; }
        .audit-apply-btn {
          padding:9px 18px; border-radius:9px;
          border:1px solid #A78BFA44; background:#0F0A1A;
          color:#A78BFA; font-size:12px; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all .15s;
        }
        .audit-apply-btn:hover { border-color:#A78BFA88; }

        /* ── Table ─────────────────────── */
        .audit-table-card {
          background:#111; border:1px solid #1E1E1E; border-radius:16px;
          overflow:hidden;
          animation:slideUp .4s ease .15s both;
          position:relative;
        }
        /* Subtle scan line */
        .audit-table-card::after {
          content:''; position:absolute; left:0; right:0; height:40px;
          background:linear-gradient(180deg,rgba(167,139,250,.015),transparent);
          pointer-events:none;
          animation:scanLine 8s linear infinite;
        }

        /* Table head */
        .audit-thead {
          display:grid;
          grid-template-columns:1.8fr 1.6fr 1.4fr 1.8fr 1fr;
          padding:11px 20px;
          border-bottom:1px solid #1A1A1A;
          background:#0D0D0D;
          gap:12px;
        }
        .audit-th {
          font-size:10px; color:#444;
          font-family:'IBM Plex Mono',monospace;
          letter-spacing:.12em; text-transform:uppercase;
          display:flex; align-items:center; gap:5px;
        }

        /* Log row */
        .audit-row {
          display:grid;
          grid-template-columns:1.8fr 1.6fr 1.4fr 1.8fr 1fr;
          padding:13px 20px;
          border-bottom:1px solid #0F0F0F;
          gap:12px;
          align-items:center;
          transition:background .12s;
          animation:rowIn .3s ease both;
          position:relative;
        }
        .audit-row:hover { background:#0D0D0D; }
        .audit-row:last-child { border-bottom:none; }
        /* Left color flash on hover */
        .audit-row::before {
          content:''; position:absolute;
          left:0; top:0; bottom:0; width:2px;
          background:var(--row-color);
          opacity:0; transition:opacity .15s;
        }
        .audit-row:hover::before { opacity:1; }

        /* Action badge */
        .audit-action-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:7px;
          font-size:10px; font-weight:700;
          font-family:'IBM Plex Mono',monospace;
          border:1px solid; letter-spacing:.03em;
          white-space:nowrap;
        }

        /* User cell */
        .audit-user-name { font-size:13px; color:#CCC; font-weight:500; }
        .audit-user-email { font-size:10px; color:#444; font-family:'IBM Plex Mono',monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Time cell */
        .audit-time-main { font-size:11px; color:#666; font-family:'IBM Plex Mono',monospace; }
        .audit-time-rel  { font-size:10px; color:#333; font-family:'IBM Plex Mono',monospace; }

        /* Resource + IP */
        .audit-resource { font-size:11px; color:#555; font-family:'IBM Plex Mono',monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .audit-ip       { font-size:11px; color:#555; font-family:'IBM Plex Mono',monospace; }

        /* Loading state */
        .audit-loading-row {
          padding:60px 0; display:flex; flex-direction:column; align-items:center; gap:14px;
        }
        .audit-spinner {
          width:32px; height:32px; border:2px solid #1A1A1A;
          border-top-color:#A78BFA; border-radius:50%;
          animation:spin .8s linear infinite;
        }

        /* Empty state */
        .audit-empty {
          padding:60px 0; text-align:center; color:#333;
          font-family:'IBM Plex Mono',monospace; font-size:12px;
          display:flex; flex-direction:column; align-items:center; gap:12px;
        }
        .audit-empty-icon {
          width:48px; height:48px; border-radius:14px;
          background:#141414; border:1px solid #1E1E1E;
          display:flex; align-items:center; justify-content:center;
        }

        /* ── Pagination ─────────────── */
        .audit-pagination {
          display:flex; justify-content:space-between; align-items:center;
          margin-top:16px;
        }
        .audit-page-info { font-size:12px; color:#444; font-family:'IBM Plex Mono',monospace; }
        .audit-page-btns { display:flex; gap:6px; align-items:center; }
        .audit-page-btn {
          width:34px; height:34px;
          display:flex; align-items:center; justify-content:center;
          border-radius:9px; border:1px solid #2A2A2A;
          background:#111; color:#555;
          cursor:pointer; transition:all .15s;
          font-size:12px; font-family:'IBM Plex Mono',monospace;
        }
        .audit-page-btn:hover:not(:disabled) { border-color:#3A3A3A; color:#AAA; background:#141414; }
        .audit-page-btn:disabled { opacity:.35; cursor:not-allowed; }
        .audit-page-current {
          height:34px; padding:0 14px;
          display:flex; align-items:center;
          border-radius:9px; border:1px solid #A78BFA33;
          background:#0F0A1A; color:#A78BFA;
          font-size:12px; font-family:'IBM Plex Mono',monospace; font-weight:600;
        }
        .audit-page-total { font-size:11px; color:#444; font-family:'IBM Plex Mono',monospace; margin-left:8px; }
      `}</style>

      <div className="audit-root">

        {/* ── Header ─────────────────────────────────── */}
        <div className="audit-header">
          <div>
            <div className="audit-eyebrow">
              <div className="audit-eyebrow-bar"/>
              <span className="audit-eyebrow-text">Admin · Security</span>
            </div>
            <h1 className="audit-title">Audit Logs</h1>
            <p className="audit-sub">
              {total.toLocaleString()} total entries ·
              <span style={{ color:'#A78BFA', marginLeft:6, fontFamily:'IBM Plex Mono,monospace', fontSize:12 }}>
                refreshed {format(lastRefresh, 'HH:mm:ss')}
              </span>
            </p>
          </div>
          <div className="audit-header-actions">
            <button className="audit-refresh-btn" onClick={() => fetchLogs(true)}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }}/> Refresh
            </button>
            <button className="audit-export-btn" onClick={exportCSV}>
              <Download size={13}/> Export CSV
            </button>
          </div>
        </div>

        {/* ── Summary strip ───────────────────────────── */}
        <div className="audit-summary">
          {[
            { label:'This Page',   value:logs.length,                      color:'#A78BFA', bg:'#0F0A1A', border:'#A78BFA25', icon:<Activity size={14} color="#A78BFA"/> },
            { label:'Total Logs',  value:total.toLocaleString(),            color:'#00D4FF', bg:'#001824', border:'#00D4FF25', icon:<Shield size={14} color="#00D4FF"/> },
            { label:'Unique Users',value:new Set(logs.map(l=>l.userId)).size, color:'#00F5A0', bg:'#001A0F', border:'#00F5A025', icon:<User size={14} color="#00F5A0"/> },
            { label:'Top Action',  value: topActions[0]?.[0]?.replace(/_/g,' ') ?? '—', color:'#F59E0B', bg:'#1A1200', border:'#F59E0B25', icon:<Filter size={14} color="#F59E0B"/> },
          ].map(s => (
            <div key={s.label} className="audit-summary-card" style={{ '--sc-color':s.color } as any}>
              <div className="audit-summary-icon" style={{ background:s.bg, borderColor:s.border }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:'IBM Plex Mono,monospace', color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#555', marginTop:3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ──────────────────────────────── */}
        <div className="audit-filters">
          <Shield size={13} color="#555"/>
          <div className="audit-search-wrap">
            <Search size={13} className="audit-search-icon" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444', pointerEvents:'none' }}/>
            <input className="audit-input" placeholder="Search user, email, resource…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="audit-input" value={action}
            onChange={e => { setAction(e.target.value); setPage(1) }}>
            <option value="">All Actions</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
            ))}
          </select>
          <button className="audit-apply-btn" onClick={() => { setPage(1); fetchLogs() }}>
            Apply
          </button>
        </div>

        {/* ── Table ───────────────────────────────────── */}
        <div className="audit-table-card">
          <div className="audit-thead">
            {[
              { label:'Timestamp', icon:Clock },
              { label:'User',      icon:User },
              { label:'Action',    icon:Activity },
              { label:'Resource',  icon:null },
              { label:'IP / UA',   icon:Globe },
            ].map(h => (
              <div key={h.label} className="audit-th">
                {h.icon && <h.icon size={10} color="#333"/>}
                {h.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="audit-loading-row">
              <div className="audit-spinner"/>
              <span style={{ fontSize:11, color:'#444', fontFamily:'IBM Plex Mono,monospace' }}>Loading audit trail…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="audit-empty">
              <div className="audit-empty-icon"><Shield size={20} color="#333"/></div>
              <span>No logs match your query</span>
            </div>
          ) : filtered.map((log, i) => {
            const am = ACTION_META[log.action] || { color:'#555', bg:'#111', border:'#2A2A2A', label:log.action, icon:'·' }
            return (
              <div key={log.id} className="audit-row"
                style={{ '--row-color':am.color, animationDelay:`${i * .03}s` } as any}>

                {/* Timestamp */}
                <div>
                  <div className="audit-time-main">{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</div>
                  <div className="audit-time-rel">{format(new Date(log.timestamp), 'yyyy')}</div>
                </div>

                {/* User */}
                <div>
                  <div className="audit-user-name">{log.user?.name ?? '—'}</div>
                  <div className="audit-user-email">{log.user?.email ?? ''}</div>
                </div>

                {/* Action */}
                <div>
                  <span className="audit-action-badge" style={{ color:am.color, background:am.bg, borderColor:am.border }}>
                    <span>{am.icon}</span> {am.label}
                  </span>
                </div>

                {/* Resource */}
                <div className="audit-resource">{log.resource || '—'}</div>

                {/* IP */}
                <div className="audit-ip">{log.ipAddress || '—'}</div>
              </div>
            )
          })}
        </div>

        {/* ── Pagination ──────────────────────────────── */}
        <div className="audit-pagination">
          <span className="audit-page-info">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()} entries
          </span>
          <div className="audit-page-btns">
            <button className="audit-page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="audit-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14}/>
            </button>
            <span className="audit-page-current">
              {page}
              <span className="audit-page-total">/ {Math.ceil(total / LIMIT)}</span>
            </span>
            <button className="audit-page-btn" onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total}>
              <ChevRight size={14}/>
            </button>
            <button className="audit-page-btn" onClick={() => setPage(Math.ceil(total / LIMIT))} disabled={page * LIMIT >= total}>»</button>
          </div>
        </div>
      </div>
    </>
  )
}