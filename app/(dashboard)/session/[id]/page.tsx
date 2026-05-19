// app/(dashboard)/session/[id]/page.tsx
// FIXED: 1) Message edit re-translates to all languages, 2) Re-extracts entities after edit, 3) Visual report editor

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, Download, Check, Send, Sparkles, User, Stethoscope,
  Loader2, Mic, MicOff, Volume2, ChevronRight,
  Activity, Clock, Zap, Brain, X, ChevronDown, ChevronUp,
  Pencil, CheckCheck, Bold, Italic, List, AlignLeft, Type,
  Underline, Link, Minus, Plus,
  MessageCircle, Calendar, Pill, Phone, BookOpen
} from 'lucide-react'
import { useSessionPolling } from '@/lib/hooks/useSessionPolling'
import { generatePDFClient } from '@/lib/pdf/client-generator'


// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  speaker: 'doctor' | 'patient'
  originalText: string
  translations: { ENGLISH: string; HINDI: string; KANNADA: string }
  timestamp: Date
}

type LangKey = 'ENGLISH' | 'HINDI' | 'KANNADA'
const LANG_LABELS: Record<LangKey, string> = { ENGLISH: 'EN', HINDI: 'हि', KANNADA: 'ಕ' }
const LANG_CODES: Record<LangKey, string> = { ENGLISH: 'en-IN', HINDI: 'hi-IN', KANNADA: 'kn-IN' }

const ENTITY_COLORS: Record<string, string> = {
  symptoms: '#60A5FA', medications: '#F472B6', diseases: '#34D399',
  procedures: '#FBBF24', bodyParts: '#A78BFA', severity: '#F87171',
  duration: '#6EE7B7', frequency: '#FCD34D',
  income: '#34D399', expenses: '#F87171', investments: '#60A5FA',
  taxes: '#FBBF24', loans: '#F472B6', insurance: '#A78BFA',
  goals: '#6EE7B7', amounts: '#FCD34D', timeframes: '#93C5FD', taxSections: '#86EFAC',
}

// ─── Medication helpers ────────────────────────────────────────────────────────
function EMPTY_MED() {
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: '', dosage: '', frequency: 'once_daily',
    startDate: '', endDate: '',
    timing: {
      morning:   { enabled: false, time: '08:00' },
      afternoon: { enabled: false, time: '13:00' },
      night:     { enabled: true,  time: '21:00' },
    },
    notes: '',
  }
}

const TIMING_META: Record<string, { label: string; emoji: string; color: string; activeCls: string; bg: string }> = {
  morning:   { label:'Morning',   emoji:'🌅', color:'#F59E0B', activeCls:'timing-morning',   bg:'#1A1200' },
  afternoon: { label:'Afternoon', emoji:'☀️', color:'#00D4FF', activeCls:'timing-afternoon', bg:'#001824' },
  night:     { label:'Night',     emoji:'🌙', color:'#A78BFA', activeCls:'timing-night',     bg:'#0F0A1A' },
}

const FREQ_OPTIONS = [
  { value:'once_daily',   label:'Once daily'         },
  { value:'twice_daily',  label:'Twice daily'        },
  { value:'thrice_daily', label:'Three times daily'  },
  { value:'every_4h',     label:'Every 4 hours'      },
  { value:'every_6h',     label:'Every 6 hours'      },
  { value:'every_8h',     label:'Every 8 hours'      },
  { value:'weekly',       label:'Weekly'             },
  { value:'as_needed',    label:'As needed (SOS)'    },
]

// ─── Visual Report Editor Component ───────────────────────────────────────────
function VisualReportEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'visual' | 'html'>('visual')
  const [htmlDraft, setHtmlDraft] = useState(value)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value
      isInitialized.current = true
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'html') {
      if (editorRef.current) {
        setHtmlDraft(editorRef.current.innerHTML)
      }
    } else {
      if (editorRef.current && htmlDraft !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = htmlDraft
        onChange(htmlDraft)
      }
    }
  }, [viewMode])

  const updateFormats = () => {
    const fmts = new Set<string>()
    if (document.queryCommandState('bold')) fmts.add('bold')
    if (document.queryCommandState('italic')) fmts.add('italic')
    if (document.queryCommandState('underline')) fmts.add('underline')
    setActiveFormats(fmts)
  }

  const execCmd = (cmd: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand(cmd, false, value)
      updateFormats()
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertList = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const li = document.createElement('li')
        li.textContent = 'New item'
        const ul = document.createElement('ul')
        ul.appendChild(li)
        range.insertNode(ul)
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const insertHR = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid #2A2A2A;margin:12px 0;"/>')
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleFontSize = (delta: number) => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    if (range.collapsed) return
    const span = document.createElement('span')
    const currentSize = parseFloat(window.getComputedStyle(range.commonAncestorContainer.parentElement || document.body).fontSize) || 14
    span.style.fontSize = `${Math.max(9, Math.min(32, currentSize + delta * 2))}px`
    range.surroundContents(span)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const toolbarButtons = [
    { icon: Bold,      cmd: 'bold',      title: 'Bold',      fmt: 'bold' },
    { icon: Italic,    cmd: 'italic',    title: 'Italic',    fmt: 'italic' },
    { icon: Underline, cmd: 'underline', title: 'Underline', fmt: 'underline' },
  ]

  return (
    <div style={{ border: '1px solid #242424', borderRadius: 10, overflow: 'hidden', background: '#0A0A0A' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 12px', background: '#111', borderBottom: '1px solid #1E1E1E',
        flexWrap: 'wrap'
      }}>
        {/* Format buttons */}
        {toolbarButtons.map(({ icon: Icon, cmd, title, fmt }) => (
          <button
            key={cmd}
            onMouseDown={e => { e.preventDefault(); execCmd(cmd) }}
            title={title}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: `1px solid ${activeFormats.has(fmt) ? '#00D4FF44' : '#2A2A2A'}`,
              background: activeFormats.has(fmt) ? '#001824' : 'transparent',
              color: activeFormats.has(fmt) ? '#00D4FF' : '#666',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            <Icon size={13} />
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: '#2A2A2A', margin: '0 4px' }} />

        {/* Heading buttons */}
        {['H2', 'H3', 'P'].map(tag => (
          <button
            key={tag}
            onMouseDown={e => {
              e.preventDefault()
              if (tag === 'P') execCmd('formatBlock', 'p')
              else execCmd('formatBlock', tag.toLowerCase())
            }}
            title={tag === 'P' ? 'Paragraph' : `Heading ${tag[1]}`}
            style={{
              height: 28, padding: '0 8px', borderRadius: 6,
              border: '1px solid #2A2A2A', background: 'transparent',
              color: '#666', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#CCC'; e.currentTarget.style.borderColor = '#3A3A3A' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#2A2A2A' }}
          >
            {tag}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: '#2A2A2A', margin: '0 4px' }} />

        {/* List & HR */}
        <button
          onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }}
          title="Bullet List"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#CCC' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
        >
          <List size={13} />
        </button>

        <button
          onMouseDown={e => { e.preventDefault(); insertHR() }}
          title="Horizontal Rule"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#CCC' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
        >
          <Minus size={13} />
        </button>

        <div style={{ width: 1, height: 20, background: '#2A2A2A', margin: '0 4px' }} />

        {/* Font size */}
        <button
          onMouseDown={e => { e.preventDefault(); handleFontSize(-1) }}
          title="Decrease font size"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Minus size={11} />
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); handleFontSize(1) }}
          title="Increase font size"
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Plus size={11} />
        </button>

        <div style={{ flex: 1 }} />

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 2, background: '#0D0D0D', borderRadius: 7, border: '1px solid #1A1A1A' }}>
          {(['visual', 'html'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '3px 10px', borderRadius: 5, border: 'none',
                background: viewMode === mode ? '#1A1A1A' : 'transparent',
                color: viewMode === mode ? '#E8E8E8' : '#444',
                fontSize: 10, fontFamily: 'IBM Plex Mono, monospace',
                cursor: 'pointer', transition: 'all .15s',
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      {viewMode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
          onKeyUp={updateFormats}
          onMouseUp={updateFormats}
          style={{
            minHeight: 320, maxHeight: 520, overflowY: 'auto',
            padding: '20px 24px',
            color: '#CCC', fontSize: 13, lineHeight: 1.75,
            fontFamily: 'Georgia, serif', outline: 'none',
            background: '#0A0A0A',
          }}
        />
      ) : (
        <textarea
          value={htmlDraft}
          onChange={e => { setHtmlDraft(e.target.value); onChange(e.target.value) }}
          style={{
            width: '100%', minHeight: 320, maxHeight: 520,
            background: '#0A0A0A', border: 'none', outline: 'none',
            color: '#9CA3AF', fontSize: 12, lineHeight: 1.8,
            fontFamily: 'IBM Plex Mono, monospace',
            padding: '20px 24px', resize: 'vertical', display: 'block',
          }}
          spellCheck={false}
        />
      )}

      {/* Action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A',
      }}>
        <span style={{ fontSize: 10, color: '#444', fontFamily: 'IBM Plex Mono, monospace' }}>
          {viewMode === 'visual' ? '✎ Click anywhere in the report to edit text' : '◈ Editing raw HTML'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, border: '1px solid #00F5A044', background: '#0A1D0F', color: '#00F5A0', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
            {saving ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <CheckCheck style={{ width: 12, height: 12 }} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SessionPage() {
  const params    = useParams()
  const router    = useRouter()
  const sessionId = params.id as string

  // ── Core state ──────────────────────────────────────────────────────────────
  const [session, setSession]                   = useState<any>(null)
  const [messages, setMessages]                 = useState<Message[]>([])
  const [extractedData, setExtractedData]       = useState<any>({})
  const [nerEntities, setNerEntities]           = useState<any>({})
  const [report, setReport]                     = useState('')
  const [exports, setExports]                   = useState<any[]>([])

  // ── Language ─────────────────────────────────────────────────────────────────
  const [messageDisplayLang, setMessageDisplayLang] = useState<Record<string, LangKey>>({})
  const [displayLanguage, setDisplayLanguage]   = useState<LangKey>('ENGLISH')
  const [doctorLanguage, setDoctorLanguage]     = useState<LangKey>('ENGLISH')
  const [patientLanguage, setPatientLanguage]   = useState<LangKey>('HINDI')

  // ── Recording ─────────────────────────────────────────────────────────────
  const [isDoctorRecording, setIsDoctorRecording]   = useState(false)
  const [isPatientRecording, setIsPatientRecording] = useState(false)
  const [isProcessing, setIsProcessing]             = useState(false)

  // ── TTS ───────────────────────────────────────────────────────────────────
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)
  const [playingLang, setPlayingLang]           = useState<string | null>(null)
  const [ttsError, setTtsError]                 = useState<string | null>(null)

  // ── AI suggestions ────────────────────────────────────────────────────────
  const [aiQuestions, setAiQuestions]           = useState<string[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [manualQuestion, setManualQuestion]     = useState('')
  const [sendingMessage, setSendingMessage]     = useState(false)
  const [pastSessionContext, setPastSessionContext] = useState<any>(null)

  // ── Conversation end gate ─────────────────────────────────────────────────
  const [conversationEnded, setConversationEnded] = useState(false)

  // ── Report ────────────────────────────────────────────────────────────────
  const [generating, setGenerating]             = useState(false)
  const [exporting, setExporting]               = useState(false)
  const [downloading, setDownloading]           = useState(false)
  const [activeTab, setActiveTab]               = useState<'entities' | 'data'>('entities')
  const [sessionTab, setSessionTab]             = useState<'chat' | 'schedule' | 'report'>('chat')
  const [reportExpanded, setReportExpanded]     = useState(false)
  const [reportEditMode, setReportEditMode]     = useState<'view' | 'edit'>('view')
  const [reportHtmlDraft, setReportHtmlDraft]   = useState('')
  const [savingReport, setSavingReport]         = useState(false)

  // ── PDF Language Picker ──────────────────────────────────────────────────
  const [showPdfLangPicker, setShowPdfLangPicker] = useState(false)
  const [pdfLangPickerFor, setPdfLangPickerFor]   = useState<'download' | 'export' | 'whatsapp'>('download')
  const [translatingReport, setTranslatingReport] = useState(false)
  const [sendingWhatsapp, setSendingWhatsapp]     = useState(false)

  // ── Patient Summary ─────────────────────────────────────────────────────
  const [showSummary, setShowSummary]             = useState(false)
  const [summary, setSummary]                     = useState<any>(null)
  const [summaryLang, setSummaryLang]             = useState<LangKey>('ENGLISH')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [summaryTtsId, setSummaryTtsId]           = useState<string | null>(null)

  // ── Message editing ───────────────────────────────────────────────────────
  const [editingMsgId, setEditingMsgId]         = useState<string | null>(null)
  const [editingMsgLang, setEditingMsgLang]     = useState<LangKey>('ENGLISH')
  const [editingMsgText, setEditingMsgText]     = useState('')
  const [savingMsgEdit, setSavingMsgEdit]       = useState(false)
  const [translatingMsg, setTranslatingMsg]     = useState(false)

  // ── Appointment ───────────────────────────────────────────────────────────
  const [showScheduler, setShowScheduler]       = useState(false)
  const [apptDate, setApptDate]                 = useState('')
  const [apptTime, setApptTime]                 = useState('')
  const [apptNotes, setApptNotes]               = useState('')
  const [customCallMsg, setCustomCallMsg]       = useState('')
  const [scheduling, setScheduling]             = useState(false)
  const [apptSuccess, setApptSuccess]           = useState<string | null>(null)
  const [appointments, setAppointments]         = useState<any[]>([])
  const [callMode, setCallMode]                 = useState<'now' | 'schedule'>('schedule')

  // ── Medication ────────────────────────────────────────────────────────────
  const [medications, setMedications]           = useState<any[]>([])
  const [showMedForm, setShowMedForm]           = useState(false)
  const [newMed, setNewMed]                     = useState(EMPTY_MED())
  const [editingMedId, setEditingMedId]         = useState<string | null>(null)
  const [savingMed, setSavingMed]               = useState(false)
  const [callingMed, setCallingMed]             = useState<string | null>(null)

  // ── Finance Investment Reminders ──────────────────────────────────────────
  const [finReminders, setFinReminders]         = useState<any[]>([])
  const [showFinForm, setShowFinForm]           = useState(false)
  const [editingFinId, setEditingFinId]         = useState<string | null>(null)
  const [savingFin, setSavingFin]               = useState(false)
  const [newFin, setNewFin]                     = useState({ id: '', title: '', stockName: '', quantity: '', buyPrice: '', buyDate: '', callDate: '', callTime: '', customMessage: '', notes: '' })

  // ── Refs ──────────────────────────────────────────────────────────────────
  const doctorRecorderRef  = useRef<MediaRecorder | null>(null)
  const patientRecorderRef = useRef<MediaRecorder | null>(null)
  const doctorChunksRef    = useRef<Blob[]>([])
  const patientChunksRef   = useRef<Blob[]>([])
  const audioRef           = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef     = useRef<HTMLDivElement>(null)
  const messagesRef        = useRef<Message[]>([])

  // Keep ref in sync with state for use inside callbacks
  useEffect(() => { messagesRef.current = messages }, [messages])

  const { data: sessionData } = useSessionPolling(sessionId, 5000)

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { loadSession() }, [])

  useEffect(() => {
    if (sessionData) {
      if (sessionData.extractedData) setExtractedData(sessionData.extractedData)
      if (sessionData.nerEntities)   setNerEntities(sessionData.nerEntities)
      if (sessionData.finalReport)   setReport(sessionData.finalReport)
    }
  }, [sessionData])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadSession = async () => {
    try {
      const res  = await fetch(`/api/session/${sessionId}`)
      const data = await res.json()
      // Redirect SINGLE mode sessions to the single-language page
      if (data.sessionMode === 'SINGLE') {
        router.replace(`/session/${data.id}/single`)
        return
      }
      setSession(data)
      if (data.interactions?.length > 0) {
        setMessages(data.interactions.map((i: any) => ({
          id: i.id, speaker: i.speaker, originalText: i.text,
          translations: {
            ENGLISH: i.translated  || i.text,
            HINDI:   i.hindiText   || i.text,
            KANNADA: i.kannadaText || i.text,
          },
          timestamp: new Date(i.timestamp),
        })))
      }
      setExtractedData(data.extractedData || {})
      setNerEntities(data.nerEntities     || {})
      setReport(data.finalReport          || '')
      if (data.status === 'COMPLETED') setConversationEnded(true)

      // Fetch past session context for this patient/client
      try {
        const pastRes = await fetch('/api/ai/past-sessions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: data.personId, domain: data.domain, department: data.department, currentSessionId: sessionId })
        })
        if (pastRes.ok) {
          const { pastContext } = await pastRes.json()
          setPastSessionContext(pastContext)
        }
      } catch {}

      if (!data.interactions || data.interactions.length === 0) {
        generateAIQuestions('', data.domain, data.department)
      }
    } catch (err) { console.error('Failed to load session:', err) }

    await loadExports()
    await loadMeds()

    try {
      const r = await fetch(`/api/twilio/appointments?sessionId=${sessionId}`)
      if (r.ok) { const d = await r.json(); setAppointments(d.appointments || []) }
    } catch {}
    await loadFinReminders()
  }

  const loadFinReminders = async () => {
    try {
      const r = await fetch(`/api/finance-reminders/${sessionId}`)
      if (r.ok) { const d = await r.json(); setFinReminders(d.reminders || []) }
    } catch {}
  }

  const loadExports = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/exports`)
      if (res.ok) { const { exports: exp } = await res.json(); setExports(exp || []) }
    } catch {}
  }

  const loadMeds = async () => {
    try {
      const r = await fetch(`/api/medications/${sessionId}`)
      if (r.ok) { const d = await r.json(); setMedications(d.medications || []) }
    } catch {}
  }

  // ── Language helpers ──────────────────────────────────────────────────────
  const getMsgLang = (id: string): LangKey => messageDisplayLang[id] || displayLanguage
  const setMsgLang = (id: string, lang: LangKey) =>
    setMessageDisplayLang(prev => ({ ...prev, [id]: lang }))

  // ── FIX 1: Message edit - re-translate to ALL languages ──────────────────
  const startEditMessage = (msg: Message) => {
    const lang = getMsgLang(msg.id)
    setEditingMsgId(msg.id)
    setEditingMsgLang(lang)
    setEditingMsgText(msg.translations[lang] || msg.originalText)
  }

  const cancelEditMessage = () => { setEditingMsgId(null); setEditingMsgText('') }

  const saveEditMessage = async (msgId: string) => {
    setSavingMsgEdit(true)
    setTranslatingMsg(true)
    try {
      // Step 1: Re-translate the edited text to all other languages
      const sourceLangCode = LANG_CODES[editingMsgLang]
      let newTranslations: Record<string, string> = {
        ENGLISH: editingMsgLang === 'ENGLISH' ? editingMsgText : '',
        HINDI:   editingMsgLang === 'HINDI'   ? editingMsgText : '',
        KANNADA: editingMsgLang === 'KANNADA' ? editingMsgText : '',
      }

      // Translate to the other two languages
      const otherLangs = (['ENGLISH', 'HINDI', 'KANNADA'] as LangKey[]).filter(l => l !== editingMsgLang)

      const translationResults = await Promise.allSettled(
        otherLangs.map(async (targetLang) => {
          const res = await fetch('/api/voice/translate-all', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: editingMsgText, sourceLang: sourceLangCode })
          })
          if (res.ok) {
            const { translations } = await res.json()
            return { lang: targetLang, text: translations[targetLang] || editingMsgText }
          }
          return { lang: targetLang, text: editingMsgText }
        })
      )

      // Build full translations from the translate-all response (it returns all 3 at once)
      // Actually translate-all gives us all 3 in one call - use that instead
      const trRes = await fetch('/api/voice/translate-all', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingMsgText, sourceLang: sourceLangCode })
      })
      if (trRes.ok) {
        const { translations } = await trRes.json()
        newTranslations = {
          ENGLISH: translations.ENGLISH || editingMsgText,
          HINDI:   translations.HINDI   || editingMsgText,
          KANNADA: translations.KANNADA || editingMsgText,
        }
        // Keep the edited language's exact text (don't overwrite with round-trip translation)
        newTranslations[editingMsgLang] = editingMsgText
      }

      setTranslatingMsg(false)

      // Step 2: Update local state with ALL translations
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m
        return {
          ...m,
          originalText: editingMsgLang === 'ENGLISH' ? editingMsgText : m.originalText,
          translations: newTranslations as { ENGLISH: string; HINDI: string; KANNADA: string },
        }
      }))

      // Step 3: Persist to server (all 3 languages)
      await fetch(`/api/session/${sessionId}/edit-message`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: msgId,
          lang: editingMsgLang,
          text: editingMsgText,
          allTranslations: newTranslations,
        })
      })

      // FIX 2: Re-extract entities from updated conversation
      const updatedMessages = messagesRef.current.map(m => {
        if (m.id !== msgId) return m
        return { ...m, translations: newTranslations as { ENGLISH: string; HINDI: string; KANNADA: string } }
      })

      const ctx = updatedMessages
        .map(m => `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.translations.ENGLISH}`)
        .join('\n')

      const nerRes = await fetch('/api/ai/extract-entities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ctx,
          useHuggingFace: session?.domain === 'HEALTHCARE',
          domain: session?.domain
        })
      })
      if (nerRes.ok) {
        const { entities } = await nerRes.json()
        setNerEntities(entities)
        await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nerEntities: entities })
        })
      }

    } catch (err) { console.error(err) }
    finally {
      setSavingMsgEdit(false)
      setTranslatingMsg(false)
      setEditingMsgId(null)
      setEditingMsgText('')
    }
  }

  // ── FIX 3: Report edit - visual editor ────────────────────────────────────
  const openReportEdit = () => {
    setReportHtmlDraft(report)
    setReportEditMode('edit')
    setReportExpanded(true)
  }
  const cancelReportEdit = () => { setReportEditMode('view'); setReportHtmlDraft('') }
  const saveReportEdit = async () => {
    setSavingReport(true)
    try {
      setReport(reportHtmlDraft)
      await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalReport: reportHtmlDraft })
      })
      setReportEditMode('view')
      setReportHtmlDraft('')
    } catch (err) { console.error(err) }
    finally { setSavingReport(false) }
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async (
    recorderRef: React.MutableRefObject<MediaRecorder | null>,
    chunksRef: React.MutableRefObject<Blob[]>,
    setRecording: (v: boolean) => void,
    speaker: 'doctor' | 'patient',
    language: LangKey
  ) => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder; chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processVoiceInput(speaker, blob, language)
      }
      recorder.start(); setRecording(true)
    } catch { alert('Microphone access denied') }
  }

  const stopRecording = (
    recorderRef: React.MutableRefObject<MediaRecorder | null>,
    setRecording: (v: boolean) => void,
    isRecording: boolean
  ) => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop(); setRecording(false)
      recorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  const processVoiceInput = async (speaker: 'doctor' | 'patient', audioBlob: Blob, language: LangKey) => {
    setIsProcessing(true)
    try {
      const fd = new FormData(); fd.append('audio', audioBlob); fd.append('language', language)
      const tRes = await fetch('/api/voice/transcribe', { method: 'POST', body: fd })
      if (!tRes.ok) throw new Error('Transcription failed')
      const { transcript } = await tRes.json()
      const langCode = LANG_CODES[language]
      const trRes = await fetch('/api/voice/translate-all', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: transcript, sourceLang: langCode })
      })
      const { translations } = await trRes.json()
      await addMessage(speaker, transcript, translations)
    } catch (err) { console.error(err); alert('Failed to process voice. Please try again.') }
    finally { setIsProcessing(false) }
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  const playTTS = async (messageId: string, text: string, language: LangKey) => {
    if (!text?.trim()) return
    setTtsError(null)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (playingMessageId === messageId && playingLang === language) {
      setPlayingMessageId(null); setPlayingLang(null); return
    }
    setPlayingMessageId(messageId); setPlayingLang(language)
    try {
      const res = await fetch('/api/voice/tts', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: text.trim().substring(0, 490), language })
      })
      const rd = await res.json()
      if (!res.ok) throw new Error(rd.error || `TTS failed (${res.status})`)
      if (!rd.audio) throw new Error('No audio data returned')
      const audio = new Audio(`data:audio/wav;base64,${rd.audio}`)
      audioRef.current = audio
      audio.onended = () => { setPlayingMessageId(null); setPlayingLang(null) }
      audio.onerror = () => { setTtsError('Audio playback failed'); setPlayingMessageId(null); setPlayingLang(null) }
      await audio.play()
    } catch (err: any) { setTtsError(err.message || 'TTS failed'); setPlayingMessageId(null); setPlayingLang(null) }
  }

  // ── AI questions ──────────────────────────────────────────────────────────
  const generateAIQuestions = async (context: string, domain: string, department: string) => {
    setLoadingQuestions(true)
    try {
      const res = await fetch('/api/ai/suggest-questions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ context, messages: messagesRef.current.map(m => ({ speaker: m.speaker, text: m.translations.ENGLISH })), domain, department, extractedData, nerEntities, pastSessionContext })
      })
      if (res.ok) { const { questions } = await res.json(); setAiQuestions(questions || []) }
    } catch (err) { console.error(err) }
    finally { setLoadingQuestions(false) }
  }

  const addMessage = async (speaker: 'doctor' | 'patient', originalText: string, translations?: Record<string, string>) => {
    const safe = translations || {}
    const newMsg: Message = {
      id: Date.now().toString(), speaker, originalText,
      translations: { ENGLISH: safe.ENGLISH || originalText, HINDI: safe.HINDI || originalText, KANNADA: safe.KANNADA || originalText },
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMsg])
    await fetch(`/api/session/${sessionId}/add-message`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ speaker, text: originalText, translated: newMsg.translations.ENGLISH })
    })
    const ctx = [...messagesRef.current, newMsg].map(m => `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.translations.ENGLISH}`).join('\n')
    if (speaker === 'patient') {
      const nerRes = await fetch('/api/ai/extract-entities', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: ctx, useHuggingFace: session?.domain === 'HEALTHCARE', domain: session?.domain })
      })
      const { entities } = await nerRes.json(); setNerEntities(entities)
      await fetch(`/api/session/${sessionId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nerEntities: entities }) })
      const extRes = await fetch('/api/ai/extract-data', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ transcript: ctx, domain: session?.domain, department: session?.department, schema: session?.config?.schema })
      })
      const { extractedData: newData } = await extRes.json(); setExtractedData(newData)
      await fetch(`/api/session/${sessionId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ extractedData: newData }) })
      generateAIQuestions(ctx, session?.domain, session?.department)
    }
  }

  const sendManualQuestion = async () => {
    if (!manualQuestion.trim()) return
    setSendingMessage(true)
    const tr = await fetch('/api/voice/translate-all', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: manualQuestion, sourceLang:'en-IN' })
    })
    const { translations } = await tr.json()
    await addMessage('doctor', manualQuestion.trim(), translations)
    setManualQuestion(''); setSendingMessage(false)
  }

  const selectAIQuestion = async (question: string) => {
    const tr = await fetch('/api/voice/translate-all', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: question, sourceLang:'en-IN' })
    })
    const { translations } = await tr.json()
    await addMessage('doctor', question, translations)
    setAiQuestions([])
  }

  // ── End Conversation ─────────────────────────────────────────────────────
  const endConversation = async () => {
    setConversationEnded(true)
    try {
      await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      })
    } catch (err) { console.error(err) }
  }

  // ── Report actions ─────────────────────────────────────────────────────────
  const generateReport = async () => {
    if (!conversationEnded && session?.status !== 'COMPLETED') {
      alert('Please end the conversation first before generating a report.')
      return
    }
    setGenerating(true)
    try {
      const transcript = messages.map(m => `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.translations.ENGLISH}`).join('\n')
      const res = await fetch('/api/ai/generate-report', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ transcript, extractedData, nerEntities, domain: session.domain, department: session.department, template: session.config?.template, personName: session.person.name, personPhone: session.person.phone, personEmail: session.person.email })
      })
      const { report: generated } = await res.json()
      await fetch(`/api/session/${sessionId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ finalReport: generated }) })
      setReport(generated); setReportExpanded(true)
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  const approveReport = async () => {
    await fetch(`/api/session/${sessionId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ approved: true, approvedAt: new Date(), status:'COMPLETED' }) })
    loadSession()
  }

  // ── PDF with optional language translation ──────────────────────────────
  const getTranslatedReportHtml = async (lang: LangKey): Promise<string> => {
    if (lang === 'ENGLISH') return report
    setTranslatingReport(true)
    try {
      const res = await fetch('/api/ai/translate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: report, targetLang: lang })
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 || data.error === 'RATE_LIMIT') {
          throw new Error(`RATE_LIMIT:AI translation limit reached. Please try again in ~1 hour, or send in English.`)
        }
        throw new Error(data.error || 'Translation failed')
      }
      return data.translatedHtml || report
    } catch (err: any) {
      console.error('Report translation failed:', err)
      if (err.message?.startsWith('RATE_LIMIT:')) {
        throw err // bubble up — caller will show the message
      }
      return report // silent fallback only for non-rate-limit errors
    } finally {
      setTranslatingReport(false)
    }
  }

  const exportPDF = async (lang: LangKey = 'ENGLISH') => {
    setExporting(true)
    try {
      // Inject translated content into a hidden clone for PDF generation
      const htmlToUse = await getTranslatedReportHtml(lang)

      // Temporarily swap report-content innerHTML if needed
      const el = document.getElementById('report-content')
      const originalHtml = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) {
        el.innerHTML = htmlToUse
        await new Promise(r => setTimeout(r, 100))
      }

      const pdfBlob = await generatePDFClient('report-content')

      // Restore original
      if (lang !== 'ENGLISH' && el) el.innerHTML = originalHtml

      const fd = new FormData(); fd.append('pdf', pdfBlob, 'report.pdf')
      const res = await fetch(`/api/session/${sessionId}/export-pdf`, { method:'POST', body: fd })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Export failed: ' + (e.details || e.error || res.statusText)); return }
      const { pdfUrl } = await res.json()
      if (pdfUrl) { window.open(pdfUrl, '_blank'); await loadExports() }
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }

  const downloadReport = async (lang: LangKey = 'ENGLISH') => {
    if (!report) return
    setDownloading(true)
    try {
      const htmlToUse = await getTranslatedReportHtml(lang)

      const el = document.getElementById('report-content')
      const originalHtml = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) {
        el.innerHTML = htmlToUse
        await new Promise(r => setTimeout(r, 100))
      }

      const pdfBlob = await generatePDFClient('report-content')

      if (lang !== 'ENGLISH' && el) el.innerHTML = originalHtml

      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a'); a.href = url
      const name = (session?.person?.name || 'report').replace(/\s+/g,'_').toLowerCase()
      const langSuffix = lang === 'ENGLISH' ? '' : `_${lang.toLowerCase()}`
      a.download = `${name}_${session?.department?.toLowerCase() || 'consultation'}${langSuffix}_${new Date().toISOString().slice(0,10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
    finally { setDownloading(false) }
  }

  const openPdfLangPicker = (forAction: 'download' | 'export' | 'whatsapp') => {
    setPdfLangPickerFor(forAction)
    setShowPdfLangPicker(true)
  }

  const onSelectPdfLang = async (lang: LangKey) => {
    setShowPdfLangPicker(false)
    if (pdfLangPickerFor === 'download') await downloadReport(lang)
    else if (pdfLangPickerFor === 'export') await exportPDF(lang)
    else await sendReportToWhatsApp(lang)
  }

  // ── Send report to WhatsApp ────────────────────────────────────────────────
  const sendReportToWhatsApp = async (lang: LangKey) => {
    if (!report) return
    setSendingWhatsapp(true)
    try {
      // Step 1: Translate & generate PDF (reuse exportPDF pipeline)
      const htmlToUse = await getTranslatedReportHtml(lang)

      const el = document.getElementById('report-content')
      const originalHtml = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) {
        el.innerHTML = htmlToUse
        await new Promise(r => setTimeout(r, 100))
      }

      const pdfBlob = await generatePDFClient('report-content')

      if (lang !== 'ENGLISH' && el) el.innerHTML = originalHtml

      // Step 2: Upload to Vercel Blob via existing export-pdf route → get public URL
      const fd = new FormData()
      fd.append('pdf', pdfBlob, 'report.pdf')
      const uploadRes = await fetch(`/api/session/${sessionId}/export-pdf`, {
        method: 'POST',
        body: fd,
      })
      if (!uploadRes.ok) {
        const e = await uploadRes.json().catch(() => ({}))
        alert('Upload failed: ' + (e.error || uploadRes.statusText))
        return
      }
      const { pdfUrl } = await uploadRes.json()
      await loadExports()

      // Step 3: Send WhatsApp message with public PDF URL
      const waRes = await fetch(`/api/session/${sessionId}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl,
          language: lang,
          patientName: session?.person?.name,
        }),
      })
      const waData = await waRes.json()
      if (!waRes.ok) throw new Error(waData.error || 'WhatsApp send failed')

      alert(`✓ Report sent to WhatsApp! (${lang})\nMessage ID: ${waData.sid}`)
    } catch (err: any) {
      console.error('[sendReportToWhatsApp]', err)
      alert('Failed to send WhatsApp report: ' + err.message)
    } finally {
      setSendingWhatsapp(false)
    }
  }

  // ── Patient Summary ───────────────────────────────────────────────────────
  const generateSummary = async () => {
    setGeneratingSummary(true)
    setShowSummary(true)
    try {
      const transcript = messages.map(m =>
        `${m.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${m.translations.ENGLISH}`
      ).join('\n')
      const res = await fetch('/api/ai/generate-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, extractedData, nerEntities, domain: session.domain, department: session.department, personName: session.person.name, transcript })
      })
      if (!res.ok) throw new Error('Failed')
      const { summary: s } = await res.json()
      setSummary(s)
    } catch (err) { console.error(err) }
    finally { setGeneratingSummary(false) }
  }

  const playSummaryTts = async (text: string, id: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
    if (summaryTtsId === id) { setSummaryTtsId(null); return }
    setSummaryTtsId(id)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 490), language: summaryLang })
      })
      const rd = await res.json()
      if (rd.audio) {
        const audio = new Audio(`data:audio/wav;base64,${rd.audio}`)
        audioRef.current = audio
        audio.onended = () => setSummaryTtsId(null)
        audio.onerror = () => setSummaryTtsId(null)
        await audio.play()
      }
    } catch { setSummaryTtsId(null) }
  }

  // ── Appointment ────────────────────────────────────────────────────────────
  const scheduleAppointment = async (mode: 'now' | 'schedule') => {
    if (mode === 'schedule' && (!apptDate || !apptTime)) return
    setScheduling(true); setApptSuccess(null)
    try {
      const body: any = { sessionId, callMode: mode, notes: apptNotes.trim() || null, customMessage: customCallMsg.trim() || null }
      if (mode === 'schedule') { body.appointmentDate = apptDate; body.appointmentTime = apptTime }
      const res = await fetch('/api/twilio/schedule-call', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setApptSuccess(mode === 'now'
        ? `Call initiated! Status: ${data.callStatus}. Patient will receive the call now.`
        : `Call scheduled for ${apptDate} at ${apptTime}. Status: ${data.callStatus}.`
      )
      setApptDate(''); setApptTime(''); setApptNotes(''); setCustomCallMsg(''); setShowScheduler(false)
      const r2 = await fetch(`/api/twilio/appointments?sessionId=${sessionId}`)
      if (r2.ok) { const d = await r2.json(); setAppointments(d.appointments || []) }
    } catch (err: any) { alert('Failed: ' + err.message) }
    finally { setScheduling(false) }
  }

  // ── Medication CRUD ────────────────────────────────────────────────────────
  const saveMedication = async () => {
    if (!newMed.name.trim()) return
    setSavingMed(true)
    try {
      const r = await fetch(`/api/medications/${sessionId}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ medication: { ...newMed, id: editingMedId || newMed.id } })
      })
      if (r.ok) { const d = await r.json(); setMedications(d.medications); setNewMed(EMPTY_MED()); setShowMedForm(false); setEditingMedId(null) }
    } catch (e) { console.error(e) }
    finally { setSavingMed(false) }
  }

  const deleteMedication = async (medicationId: string) => {
    try {
      const r = await fetch(`/api/medications/${sessionId}`, {
        method:'DELETE', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ medicationId })
      })
      if (r.ok) { const d = await r.json(); setMedications(d.medications) }
    } catch {}
  }

  const triggerMedCall = async (med: any, timingLabel: string) => {
    setCallingMed(`${med.id}-${timingLabel}`)
    try {
      const r = await fetch('/api/twilio/medication-call', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sessionId, medicationName: med.name, dosage: med.dosage, timingLabel, notes: med.notes })
      })
      const d = await r.json()
      if (d.success) alert(`✓ Call initiated! Status: ${d.callStatus}`)
      else alert('Call failed: ' + d.error)
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setCallingMed(null) }
  }

  const startEditMed = (med: any) => { setNewMed({ ...med }); setEditingMedId(med.id); setShowMedForm(true) }

  // ── Finance Investment Reminders CRUD ───────────────────────────────────
  const EMPTY_FIN = () => ({ id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2), title: '', stockName: '', quantity: '', buyPrice: '', buyDate: '', callDate: '', callTime: '', customMessage: '', notes: '' })

  const saveFinReminder = async () => {
    if (!newFin.title.trim()) return
    setSavingFin(true)
    try {
      const r = await fetch(`/api/finance-reminders/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder: { ...newFin, id: editingFinId || newFin.id } })
      })
      if (r.ok) { const d = await r.json(); setFinReminders(d.reminders); setNewFin(EMPTY_FIN()); setShowFinForm(false); setEditingFinId(null) }
    } catch (e) { console.error(e) }
    finally { setSavingFin(false) }
  }

  const deleteFinReminder = async (reminderId: string) => {
    try {
      const r = await fetch(`/api/finance-reminders/${sessionId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId })
      })
      if (r.ok) { const d = await r.json(); setFinReminders(d.reminders) }
    } catch {}
  }

  const startEditFin = (rem: any) => { setNewFin({ ...rem }); setEditingFinId(rem.id); setShowFinForm(true) }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!session) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#666] font-mono text-sm">Loading session...</p>
      </div>
    </div>
  )

  const isDoctorLabel  = session.domain === 'HEALTHCARE' ? 'Doctor'  : 'Agent'
  const isPatientLabel = session.domain === 'HEALTHCARE' ? 'Patient' : 'Client'
  const entityCount    = Object.values(nerEntities).flat().length

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .session-root { background:#0A0A0A; min-height:100vh; font-family:'DM Sans',sans-serif; }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .dark-card          { background:#111111; border:1px solid #1E1E1E; border-radius:12px; }
        .dark-card-elevated { background:#141414; border:1px solid #242424; border-radius:12px; }
        .doctor-pulse  { animation:doctor-ring  1.5s ease-out infinite; }
        .patient-pulse { animation:patient-ring 1.5s ease-out infinite; }
        @keyframes doctor-ring  { 0%{box-shadow:0 0 0 0 rgba(0,212,255,.4);}  70%{box-shadow:0 0 0 20px rgba(0,212,255,0);}  100%{box-shadow:0 0 0 0 rgba(0,212,255,0);} }
        @keyframes patient-ring { 0%{box-shadow:0 0 0 0 rgba(0,245,160,.4);}  70%{box-shadow:0 0 0 20px rgba(0,245,160,0);}  100%{box-shadow:0 0 0 0 rgba(0,245,160,0);} }
        .msg-doctor  { background:linear-gradient(135deg,#0D1B2A 0%,#0A1520 100%); border:1px solid #00D4FF22; border-left:2px solid #00D4FF; }
        .msg-patient { background:linear-gradient(135deg,#0A1D14 0%,#081510 100%); border:1px solid #00F5A022; border-right:2px solid #00F5A0; }
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:#111;} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;} ::-webkit-scrollbar-thumb:hover{background:#444;}
        .entity-badge { font-size:11px;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;border:1px solid #2A2A2A;background:transparent; }
        .ai-q-card { background:#0F0F1A;border:1px solid #2A2A40;border-radius:8px;cursor:pointer;transition:all .15s ease;padding:10px 14px;text-align:left;width:100%; }
        .ai-q-card:hover { background:#151525;border-color:#6366f1;transform:translateY(-1px); }
        .lang-btn { font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 6px;border-radius:4px;border:1px solid #2A2A2A;background:transparent;color:#666;cursor:pointer;transition:all .1s; }
        .lang-btn:hover { background:#1A1A1A;color:#CCC; }
        .lang-btn.active-doctor  { background:#001A24;border-color:#00D4FF;color:#00D4FF; }
        .lang-btn.active-patient { background:#001A0F;border-color:#00F5A0;color:#00F5A0; }
        .lang-btn.active-neutral { background:#1A1A1A;border-color:#666;color:#EEE; }
        .dark-input { background:#0D0D0D;border:1px solid #2A2A2A;border-radius:8px;color:#E8E8E8;padding:8px 12px;font-size:13px;width:100%;outline:none;transition:border-color .15s; }
        .dark-input:focus { border-color:#00D4FF44; } .dark-input::placeholder { color:#444; }
        .btn-icon { display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;transition:all .15s;border:1px solid #2A2A2A;background:#141414;color:#888; }
        .btn-icon:hover { background:#1A1A1A;color:#CCC; }
        .mic-doctor  { background:linear-gradient(135deg,#001824,#002535);border:2px solid #00D4FF44;color:#00D4FF; }
        .mic-doctor:hover  { border-color:#00D4FF88;box-shadow:0 0 20px #00D4FF22; }
        .mic-patient { background:linear-gradient(135deg,#001A0F,#002215);border:2px solid #00F5A044;color:#00F5A0; }
        .mic-patient:hover { border-color:#00F5A088;box-shadow:0 0 20px #00F5A022; }
        .recording-doctor  { border-color:#ef4444 !important;background:linear-gradient(135deg,#1A0505,#200A0A) !important; }
        .recording-patient { border-color:#ef4444 !important;background:linear-gradient(135deg,#1A0505,#200A0A) !important; }
        .status-active    { color:#00F5A0;background:#001A0F;border:1px solid #00F5A022; }
        .status-completed { color:#00D4FF;background:#001824;border:1px solid #00D4FF22; }
        .section-label { font-size:10px;font-family:'IBM Plex Mono',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px; }
        .fade-in { animation:fadeIn .2s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;} }
        main { background:#0A0A0A !important; }
        .msg-edit-area { width:100%;min-height:72px;background:#0D0D0D;border:1px solid #00D4FF44;border-radius:8px;color:#E8E8E8;font-size:13px;line-height:1.6;padding:8px 10px;outline:none;resize:vertical;font-family:'DM Sans',sans-serif; }
        .msg-edit-area:focus { border-color:#00D4FF88; }
        .msg-edit-btn { opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;border:1px solid #2A2A2A;background:#111;color:#555;cursor:pointer; }
        .msg-bubble-wrap:hover .msg-edit-btn { opacity:1; }
        .msg-edit-btn:hover { color:#00D4FF;border-color:#00D4FF44; }
        /* Appointment */
        .appt-grid   { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px; }
        .appt-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px; }
        .script-textarea { width:100%;min-height:80px;background:#0A0A0A;border:1px solid #2A2A2A;border-radius:8px;color:#E8E8E8;font-size:12px;line-height:1.65;padding:10px 12px;outline:none;resize:vertical;font-family:'DM Sans',sans-serif;transition:border-color .15s; }
        .script-textarea:focus { border-color:#A78BFA88; } .script-textarea::placeholder { color:#333; }
        /* Medication */
        .med-card { background:#0F0F0F;border:1px solid #1E1E1E;border-radius:10px;padding:16px;transition:border-color .15s; }
        .med-card:hover { border-color:#2A2A2A; }
        .timing-pill { display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:100px;font-size:11px;font-family:'IBM Plex Mono',monospace;border:1px solid;cursor:pointer;transition:all .15s;user-select:none; }
        .timing-morning   { background:#1A1200;border-color:#F59E0B88;color:#F59E0B; }
        .timing-afternoon { background:#001824;border-color:#00D4FF88;color:#00D4FF; }
        .timing-night     { background:#0F0A1A;border-color:#A78BFA88;color:#A78BFA; }
        .timing-inactive  { background:#111;border-color:#2A2A2A;color:#444; }
        .freq-select { background:#0D0D0D;border:1px solid #2A2A2A;border-radius:8px;padding:8px 12px;color:#E8E8E8;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;width:100%; }
        .call-btn { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:10px;font-family:'IBM Plex Mono',monospace;border:1px solid;cursor:pointer;transition:all .15s; }
        .call-btn:disabled { opacity:.4;cursor:not-allowed; }
        @keyframes spin { to { transform:rotate(360deg) } }
        /* Visual report editor content styles */
        [contenteditable] h2 { font-size:14px;font-weight:700;color:#E8E8E8;margin:12px 0 6px;border-left:3px solid #00D4FF;padding-left:10px; }
        [contenteditable] h3 { font-size:13px;font-weight:700;color:#CCC;margin:10px 0 5px;padding:4px 10px 4px 12px;border-radius:4px;border-left:2px solid #555; }
        [contenteditable] p { margin:0 0 6px;color:#BBB; }
        [contenteditable] ul,[contenteditable] ol { padding-left:20px;margin:4px 0 8px;color:#BBB; }
        [contenteditable] li { margin-bottom:3px; }
        [contenteditable] strong { color:#E8E8E8;font-weight:700; }
        [contenteditable] table { border-collapse:collapse;width:100%;margin-bottom:12px; }
        [contenteditable] td,[contenteditable] th { border:1px solid #2A2A2A;padding:6px 10px;font-size:12px;color:#BBB; }
        [contenteditable]:focus { outline:none; }
        /* Translate indicator */
        .translate-indicator { display:flex;align-items:center;gap:6px;padding:4px 10px;background:#0A1A0F;border:1px solid #00F5A033;border-radius:6px;font-size:10px;color:#00F5A0;font-family:'IBM Plex Mono',monospace; }
        /* Tab bar */
        .tab-bar { display:flex;gap:2px;padding:3px;background:#0D0D0D;border:1px solid #1E1E1E;border-radius:12px;margin:0 16px 12px; }
        .tab-btn { display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;background:transparent;color:#555;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all .2s;flex:1;justify-content:center; }
        .tab-btn:hover { color:#AAA;background:#111; }
        .tab-btn.tab-active { background:#141414;color:#E8E8E8;border:1px solid #242424;box-shadow:0 2px 8px rgba(0,0,0,.3); }
        .tab-btn.tab-active .tab-icon { opacity:1; }
        .tab-icon { opacity:.4;transition:opacity .2s; }
        .tab-badge { font-size:10px;padding:1px 6px;border-radius:10px;font-family:'IBM Plex Mono',monospace;margin-left:2px; }
      `}</style>

      <div className="session-root pb-8">
        <audio ref={audioRef} className="hidden" />

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="dark-card mx-4 mt-4 mb-4 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D4FF]" />
              <span className="font-semibold text-[#E8E8E8] text-sm">{session.person.name || 'Unknown'}</span>
            </div>
            <span className="text-[#333]">|</span>
            <span className="mono text-xs text-[#555]">{session.department.replace(/_/g,' ')}</span>
            <span className="text-[#333]">|</span>
            <span className={`mono text-xs px-2 py-0.5 rounded-full ${session.status === 'COMPLETED' ? 'status-completed' : 'status-active'}`}>
              ● {session.status}
            </span>
            {session.approved && <span className="mono text-xs px-2 py-0.5 rounded-full text-[#A78BFA] bg-[#1A1030] border border-[#A78BFA22]">✓ APPROVED</span>}
          </div>
          <div className="flex items-center gap-3">
            {/* ── End Conversation Button */}
            {!conversationEnded && session.status !== 'COMPLETED' && messages.length > 0 && (
              <button
                onClick={endConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background:'linear-gradient(135deg,#1A0A0A,#200505)', border:'1px solid #ef444466', color:'#ef4444', fontFamily:'IBM Plex Mono,monospace' }}
              >
                <X className="w-3 h-3"/>
                End Conversation
              </button>
            )}
            {(conversationEnded || session.status === 'COMPLETED') && (
              <span className="mono text-xs px-2 py-0.5 rounded-full bg-[#0A1D0F] border border-[#00F5A022] text-[#00F5A0]">✓ Conversation Ended</span>
            )}

            {/* ── Smart Summary Button */}
            <button
              onClick={generateSummary}
              disabled={generatingSummary || messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#0A1A14,#051A10)', border:'1px solid #34D39944', color:'#34D399', fontFamily:'IBM Plex Mono,monospace' }}
            >
              {generatingSummary
                ? <Loader2 className="w-3 h-3 animate-spin"/>
                : <BookOpen className="w-3 h-3"/>}
              {generatingSummary ? 'generating...' : 'Smart Summary'}
            </button>

            <span className="text-[#444] text-xs mono">Display:</span>
            <div className="flex gap-1">
              {(['ENGLISH','HINDI','KANNADA'] as LangKey[]).map(l => (
                <button key={l} onClick={() => setDisplayLanguage(l)}
                  className={`lang-btn ${displayLanguage === l ? 'active-neutral' : ''}`}>
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            <span className="mono text-[#333] text-xs">
              {new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
        </div>

        {ttsError && (
          <div className="mx-4 mb-3 px-4 py-2 bg-[#1A0A0A] border border-[#ef444433] rounded-lg flex items-center justify-between">
            <span className="text-xs text-[#ef4444] mono">TTS: {ttsError}</span>
            <button onClick={() => setTtsError(null)} className="text-[#ef4444]"><X className="w-3 h-3"/></button>
          </div>
        )}

        {/* ── TAB BAR ──────────────────────────────────────────────────────── */}
        <div className="tab-bar">
          {[
            { id: 'chat' as const, icon: MessageCircle, label: 'Chat', badge: messages.length > 0 ? messages.length : null, color: '#00D4FF' },
            { id: 'schedule' as const, icon: Calendar,
              label: session.domain === 'HEALTHCARE' ? 'Schedule & Meds' : 'Schedule & Invest',
              badge: (() => { const c = appointments.length + (session.domain === 'HEALTHCARE' ? medications.length : finReminders.length); return c > 0 ? c : null })(),
              color: '#A78BFA' },
            { id: 'report' as const, icon: FileText, label: 'Report', badge: report ? '✓' : null, color: '#F59E0B' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setSessionTab(tab.id)}
              className={`tab-btn ${sessionTab === tab.id ? 'tab-active' : ''}`}>
              <tab.icon className="tab-icon" style={{ width: 16, height: 16, color: sessionTab === tab.id ? tab.color : undefined }} />
              {tab.label}
              {tab.badge && (
                <span className="tab-badge" style={{ background: sessionTab === tab.id ? `${tab.color}22` : '#1A1A1A', color: sessionTab === tab.id ? tab.color : '#555', border: `1px solid ${sessionTab === tab.id ? `${tab.color}44` : '#2A2A2A'}` }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CHAT TAB ────────────────────────────────────────────────────────── */}
        {sessionTab === 'chat' && (
        <div className="px-4 grid grid-cols-12 gap-3">

          {/* LEFT: DOCTOR */}
          <div className="col-span-3 space-y-3">
            <div className="dark-card-elevated p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#00D4FF]" />
                  <span className="text-[#E8E8E8] text-sm font-medium">{isDoctorLabel}</span>
                </div>
                <div className="flex gap-1">
                  {(['ENGLISH','HINDI','KANNADA'] as LangKey[]).map(l => (
                    <button key={l} onClick={() => setDoctorLanguage(l)}
                      className={`lang-btn ${doctorLanguage === l ? 'active-doctor' : ''}`}>
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => isDoctorRecording
                    ? stopRecording(doctorRecorderRef, setIsDoctorRecording, isDoctorRecording)
                    : startRecording(doctorRecorderRef, doctorChunksRef, setIsDoctorRecording, 'doctor', doctorLanguage)}
                  disabled={isProcessing}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${isDoctorRecording ? 'recording-doctor doctor-pulse' : isProcessing ? 'opacity-50 cursor-not-allowed mic-doctor' : 'mic-doctor'}`}>
                  {isProcessing ? <Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin"/> : isDoctorRecording ? <MicOff className="w-6 h-6 text-[#ef4444]"/> : <Mic className="w-6 h-6"/>}
                </button>
              </div>
              <p className="text-center text-xs mono text-[#444] mb-4">
                {isDoctorRecording ? '● REC – click to stop' : isProcessing ? 'processing...' : 'click to speak'}
              </p>
              <div className="flex gap-2">
                <input className="dark-input text-xs" placeholder="Type a question…" value={manualQuestion}
                  onChange={e => setManualQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendManualQuestion()}/>
                <button onClick={sendManualQuestion} disabled={!manualQuestion.trim() || sendingMessage}
                  className="btn-icon w-9 h-9 flex-shrink-0 disabled:opacity-40">
                  {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="dark-card-elevated p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]"/>
                  <span className="text-xs font-medium text-[#A78BFA]">AI Suggestions</span>
                  {aiQuestions.length > 0 && <span className="mono text-xs text-[#555]">({aiQuestions.length})</span>}
                </div>
                {loadingQuestions && <Loader2 className="w-3 h-3 animate-spin text-[#555]"/>}
              </div>
              <div className="space-y-2">
                {aiQuestions.length === 0 && !loadingQuestions && (
                  <p className="text-xs text-[#333] mono text-center py-3">Suggestions appear after patient speaks</p>
                )}
                {aiQuestions.map((q,i) => (
                  <button key={i} onClick={() => selectAIQuestion(q)} className="ai-q-card fade-in group">
                    <div className="flex items-start gap-2">
                      <span className="mono text-xs text-[#A78BFA] opacity-60 flex-shrink-0 mt-0.5">{String(i+1).padStart(2,'0')}</span>
                      <span className="text-xs text-[#AAA] group-hover:text-[#E8E8E8] transition-colors leading-relaxed whitespace-normal break-words text-left">{q}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 ml-5">
                      <ChevronRight className="w-3 h-3 text-[#A78BFA] opacity-0 group-hover:opacity-100 transition-opacity"/>
                      <span className="text-[10px] text-[#A78BFA] opacity-0 group-hover:opacity-100 transition-opacity mono">ask this</span>
                    </div>
                  </button>
                ))}
              </div>
              {aiQuestions.length > 0 && (
                <button onClick={() => setAiQuestions([])} className="mt-3 w-full text-xs text-[#333] hover:text-[#666] mono transition-colors">clear suggestions</button>
              )}
            </div>
          </div>

          {/* CENTER: CONVERSATION */}
          <div className="col-span-6">
            <div className="dark-card-elevated h-full flex flex-col" style={{ minHeight:520 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#555]"/>
                  <span className="text-sm text-[#888]">Conversation</span>
                  <span className="mono text-xs text-[#333]">({messages.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  {translatingMsg && (
                    <div className="translate-indicator">
                      <Loader2 style={{ width: 10, height: 10 }} className="animate-spin"/>
                      translating all languages…
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#333]"/>
                    <span className="mono text-xs text-[#333]">live</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse ml-1"/>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 260px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3">
                    <Mic className="w-8 h-8 text-[#222]"/>
                    <p className="text-xs mono text-[#333] text-center">No messages yet<br/>Start recording to begin</p>
                  </div>
                ) : (
                  <>
                  <div style={{ flex: 1 }} />

                {messages.map(msg => {
                  const lang     = getMsgLang(msg.id)
                  const text     = msg.translations[lang] || msg.originalText
                  const isDoctor = msg.speaker === 'doctor'
                  const isEditing= editingMsgId === msg.id

                  return (
                    <div key={msg.id} className={`flex ${isDoctor ? 'justify-start' : 'justify-end'} fade-in msg-bubble-wrap`}>
                      <div className={`max-w-[85%] rounded-lg p-3 ${isDoctor ? 'msg-doctor' : 'msg-patient'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`mono text-[10px] font-semibold ${isDoctor ? 'text-[#00D4FF]' : 'text-[#00F5A0]'}`}>
                            {isDoctor ? isDoctorLabel : isPatientLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            {(['ENGLISH','HINDI','KANNADA'] as LangKey[]).map(l => (
                              <button key={l} onClick={() => setMsgLang(msg.id, l)}
                                className={`lang-btn ${lang === l ? (isDoctor ? 'active-doctor' : 'active-patient') : ''}`}>
                                {LANG_LABELS[l]}
                              </button>
                            ))}
                            <button onClick={() => playTTS(msg.id, text, lang)} className="btn-icon w-5 h-5 ml-1">
                              {playingMessageId === msg.id && playingLang === lang ? <Loader2 className="w-3 h-3 animate-spin"/> : <Volume2 className="w-3 h-3"/>}
                            </button>
                            {!isEditing && (
                              <button onClick={() => startEditMessage(msg)} className="msg-edit-btn" title="Edit message">
                                <Pencil style={{ width:10, height:10 }}/>
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div>
                            {/* Language selector for edit */}
                            <div className="flex gap-1 mb-2 items-center">
                              <span className="mono text-[9px] text-[#444] mr-1">Edit in:</span>
                              {(['ENGLISH','HINDI','KANNADA'] as LangKey[]).map(l => (
                                <button key={l}
                                  onClick={() => {
                                    setEditingMsgLang(l)
                                    setEditingMsgText(msg.translations[l] || msg.originalText)
                                  }}
                                  className={`lang-btn text-[10px] ${editingMsgLang === l ? (isDoctor ? 'active-doctor' : 'active-patient') : ''}`}>
                                  {LANG_LABELS[l]}
                                </button>
                              ))}
                              <span className="mono text-[9px] text-[#555] ml-1">→ auto-translates to all</span>
                            </div>
                            <textarea
                              className="msg-edit-area"
                              value={editingMsgText}
                              onChange={e => setEditingMsgText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2 items-center">
                              <button onClick={() => saveEditMessage(msg.id)} disabled={savingMsgEdit}
                                style={{ fontSize:11, padding:'4px 12px', borderRadius:6, background:isDoctor?'#001824':'#001A0F', border:`1px solid ${isDoctor?'#00D4FF44':'#00F5A044'}`, color:isDoctor?'#00D4FF':'#00F5A0', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                {savingMsgEdit
                                  ? <><Loader2 style={{ width:10, height:10 }} className="animate-spin"/> {translatingMsg ? 'Translating...' : 'Saving...'}</>
                                  : <><CheckCheck style={{ width:10, height:10 }}/> Save & Translate</>
                                }
                              </button>
                              <button onClick={cancelEditMessage}
                                style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid #2A2A2A', color:'#666', cursor:'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#CCC] leading-relaxed">{text}</p>
                        )}

                        <p className="mono text-[10px] text-[#333] mt-1.5">
                          {msg.timestamp.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef}/>
                </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: PATIENT + LIVE EXTRACTION */}
          <div className="col-span-3 space-y-3">
            <div className="dark-card-elevated p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#00F5A0]"/>
                  <span className="text-[#E8E8E8] text-sm font-medium">{isPatientLabel}</span>
                </div>
                <div className="flex gap-1">
                  {(['ENGLISH','HINDI','KANNADA'] as LangKey[]).map(l => (
                    <button key={l} onClick={() => setPatientLanguage(l)}
                      className={`lang-btn ${patientLanguage === l ? 'active-patient' : ''}`}>
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => isPatientRecording
                    ? stopRecording(patientRecorderRef, setIsPatientRecording, isPatientRecording)
                    : startRecording(patientRecorderRef, patientChunksRef, setIsPatientRecording, 'patient', patientLanguage)}
                  disabled={isProcessing}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${isPatientRecording ? 'recording-patient patient-pulse' : isProcessing ? 'opacity-50 cursor-not-allowed mic-patient' : 'mic-patient'}`}>
                  {isProcessing ? <Loader2 className="w-6 h-6 text-[#00F5A0] animate-spin"/> : isPatientRecording ? <MicOff className="w-6 h-6 text-[#ef4444]"/> : <Mic className="w-6 h-6"/>}
                </button>
              </div>
              <p className="text-center text-xs mono text-[#444]">
                {isPatientRecording ? '● REC – click to stop' : `${isPatientLabel} speaks here`}
              </p>
            </div>



            {/* Live Extraction */}
            <div className="dark-card-elevated p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]"/>
                  <span className="text-xs font-medium text-[#F59E0B]">Live Extraction</span>
                </div>
                {entityCount > 0 && <span className="mono text-xs text-[#555]">{entityCount} entities</span>}
              </div>
              <div className="flex gap-1 mb-3 bg-[#0D0D0D] p-1 rounded-lg">
                {(['entities','data'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-xs mono py-1 rounded transition-all ${activeTab === tab ? 'bg-[#1A1A1A] text-[#E8E8E8]' : 'text-[#444] hover:text-[#666]'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="h-56 overflow-y-auto">
                {activeTab === 'entities' ? (
                  <div className="space-y-2">
                    {Object.entries(nerEntities).map(([key, vals]: [string, any]) =>
                      vals?.length > 0 ? (
                        <div key={key}>
                          <p className="section-label" style={{ color: ENTITY_COLORS[key] || '#555' }}>{key}</p>
                          <div className="flex flex-wrap gap-1">
                            {vals.map((v: string, i: number) => (
                              <span key={i} className="entity-badge"
                                style={{ color: ENTITY_COLORS[key] || '#A0A0A0', borderColor: ENTITY_COLORS[key] ? `${ENTITY_COLORS[key]}44` : '#2A2A2A', backgroundColor: ENTITY_COLORS[key] ? `${ENTITY_COLORS[key]}11` : 'transparent' }}>
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                    {Object.values(nerEntities).every((v: any) => !v?.length) && (
                      <p className="text-xs mono text-[#333] text-center pt-4">awaiting input</p>
                    )}
                  </div>
                ) : (
                  <pre className="mono text-[11px] text-[#555] whitespace-pre-wrap">{JSON.stringify(extractedData, null, 2) || 'No data yet'}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── REPORT TAB ──────────────────────────────────────────────────── */}
        {sessionTab === 'report' && (
        <>
        {/* ── REPORT ────────────────────────────────────────────────────────── */}
        <div className="px-4 mt-3">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#555]"/>
                <span className="text-sm text-[#888]">Generated Report</span>
                {report && reportEditMode === 'view' && (
                  <button onClick={() => setReportExpanded(e => !e)} className="btn-icon w-6 h-6">
                    {reportExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={generateReport} disabled={generating || messages.length === 0 || (!conversationEnded && session?.status !== 'COMPLETED')}
                  title={!conversationEnded && session?.status !== 'COMPLETED' ? 'End the conversation first to generate report' : ''}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium transition-all ${messages.length === 0 || (!conversationEnded && session?.status !== 'COMPLETED') ? 'bg-[#111] text-[#333] cursor-not-allowed opacity-50' : 'bg-[#001824] border border-[#00D4FF44] text-[#00D4FF] hover:border-[#00D4FF88] hover:bg-[#002535]'}`}>
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                  {generating ? 'generating...' : !conversationEnded && session?.status !== 'COMPLETED' ? '🔒 End conversation first' : 'Generate'}
                </button>

                {/* FIX 3: Visual Edit button */}
                {report && reportEditMode === 'view' && (
                  <button onClick={openReportEdit}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0F0A1A] border border-[#A78BFA44] text-[#A78BFA] hover:border-[#A78BFA88] transition-all">
                    <Pencil className="w-3.5 h-3.5"/> Edit Report
                  </button>
                )}

                {report && !session.approved && reportEditMode === 'view' && (
                  <button onClick={approveReport}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0A1D0F] border border-[#00F5A044] text-[#00F5A0] hover:border-[#00F5A088] transition-all">
                    <Check className="w-3.5 h-3.5"/> Approve
                  </button>
                )}
                {report && reportEditMode === 'view' && (
                  <button onClick={() => openPdfLangPicker('download')} disabled={downloading || translatingReport}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0F0A1A] border border-[#A78BFA44] text-[#A78BFA] hover:border-[#A78BFA88] transition-all disabled:opacity-50">
                    {downloading || (translatingReport && pdfLangPickerFor === 'download') ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
                    {downloading ? 'saving...' : translatingReport && pdfLangPickerFor === 'download' ? 'translating...' : 'Download PDF'}
                  </button>
                )}
                {session.approved && reportEditMode === 'view' && (
                  <button onClick={() => openPdfLangPicker('export')} disabled={exporting || translatingReport}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0A0A1A] border border-[#6366f144] text-[#818cf8] hover:border-[#6366f188] transition-all disabled:opacity-50">
                    {exporting || (translatingReport && pdfLangPickerFor === 'export') ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5"/>}
                    {exporting ? 'uploading...' : translatingReport && pdfLangPickerFor === 'export' ? 'translating...' : 'Export to Cloud'}
                  </button>
                )}
                {report && reportEditMode === 'view' && (
                  <button onClick={() => openPdfLangPicker('whatsapp')} disabled={sendingWhatsapp || translatingReport}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium transition-all disabled:opacity-50"
                    style={{ background:'#0A1A0F', border:'1px solid #25D36644', color:'#25D366' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#25D36688')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#25D36644')}>
                    {sendingWhatsapp || (translatingReport && pdfLangPickerFor === 'whatsapp')
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                      : <span style={{ fontSize: 13 }}>💬</span>}
                    {sendingWhatsapp ? 'sending...' : translatingReport && pdfLangPickerFor === 'whatsapp' ? 'translating...' : 'WhatsApp'}
                  </button> 
                )}
              </div>
            </div>

            {/* FIX 3: Visual Report Editor */}
            {reportEditMode === 'edit' ? (
              <VisualReportEditor
                value={reportHtmlDraft}
                onChange={setReportHtmlDraft}
                onSave={saveReportEdit}
                onCancel={cancelReportEdit}
                saving={savingReport}
              />
            ) : (
              <div id="report-content"
                className={`overflow-y-auto rounded-lg border border-[#1A1A1A] bg-[#0D0D0D] p-6 transition-all duration-300 ${reportExpanded ? 'max-h-[800px]' : report ? 'max-h-48' : 'max-h-24'}`}
                style={{ fontFamily:'Georgia, serif' }}>
                {report
                  ? <div dangerouslySetInnerHTML={{ __html: report }}/>
                  : <p className="text-xs mono text-[#333] text-center py-4">Complete the consultation and click "Generate Report"</p>
                }
              </div>
            )}
          </div>
        </div>

        {/* ── EXPORT HISTORY ─────────────────────────────────────────────────── */}
        {exports.length > 0 && (
          <div className="px-4 mt-3">
            <div className="dark-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#555]"/>
                <span className="text-sm text-[#888]">Cloud Exports</span>
                <span className="mono text-xs text-[#333]">({exports.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {exports.map((exp: any, i: number) => (
                  <div key={exp.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#0D0D0D', border:'1px solid #1E1E1E', borderRadius:8 }}>
                    <div>
                      <p style={{ fontSize:12, color:'#CCC', fontFamily:'IBM Plex Mono, monospace' }}>Export #{exports.length - i}</p>
                      <p style={{ fontSize:10, color:'#444', fontFamily:'IBM Plex Mono, monospace', marginTop:2 }}>
                        {new Date(exp.createdAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}
                      </p>
                    </div>
                    <a href={exp.fileUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#0A0A1A', border:'1px solid #6366f144', borderRadius:8, color:'#818cf8', fontSize:12, textDecoration:'none', fontFamily:'IBM Plex Mono, monospace' }}>
                      <Download className="w-3 h-3"/> Open {exp.format === 'DATASET' ? 'Dataset' : 'PDF'}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SMART SUMMARY MODAL ─────────────────────────────────────────────── */}
        {showSummary && (
          <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:10000, display:'flex', alignItems:'flex-start', justifyContent:'center', backdropFilter:'blur(8px)', overflowY:'auto', padding:'24px 16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSummary(false) }}
          >
            <div style={{ background:'#0D0D0D', border:'1px solid #1E1E1E', borderRadius:20, width:'100%', maxWidth:700, boxShadow:'0 32px 100px rgba(0,0,0,0.8)', marginBottom:24 }}>

              {/* Modal Header */}
              <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0A1A14,#051A10)', border:'1px solid #34D39966', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📋</div>
                  <div>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:16, fontWeight:700, color:'#E8E8E8', margin:0 }}>Smart Summary</p>
                    <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#555', margin:'2px 0 0' }}>
                      Simple language • For {session?.domain === 'HEALTHCARE' ? 'Patient' : 'Client'}: {session?.person?.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowSummary(false)}
                  style={{ width:32, height:32, borderRadius:10, border:'1px solid #2A2A2A', background:'#141414', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✕</button>
              </div>

              {/* Language Tabs */}
              <div style={{ display:'flex', gap:4, padding:'16px 24px 0' }}>
                {([
                  { lang: 'ENGLISH' as LangKey, label: '🇬🇧 English', accent: '#00D4FF' },
                  { lang: 'HINDI'   as LangKey, label: '🇮🇳 हिंदी',    accent: '#F59E0B' },
                  { lang: 'KANNADA' as LangKey, label: '🏛️ ಕನ್ನಡ',   accent: '#34D399' },
                ]).map(({ lang, label, accent }) => (
                  <button key={lang} onClick={() => setSummaryLang(lang)} style={{
                    padding:'6px 16px', borderRadius:8, border:`1px solid ${summaryLang === lang ? accent : '#2A2A2A'}`,
                    background: summaryLang === lang ? `${accent}18` : 'transparent',
                    color: summaryLang === lang ? accent : '#555',
                    fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s'
                  }}>{label}</button>
                ))}
              </div>

              {/* Content */}
              <div style={{ padding:'20px 24px 24px' }}>
                {generatingSummary ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:16 }}>
                    <Loader2 style={{ width:32, height:32, color:'#34D399' }} className="animate-spin"/>
                    <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'#555', margin:0 }}>Generating summary in 3 languages…</p>
                  </div>
                ) : summary ? (() => {
                  const langKey = summaryLang === 'ENGLISH' ? 'english' : summaryLang === 'HINDI' ? 'hindi' : 'kannada'
                  const s = summary[langKey] || {}
                  const isHealthcare = session?.domain === 'HEALTHCARE'

                  const Section = ({ emoji, title, accent, items, text, ttsId }: {
                    emoji: string; title: string; accent: string;
                    items?: string[]; text?: string; ttsId: string
                  }) => {
                    const ttsText = text || (items || []).join('. ')
                    if (!ttsText?.trim()) return null
                    return (
                      <div style={{ background:'#111', border:`1px solid ${accent}22`, borderLeft:`3px solid ${accent}`, borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>{emoji}</span>
                            <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:11, fontWeight:700, color: accent, letterSpacing:'0.08em', textTransform:'uppercase' as const }}>{title}</span>
                          </div>
                          <button onClick={() => playSummaryTts(ttsText, ttsId)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', border:`1px solid ${accent}44`, borderRadius:6, background:`${accent}11`, color: accent, cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10, transition:'all .15s' }}>
                            {summaryTtsId === ttsId
                              ? <Loader2 style={{ width:10, height:10 }} className="animate-spin"/>
                              : <Volume2 style={{ width:10, height:10 }}/>}
                            {summaryTtsId === ttsId ? 'playing' : 'Listen'}
                          </button>
                        </div>
                        {text ? (
                          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#CCC', margin:0, lineHeight:1.65 }}>{text}</p>
                        ) : (
                          <ul style={{ margin:0, paddingLeft:16 }}>
                            {(items || []).map((item, i) => (
                              <li key={i} style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#CCC', marginBottom:5, lineHeight:1.65 }}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div>
                      <Section emoji="🩺" title={isHealthcare ? 'Main Problem' : 'Main Goal'} accent="#00D4FF" text={s.mainProblem} ttsId="main"/>
                      <Section emoji="🔍" title="Key Findings" accent="#A78BFA" items={s.keyFindings} ttsId="findings"/>
                      {isHealthcare
                        ? <Section emoji="💊" title="Medicines" accent="#F472B6" items={s.medicines} ttsId="meds"/>
                        : <Section emoji="📌" title="Action Items" accent="#F472B6" items={s.actionItems} ttsId="actions"/>}
                      <Section emoji="✅" title="What To Do" accent="#34D399" items={s.doList} ttsId="todo"/>
                      <Section emoji="📅" title="Follow-Up" accent="#F59E0B" text={s.followUp} ttsId="followup"/>
                      {(s.redFlags || []).length > 0 && (
                        <Section emoji="🚨" title="Warning Signs" accent="#F87171" items={s.redFlags} ttsId="red"/>
                      )}
                      {s.encouragement && (
                        <div style={{ background:'linear-gradient(135deg,#0A1A14,#051A10)', border:'1px solid #34D39944', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:24 }}>💚</span>
                          <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, color:'#34D399', margin:0, lineHeight:1.65, fontStyle:'italic' }}>"{s.encouragement}"</p>
                          <button onClick={() => playSummaryTts(s.encouragement, 'enc')}
                            style={{ flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'3px 10px', border:'1px solid #34D39944', borderRadius:6, background:'#34D39911', color:'#34D399', cursor:'pointer', fontFamily:'IBM Plex Mono,monospace', fontSize:10 }}>
                            {summaryTtsId === 'enc' ? <Loader2 style={{ width:10, height:10 }} className="animate-spin"/> : <Volume2 style={{ width:10, height:10 }}/>}
                            {summaryTtsId === 'enc' ? 'playing' : 'Listen'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })() : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:12 }}>
                    <BookOpen style={{ width:32, height:32, color:'#333' }}/>
                    <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'#444', margin:0 }}>Click "Smart Summary" to generate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PDF LANGUAGE PICKER MODAL ─────────────────────────────────────── */}
        {showPdfLangPicker && (
          <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPdfLangPicker(false) }}
          >
            <div style={{ background:'#0F0F0F', border:'1px solid #2A2A2A', borderRadius:16, padding:'28px 32px', width:380, boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                    ...(pdfLangPickerFor === 'whatsapp'
                      ? { background:'linear-gradient(135deg,#0A1A0F,#061208)', border:'1px solid #25D36644' }
                      : { background:'linear-gradient(135deg,#1A0F2E,#0F0A1A)', border:'1px solid #A78BFA44' })
                  }}>
                    {pdfLangPickerFor === 'whatsapp' ? '💬' : '📄'}
                  </div>
                  <div>
                    <p style={{ fontFamily:'DM Sans,sans-serif', fontSize:14, fontWeight:700, color:'#E8E8E8', margin:0 }}>
                      {pdfLangPickerFor === 'download' ? 'Download PDF'
                        : pdfLangPickerFor === 'export' ? 'Export PDF to Cloud'
                        : 'Send Report via WhatsApp'}
                    </p>
                    <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#555', margin:'2px 0 0' }}>
                      {pdfLangPickerFor === 'whatsapp' ? 'Choose language → PDF sent to patient' : 'Choose report language'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPdfLangPicker(false)}
                  style={{ width:28, height:28, borderRadius:8, border:'1px solid #2A2A2A', background:'#141414', color:'#666', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>✕</button>
              </div>

              {/* Language Cards */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                {([
                  { lang: 'ENGLISH' as LangKey, flag: '🇬🇧', native: 'English',   script: 'EN', accent: '#00D4FF', bg: '#001824', border: '#00D4FF' },
                  { lang: 'HINDI'   as LangKey, flag: '🇮🇳', native: 'हिंदी',      script: 'हि', accent: '#F59E0B', bg: '#1A1200', border: '#F59E0B' },
                  { lang: 'KANNADA' as LangKey, flag: '🏛️', native: 'ಕನ್ನಡ',     script: 'ಕ',  accent: '#34D399', bg: '#001A0F', border: '#34D399' },
                ]).map(({ lang, flag, native, script, accent, bg, border }) => (
                  <button
                    key={lang}
                    onClick={() => onSelectPdfLang(lang)}
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                      padding:'16px 8px', borderRadius:12, cursor:'pointer', transition:'all .2s',
                      background: bg, border: `1px solid ${accent}44`,
                      outline:'none',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${border}AA`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${border}22` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${border}44`; (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
                  >
                    <span style={{ fontSize:24 }}>{flag}</span>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:22, fontWeight:700, color: accent, lineHeight:1 }}>{script}</span>
                    <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:11, color:'#AAA', fontWeight:500 }}>{native}</span>
                  </button>
                ))}
              </div>

              {/* Hint */}
              <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#444', textAlign:'center', lineHeight:1.5, margin:0 }}>
                Hindi & Kannada versions are AI-translated.<br/>English is the original generated report.
              </p>
            </div>
          </div>
        )}

        </>
        )}

        {/* ── SCHEDULE TAB ────────────────────────────────────────────────── */}
        {sessionTab === 'schedule' && (
        <>
        {/* ══ APPOINTMENT SCHEDULER ══════════════════════════════════════════ */}
        <div className="px-4 mt-3">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-sm text-[#888]">Appointment & Call</span>
                {appointments.length > 0 && <span className="mono text-xs text-[#333]">({appointments.length} scheduled)</span>}
              </div>
              <button onClick={() => setShowScheduler(s => !s)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#0F0A1A] border border-[#A78BFA44] text-[#A78BFA] hover:border-[#A78BFA88] transition-all">
                {showScheduler ? '✕ Cancel' : '+ Schedule Call'}
              </button>
            </div>

            {apptSuccess && (
              <div style={{ padding:'10px 14px', background:'#0A1D0F', border:'1px solid #00F5A044', borderRadius:8, color:'#00F5A0', fontSize:12, marginBottom:12, fontFamily:'IBM Plex Mono, monospace' }}>
                ✓ {apptSuccess}
              </div>
            )}

            {showScheduler && (
              <div style={{ background:'#0F0F0F', border:'1px solid #2A2A2A', borderRadius:10, padding:20, marginBottom:12 }}>
                <p style={{ fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
                  {session.domain === 'HEALTHCARE' ? 'Patient' : 'Client'}: <span style={{ color:'#A78BFA' }}>{session.person.name}</span> · {session.person.phone}
                </p>

                {/* Mode Toggle */}
                <div style={{ display:'flex', gap:2, padding:3, background:'#0A0A0A', borderRadius:8, marginBottom:16, border:'1px solid #1E1E1E' }}>
                  {(['now', 'schedule'] as const).map(m => (
                    <button key={m} onClick={() => setCallMode(m)}
                      style={{ flex:1, padding:'8px 16px', borderRadius:6, border:'none', fontSize:12, fontFamily:'IBM Plex Mono, monospace', fontWeight:600, cursor:'pointer', transition:'all .2s',
                        background: callMode === m ? '#141414' : 'transparent',
                        color: callMode === m ? (m === 'now' ? '#00F5A0' : '#A78BFA') : '#555',
                        borderColor: callMode === m ? '#2A2A2A' : 'transparent',
                        borderWidth:1, borderStyle:'solid',
                      }}>
                      {m === 'now' ? '📞 Call Now' : '📅 Schedule Call'}
                    </button>
                  ))}
                </div>

                {/* Date/Time - only for schedule mode */}
                {callMode === 'schedule' && (
                  <div className="appt-grid-3" style={{ marginBottom:12 }}>
                    <div>
                      <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Date *</label>
                      <input type="date" className="dark-input" value={apptDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setApptDate(e.target.value)} style={{ colorScheme:'dark' }}/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Time *</label>
                      <input type="time" className="dark-input" value={apptTime}
                        onChange={e => setApptTime(e.target.value)} style={{ colorScheme:'dark' }}/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Notes (spoken in call)</label>
                      <input className="dark-input" placeholder="e.g. Bring previous reports" value={apptNotes}
                        onChange={e => setApptNotes(e.target.value)}/>
                    </div>
                  </div>
                )}

                {/* Notes for Call Now mode */}
                {callMode === 'now' && (
                  <div style={{ marginBottom:12 }}>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Notes (spoken in call)</label>
                    <input className="dark-input" placeholder="e.g. Urgent follow-up needed" value={apptNotes}
                      onChange={e => setApptNotes(e.target.value)}/>
                  </div>
                )}

                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                    Custom Call Script <span style={{ color:'#333', textTransform:'none', letterSpacing:0 }}>(leave blank to auto-generate)</span>
                  </label>
                  <textarea className="script-textarea"
                    placeholder={`Hello ${session.person.name || 'patient'}. Your appointment is confirmed...`}
                    value={customCallMsg}
                    onChange={e => setCustomCallMsg(e.target.value)}/>
                </div>
                <div style={{ padding:'10px 14px', background:'#0A0A1A', border:'1px solid #A78BFA22', borderRadius:8, marginBottom:16 }}>
                  <p style={{ fontSize:11, color:'#666', fontFamily:'IBM Plex Mono, monospace' }}>
                    📞 Twilio will call <span style={{ color:'#A78BFA' }}>+91{session.person.phone}</span>
                    {callMode === 'now' ? ' immediately' : ` on ${apptDate || '...'} at ${apptTime || '...'}`}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display:'flex', gap:10 }}>
                  {callMode === 'now' ? (
                    <button onClick={() => scheduleAppointment('now')} disabled={scheduling}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', background:'#0A1D0F', border:'1px solid #00F5A066', borderRadius:10, color:'#00F5A0', fontSize:13, fontWeight:600, cursor:scheduling?'not-allowed':'pointer', transition:'all .2s' }}>
                      {scheduling
                        ? <><span style={{ width:14, height:14, border:'2px solid #00F5A044', borderTopColor:'#00F5A0', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Calling…</>
                        : <>📞 Call Now</>
                      }
                    </button>
                  ) : (
                    <button onClick={() => scheduleAppointment('schedule')} disabled={!apptDate || !apptTime || scheduling}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', background:'#0F0A1A', border:'1px solid #A78BFA66', borderRadius:10, color:'#A78BFA', fontSize:13, fontWeight:600, cursor:(!apptDate||!apptTime||scheduling)?'not-allowed':'pointer', opacity:(!apptDate||!apptTime)?0.5:1, transition:'all .2s' }}>
                      {scheduling
                        ? <><span style={{ width:14, height:14, border:'2px solid #A78BFA44', borderTopColor:'#A78BFA', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Scheduling…</>
                        : <>📅 Schedule Call</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )}

            {appointments.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {appointments.map((apt: any) => (
                  <div key={apt.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#0D0D0D', border:'1px solid #1E1E1E', borderRadius:8 }}>
                    <div>
                      <p style={{ fontSize:12, color:'#CCC', fontFamily:'IBM Plex Mono, monospace' }}>
                        {new Date(apt.appointmentDate).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}
                      </p>
                      {apt.notes && <p style={{ fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', marginTop:2 }}>{apt.notes}</p>}
                    </div>
                    <span style={{ padding:'3px 10px', borderRadius:4, fontSize:10, fontFamily:'IBM Plex Mono, monospace', background:'#0F0A1A', border:'1px solid #A78BFA33', color:'#A78BFA' }}>
                      📞 {apt.callStatus || 'initiated'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ DOMAIN-SPECIFIC: MEDICATION (Healthcare) / INVESTMENT REMINDERS (Finance) ═══ */}
        {session.domain === 'HEALTHCARE' ? (
        <div className="px-4 mt-3 pb-8">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#34D399]"/>
                <span className="text-sm text-[#888]">Medication Schedule</span>
                {medications.length > 0 && <span className="mono text-xs text-[#333]">({medications.length} medicine{medications.length > 1 ? 's' : ''})</span>}
              </div>
              <button
                onClick={() => { if (!showMedForm || editingMedId) { setNewMed(EMPTY_MED()); setEditingMedId(null) } setShowMedForm(s => !s) }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#051A10] border border-[#34D39944] text-[#34D399] hover:border-[#34D39988] transition-all">
                {showMedForm && !editingMedId ? '✕ Cancel' : '+ Add Medicine'}
              </button>
            </div>

            {showMedForm && (
              <div style={{ background:'#0A0A0A', border:'1px solid #1E1E1E', borderRadius:10, padding:20, marginBottom:16 }}>
                <p style={{ fontSize:10, color:'#34D399', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
                  {editingMedId ? '✎ Edit Medication' : '+ New Medication'}
                </p>
                <div className="appt-grid" style={{ marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Medicine Name *</label>
                    <input className="dark-input" placeholder="e.g. Paracetamol" value={newMed.name}
                      onChange={e => setNewMed({ ...newMed, name: e.target.value })}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Dosage</label>
                    <input className="dark-input" placeholder="e.g. 500mg · 1 tablet" value={newMed.dosage}
                      onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}/>
                  </div>
                </div>
                <div className="appt-grid-3" style={{ marginBottom:16 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Frequency</label>
                    <select className="freq-select" value={newMed.frequency}
                      onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}>
                      {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Start Date</label>
                    <input type="date" className="dark-input" value={newMed.startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setNewMed({ ...newMed, startDate: e.target.value })} style={{ colorScheme:'dark' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>End Date</label>
                    <input type="date" className="dark-input" value={newMed.endDate}
                      min={newMed.startDate || new Date().toISOString().split('T')[0]}
                      onChange={e => setNewMed({ ...newMed, endDate: e.target.value })} style={{ colorScheme:'dark' }}/>
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
                    Timing & Reminder Call Times
                  </label>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {(['morning','afternoon','night'] as const).map(slot => {
                      const meta = TIMING_META[slot]
                      const isOn = newMed.timing[slot].enabled
                      return (
                        <div key={slot} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#111', border:`1px solid ${isOn ? meta.color+'33' : '#1E1E1E'}`, borderRadius:8, transition:'border-color .15s' }}>
                          <button
                            onClick={() => setNewMed({ ...newMed, timing: { ...newMed.timing, [slot]: { ...newMed.timing[slot], enabled: !isOn } } })}
                            className={`timing-pill ${isOn ? meta.activeCls : 'timing-inactive'}`}>
                            <span>{meta.emoji}</span>
                            <span>{meta.label}</span>
                          </button>
                          {isOn ? (
                            <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                              <label style={{ fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', whiteSpace:'nowrap' }}>Reminder call at:</label>
                              <input type="time" className="dark-input"
                                style={{ maxWidth:130, colorScheme:'dark', borderColor:`${meta.color}44` }}
                                value={newMed.timing[slot].time}
                                onChange={e => setNewMed({ ...newMed, timing: { ...newMed.timing, [slot]: { ...newMed.timing[slot], time: e.target.value } } })}/>
                            </div>
                          ) : (
                            <span style={{ fontSize:11, color:'#2A2A2A', fontFamily:'IBM Plex Mono, monospace' }}>click to enable</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                    Special Instructions
                  </label>
                  <input className="dark-input" placeholder="e.g. Take with food, avoid dairy for 2 hours" value={newMed.notes}
                    onChange={e => setNewMed({ ...newMed, notes: e.target.value })}/>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveMedication} disabled={savingMed || !newMed.name.trim()}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:'#051A10', border:'1px solid #34D39966', borderRadius:10, color:'#34D399', fontSize:13, fontWeight:600, cursor:'pointer', opacity:!newMed.name.trim()?0.5:1, transition:'all .2s' }}>
                    {savingMed
                      ? <><span style={{ width:12, height:12, border:'2px solid #34D39944', borderTopColor:'#34D399', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Saving…</>
                      : <>{editingMedId ? 'Update Medication' : 'Save Medication'}</>
                    }
                  </button>
                  <button onClick={() => { setShowMedForm(false); setEditingMedId(null); setNewMed(EMPTY_MED()) }}
                    style={{ padding:'10px 18px', background:'transparent', border:'1px solid #2A2A2A', borderRadius:10, color:'#666', fontSize:13, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {medications.length === 0 && !showMedForm && (
              <p style={{ fontSize:12, color:'#333', fontFamily:'IBM Plex Mono, monospace', textAlign:'center', padding:'28px 0' }}>
                No medications added yet — click "+ Add Medicine" to prescribe
              </p>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {medications.map((med: any) => (
                <div key={med.id} className="med-card">
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'#E8E8E8' }}>{med.name}</span>
                        {med.dosage && (
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'#051A10', border:'1px solid #34D39922', color:'#34D399', fontFamily:'IBM Plex Mono, monospace' }}>
                            {med.dosage}
                          </span>
                        )}
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'#111', border:'1px solid #2A2A2A', color:'#666', fontFamily:'IBM Plex Mono, monospace' }}>
                          {FREQ_OPTIONS.find(o => o.value === med.frequency)?.label || med.frequency}
                        </span>
                      </div>
                      {(med.startDate || med.endDate) && (
                        <p style={{ fontSize:10, color:'#444', fontFamily:'IBM Plex Mono, monospace', marginTop:4 }}>
                          {med.startDate && `From ${med.startDate}`}{med.endDate && ` → ${med.endDate}`}
                        </p>
                      )}
                      {med.notes && <p style={{ fontSize:11, color:'#555', marginTop:4, fontStyle:'italic' }}>{med.notes}</p>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => startEditMed(med)}
                        style={{ padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid #2A2A2A', color:'#666', fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono, monospace' }}>
                        ✎ Edit
                      </button>
                      <button onClick={() => deleteMedication(med.id)}
                        style={{ padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid #F8717122', color:'#F87171', fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono, monospace' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {(['morning','afternoon','night'] as const).map(slot => {
                      const slotData = med.timing?.[slot]
                      if (!slotData?.enabled) return null
                      const meta    = TIMING_META[slot]
                      const callKey = `${med.id}-${slot}`
                      const isCalling = callingMed === callKey
                      return (
                        <div key={slot} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#0A0A0A', border:`1px solid ${meta.color}22`, borderRadius:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:14 }}>{meta.emoji}</span>
                            <span style={{ fontSize:12, color:meta.color, fontFamily:'IBM Plex Mono, monospace', fontWeight:600 }}>{meta.label}</span>
                            <span style={{ fontSize:11, color:'#555', fontFamily:'IBM Plex Mono, monospace' }}>@ {slotData.time}</span>
                          </div>
                          <button
                            className="call-btn"
                            style={{ background:`${meta.color}11`, borderColor:`${meta.color}44`, color:meta.color }}
                            disabled={!!callingMed}
                            onClick={() => triggerMedCall(med, slot)}>
                            {isCalling
                              ? <><span style={{ width:9, height:9, border:`1.5px solid ${meta.color}44`, borderTopColor:meta.color, borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Calling…</>
                              : <>📞 Call Now</>
                            }
                          </button>
                        </div>
                      )
                    })}
                    {!(['morning','afternoon','night'] as const).some(s => med.timing?.[s]?.enabled) && (
                      <p style={{ fontSize:11, color:'#333', fontFamily:'IBM Plex Mono, monospace', padding:'6px 0' }}>No reminder times set</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
        /* ══ FINANCE: INVESTMENT REMINDERS ═══════════════════════════════════ */
        <div className="px-4 mt-3 pb-8">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FBBF24]"/>
                <span className="text-sm text-[#888]">Investment Reminders</span>
                {finReminders.length > 0 && <span className="mono text-xs text-[#333]">({finReminders.length} reminder{finReminders.length > 1 ? 's' : ''})</span>}
              </div>
              <button
                onClick={() => { if (!showFinForm || editingFinId) { setNewFin(EMPTY_FIN()); setEditingFinId(null) } setShowFinForm(s => !s) }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium bg-[#1A1200] border border-[#FBBF2444] text-[#FBBF24] hover:border-[#FBBF2488] transition-all">
                {showFinForm && !editingFinId ? '✕ Cancel' : '+ Add Reminder'}
              </button>
            </div>

            {showFinForm && (
              <div style={{ background:'#0A0A0A', border:'1px solid #1E1E1E', borderRadius:10, padding:20, marginBottom:16 }}>
                <p style={{ fontSize:10, color:'#FBBF24', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
                  {editingFinId ? '✎ Edit Reminder' : '+ New Investment Reminder'}
                </p>
                <div className="appt-grid" style={{ marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Reminder Title *</label>
                    <input className="dark-input" placeholder="e.g. Buy Reliance shares" value={newFin.title}
                      onChange={e => setNewFin({ ...newFin, title: e.target.value })}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Stock / Fund Name</label>
                    <input className="dark-input" placeholder="e.g. RELIANCE, NIFTY 50 ETF" value={newFin.stockName}
                      onChange={e => setNewFin({ ...newFin, stockName: e.target.value })}/>
                  </div>
                </div>
                <div className="appt-grid-3" style={{ marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Quantity to Buy</label>
                    <input className="dark-input" placeholder="e.g. 50 shares" value={newFin.quantity}
                      onChange={e => setNewFin({ ...newFin, quantity: e.target.value })}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Target Price</label>
                    <input className="dark-input" placeholder="e.g. ₹2,400" value={newFin.buyPrice}
                      onChange={e => setNewFin({ ...newFin, buyPrice: e.target.value })}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Buy By Date</label>
                    <input type="date" className="dark-input" value={newFin.buyDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setNewFin({ ...newFin, buyDate: e.target.value })} style={{ colorScheme:'dark' }}/>
                  </div>
                </div>
                <div className="appt-grid" style={{ marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Reminder Call Date</label>
                    <input type="date" className="dark-input" value={newFin.callDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setNewFin({ ...newFin, callDate: e.target.value })} style={{ colorScheme:'dark' }}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Reminder Call Time</label>
                    <input type="time" className="dark-input" value={newFin.callTime}
                      onChange={e => setNewFin({ ...newFin, callTime: e.target.value })} style={{ colorScheme:'dark' }}/>
                  </div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
                    Custom Call Message <span style={{ color:'#333', textTransform:'none', letterSpacing:0 }}>(leave blank for auto)</span>
                  </label>
                  <textarea className="script-textarea" style={{ minHeight:60 }}
                    placeholder={`Hello ${session.person?.name || 'client'}. This is a reminder to invest in...`}
                    value={newFin.customMessage}
                    onChange={e => setNewFin({ ...newFin, customMessage: e.target.value })}/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, color:'#555', fontFamily:'IBM Plex Mono, monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Notes</label>
                  <input className="dark-input" placeholder="e.g. SIP allocation, risk factor" value={newFin.notes}
                    onChange={e => setNewFin({ ...newFin, notes: e.target.value })}/>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveFinReminder} disabled={savingFin || !newFin.title.trim()}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:'#1A1200', border:'1px solid #FBBF2466', borderRadius:10, color:'#FBBF24', fontSize:13, fontWeight:600, cursor:'pointer', opacity:!newFin.title.trim()?0.5:1, transition:'all .2s' }}>
                    {savingFin
                      ? <><span style={{ width:12, height:12, border:'2px solid #FBBF2444', borderTopColor:'#FBBF24', borderRadius:'50%', display:'inline-block', animation:'spin .8s linear infinite' }}/> Saving…</>
                      : <>{editingFinId ? 'Update Reminder' : 'Save Reminder'}</>
                    }
                  </button>
                  <button onClick={() => { setShowFinForm(false); setEditingFinId(null); setNewFin(EMPTY_FIN()) }}
                    style={{ padding:'10px 18px', background:'transparent', border:'1px solid #2A2A2A', borderRadius:10, color:'#666', fontSize:13, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {finReminders.length === 0 && !showFinForm && (
              <p style={{ fontSize:12, color:'#333', fontFamily:'IBM Plex Mono, monospace', textAlign:'center', padding:'28px 0' }}>
                No investment reminders yet — click "+ Add Reminder" to create one
              </p>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {finReminders.map((rem: any) => (
                <div key={rem.id} className="med-card" style={{ borderColor:'#FBBF2422' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'#E8E8E8' }}>{rem.title}</span>
                        {rem.stockName && (
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:4, background:'#1A1200', border:'1px solid #FBBF2422', color:'#FBBF24', fontFamily:'IBM Plex Mono, monospace' }}>
                            📈 {rem.stockName}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
                        {rem.quantity && <span style={{ fontSize:11, color:'#666', fontFamily:'IBM Plex Mono, monospace' }}>Qty: <span style={{ color:'#AAA' }}>{rem.quantity}</span></span>}
                        {rem.buyPrice && <span style={{ fontSize:11, color:'#666', fontFamily:'IBM Plex Mono, monospace' }}>Price: <span style={{ color:'#34D399' }}>{rem.buyPrice}</span></span>}
                        {rem.buyDate && <span style={{ fontSize:11, color:'#666', fontFamily:'IBM Plex Mono, monospace' }}>Buy by: <span style={{ color:'#AAA' }}>{rem.buyDate}</span></span>}
                      </div>
                      {rem.callDate && (
                        <p style={{ fontSize:10, color:'#A78BFA', fontFamily:'IBM Plex Mono, monospace', marginTop:4 }}>
                          📞 Reminder call: {rem.callDate}{rem.callTime ? ` at ${rem.callTime}` : ''}
                        </p>
                      )}
                      {rem.notes && <p style={{ fontSize:11, color:'#555', marginTop:4, fontStyle:'italic' }}>{rem.notes}</p>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => startEditFin(rem)}
                        style={{ padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid #2A2A2A', color:'#666', fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono, monospace' }}>
                        ✎ Edit
                      </button>
                      <button onClick={() => deleteFinReminder(rem.id)}
                        style={{ padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid #F8717122', color:'#F87171', fontSize:11, cursor:'pointer', fontFamily:'IBM Plex Mono, monospace' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
        </>
        )}


      </div>
    </>
  )
}