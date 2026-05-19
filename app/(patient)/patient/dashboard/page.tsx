'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientSession {
  id: string
  domain: string
  department: string
  status: string
  approved: boolean
  createdAt: string
  finalReport: string | null
  smartSummary: any
  extractedData: any
  nerEntities: any
  doctor?: { name: string }
}

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate: string
  timing: { morning?: { enabled: boolean; time: string }; afternoon?: { enabled: boolean; time: string }; night?: { enabled: boolean; time: string } }
  notes: string
}

interface FinReminder {
  id: string
  title: string
  stockName: string
  quantity: string
  buyPrice: string
  buyDate: string
  callDate: string
  callTime: string
  fired: boolean
}

type TabId = 'overview' | 'reports' | 'meds' | 'timeline'

const LANG_KEYS = ['english', 'hindi', 'kannada'] as const
const LANG_LABELS = { english: '🇬🇧 English', hindi: '🇮🇳 हिंदी', kannada: '🏛️ ಕನ್ನಡ' }

// ─── Mini Components ──────────────────────────────────────────────────────────
function Spinner({ size = 20, color = '#6366f1' }: { size?: number; color?: string }) {
  return <span style={{ width:size, height:size, border:`2px solid ${color}33`, borderTopColor:color, borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite', flexShrink:0 }} />
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return <span style={{ padding:'3px 10px', borderRadius:100, fontSize:'.65rem', fontFamily:'JetBrains Mono,monospace', fontWeight:700, letterSpacing:'.06em', background:bg, color, border:`1px solid ${border}`, display:'inline-flex', alignItems:'center', gap:5 }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:color }} />
    {label}
  </span>
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }: { icon: string; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${color}18`, borderRadius:16, padding:'20px 18px', position:'relative', overflow:'hidden', transition:'border-color .2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}40`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}18`)}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:`radial-gradient(${color}18,transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:'1.6rem', fontWeight:800, color, fontFamily:'Sora,sans-serif', lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:'.75rem', color:'#6b7280', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.06em', textTransform:'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize:'.72rem', color:'#4b5563', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ─── Audio Player for TTS ─────────────────────────────────────────────────────
function AudioSummaryPlayer({ session, lang }: { session: PatientSession; lang: string }) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const langMap: Record<string, string> = { english: 'ENGLISH', hindi: 'HINDI', kannada: 'KANNADA' }

  const getSummaryText = (): string => {
    const s = session.smartSummary?.[lang]
    if (!s) return ''
    const isHC = session.domain === 'HEALTHCARE'
    const parts = [
      s.mainProblem,
      s.keyFindings?.slice(0,2).join('. '),
      isHC ? s.medicines?.slice(0,2).join('. ') : s.actionItems?.slice(0,2).join('. '),
      s.followUp,
      s.encouragement
    ].filter(Boolean)
    return parts.join('. ').substring(0, 490)
  }

  const togglePlay = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      return
    }
    const text = getSummaryText()
    if (!text) { setError('No summary available in this language'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/voice/tts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text, language: langMap[lang] || 'ENGLISH' })
      })
      const data = await res.json()
      if (!res.ok || !data.audio) throw new Error(data.error || 'TTS failed')
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => { setError('Playback failed'); setPlaying(false) }
      await audio.play()
      setPlaying(true)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <button onClick={togglePlay} disabled={loading}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', borderRadius:10, border:'1px solid rgba(99,102,241,.3)', background: playing ? 'rgba(99,102,241,.15)' : 'rgba(99,102,241,.06)', color:'#818cf8', cursor:'pointer', fontFamily:'Sora,sans-serif', fontSize:'.82rem', fontWeight:600, transition:'all .2s' }}>
        {loading ? <Spinner size={14} color="#818cf8" /> : playing
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#818cf8"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="#818cf8"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        {loading ? 'Loading audio...' : playing ? 'Stop audio' : '🔊 Listen to summary'}
      </button>
      {error && <p style={{ fontSize:'.72rem', color:'#f87171', fontFamily:'JetBrains Mono' }}>{error}</p>}
    </div>
  )
}

// ─── Session Report Card ───────────────────────────────────────────────────────
function SessionCard({ session, onClick, isHC }: { session: PatientSession; onClick: () => void; isHC: boolean }) {
  const color = isHC ? '#06b6d4' : '#34d399'
  const date = new Date(session.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
  return (
    <div onClick={onClick} style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${color}22`, borderRadius:16, padding:'18px 20px', cursor:'pointer', transition:'all .2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}55`; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=`${color}22`; e.currentTarget.style.transform='none' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color}88,transparent)` }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <p style={{ fontWeight:700, color:'#f9fafb', fontSize:'.95rem', marginBottom:4 }}>{session.department.replace(/_/g,' ')}</p>
          <p style={{ fontSize:'.72rem', color:'#6b7280', fontFamily:'JetBrains Mono' }}>{date}</p>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {session.approved && <Badge label="APPROVED" color="#34d399" bg="rgba(52,211,153,.08)" border="rgba(52,211,153,.25)" />}
          <Badge label={session.status} color={session.status==='COMPLETED' ? '#06b6d4' : '#f59e0b'} bg={session.status==='COMPLETED' ? 'rgba(6,182,212,.08)' : 'rgba(245,158,11,.08)'} border={session.status==='COMPLETED' ? 'rgba(6,182,212,.25)' : 'rgba(245,158,11,.25)'} />
        </div>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {session.finalReport && <span style={{ fontSize:'.7rem', padding:'3px 8px', borderRadius:6, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.2)', color:'#818cf8', fontFamily:'JetBrains Mono' }}>📄 Report ready</span>}
        {session.smartSummary && <span style={{ fontSize:'.7rem', padding:'3px 8px', borderRadius:6, background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.2)', color:'#34d399', fontFamily:'JetBrains Mono' }}>🔊 Audio available</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:10 }}>
        <span style={{ fontSize:'.75rem', color:'#4b5563' }}>View details</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  )
}

// ─── Medication Tracker Card ──────────────────────────────────────────────────
function MedCard({ med }: { med: Medication }) {
  const today = new Date().toISOString().split('T')[0]
  const isActive = (!med.startDate || today >= med.startDate) && (!med.endDate || today <= med.endDate)
  const slotColors = { morning:'#f59e0b', afternoon:'#06b6d4', night:'#818cf8' }
  const slotEmoji = { morning:'🌅', afternoon:'☀️', night:'🌙' }

  return (
    <div style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${isActive ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,.06)'}`, borderRadius:14, padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, color:'#f9fafb', fontSize:'.9rem' }}>💊 {med.name}</span>
            {med.dosage && <span style={{ fontSize:'.68rem', padding:'2px 8px', borderRadius:100, background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.2)', color:'#34d399', fontFamily:'JetBrains Mono' }}>{med.dosage}</span>}
          </div>
          {(med.startDate || med.endDate) && (
            <p style={{ fontSize:'.7rem', color:'#6b7280', fontFamily:'JetBrains Mono', marginTop:4 }}>
              {med.startDate && `From ${med.startDate}`}{med.endDate && ` → ${med.endDate}`}
            </p>
          )}
        </div>
        <span style={{ fontSize:'.65rem', padding:'3px 8px', borderRadius:6, fontFamily:'JetBrains Mono', background:isActive?'rgba(52,211,153,.08)':'rgba(255,255,255,.04)', color:isActive?'#34d399':'#4b5563', border:`1px solid ${isActive?'rgba(52,211,153,.2)':'rgba(255,255,255,.08)'}` }}>
          {isActive ? '● ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {(['morning','afternoon','night'] as const).map(slot => {
          const s = med.timing?.[slot]
          if (!s?.enabled) return null
          return (
            <div key={slot} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:8, background:`${slotColors[slot]}11`, border:`1px solid ${slotColors[slot]}33` }}>
              <span style={{ fontSize:12 }}>{slotEmoji[slot]}</span>
              <span style={{ fontSize:'.7rem', color:slotColors[slot], fontFamily:'JetBrains Mono', fontWeight:600 }}>{s.time}</span>
            </div>
          )
        })}
      </div>
      {med.notes && <p style={{ fontSize:'.75rem', color:'#6b7280', marginTop:8, fontStyle:'italic' }}>{med.notes}</p>}
    </div>
  )
}

// ─── Session Detail Modal ──────────────────────────────────────────────────────
function SessionModal({ session, onClose }: { session: PatientSession; onClose: () => void }) {
  const [lang, setLang] = useState<'english'|'hindi'|'kannada'>('english')
  const [reportLang, setReportLang] = useState<'ENGLISH'|'HINDI'|'KANNADA'>('ENGLISH')
  const [translating, setTranslating] = useState(false)
  const [translatedReport, setTranslatedReport] = useState('')
  const [downloading, setDownloading] = useState(false)
  const isHC = session.domain === 'HEALTHCARE'
  const color = isHC ? '#06b6d4' : '#34d399'
  const s = session.smartSummary?.[lang]

  const translateReport = async (targetLang: 'ENGLISH'|'HINDI'|'KANNADA') => {
    setReportLang(targetLang)
    if (targetLang === 'ENGLISH' || !session.finalReport) { setTranslatedReport(''); return }
    setTranslating(true)
    try {
      const res = await fetch('/api/ai/translate-report', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ html: session.finalReport, targetLang })
      })
      const data = await res.json()
      setTranslatedReport(data.translatedHtml || session.finalReport || '')
    } catch { setTranslatedReport(session.finalReport || '') }
    finally { setTranslating(false) }
  }

  const downloadPDF = async () => {
    if (!session.finalReport) return
    setDownloading(true)
    try {
      const { generatePDFClient } = await import('@/lib/pdf/client-generator')
      const pdfBlob = await generatePDFClient('patient-report-content')
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${session.department.toLowerCase().replace(/_/g,'-')}-${session.createdAt.slice(0,10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  const sectionCards = [
    { key:'mainProblem', emoji: isHC ? '🩺':'💡', title: isHC ? 'Main Problem':'Main Goal', color:'#06b6d4' },
    { key:'keyFindings', emoji:'🔍', title:'Key Findings', color:'#818cf8' },
    { key: isHC?'medicines':'actionItems', emoji: isHC?'💊':'📌', title: isHC?'Medicines':'Action Items', color:'#f472b6' },
    { key:'doList', emoji:'✅', title:'What To Do', color:'#34d399' },
    { key:'followUp', emoji:'📅', title:'Follow-Up', color:'#f59e0b' },
    { key:'redFlags', emoji:'🚨', title:'Warning Signs', color:'#f87171' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', backdropFilter:'blur(12px)', overflowY:'auto', padding:'20px 16px' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#0b0f1a', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, width:'100%', maxWidth:760, boxShadow:'0 40px 100px rgba(0,0,0,.7)', marginBottom:24 }}>
        {/* Modal Header */}
        <div style={{ padding:'24px 28px 0', borderBottom:'1px solid rgba(255,255,255,.06)', paddingBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}` }} />
                <span style={{ fontSize:'.7rem', fontFamily:'JetBrains Mono', letterSpacing:'.1em', color, fontWeight:600, textTransform:'uppercase' }}>{session.domain}</span>
              </div>
              <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f9fafb', marginBottom:4 }}>{session.department.replace(/_/g,' ')}</h2>
              <p style={{ fontSize:'.78rem', color:'#6b7280', fontFamily:'JetBrains Mono' }}>
                {new Date(session.createdAt).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.04)', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:'24px 28px' }}>
          {/* Smart Summary Section */}
          {session.smartSummary && (
            <div style={{ marginBottom:28 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <h3 style={{ fontSize:'.8rem', fontFamily:'JetBrains Mono', letterSpacing:'.1em', textTransform:'uppercase', color:'#6366f1', fontWeight:700 }}>📋 Smart Summary</h3>
                <div style={{ display:'flex', gap:4 }}>
                  {(['english','hindi','kannada'] as const).map(l => (
                    <button key={l} onClick={() => setLang(l)}
                      style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${lang===l?'rgba(99,102,241,.5)':'rgba(255,255,255,.06)'}`, background:lang===l?'rgba(99,102,241,.12)':'transparent', color:lang===l?'#818cf8':'#4b5563', fontSize:'.7rem', fontFamily:'JetBrains Mono', cursor:'pointer', transition:'all .15s' }}>
                      {l === 'english' ? 'EN' : l === 'hindi' ? 'हि' : 'ಕ'}
                    </button>
                  ))}
                </div>
              </div>

              <AudioSummaryPlayer session={session} lang={lang} />

              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:14 }}>
                {sectionCards.map(({ key, emoji, title, color: c }) => {
                  const val = s?.[key]
                  if (!val || (Array.isArray(val) && val.length === 0)) return null
                  return (
                    <div key={key} style={{ background:`${c}08`, border:`1px solid ${c}20`, borderLeft:`3px solid ${c}`, borderRadius:10, padding:'12px 14px' }}>
                      <p style={{ fontSize:'.7rem', fontFamily:'JetBrains Mono', fontWeight:700, color:c, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>{emoji} {title}</p>
                      {Array.isArray(val) ? (
                        <ul style={{ paddingLeft:14, margin:0 }}>
                          {val.map((item: string, i: number) => <li key={i} style={{ fontSize:'.83rem', color:'#d1d5db', lineHeight:1.65, marginBottom:3 }}>{item}</li>)}
                        </ul>
                      ) : (
                        <p style={{ fontSize:'.83rem', color:'#d1d5db', lineHeight:1.65, margin:0 }}>{val}</p>
                      )}
                    </div>
                  )
                })}
                {s?.encouragement && (
                  <div style={{ background:'linear-gradient(135deg,rgba(52,211,153,.06),rgba(99,102,241,.06))', border:'1px solid rgba(52,211,153,.2)', borderRadius:10, padding:'12px 14px', display:'flex', gap:10 }}>
                    <span style={{ fontSize:20 }}>💚</span>
                    <p style={{ fontSize:'.83rem', color:'#6ee7b7', lineHeight:1.65, margin:0, fontStyle:'italic' }}>"{s.encouragement}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Report Section */}
          {session.finalReport && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h3 style={{ fontSize:'.8rem', fontFamily:'JetBrains Mono', letterSpacing:'.1em', textTransform:'uppercase', color:'#f59e0b', fontWeight:700 }}>📄 Full Report</h3>
                <div style={{ display:'flex', gap:8 }}>
                  {(['ENGLISH','HINDI','KANNADA'] as const).map(l => (
                    <button key={l} onClick={() => translateReport(l)}
                      style={{ padding:'3px 10px', borderRadius:7, border:`1px solid ${reportLang===l?'rgba(245,158,11,.5)':'rgba(255,255,255,.06)'}`, background:reportLang===l?'rgba(245,158,11,.12)':'transparent', color:reportLang===l?'#f59e0b':'#4b5563', fontSize:'.68rem', fontFamily:'JetBrains Mono', cursor:'pointer', transition:'all .15s' }}>
                      {l === 'ENGLISH' ? 'EN' : l === 'HINDI' ? 'हि' : 'ಕ'}
                    </button>
                  ))}
                  <button onClick={downloadPDF} disabled={downloading}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 12px', borderRadius:7, border:'1px solid rgba(99,102,241,.3)', background:'rgba(99,102,241,.08)', color:'#818cf8', fontSize:'.68rem', fontFamily:'JetBrains Mono', cursor:'pointer' }}>
                    {downloading ? <Spinner size={10} color="#818cf8" /> : '⬇'} PDF
                  </button>
                </div>
              </div>
              {translating ? (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'20px', justifyContent:'center', color:'#6b7280', fontSize:'.8rem', fontFamily:'JetBrains Mono' }}>
                  <Spinner size={14} color="#6b7280" /> Translating report...
                </div>
              ) : (
                <div id="patient-report-content" style={{ maxHeight:400, overflowY:'auto', padding:20, background:'#080d16', borderRadius:12, border:'1px solid rgba(255,255,255,.06)' }}>
                  <div dangerouslySetInnerHTML={{ __html: translatedReport || session.finalReport }} />
                </div>
              )}
            </div>
          )}

          {!session.finalReport && !session.smartSummary && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#4b5563', fontFamily:'JetBrains Mono', fontSize:'.8rem' }}>
              <p style={{ fontSize:24, marginBottom:10 }}>⏳</p>
              Your report is being prepared by your doctor.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const router = useRouter()
  const [person, setPerson] = useState<any>(null)
  const [sessions, setSessions] = useState<PatientSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedSession, setSelectedSession] = useState<PatientSession | null>(null)
  const [allMeds, setAllMeds] = useState<Medication[]>([])
  const [allFinRem, setAllFinRem] = useState<FinReminder[]>([])
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/patient/dashboard')
      if (!res.ok) { router.push('/patient'); return }
      const data = await res.json()
      setPerson(data.person)
      setSessions(data.sessions || [])
      const meds: Medication[] = []
      const fins: FinReminder[] = []
      for (const s of (data.sessions || [])) {
        const ed = s.extractedData || {}
        if (ed.medicationSchedules) meds.push(...ed.medicationSchedules)
        if (ed.financeReminders) fins.push(...ed.financeReminders)
      }
      setAllMeds(meds)
      setAllFinRem(fins)
    } catch { router.push('/patient') }
    finally { setLoading(false) }
  }

  const logout = async () => {
    setLoggingOut(true)
    await fetch('/api/patient/logout', { method:'POST' })
    router.push('/patient')
  }

  const completed = sessions.filter(s => s.status === 'COMPLETED').length
  const approved = sessions.filter(s => s.approved).length
  const activeMeds = allMeds.filter(m => {
    const today = new Date().toISOString().split('T')[0]
    return (!m.startDate || today >= m.startDate) && (!m.endDate || today <= m.endDate)
  })
  const pendingFins = allFinRem.filter(r => !r.fired)
  const hcSessions = sessions.filter(s => s.domain === 'HEALTHCARE')
  const finSessions = sessions.filter(s => s.domain === 'FINANCE')

  const tabs: { id: TabId; label: string; icon: string; badge?: number }[] = [
    { id:'overview', label:'Overview', icon:'🏠' },
    { id:'reports', label:'Reports', icon:'📄', badge: sessions.filter(s=>s.finalReport).length },
    { id:'meds', label: hcSessions.length > finSessions.length ? 'Medications' : 'Investments', icon: hcSessions.length > finSessions.length ? '💊':'📈', badge: hcSessions.length > finSessions.length ? activeMeds.length : pendingFins.length },
    { id:'timeline', label:'Timeline', icon:'📅', badge: sessions.length },
  ]

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <Spinner size={36} color="#6366f1" />
      <p style={{ color:'#6b7280', fontFamily:'JetBrains Mono', fontSize:'.8rem' }}>Loading your dashboard...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#030712;font-family:'Sora',sans-serif;color:#d1d5db;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes blobMove{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-30px) scale(1.05)}}
        .tab-item{display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;border:none;background:transparent;color:#6b7280;font-size:.82rem;font-family:'Sora',sans-serif;font-weight:500;cursor:pointer;transition:all .2s;position:relative;}
        .tab-item:hover{color:#d1d5db;background:rgba(255,255,255,.04);}
        .tab-item.active{background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.2);}
        .tab-badge{font-size:.6rem;padding:1px 6px;borderRadius:10px;background:rgba(99,102,241,.15);color:#818cf8;font-family:'JetBrains Mono';border:1px solid rgba(99,102,241,.2);}
        .section-label{font-size:.7rem;font-family:'JetBrains Mono';letter-spacing:.12em;text-transform:uppercase;color:#4b5563;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
        .section-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(99,102,241,.15),transparent);}
      `}</style>

      {/* Background */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', filter:'blur(140px)', opacity:.04, background:'radial-gradient(#6366f1,transparent 70%)', top:-200, left:-200, animation:'blobMove 18s ease-in-out infinite' }} />
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', filter:'blur(120px)', opacity:.03, background:'radial-gradient(#06b6d4,transparent 70%)', bottom:-100, right:-100, animation:'blobMove 22s ease-in-out infinite reverse' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(99,102,241,.028) 1px,transparent 1px)', backgroundSize:'30px 30px' }} />
      </div>

      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(3,7,18,.92)', borderBottom:'1px solid rgba(255,255,255,.05)', backdropFilter:'blur(20px)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 20px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 18px rgba(99,102,241,.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p style={{ fontSize:'.9rem', fontWeight:700, color:'#f9fafb', lineHeight:1.2 }}>{person?.name || 'My Dashboard'}</p>
              <p style={{ fontSize:'.65rem', color:'#4b5563', fontFamily:'JetBrains Mono' }}>{person?.phone}</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.15)', borderRadius:6 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#34d399', display:'inline-block', animation:'pulse 2s infinite' }} />
              <span style={{ fontSize:'.62rem', color:'#34d399', fontFamily:'JetBrains Mono' }}>Health Portal</span>
            </div>
            <button onClick={logout} disabled={loggingOut} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.03)', color:'#6b7280', fontSize:'.78rem', cursor:'pointer', fontFamily:'Sora', transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(239,68,68,.3)'; e.currentTarget.style.color='#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.06)'; e.currentTarget.style.color='#6b7280' }}>
              {loggingOut ? <Spinner size={12} color="#6b7280" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div style={{ position:'sticky', top:58, zIndex:40, background:'rgba(3,7,18,.88)', borderBottom:'1px solid rgba(255,255,255,.04)', backdropFilter:'blur(16px)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'8px 16px', display:'flex', gap:4 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-item ${activeTab===tab.id?'active':''}`}>
              <span>{tab.icon}</span> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main style={{ position:'relative', zIndex:1, maxWidth:900, margin:'0 auto', padding:'24px 20px 48px', animation:'fadeUp .5s ease' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div>
            {/* Welcome */}
            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontSize:'1.6rem', fontWeight:800, color:'#f9fafb', letterSpacing:'-.02em', marginBottom:6 }}>
                Welcome back, {person?.name?.split(' ')[0] || 'there'} 👋
              </h1>
              <p style={{ color:'#6b7280', fontSize:'.88rem' }}>Here's a summary of your health journey</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:32 }}>
              <StatCard icon="📋" label="Total Sessions" value={sessions.length} color="#6366f1" />
              <StatCard icon="✅" label="Completed" value={completed} color="#34d399" />
              <StatCard icon="🏆" label="Approved" value={approved} color="#f59e0b" />
              <StatCard icon="💊" label="Active Meds" value={activeMeds.length} color="#f472b6" sub={pendingFins.length > 0 ? `${pendingFins.length} invest. reminders` : undefined} />
            </div>

            {/* Recent Sessions */}
            <div style={{ marginBottom:28 }}>
              <div className="section-label">Recent Consultations</div>
              {sessions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#4b5563', fontFamily:'JetBrains Mono', fontSize:'.8rem' }}>
                  <p style={{ fontSize:24, marginBottom:8 }}>🏥</p>
                  No sessions yet
                </div>
              ) : (
                <div style={{ display:'grid', gap:12 }}>
                  {sessions.slice(0,3).map(s => (
                    <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} isHC={s.domain==='HEALTHCARE'} />
                  ))}
                  {sessions.length > 3 && (
                    <button onClick={() => setActiveTab('reports')} style={{ padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,.06)', background:'transparent', color:'#6b7280', fontSize:'.8rem', cursor:'pointer', fontFamily:'Sora', transition:'all .2s' }}
                      onMouseEnter={e => e.currentTarget.style.color='#d1d5db'} onMouseLeave={e => e.currentTarget.style.color='#6b7280'}>
                      View all {sessions.length} sessions →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Active Medications Preview */}
            {activeMeds.length > 0 && (
              <div>
                <div className="section-label">Today's Medications</div>
                <div style={{ display:'grid', gap:10 }}>
                  {activeMeds.slice(0,2).map(m => <MedCard key={m.id} med={m} />)}
                  {activeMeds.length > 2 && (
                    <button onClick={() => setActiveTab('meds')} style={{ padding:'10px', borderRadius:10, border:'1px solid rgba(255,255,255,.06)', background:'transparent', color:'#6b7280', fontSize:'.8rem', cursor:'pointer', fontFamily:'Sora' }}>
                      View all {activeMeds.length} medications →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f9fafb', marginBottom:4 }}>Your Reports</h2>
              <p style={{ color:'#6b7280', fontSize:'.82rem' }}>Tap any session to view your full report, audio summary, and download PDF</p>
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px', color:'#4b5563' }}>No reports yet</div>
            ) : (
              <div style={{ display:'grid', gap:12 }}>
                {sessions.map(s => (
                  <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} isHC={s.domain==='HEALTHCARE'} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MEDICATIONS / INVESTMENTS TAB ── */}
        {activeTab === 'meds' && (
          <div>
            {hcSessions.length >= finSessions.length ? (
              <>
                <div style={{ marginBottom:20 }}>
                  <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f9fafb', marginBottom:4 }}>Your Medications</h2>
                  <p style={{ color:'#6b7280', fontSize:'.82rem' }}>Track all your prescribed medications and reminder schedules</p>
                </div>
                {activeMeds.length === 0 && allMeds.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px', color:'#4b5563', fontFamily:'JetBrains Mono', fontSize:'.8rem' }}>
                    <p style={{ fontSize:24, marginBottom:8 }}>💊</p>
                    No medications prescribed yet
                  </div>
                ) : (
                  <>
                    {activeMeds.length > 0 && (
                      <>
                        <div className="section-label">Active Now</div>
                        <div style={{ display:'grid', gap:10, marginBottom:20 }}>
                          {activeMeds.map(m => <MedCard key={m.id} med={m} />)}
                        </div>
                      </>
                    )}
                    {allMeds.filter(m => {
                      const today = new Date().toISOString().split('T')[0]
                      return m.endDate && today > m.endDate
                    }).length > 0 && (
                      <>
                        <div className="section-label">Past Medications</div>
                        <div style={{ display:'grid', gap:10 }}>
                          {allMeds.filter(m => { const today = new Date().toISOString().split('T')[0]; return m.endDate && today > m.endDate }).map(m => <MedCard key={m.id} med={m} />)}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom:20 }}>
                  <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f9fafb', marginBottom:4 }}>Investment Reminders</h2>
                  <p style={{ color:'#6b7280', fontSize:'.82rem' }}>Your scheduled investment actions and advisor reminders</p>
                </div>
                {allFinRem.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px', color:'#4b5563', fontFamily:'JetBrains Mono', fontSize:'.8rem' }}>
                    <p style={{ fontSize:24, marginBottom:8 }}>📈</p>
                    No investment reminders yet
                  </div>
                ) : (
                  <div style={{ display:'grid', gap:12 }}>
                    {allFinRem.map(rem => (
                      <div key={rem.id} style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${rem.fired?'rgba(52,211,153,.2)':'rgba(251,191,36,.2)'}`, borderLeft:`3px solid ${rem.fired?'#34d399':'#fbbf24'}`, borderRadius:14, padding:'16px 18px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div>
                            <p style={{ fontWeight:700, color:'#f9fafb', fontSize:'.9rem', marginBottom:2 }}>📈 {rem.title}</p>
                            {rem.stockName && <p style={{ fontSize:'.72rem', fontFamily:'JetBrains Mono', color:'#fbbf24' }}>{rem.stockName}</p>}
                          </div>
                          <span style={{ fontSize:'.65rem', padding:'3px 8px', borderRadius:6, background:rem.fired?'rgba(52,211,153,.08)':'rgba(251,191,36,.08)', color:rem.fired?'#34d399':'#fbbf24', fontFamily:'JetBrains Mono', border:`1px solid ${rem.fired?'rgba(52,211,153,.2)':'rgba(251,191,36,.2)'}` }}>
                            {rem.fired ? '✓ DONE' : '⏳ PENDING'}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                          {rem.quantity && <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>Qty: <strong style={{ color:'#f9fafb' }}>{rem.quantity}</strong></span>}
                          {rem.buyPrice && <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>Price: <strong style={{ color:'#34d399' }}>{rem.buyPrice}</strong></span>}
                          {rem.buyDate && <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>By: <strong style={{ color:'#f9fafb' }}>{rem.buyDate}</strong></span>}
                          {rem.callDate && <span style={{ fontSize:'.72rem', color:'#818cf8' }}>📞 {rem.callDate} {rem.callTime}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f9fafb', marginBottom:4 }}>Your Health Timeline</h2>
              <p style={{ color:'#6b7280', fontSize:'.82rem' }}>Chronological view of all your consultations</p>
            </div>
            {sessions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px', color:'#4b5563' }}>No history yet</div>
            ) : (
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:20, top:0, bottom:0, width:2, background:'linear-gradient(to bottom, rgba(99,102,241,.3), transparent)' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {sessions.map((s, i) => {
                    const color = s.domain==='HEALTHCARE' ? '#06b6d4' : '#34d399'
                    const date = new Date(s.createdAt)
                    return (
                      <div key={s.id} style={{ display:'flex', gap:16, paddingBottom:24, paddingLeft:0, animation:`fadeUp .4s ease both`, animationDelay:`${i*60}ms` }}>
                        {/* Timeline dot */}
                        <div style={{ position:'relative', zIndex:1, flexShrink:0 }}>
                          <div style={{ width:40, height:40, borderRadius:12, background:`${color}15`, border:`2px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 12px ${color}22` }}>
                            <span style={{ fontSize:16 }}>{s.domain==='HEALTHCARE'?'🏥':'💰'}</span>
                          </div>
                        </div>
                        {/* Content */}
                        <div style={{ flex:1 }} onClick={() => setSelectedSession(s)}>
                          <div style={{ background:'rgba(255,255,255,.025)', border:`1px solid ${color}18`, borderRadius:14, padding:'14px 16px', cursor:'pointer', transition:'all .2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor=`${color}44`; e.currentTarget.style.transform='translateX(2px)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor=`${color}18`; e.currentTarget.style.transform='none' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                              <div>
                                <p style={{ fontWeight:700, color:'#f9fafb', fontSize:'.88rem' }}>{s.department.replace(/_/g,' ')}</p>
                                <p style={{ fontSize:'.68rem', color:'#6b7280', fontFamily:'JetBrains Mono', marginTop:2 }}>
                                  {date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })} · {date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                                </p>
                              </div>
                              <div style={{ display:'flex', gap:6 }}>
                                {s.approved && <Badge label="✓ DONE" color="#34d399" bg="rgba(52,211,153,.08)" border="rgba(52,211,153,.2)" />}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                              {s.finalReport && <span style={{ fontSize:'.65rem', padding:'2px 7px', borderRadius:5, background:'rgba(99,102,241,.08)', color:'#818cf8', fontFamily:'JetBrains Mono' }}>📄 Report</span>}
                              {s.smartSummary && <span style={{ fontSize:'.65rem', padding:'2px 7px', borderRadius:5, background:'rgba(52,211,153,.08)', color:'#34d399', fontFamily:'JetBrains Mono' }}>🔊 Audio</span>}
                              {(s.extractedData?.medicationSchedules?.length > 0) && <span style={{ fontSize:'.65rem', padding:'2px 7px', borderRadius:5, background:'rgba(244,114,182,.08)', color:'#f472b6', fontFamily:'JetBrains Mono' }}>💊 Meds</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Session Modal */}
      {selectedSession && <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </>
  )
}