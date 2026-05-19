// app/admin/layout.tsx
// Enhanced admin layout — sticky sidebar + global admin styles
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Settings, FileText,
  BarChart2, LogOut, ChevronRight, Zap, Shield,
  Bell, Search, Moon, Cpu
} from 'lucide-react'

const NAV = [
  { href: '/admin/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, color: '#00D4FF' },
  { href: '/admin/analytics',   label: 'Analytics',   icon: BarChart2,        color: '#A78BFA' },
  { href: '/admin/users',       label: 'Users',        icon: Users,            color: '#00F5A0' },
  { href: '/admin/configs',     label: 'Configs',      icon: Settings,         color: '#F59E0B' },
  { href: '/admin/audit-logs',  label: 'Audit Logs',   icon: FileText,         color: '#F472B6' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [notifications] = useState(3)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'ADMIN') router.push('/login')
        else setUser(d.user)
      })
      .catch(() => router.push('/login'))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #00D4FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0A !important; }

        /* ── Scrollbar ───────────────────── */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #3A3A3A; }

        /* ── Layout grid ─────────────────── */
        .adm-shell {
          display: grid;
          grid-template-columns: 220px 1fr;
          min-height: 100vh;
          background: #0A0A0A;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Sidebar ─────────────────────── */
        .adm-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0D0D0D;
          border-right: 1px solid #1A1A1A;
          padding: 0;
          overflow: hidden;
          z-index: 50;
        }

        /* Sidebar top gradient accent */
        .adm-sidebar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, #00D4FF66, #A78BFA66, transparent);
        }

        /* ── Logo area ───────────────────── */
        .adm-logo {
          padding: 20px 18px 16px;
          border-bottom: 1px solid #1A1A1A;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adm-logo-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #001824, #003040);
          border: 1px solid #00D4FF33;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 16px #00D4FF18;
          flex-shrink: 0;
        }
        .adm-logo-text {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: #E8E8E8;
          letter-spacing: .02em;
        }
        .adm-logo-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          color: #444;
          letter-spacing: .1em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        /* ── Nav ─────────────────────────── */
        .adm-nav { flex: 1; padding: 14px 10px; overflow-y: auto; }
        .adm-nav-label {
          font-size: 9px;
          color: #333;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: .14em;
          text-transform: uppercase;
          padding: 0 8px;
          margin-bottom: 6px;
          margin-top: 14px;
        }
        .adm-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          color: #555;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: all .18s;
          position: relative;
          margin-bottom: 2px;
          border: 1px solid transparent;
          letter-spacing: .01em;
        }
        .adm-nav-item:hover {
          color: #CCC;
          background: #141414;
          border-color: #1E1E1E;
        }
        .adm-nav-item.active {
          color: #E8E8E8;
          background: #141414;
          border-color: #242424;
        }
        .adm-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 2px;
          border-radius: 2px;
          background: var(--nav-color, #00D4FF);
          box-shadow: 0 0 8px var(--nav-color, #00D4FF);
        }
        .adm-nav-chevron {
          margin-left: auto;
          opacity: 0;
          transition: opacity .15s;
        }
        .adm-nav-item:hover .adm-nav-chevron,
        .adm-nav-item.active .adm-nav-chevron {
          opacity: 1;
        }
        .adm-nav-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--nav-color, #00D4FF);
          box-shadow: 0 0 6px var(--nav-color, #00D4FF);
          opacity: 0;
          transition: opacity .15s;
          flex-shrink: 0;
        }
        .adm-nav-item.active .adm-nav-dot { opacity: 1; }

        /* ── Sidebar footer ──────────────── */
        .adm-sidebar-footer {
          padding: 14px 10px;
          border-top: 1px solid #1A1A1A;
        }
        .adm-user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #111;
          border: 1px solid #1E1E1E;
          margin-bottom: 8px;
          transition: border-color .15s;
        }
        .adm-user-pill:hover { border-color: #2A2A2A; }
        .adm-avatar {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg, #001824, #003040);
          border: 1px solid #00D4FF33;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #00D4FF;
          flex-shrink: 0;
        }
        .adm-logout-btn {
          width: 100%;
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: #444;
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all .15s;
        }
        .adm-logout-btn:hover {
          background: #1A0505;
          border-color: #F8717133;
          color: #F87171;
        }

        /* ── Main content area ───────────── */
        .adm-main {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
        }

        /* ── Top bar ─────────────────────── */
        .adm-topbar {
          height: 56px;
          position: sticky; top: 0;
          z-index: 40;
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid #1A1A1A;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
        }
        .adm-topbar::before {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, #00D4FF18, transparent);
        }

        /* Breadcrumb */
        .breadcrumb {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #555;
          font-family: 'IBM Plex Mono', monospace;
        }
        .breadcrumb-sep { color: #2A2A2A; }
        .breadcrumb-current { color: #AAA; font-weight: 600; }

        /* Topbar right */
        .topbar-actions { display: flex; align-items: center; gap: 10px; }
        .topbar-icon-btn {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: 1px solid #1E1E1E;
          background: #111;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .15s; position: relative;
          color: #555;
        }
        .topbar-icon-btn:hover { border-color: #2A2A2A; color: #CCC; background: #141414; }
        .notif-dot {
          position: absolute; top: 5px; right: 5px;
          width: 7px; height: 7px; border-radius: 50%;
          background: #F472B6;
          box-shadow: 0 0 6px #F472B6;
          border: 1.5px solid #0A0A0A;
        }

        /* Status pill */
        .status-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px;
          background: #051A10;
          border: 1px solid #00F5A022;
          border-radius: 100px;
          font-size: 10px;
          color: #00F5A0;
          font-family: 'IBM Plex Mono', monospace;
        }

        /* ── Page content ────────────────── */
        .adm-page { flex: 1; padding: 28px; overflow-y: auto; }

        /* ── Animations ──────────────────── */
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes lp { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.85)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn .3s ease; }

        /* ── Override main margin from parent layout ── */
        main { padding: 0 !important; max-width: none !important; background: transparent !important; }
      `}</style>

      <div className="adm-shell">

        {/* ── SIDEBAR ────────────────────────────────────────── */}
        <aside className="adm-sidebar">

          {/* Logo */}
          <div className="adm-logo">
            <div className="adm-logo-icon">
              <Zap size={16} color="#00D4FF"/>
            </div>
            <div>
              <div className="adm-logo-text">MediFi Admin</div>
              <div className="adm-logo-sub">Control Panel</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="adm-nav">
            <div className="adm-nav-label">Navigation</div>
            {NAV.map(n => {
              const isActive = pathname === n.href || pathname.startsWith(n.href + '/')
              return (
                <Link key={n.href} href={n.href}
                  className={`adm-nav-item ${isActive ? 'active' : ''}`}
                  style={{ '--nav-color': n.color } as any}>
                  <n.icon size={15} color={isActive ? n.color : '#555'}/>
                  {n.label}
                  <span className="adm-nav-dot"/>
                  <ChevronRight size={12} className="adm-nav-chevron" color={n.color}/>
                </Link>
              )
            })}

            <div className="adm-nav-label" style={{ marginTop: 20 }}>System</div>
            <Link href="/domain-select" className="adm-nav-item" style={{ '--nav-color': '#A78BFA' } as any}>
              <Cpu size={15} color="#555"/>
              Go to App
              <span className="adm-nav-dot"/>
            </Link>
          </nav>

          {/* Footer */}
          <div className="adm-sidebar-footer">
            <div className="adm-user-pill">
              <div className="adm-avatar">{user.name?.charAt(0) || 'A'}</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, color: '#CCC', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace' }}>{user.role}</div>
              </div>
            </div>
            <button className="adm-logout-btn" onClick={handleLogout}>
              <LogOut size={13}/> Sign out
            </button>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <div className="adm-main">

          {/* Top bar */}
          <div className="adm-topbar">
            <div className="breadcrumb">
              <span>Admin</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">
                {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Dashboard'}
              </span>
            </div>

            <div className="topbar-actions">
              <div className="status-pill">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F5A0', boxShadow: '0 0 6px #00F5A0', animation: 'lp 2s infinite', display: 'inline-block' }}/>
                All systems operational
              </div>
              <div className="topbar-icon-btn" onClick={() => setSearchOpen(s => !s)}>
                <Search size={14}/>
              </div>
              <div className="topbar-icon-btn" style={{ position: 'relative' }}>
                <Bell size={14}/>
                {notifications > 0 && <span className="notif-dot"/>}
              </div>
              <div className="topbar-icon-btn">
                <Shield size={14} color="#A78BFA"/>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="adm-page fade-in">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}