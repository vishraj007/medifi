'use client'

import { useState, useEffect } from 'react'
import { Plus, Save, Edit2, X, Check, Code2, FileCode, Layers, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react'

export default function ConfigsPage() {
  const [configs, setConfigs]   = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [activeSection, setActiveSection] = useState<'schema'|'prompts'|'template'>('schema')
  const [jsonError, setJsonError] = useState<{ schema?:string; prompts?:string }>({})

  useEffect(() => { fetchConfigs() }, [])

  const fetchConfigs = async () => {
    const res  = await fetch('/api/admin/configs')
    const data = await res.json()
    setConfigs(data)
    if (data.length > 0 && !selected) setSelected(data[0])
  }

  const saveConfig = async () => {
    if (jsonError.schema || jsonError.prompts) return
    setSaving(true)
    try {
      const method = selected.id ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/configs', {
        method, headers:{'Content-Type':'application/json'},
        body: JSON.stringify(selected)
      })
      if (res.ok) { fetchConfigs(); setEditing(false) }
    } catch {}
    finally { setSaving(false) }
  }

  const createNew = () => {
    setSelected({ domain:'HEALTHCARE', department:'GENERAL_MEDICINE', schema:{}, prompts:{ system:'', extraction:'' }, template:'<div class="report"></div>', isActive:true })
    setEditing(true); setJsonError({})
  }

  const DOMAIN_COLOR = (d: string) => d === 'HEALTHCARE' ? '#00D4FF' : '#00F5A0'
  const DOMAIN_BG    = (d: string) => d === 'HEALTHCARE' ? 'linear-gradient(135deg,#001824,#002535)' : 'linear-gradient(135deg,#001A0F,#002518)'
  const DOMAIN_ICON  = (d: string) => d === 'HEALTHCARE' ? '⚕' : '₹'

  const SECTIONS = [
    { id:'schema',   label:'Schema',   icon: Layers,   desc:'JSON data structure' },
    { id:'prompts',  label:'Prompts',  icon: Code2,    desc:'AI system prompts'   },
    { id:'template', label:'Template', icon: FileCode, desc:'HTML report layout'  },
  ] as const

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Keyframes ─────────────────── */
        @keyframes slideUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes scanLine { 0%{top:-2px} 100%{top:100%} }

        /* ── Root ──────────────────────── */
        .cfg-root { font-family:'DM Sans',sans-serif; color:#E8E8E8; }

        /* ── Header ───────────────────── */
        .cfg-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px;
          animation: slideUp .4s ease both;
        }
        .cfg-eyebrow { display:flex; align-items:center; gap:8px; margin-bottom:7px; }
        .cfg-eyebrow-bar { width:3px; height:20px; border-radius:2px; background:linear-gradient(180deg,#00D4FF,#A78BFA); }
        .cfg-eyebrow-text { font-size:10px; color:#444; font-family:'IBM Plex Mono',monospace; letter-spacing:.15em; text-transform:uppercase; }
        .cfg-title { font-size:28px; font-weight:700; color:#E8E8E8; letter-spacing:-.02em; margin:0 0 5px; }
        .cfg-sub   { font-size:13px; color:#555; }

        .cfg-new-btn {
          display:flex; align-items:center; gap:8px;
          padding:11px 20px;
          background: linear-gradient(135deg,#001824,#002535);
          border:1px solid #00D4FF44; border-radius:11px;
          color:#00D4FF; font-size:13px; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all .2s;
          box-shadow: 0 4px 20px rgba(0,212,255,.08);
        }
        .cfg-new-btn:hover {
          border-color:#00D4FF88;
          box-shadow: 0 4px 28px rgba(0,212,255,.18);
          transform:translateY(-1px);
        }

        /* ── Layout grid ───────────────── */
        .cfg-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 16px;
          align-items: start;
        }

        /* ── Sidebar list ──────────────── */
        .cfg-list-card {
          background: #111;
          border: 1px solid #1E1E1E;
          border-radius: 16px;
          overflow: hidden;
          animation: slideUp .4s ease .05s both;
          position: sticky;
          top: 80px;
        }
        .cfg-list-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid #1A1A1A;
          background: #0D0D0D;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cfg-list-header-text { font-size:10px; color:#444; font-family:'IBM Plex Mono',monospace; letter-spacing:.12em; text-transform:uppercase; }
        .cfg-list-count { font-size:11px; color:#555; font-family:'IBM Plex Mono',monospace; background:#1A1A1A; border:1px solid #2A2A2A; border-radius:100px; padding:2px 8px; }

        /* Config item */
        .cfg-item {
          padding: 13px 16px;
          cursor: pointer;
          transition: all .18s;
          border-bottom: 1px solid #0F0F0F;
          position: relative;
          overflow: hidden;
        }
        .cfg-item:last-child { border-bottom: none; }
        .cfg-item::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0; width: 2px;
          background: var(--item-color);
          box-shadow: 0 0 8px var(--item-color);
          opacity: 0;
          transition: opacity .18s;
        }
        .cfg-item:hover { background: #0D0D0D; }
        .cfg-item.active { background: #0D0D0D; }
        .cfg-item.active::before { opacity: 1; }

        .cfg-item-domain {
          font-size:12px; font-weight:700;
          font-family:'IBM Plex Mono',monospace;
          letter-spacing:.04em;
          margin-bottom: 2px;
        }
        .cfg-item-dept { font-size:11px; color:#555; }
        .cfg-item-badge {
          font-size:9px; padding:2px 7px; border-radius:4px;
          font-family:'IBM Plex Mono',monospace; font-weight:600;
          border:1px solid; letter-spacing:.04em;
        }
        .cfg-item-row {
          display:flex; align-items:center; justify-content:space-between;
        }
        .cfg-item-icon {
          font-size:16px; margin-right:6px;
          filter: drop-shadow(0 0 4px var(--item-color));
        }

        /* ── Editor card ─────────────── */
        .cfg-editor-card {
          background: #111;
          border: 1px solid #1E1E1E;
          border-radius: 16px;
          overflow: hidden;
          animation: slideUp .4s ease .1s both;
          position: relative;
        }
        /* Scan line effect */
        .cfg-editor-card::after {
          content: '';
          position: absolute;
          left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,.15), transparent);
          animation: scanLine 6s linear infinite;
          pointer-events: none;
        }

        /* Editor top bar */
        .cfg-editor-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 22px;
          border-bottom: 1px solid #1A1A1A;
          background: #0D0D0D;
        }
        .cfg-editor-meta { display:flex; align-items:center; gap:10px; }
        .cfg-editor-domain { font-family:'IBM Plex Mono',monospace; font-size:16px; font-weight:700; letter-spacing:.04em; }
        .cfg-editor-sep    { color:#333; font-size:14px; }
        .cfg-editor-dept   { font-size:13px; color:#AAA; }
        .cfg-editor-mode   { font-size:10px; color:#555; font-family:'IBM Plex Mono',monospace; margin-top:2px; }

        /* Action buttons */
        .cfg-btn {
          display:flex; align-items:center; gap:6px;
          padding: 8px 16px; border-radius:9px;
          font-size:12px; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition: all .15s; border:1px solid;
        }
        .cfg-btn-save  { background:#0A1D0F; border-color:#00F5A044; color:#00F5A0; }
        .cfg-btn-save:hover:not(:disabled)  { border-color:#00F5A088; box-shadow:0 4px 16px rgba(0,245,160,.12); }
        .cfg-btn-save:disabled { opacity:.4; cursor:not-allowed; }
        .cfg-btn-edit  { background:#001824; border-color:#00D4FF44; color:#00D4FF; }
        .cfg-btn-edit:hover  { border-color:#00D4FF88; }
        .cfg-btn-cancel{ background:transparent; border-color:#2A2A2A; color:#555; }
        .cfg-btn-cancel:hover{ border-color:#3A3A3A; color:#888; }

        /* ── Field grid ─────────────── */
        .cfg-field-grid {
          display: grid; grid-template-columns:1fr 1fr; gap:14px;
          padding: 22px; border-bottom: 1px solid #1A1A1A;
        }
        .cfg-field-label {
          display:block; font-size:10px; color:#555;
          font-family:'IBM Plex Mono',monospace;
          letter-spacing:.12em; text-transform:uppercase;
          margin-bottom:7px;
        }
        .cfg-field-input {
          width:100%; background:#0D0D0D; border:1px solid #2A2A2A;
          border-radius:9px; padding:10px 14px;
          color:#E8E8E8; font-size:13px;
          font-family:'DM Sans',sans-serif; outline:none;
          transition:border-color .15s, box-shadow .15s;
        }
        .cfg-field-input:focus { border-color:#00D4FF55; box-shadow:0 0 0 3px rgba(0,212,255,.06); }
        .cfg-field-input:disabled { opacity:.5; cursor:default; }
        select.cfg-field-input option { background:#111; }

        /* ── Section tabs ───────────── */
        .cfg-tabs {
          display:flex; gap:2px; padding:12px 22px;
          border-bottom:1px solid #1A1A1A;
          background: #0A0A0A;
        }
        .cfg-tab {
          display:flex; align-items:center; gap:7px;
          padding:8px 14px; border-radius:9px; border:1px solid transparent;
          font-size:12px; font-weight:600; cursor:pointer;
          transition:all .15s; font-family:'DM Sans',sans-serif;
          color:#444;
        }
        .cfg-tab:hover { background:#0F0F0F; color:#888; }
        .cfg-tab.active { background:#141414; border-color:#242424; color:#E8E8E8; }
        .cfg-tab-dot {
          width:5px; height:5px; border-radius:50%;
          background:var(--tab-color); opacity:0;
          box-shadow:0 0 5px var(--tab-color);
          transition:opacity .15s;
        }
        .cfg-tab.active .cfg-tab-dot { opacity:1; }

        /* ── Code textarea ──────────── */
        .cfg-code-wrap {
          padding: 22px;
          position: relative;
        }
        .cfg-section-desc { font-size:11px; color:#444; font-family:'IBM Plex Mono',monospace; margin-bottom:12px; }
        .cfg-json-err { float:right; font-size:10px; color:#F87171; font-family:'IBM Plex Mono',monospace; background:#1A0505; border:1px solid #F8717133; border-radius:5px; padding:2px 8px; }

        .cfg-textarea {
          width:100%; background:#0A0A0A; border:1px solid #2A2A2A;
          border-radius:10px; padding:16px;
          color:#9CA3AF; font-size:12px; line-height:1.8;
          font-family:'IBM Plex Mono',monospace; outline:none;
          resize:vertical; transition:border-color .15s;
          min-height:220px;
        }
        .cfg-textarea:focus { border-color:#00D4FF33; }
        .cfg-textarea:disabled { opacity:.5; cursor:default; }
        .cfg-textarea.err { border-color:#F87171 !important; }
        /* Syntax-ish — minimal color via CSS */
        .cfg-textarea-html {
          color:#E8E8E8; min-height:280px;
          background: repeating-linear-gradient(
            transparent 0px, transparent 21.6px,
            rgba(0,212,255,.015) 21.6px, rgba(0,212,255,.015) 22.4px
          );
        }

        /* ── Status toggle ──────────── */
        .cfg-status-row {
          display:flex; align-items:center; gap:14px;
          padding:16px 22px;
          border-top:1px solid #1A1A1A;
          background:#0A0A0A;
        }
        .cfg-status-label { font-size:10px; color:#555; font-family:'IBM Plex Mono',monospace; letter-spacing:.12em; text-transform:uppercase; }
        .cfg-toggle {
          display:flex; align-items:center; gap:7px;
          padding:6px 14px; border-radius:8px; border:1px solid;
          font-size:11px; font-family:'IBM Plex Mono',monospace; font-weight:600;
          cursor:pointer; transition:all .2s;
        }

        /* Scrollbar */
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#0A0A0A;}
        ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px;}
      `}</style>

      <div className="cfg-root">

        {/* ── Header ─────────────────────────────────── */}
        <div className="cfg-header">
          <div>
            <div className="cfg-eyebrow">
              <div className="cfg-eyebrow-bar"/>
              <span className="cfg-eyebrow-text">Admin · Configs</span>
            </div>
            <h1 className="cfg-title">Configurations</h1>
            <p className="cfg-sub">Manage domain schemas, AI prompts and report templates</p>
          </div>
          <button className="cfg-new-btn" onClick={createNew}>
            <Plus size={15}/> New Config
          </button>
        </div>

        <div className="cfg-layout">

          {/* ── Config list ───────────────────────────── */}
          <div className="cfg-list-card">
            <div className="cfg-list-header">
              <span className="cfg-list-header-text">Configurations</span>
              <span className="cfg-list-count">{configs.length}</span>
            </div>
            <div>
              {configs.map(cfg => {
                const color = DOMAIN_COLOR(cfg.domain)
                const isActive = selected?.id === cfg.id
                return (
                  <div key={cfg.id}
                    className={`cfg-item ${isActive ? 'active' : ''}`}
                    style={{ '--item-color': color } as any}
                    onClick={() => { setSelected(cfg); setEditing(false); setJsonError({}); setActiveSection('schema') }}
                  >
                    <div className="cfg-item-row">
                      <div style={{ display:'flex', alignItems:'center' }}>
                        <span className="cfg-item-icon">{DOMAIN_ICON(cfg.domain)}</span>
                        <span className="cfg-item-domain" style={{ color }}>{cfg.domain}</span>
                      </div>
                      <div className="cfg-item-badge" style={{
                        color: cfg.isActive ? '#00F5A0' : '#555',
                        background: cfg.isActive ? '#051A10' : '#1A1A1A',
                        borderColor: cfg.isActive ? '#00F5A033' : '#2A2A2A',
                      }}>
                        {cfg.isActive ? '● on' : '○ off'}
                      </div>
                    </div>
                    <div className="cfg-item-dept">{cfg.department.replace(/_/g,' ')}</div>
                    {isActive && (
                      <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
                        <ChevronRight size={14} color={color} style={{ opacity:.6 }}/>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Editor ────────────────────────────────── */}
          {selected && (
            <div className="cfg-editor-card">

              {/* Top bar */}
              <div className="cfg-editor-topbar">
                <div>
                  <div className="cfg-editor-meta">
                    <span className="cfg-editor-domain" style={{ color: DOMAIN_COLOR(selected.domain) }}>
                      {DOMAIN_ICON(selected.domain)} {selected.domain}
                    </span>
                    <span className="cfg-editor-sep">·</span>
                    <span className="cfg-editor-dept">{selected.department?.replace(/_/g,' ')}</span>
                  </div>
                  <div className="cfg-editor-mode">
                    {editing ? '✎ Editing — unsaved changes' : '◉ View mode'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {editing ? (
                    <>
                      <button className="cfg-btn cfg-btn-save" onClick={saveConfig}
                        disabled={saving || !!jsonError.schema || !!jsonError.prompts}>
                        <Save size={12}/>{saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="cfg-btn cfg-btn-cancel" onClick={() => { setEditing(false); setJsonError({}) }}>
                        <X size={12}/> Cancel
                      </button>
                    </>
                  ) : (
                    <button className="cfg-btn cfg-btn-edit" onClick={() => setEditing(true)}>
                      <Edit2 size={12}/> Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Domain + Dept selects */}
              <div className="cfg-field-grid">
                <div>
                  <label className="cfg-field-label">Domain</label>
                  <select className="cfg-field-input" value={selected.domain} disabled={!editing}
                    onChange={e => setSelected({ ...selected, domain:e.target.value })}>
                    <option value="HEALTHCARE">Healthcare</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="cfg-field-label">Department</label>
                  <select className="cfg-field-input" value={selected.department} disabled={!editing}
                    onChange={e => setSelected({ ...selected, department:e.target.value })}>
                    {selected.domain === 'HEALTHCARE' ? (
                      <>
                        <option value="GENERAL_MEDICINE">General Medicine</option>
                        <option value="CARDIOLOGY">Cardiology</option>
                        <option value="ORTHOPEDICS">Orthopedics</option>
                        <option value="PEDIATRICS">Pediatrics</option>
                      </>
                    ) : (
                      <>
                        <option value="TAXATION">Taxation</option>
                        <option value="INVESTMENT">Investment</option>
                        <option value="INSURANCE">Insurance</option>
                        <option value="LOANS">Loans</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Section tabs */}
              <div className="cfg-tabs">
                {SECTIONS.map(s => (
                  <button key={s.id}
                    className={`cfg-tab ${activeSection === s.id ? 'active' : ''}`}
                    style={{ '--tab-color': '#00D4FF' } as any}
                    onClick={() => setActiveSection(s.id)}>
                    <s.icon size={12}/>
                    {s.label}
                    <span className="cfg-tab-dot"/>
                  </button>
                ))}
              </div>

              {/* Code sections */}
              <div className="cfg-code-wrap">
                {activeSection === 'schema' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <p className="cfg-section-desc">Data extraction schema — JSON object</p>
                      {jsonError.schema && <span className="cfg-json-err">⚠ Invalid JSON</span>}
                    </div>
                    <textarea className={`cfg-textarea${jsonError.schema ? ' err' : ''}`}
                      rows={10} disabled={!editing}
                      defaultValue={JSON.stringify(selected.schema, null, 2)}
                      onChange={e => {
                        try { setSelected({ ...selected, schema:JSON.parse(e.target.value) }); setJsonError(p => ({ ...p, schema:undefined })) }
                        catch { setJsonError(p => ({ ...p, schema:'invalid' })) }
                      }}/>
                  </div>
                )}
                {activeSection === 'prompts' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <p className="cfg-section-desc">AI system and extraction prompts — JSON object</p>
                      {jsonError.prompts && <span className="cfg-json-err">⚠ Invalid JSON</span>}
                    </div>
                    <textarea className={`cfg-textarea${jsonError.prompts ? ' err' : ''}`}
                      rows={10} disabled={!editing}
                      defaultValue={JSON.stringify(selected.prompts, null, 2)}
                      onChange={e => {
                        try { setSelected({ ...selected, prompts:JSON.parse(e.target.value) }); setJsonError(p => ({ ...p, prompts:undefined })) }
                        catch { setJsonError(p => ({ ...p, prompts:'invalid' })) }
                      }}/>
                  </div>
                )}
                {activeSection === 'template' && (
                  <div>
                    <p className="cfg-section-desc" style={{ marginBottom:10 }}>Report HTML template — rendered as patient/client report</p>
                    <textarea className="cfg-textarea cfg-textarea-html"
                      rows={14} disabled={!editing}
                      value={selected.template}
                      onChange={e => setSelected({ ...selected, template:e.target.value })}/>
                  </div>
                )}
              </div>

              {/* Status toggle */}
              <div className="cfg-status-row">
                <span className="cfg-status-label">Status</span>
                <button
                  className="cfg-toggle"
                  disabled={!editing}
                  onClick={() => setSelected({ ...selected, isActive:!selected.isActive })}
                  style={{
                    background: selected.isActive ? '#051A10' : '#1A1A1A',
                    borderColor: selected.isActive ? '#00F5A044' : '#2A2A2A',
                    color: selected.isActive ? '#00F5A0' : '#555',
                    cursor: editing ? 'pointer' : 'default',
                  }}>
                  {selected.isActive
                    ? <><ToggleRight size={14}/> Active</>
                    : <><ToggleLeft  size={14}/> Inactive</>
                  }
                </button>
                <span style={{ fontSize:11, color:'#333', fontFamily:'IBM Plex Mono,monospace', marginLeft:'auto' }}>
                  ID: {selected.id?.slice(-8) ?? 'new'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}