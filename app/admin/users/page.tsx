'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, UserCheck, UserX, Search, Filter, MoreHorizontal, Shield, Mail, Calendar, Building } from 'lucide-react'
import { format } from 'date-fns'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({ name:'', email:'', role:'DOCTOR', department:'GENERAL_MEDICINE', password:'' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true); fetchUsers() }, [])

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data)
  }

  const createUser = async () => {
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(newUser)
      })
      if (res.ok) {
        fetchUsers(); setShowModal(false)
        setNewUser({ name:'', email:'', role:'DOCTOR', department:'GENERAL_MEDICINE', password:'' })
      } else {
        const err = await res.json()
        setError(err.error || 'Failed to create user')
      }
    } catch { setError('Failed to create user') }
    finally { setCreating(false) }
  }

  const ROLE_META: Record<string, { color:string; bg:string; border:string; icon:any; label:string }> = {
    ADMIN:         { color:'#F87171', bg:'#1A0505', border:'#F8717130', icon:Shield,    label:'Admin' },
    DOCTOR:        { color:'#00D4FF', bg:'#001824', border:'#00D4FF30', icon:UserCheck, label:'Doctor' },
    FINANCE_AGENT: { color:'#00F5A0', bg:'#001A0F', border:'#00F5A030', icon:Building,  label:'Finance' },
  }

  const DEPT_OPTIONS_DOCTOR  = ['GENERAL_MEDICINE','CARDIOLOGY','ORTHOPEDICS','PEDIATRICS']
  const DEPT_OPTIONS_FINANCE = ['TAXATION','INVESTMENT','INSURANCE','LOANS']

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'ALL' || u.role === filterRole
    return matchSearch && matchRole
  })

  const totalActive   = users.filter(u => u.isActive).length
  const totalInactive = users.filter(u => !u.isActive).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Keyframes ─────────────────── */
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes scaleIn   { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:none} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes rowReveal { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.4} }

        /* ── Page ──────────────────────── */
        .usr-root { font-family:'DM Sans',sans-serif; color:#E8E8E8; }

        /* ── Header ───────────────────── */
        .usr-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
          animation: slideUp .4s ease both;
        }
        .usr-eyebrow {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 7px;
        }
        .usr-eyebrow-bar {
          width: 3px; height: 20px; border-radius: 2px;
          background: linear-gradient(180deg, #00D4FF, #00F5A0);
        }
        .usr-eyebrow-text {
          font-size: 10px; color: #444;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: .15em; text-transform: uppercase;
        }
        .usr-title { font-size: 28px; font-weight: 700; color: #E8E8E8; letter-spacing: -.02em; margin: 0 0 5px; }
        .usr-sub   { font-size: 13px; color: #555; }

        /* ── Create button ─────────────── */
        .usr-create-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 20px;
          background: linear-gradient(135deg, #001824, #002535);
          border: 1px solid #00D4FF44;
          border-radius: 11px;
          color: #00D4FF;
          font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all .2s;
          position: relative; overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,212,255,.08);
        }
        .usr-create-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0,212,255,.05), transparent);
          opacity: 0; transition: opacity .2s;
        }
        .usr-create-btn:hover {
          border-color: #00D4FF88;
          box-shadow: 0 4px 28px rgba(0,212,255,.18), 0 0 0 1px #00D4FF22;
          transform: translateY(-1px);
        }
        .usr-create-btn:hover::before { opacity: 1; }

        /* ── Stats strip ───────────────── */
        .usr-stats-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
          animation: slideUp .4s ease .05s both;
        }
        .usr-stat-pill {
          padding: 14px 18px;
          background: #111;
          border: 1px solid #1E1E1E;
          border-radius: 12px;
          display: flex; align-items: center; gap: 12px;
          transition: border-color .2s;
        }
        .usr-stat-pill:hover { border-color: #2A2A2A; }
        .usr-stat-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── Filter bar ────────────────── */
        .usr-filter-bar {
          display: flex; gap: 10px; align-items: center;
          margin-bottom: 16px;
          padding: 14px 18px;
          background: #111;
          border: 1px solid #1E1E1E;
          border-radius: 13px;
          animation: slideUp .4s ease .1s both;
        }
        .usr-search-wrap {
          position: relative; flex: 1;
        }
        .usr-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%);
          color: #444; pointer-events: none;
        }
        .usr-input {
          width: 100%;
          background: #0D0D0D;
          border: 1px solid #2A2A2A;
          border-radius: 9px;
          padding: 9px 12px 9px 36px;
          color: #E8E8E8;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .usr-input:focus {
          border-color: #00D4FF44;
          box-shadow: 0 0 0 3px rgba(0,212,255,.06);
        }
        .usr-input::placeholder { color: #333; }
        .usr-filter-btn {
          padding: 9px 16px;
          border-radius: 9px;
          border: 1px solid #2A2A2A;
          background: transparent;
          color: #555;
          font-size: 12px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .usr-filter-btn.active { background:#001824; border-color:#00D4FF44; color:#00D4FF; }
        .usr-filter-btn:hover:not(.active) { color:#888; border-color:#333; background:#0D0D0D; }

        /* ── Table card ────────────────── */
        .usr-table-card {
          background: #111;
          border: 1px solid #1E1E1E;
          border-radius: 16px;
          overflow: hidden;
          animation: slideUp .4s ease .15s both;
        }
        .usr-table-head {
          display: grid;
          grid-template-columns: 2fr 2.2fr 1.2fr 1.4fr .9fr 1.4fr 1.2fr;
          padding: 11px 20px;
          border-bottom: 1px solid #1A1A1A;
          background: #0D0D0D;
          gap: 12px;
        }
        .usr-th {
          font-size: 10px; color: #444;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: .12em; text-transform: uppercase;
          display: flex; align-items: center; gap: 5px;
        }

        /* ── User row ──────────────────── */
        .usr-row {
          display: grid;
          grid-template-columns: 2fr 2.2fr 1.2fr 1.4fr .9fr 1.4fr 1.2fr;
          padding: 14px 20px;
          border-bottom: 1px solid #0F0F0F;
          gap: 12px;
          align-items: center;
          transition: background .15s;
          animation: rowReveal .3s ease both;
          cursor: default;
          position: relative;
        }
        .usr-row::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0; width: 2px;
          background: var(--row-color, transparent);
          opacity: 0;
          transition: opacity .2s;
        }
        .usr-row:hover { background: #0D0D0D; }
        .usr-row:hover::before { opacity: 1; }
        .usr-row:last-child { border-bottom: none; }

        /* Avatar */
        .usr-avatar {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          flex-shrink: 0;
          border: 1px solid;
          box-shadow: 0 2px 8px rgba(0,0,0,.4);
        }

        /* Role badge */
        .usr-role-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 7px;
          font-size: 10px; font-weight: 700;
          font-family: 'IBM Plex Mono', monospace;
          border: 1px solid;
          letter-spacing: .04em;
        }

        /* Status indicator */
        .usr-status {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
        }
        .usr-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          animation: pulse 2.5s ease-in-out infinite;
        }

        /* Mono text */
        .usr-mono { font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

        /* ── Modal ─────────────────────── */
        .usr-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.75);
          backdrop-filter: blur(8px);
          z-index: 999;
          display: flex; align-items: center; justify-content: center;
          animation: scaleIn .15s ease;
        }
        .usr-modal {
          background: #111;
          border: 1px solid #242424;
          border-radius: 18px;
          padding: 32px;
          width: 460px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03);
          animation: scaleIn .2s cubic-bezier(.23,1,.32,1);
        }
        /* Rainbow top border */
        .usr-modal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #00D4FF, #A78BFA, #F472B6, #00F5A0);
          border-radius: 18px 18px 0 0;
        }
        .usr-modal-title { font-size: 20px; font-weight: 700; color: #E8E8E8; margin: 0 0 4px; }
        .usr-modal-sub   { font-size: 12px; color: #555; font-family:'IBM Plex Mono',monospace; margin-bottom: 26px; }

        /* Modal input */
        .usr-field-label {
          display: block; font-size: 10px; color: #555;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: .12em; text-transform: uppercase;
          margin-bottom: 7px;
        }
        .usr-field-input {
          width: 100%;
          background: #0D0D0D;
          border: 1px solid #2A2A2A;
          border-radius: 10px;
          padding: 11px 14px;
          color: #E8E8E8;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .usr-field-input:focus {
          border-color: #00D4FF55;
          box-shadow: 0 0 0 3px rgba(0,212,255,.07);
        }
        .usr-field-input::placeholder { color: #333; }
        select.usr-field-input option { background: #111; }

        /* Modal buttons */
        .usr-modal-submit {
          flex: 1; padding: 12px 0;
          background: linear-gradient(135deg, #001824, #002535);
          border: 1px solid #00D4FF44;
          border-radius: 10px;
          color: #00D4FF;
          font-size: 13px; font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all .2s;
          position: relative; overflow: hidden;
        }
        .usr-modal-submit:hover:not(:disabled) {
          border-color: #00D4FF88;
          box-shadow: 0 4px 20px rgba(0,212,255,.15);
        }
        .usr-modal-submit:disabled { opacity: .45; cursor: not-allowed; }
        .usr-modal-cancel {
          padding: 12px 22px;
          background: transparent;
          border: 1px solid #2A2A2A;
          border-radius: 10px;
          color: #555;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all .15s;
        }
        .usr-modal-cancel:hover { border-color: #3A3A3A; color: #888; }

        /* Error box */
        .usr-error {
          margin-top: 14px; padding: 10px 14px;
          background: #1A0505;
          border: 1px solid #F8717133;
          border-radius: 9px;
          color: #F87171; font-size: 12px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Empty state */
        .usr-empty {
          text-align: center; padding: 60px 0;
          color: #333; font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .usr-empty-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: #141414; border: 1px solid #1E1E1E;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>

      <div className="usr-root">

        {/* ── Header ─────────────────────────────────── */}
        <div className="usr-header">
          <div>
            <div className="usr-eyebrow">
              <div className="usr-eyebrow-bar"/>
              <span className="usr-eyebrow-text">Admin · Users</span>
            </div>
            <h1 className="usr-title">User Management</h1>
            <p className="usr-sub">{users.length} users registered across all roles</p>
          </div>
          <button className="usr-create-btn" onClick={() => setShowModal(true)}>
            <Plus size={15}/> New User
          </button>
        </div>

        {/* ── Stats strip ─────────────────────────────── */}
        <div className="usr-stats-strip">
          {[
            { label:'Total Users',   value: users.length,   color:'#00D4FF', bg:'#001824', border:'#00D4FF25', icon: Users },
            { label:'Active',        value: totalActive,     color:'#00F5A0', bg:'#001A0F', border:'#00F5A025', icon: UserCheck },
            { label:'Inactive',      value: totalInactive,   color:'#F87171', bg:'#1A0505', border:'#F8717125', icon: UserX },
            { label:'Roles',         value: 3,               color:'#A78BFA', bg:'#0F0A1A', border:'#A78BFA25', icon: Shield },
          ].map((s, i) => (
            <div key={s.label} className="usr-stat-pill">
              <div className="usr-stat-icon" style={{ background: s.bg, border:`1px solid ${s.border}` }}>
                <s.icon size={16} color={s.color}/>
              </div>
              <div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'IBM Plex Mono,monospace', color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#555', marginTop:3 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter bar ──────────────────────────────── */}
        <div className="usr-filter-bar">
          <div className="usr-search-wrap">
            <Search size={13} className="usr-search-icon" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#444', pointerEvents:'none' }}/>
            <input className="usr-input" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <Filter size={13} color="#444"/>
          {['ALL','ADMIN','DOCTOR','FINANCE_AGENT'].map(r => (
            <button key={r} className={`usr-filter-btn ${filterRole === r ? 'active' : ''}`}
              onClick={() => setFilterRole(r)}>
              {r === 'ALL' ? 'All' : r === 'FINANCE_AGENT' ? 'Finance' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ── Table ───────────────────────────────────── */}
        <div className="usr-table-card">
          <div className="usr-table-head">
            {[
              { label:'Name',       icon: null },
              { label:'Email',      icon: Mail },
              { label:'Role',       icon: Shield },
              { label:'Department', icon: Building },
              { label:'Status',     icon: null },
              { label:'Last Login', icon: Calendar },
              { label:'Joined',     icon: null },
            ].map(h => (
              <div key={h.label} className="usr-th">
                {h.icon && <h.icon size={10} color="#333"/>}
                {h.label}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="usr-empty">
              <div className="usr-empty-icon"><UserX size={20} color="#333"/></div>
              <span>No users match your filter</span>
            </div>
          ) : filtered.map((user, i) => {
            const rm = ROLE_META[user.role] || ROLE_META.DOCTOR
            const initials = (user.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={user.id} className="usr-row"
                style={{ '--row-color': rm.color, animationDelay: `${i * .04}s` } as any}
                onMouseEnter={() => setHoveredRow(user.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Name + avatar */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div className="usr-avatar" style={{ background:rm.bg, borderColor:rm.border, color:rm.color }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#E8E8E8' }}>{user.name}</div>
                    <div style={{ fontSize:10, color:'#444', fontFamily:'IBM Plex Mono,monospace' }}>ID:{user.id?.slice(-6)}</div>
                  </div>
                </div>

                {/* Email */}
                <div className="usr-mono" style={{ color:'#555', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {user.email}
                </div>

                {/* Role */}
                <div>
                  <span className="usr-role-badge" style={{ color:rm.color, background:rm.bg, borderColor:rm.border }}>
                    <rm.icon size={9}/> {rm.label}
                  </span>
                </div>

                {/* Dept */}
                <div style={{ fontSize:12, color:'#666' }}>
                  {user.department ? user.department.replace(/_/g,' ') : '—'}
                </div>

                {/* Status */}
                <div className="usr-status" style={{ color: user.isActive ? '#00F5A0' : '#F87171' }}>
                  <span className="usr-status-dot" style={{ background: user.isActive ? '#00F5A0' : '#F87171', boxShadow: `0 0 5px ${user.isActive ? '#00F5A0' : '#F87171'}`, animationPlayState: user.isActive ? 'running' : 'paused' }}/>
                  {user.isActive ? 'Active' : 'Off'}
                </div>

                {/* Last login */}
                <div className="usr-mono" style={{ color:'#555' }}>
                  {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, HH:mm') : '—'}
                </div>

                {/* Joined */}
                <div className="usr-mono" style={{ color:'#444' }}>
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="usr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="usr-modal">
            <h2 className="usr-modal-title">Create New User</h2>
            <p className="usr-modal-sub">Fill in the details below to add a user</p>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                { label:'Full Name', key:'name',     type:'text',     placeholder:'Dr. Rajesh Kumar' },
                { label:'Email',     key:'email',    type:'email',    placeholder:'user@example.com' },
                { label:'Password',  key:'password', type:'password', placeholder:'••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label className="usr-field-label">{f.label}</label>
                  <input className="usr-field-input" type={f.type} placeholder={f.placeholder}
                    value={(newUser as any)[f.key]}
                    onChange={e => setNewUser({ ...newUser, [f.key]: e.target.value })}/>
                </div>
              ))}

              <div>
                <label className="usr-field-label">Role</label>
                <select className="usr-field-input" value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role:e.target.value, department: e.target.value === 'DOCTOR' ? 'GENERAL_MEDICINE' : 'TAXATION' })}>
                  <option value="ADMIN">Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="FINANCE_AGENT">Finance Agent</option>
                </select>
              </div>

              {newUser.role !== 'ADMIN' && (
                <div>
                  <label className="usr-field-label">Department</label>
                  <select className="usr-field-input" value={newUser.department}
                    onChange={e => setNewUser({ ...newUser, department:e.target.value })}>
                    {(newUser.role === 'DOCTOR' ? DEPT_OPTIONS_DOCTOR : DEPT_OPTIONS_FINANCE).map(d => (
                      <option key={d} value={d}>{d.replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {error && <div className="usr-error">⚠ {error}</div>}

            <div style={{ display:'flex', gap:10, marginTop:26 }}>
              <button className="usr-modal-submit" onClick={createUser}
                disabled={creating || !newUser.name || !newUser.email || !newUser.password}>
                {creating ? 'Creating…' : 'Create User'}
              </button>
              <button className="usr-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Missing import fix
function Users(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }