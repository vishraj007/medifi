'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, Download, Check, Send, Sparkles, Stethoscope, User,
  Loader2, Mic, MicOff, Volume2, ChevronRight,
  Activity, Clock, Zap, Brain, X, ChevronDown, ChevronUp,
  Pencil, CheckCheck, Bold, Italic, List, Underline, Minus, Plus,
  MessageCircle, Calendar, Pill, BookOpen, Globe, Languages, Phone
} from 'lucide-react'
import { useSessionPolling } from '@/lib/hooks/useSessionPolling'
import { generatePDFClient } from '@/lib/pdf/client-generator'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Utterance {
  id: string
  text: string
  detectedLanguage: string
  timestamp: Date
}

type SpeakerLabel = 'doctor' | 'patient'

interface LabeledLine {
  text: string
  speaker: SpeakerLabel
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SingleSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  // ── Core ──
  const [session, setSession] = useState<any>(null)
  const [utterances, setUtterances] = useState<Utterance[]>([])
  const [extractedData, setExtractedData] = useState<any>({})
  const [nerEntities, setNerEntities] = useState<any>({})
  const [report, setReport] = useState('')
  const [exports, setExports] = useState<any[]>([])

  // ── Language ──
  const [selectedLanguage, setSelectedLanguage] = useState<LangKey | 'AUTO'>('AUTO')
  const [detectedLang, setDetectedLang] = useState<string>('')

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // ── Transcript ──
  const [showTranscript, setShowTranscript] = useState(false)
  const [fullTranscript, setFullTranscript] = useState('')
  const [transcriptLang, setTranscriptLang] = useState<LangKey>('ENGLISH')
  const [translatingTranscript, setTranslatingTranscript] = useState(false)
  const [originalTranscript, setOriginalTranscript] = useState('')
  const [labeledLines, setLabeledLines] = useState<LabeledLine[]>([])
  const [labelingInProgress, setLabelingInProgress] = useState(false)
  const [originalLabeledLines, setOriginalLabeledLines] = useState<LabeledLine[]>([])

  // ── AI ──
  const [aiQuestions, setAiQuestions] = useState<string[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [manualQuestion, setManualQuestion] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // ── Report ──
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'entities' | 'data'>('entities')
  const [sessionTab, setSessionTab] = useState<'chat' | 'schedule' | 'report'>('chat')
  const [reportExpanded, setReportExpanded] = useState(false)
  const [reportEditMode, setReportEditMode] = useState<'view' | 'edit'>('view')
  const [reportHtmlDraft, setReportHtmlDraft] = useState('')
  const [savingReport, setSavingReport] = useState(false)

  // ── Summary ──
  const [showSummary, setShowSummary] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  // ── PDF lang ── 
  const [showPdfLangPicker, setShowPdfLangPicker] = useState(false)
  const [pdfLangPickerFor, setPdfLangPickerFor] = useState<'download' | 'export' | 'whatsapp'>('download')
  const [translatingReport, setTranslatingReport] = useState(false)
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)

  // ── Appointments ──
  const [appointments, setAppointments] = useState<any[]>([])
  const [showScheduler, setShowScheduler] = useState(false)
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('')
  const [apptNotes, setApptNotes] = useState('')
  const [customCallMsg, setCustomCallMsg] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [apptSuccess, setApptSuccess] = useState<string | null>(null)
  const [callMode, setCallMode] = useState<'now' | 'schedule'>('schedule')

  // ── Medications ──
  const [medications, setMedications] = useState<any[]>([])
  const [showMedForm, setShowMedForm] = useState(false)
  const [newMed, setNewMed] = useState(EMPTY_MED())
  const [editingMedId, setEditingMedId] = useState<string | null>(null)
  const [savingMed, setSavingMed] = useState(false)
  const [callingMed, setCallingMed] = useState<string | null>(null)

  // ── Finance Investment Reminders ──
  const [finReminders, setFinReminders] = useState<any[]>([])
  const [showFinForm, setShowFinForm] = useState(false)
  const [editingFinId, setEditingFinId] = useState<string | null>(null)
  const [savingFin, setSavingFin] = useState(false)
  const [newFin, setNewFin] = useState({ id: '', title: '', stockName: '', quantity: '', buyPrice: '', buyDate: '', callDate: '', callTime: '', customMessage: '', notes: '' })

  // ── Refs ──
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const utterancesRef = useRef<Utterance[]>([])

  useEffect(() => { utterancesRef.current = utterances }, [utterances])

  const { data: sessionData } = useSessionPolling(sessionId, 5000)

  // ── Effects ──
  useEffect(() => { loadSession() }, [])

  useEffect(() => {
    if (sessionData) {
      if (sessionData.extractedData) setExtractedData(sessionData.extractedData)
      if (sessionData.nerEntities) setNerEntities(sessionData.nerEntities)
      if (sessionData.finalReport) setReport(sessionData.finalReport)
    }
  }, [sessionData])

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [utterances])

  // ── Loaders ──
  const loadSession = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`)
      const data = await res.json()
      
      // Redirect if this is a MULTI session
      if (data.sessionMode === 'MULTI') {
        router.replace(`/session/${data.id}`)
        return
      }
      
      setSession(data)
      if (data.interactions?.length > 0) {
        setUtterances(data.interactions.map((i: any) => ({
          id: i.id,
          text: i.text,
          detectedLanguage: i.translated || 'ENGLISH',
          timestamp: new Date(i.timestamp),
        })))
      }
      setExtractedData(data.extractedData || {})
      setNerEntities(data.nerEntities || {})
      setReport(data.finalReport || '')
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

  const loadFinReminders = async () => {
    try {
      const r = await fetch(`/api/finance-reminders/${sessionId}`)
      if (r.ok) { const d = await r.json(); setFinReminders(d.reminders || []) }
    } catch {}
  }

  // ── Recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(blob)
      }
      recorder.start()
      setIsRecording(true)
    } catch { alert('Microphone access denied') }
  }

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop()
      setIsRecording(false)
      recorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    try {
      const fd = new FormData()
      fd.append('audio', audioBlob)
      if (selectedLanguage !== 'AUTO') fd.append('language', selectedLanguage)

      const tRes = await fetch('/api/voice/transcribe-detect', { method: 'POST', body: fd })
      if (!tRes.ok) throw new Error('Transcription failed')
      const { transcript, detectedLanguage, languageCode } = await tRes.json()

      if (!transcript?.trim()) { setIsProcessing(false); return }

      setDetectedLang(detectedLanguage)

      const newUtterance: Utterance = {
        id: Date.now().toString(),
        text: transcript,
        detectedLanguage,
        timestamp: new Date(),
      }
      setUtterances(prev => [...prev, newUtterance])

      // Persist
      await fetch(`/api/session/${sessionId}/add-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker: 'doctor', text: transcript, translated: detectedLanguage })
      })

      // NER extraction
      const allText = [...utterancesRef.current, newUtterance].map(u => u.text).join('\n')
      
      // If not English, translate to English first for NER
      let englishText = allText
      if (detectedLanguage !== 'ENGLISH') {
        try {
          const trRes = await fetch('/api/voice/translate-all', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: allText, sourceLang: languageCode })
          })
          if (trRes.ok) {
            const { translations } = await trRes.json()
            englishText = translations.ENGLISH || allText
          }
        } catch {}
      }

      const nerRes = await fetch('/api/ai/extract-entities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText, useHuggingFace: session?.domain === 'HEALTHCARE', domain: session?.domain })
      })
      if (nerRes.ok) {
        const { entities } = await nerRes.json()
        setNerEntities(entities)
        await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nerEntities: entities })
        })
      }

      // Extract data
      const extRes = await fetch('/api/ai/extract-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishText, domain: session?.domain, department: session?.department, schema: session?.config?.schema })
      })
      if (extRes.ok) {
        const { extractedData: newData } = await extRes.json()
        setExtractedData(newData)
        await fetch(`/api/session/${sessionId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedData: newData })
        })
      }

      generateAIQuestions(englishText, session?.domain, session?.department)
    } catch (err) { console.error(err); alert('Failed to process audio') }
    finally { setIsProcessing(false) }
  }

  // ── AI Questions ──
  const generateAIQuestions = async (context: string, domain: string, department: string) => {
    setLoadingQuestions(true)
    try {
      const res = await fetch('/api/ai/suggest-questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, messages: utterancesRef.current.map(u => ({ speaker: 'doctor', text: u.text })), domain, department, extractedData, nerEntities })
      })
      if (res.ok) { const { questions } = await res.json(); setAiQuestions(questions || []) }
    } catch {}
    finally { setLoadingQuestions(false) }
  }

  const sendManualQuestion = async () => {
    if (!manualQuestion.trim()) return
    setSendingMessage(true)
    const newU: Utterance = { id: Date.now().toString(), text: manualQuestion.trim(), detectedLanguage: 'ENGLISH', timestamp: new Date() }
    setUtterances(prev => [...prev, newU])
    await fetch(`/api/session/${sessionId}/add-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker: 'doctor', text: manualQuestion.trim(), translated: 'ENGLISH' })
    })
    setManualQuestion('')
    setSendingMessage(false)
  }

  const selectAIQuestion = async (q: string) => {
    const newU: Utterance = { id: Date.now().toString(), text: q, detectedLanguage: 'ENGLISH', timestamp: new Date() }
    setUtterances(prev => [...prev, newU])
    await fetch(`/api/session/${sessionId}/add-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker: 'doctor', text: q, translated: 'ENGLISH' })
    })
    setAiQuestions([])
  }

  // ── Transcript ──
  const openTranscript = async () => {
    const sentences = utterances.map(u => u.text).filter(t => t.trim())
    const text = sentences.join('\n\n')
    setFullTranscript(text)
    setOriginalTranscript(text)
    setTranscriptLang('ENGLISH')
    setShowTranscript(true)
    setLabelingInProgress(true)

    // Call Groq to label each sentence as doctor or patient
    try {
      const res = await fetch('/api/ai/label-speakers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences, domain: session?.domain, department: session?.department })
      })
      if (res.ok) {
        const { labels } = await res.json()
        const labeled: LabeledLine[] = sentences.map((s: string, i: number) => ({
          text: s,
          speaker: (labels[i] || (i % 2 === 0 ? 'doctor' : 'patient')) as SpeakerLabel,
        }))
        setLabeledLines(labeled)
        setOriginalLabeledLines(labeled)
      } else {
        // Fallback: alternate doctor/patient
        const fallback: LabeledLine[] = sentences.map((s: string, i: number) => ({
          text: s,
          speaker: (i % 2 === 0 ? 'doctor' : 'patient') as SpeakerLabel,
        }))
        setLabeledLines(fallback)
        setOriginalLabeledLines(fallback)
      }
    } catch {
      const fallback: LabeledLine[] = sentences.map((s: string, i: number) => ({
        text: s,
        speaker: (i % 2 === 0 ? 'doctor' : 'patient') as SpeakerLabel,
      }))
      setLabeledLines(fallback)
      setOriginalLabeledLines(fallback)
    } finally {
      setLabelingInProgress(false)
    }
  }

  const translateTranscript = async (lang: LangKey) => {
    if (lang === transcriptLang) return
    setTranslatingTranscript(true)
    try {
      if (lang === 'ENGLISH') {
        setFullTranscript(originalTranscript)
        setLabeledLines(originalLabeledLines)
      } else {
        // Translate each sentence INDIVIDUALLY to preserve 1:1 mapping with speaker labels
        const translatedLines = await Promise.all(
          originalLabeledLines.map(async (line) => {
            try {
              const res = await fetch('/api/voice/translate-all', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: line.text, sourceLang: 'en-IN' })
              })
              if (res.ok) {
                const { translations } = await res.json()
                return translations[lang] || line.text
              }
              return line.text
            } catch { return line.text }
          })
        )
        const newLabeled: LabeledLine[] = originalLabeledLines.map((ol, i) => ({
          text: translatedLines[i],
          speaker: ol.speaker,
        }))
        setLabeledLines(newLabeled)
        setFullTranscript(translatedLines.join('\n\n'))
      }
      setTranscriptLang(lang)
    } catch {}
    finally { setTranslatingTranscript(false) }
  }

  const saveTranscript = async () => {
    // Build labeled transcript text for saving
    const labeledText = labeledLines.map(l => `[${l.speaker === 'doctor' ? 'Doctor' : 'Patient'}]: ${l.text}`).join('\n\n')
    await fetch(`/api/session/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: labeledText })
    })
    alert('Transcript saved!')
  }

  // ── Report ──
  const generateReport = async () => {
    setGenerating(true)
    try {
      const text = utterances.map(u => u.text).join('\n')
      // Translate to English for report if needed
      let englishText = text
      if (detectedLang && detectedLang !== 'ENGLISH') {
        const trRes = await fetch('/api/voice/translate-all', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sourceLang: LANG_CODES[detectedLang as LangKey] || 'en-IN' })
        })
        if (trRes.ok) {
          const { translations } = await trRes.json()
          englishText = translations.ENGLISH || text
        }
      }
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishText, extractedData, nerEntities, domain: session.domain, department: session.department, template: session.config?.template, personName: session.person.name })
      })
      const { report: generated } = await res.json()
      await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalReport: generated }) })
      setReport(generated)
      setReportExpanded(true)
    } catch (err) { console.error(err) }
    finally { setGenerating(false) }
  }

  const approveReport = async () => {
    await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: true, approvedAt: new Date(), status: 'COMPLETED' }) })
    loadSession()
  }

  const getTranslatedReportHtml = async (lang: LangKey): Promise<string> => {
    if (lang === 'ENGLISH') return report
    setTranslatingReport(true)
    try {
      const res = await fetch('/api/ai/translate-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: report, targetLang: lang }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Translation failed')
      return data.translatedHtml || report
    } catch { return report }
    finally { setTranslatingReport(false) }
  }

  const downloadReport = async (lang: LangKey = 'ENGLISH') => {
    if (!report) return
    setDownloading(true)
    try {
      const htmlToUse = await getTranslatedReportHtml(lang)
      const el = document.getElementById('report-content')
      const orig = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) { el.innerHTML = htmlToUse; await new Promise(r => setTimeout(r, 100)) }
      const pdfBlob = await generatePDFClient('report-content')
      if (lang !== 'ENGLISH' && el) el.innerHTML = orig
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a'); a.href = url
      a.download = `${(session?.person?.name || 'report').replace(/\s+/g, '_').toLowerCase()}_single_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err) { console.error(err) }
    finally { setDownloading(false) }
  }

  const openReportEdit = () => { setReportHtmlDraft(report); setReportEditMode('edit'); setReportExpanded(true) }
  const cancelReportEdit = () => { setReportEditMode('view'); setReportHtmlDraft('') }
  const saveReportEdit = async () => {
    setSavingReport(true)
    try {
      setReport(reportHtmlDraft)
      await fetch(`/api/session/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalReport: reportHtmlDraft }) })
      setReportEditMode('view')
    } catch {}
    finally { setSavingReport(false) }
  }

  const generateSummary = async () => {
    setGeneratingSummary(true); setShowSummary(true)
    try {
      const text = utterances.map(u => u.text).join('\n')
      const res = await fetch('/api/ai/generate-summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, extractedData, nerEntities, domain: session.domain, department: session.department, personName: session.person.name, transcript: text })
      })
      if (res.ok) { const { summary: s } = await res.json(); setSummary(s) }
    } catch {}
    finally { setGeneratingSummary(false) }
  }

  // ── PDF language picker ──
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

  // ── Export PDF to Cloud ──
  const exportPDF = async (lang: LangKey = 'ENGLISH') => {
    setExporting(true)
    try {
      const htmlToUse = await getTranslatedReportHtml(lang)
      const el = document.getElementById('report-content')
      const originalHtml = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) { el.innerHTML = htmlToUse; await new Promise(r => setTimeout(r, 100)) }
      const pdfBlob = await generatePDFClient('report-content')
      if (lang !== 'ENGLISH' && el) el.innerHTML = originalHtml
      const fd = new FormData(); fd.append('pdf', pdfBlob, 'report.pdf')
      const res = await fetch(`/api/session/${sessionId}/export-pdf`, { method: 'POST', body: fd })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert('Export failed: ' + (e.details || e.error || res.statusText)); return }
      const { pdfUrl } = await res.json()
      if (pdfUrl) { window.open(pdfUrl, '_blank'); await loadExports() }
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }

  // ── Send report to WhatsApp ──
  const sendReportToWhatsApp = async (lang: LangKey) => {
    if (!report) return
    setSendingWhatsapp(true)
    try {
      const htmlToUse = await getTranslatedReportHtml(lang)
      const el = document.getElementById('report-content')
      const originalHtml = el?.innerHTML || ''
      if (lang !== 'ENGLISH' && el) { el.innerHTML = htmlToUse; await new Promise(r => setTimeout(r, 100)) }
      const pdfBlob = await generatePDFClient('report-content')
      if (lang !== 'ENGLISH' && el) el.innerHTML = originalHtml
      const fd = new FormData()
      fd.append('pdf', pdfBlob, 'report.pdf')
      const uploadRes = await fetch(`/api/session/${sessionId}/export-pdf`, { method: 'POST', body: fd })
      if (!uploadRes.ok) {
        const e = await uploadRes.json().catch(() => ({}))
        alert('Upload failed: ' + (e.error || uploadRes.statusText))
        return
      }
      const { pdfUrl } = await uploadRes.json()
      await loadExports()
      const waRes = await fetch(`/api/session/${sessionId}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl, language: lang, patientName: session?.person?.name }),
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

  // ── Appointment ──
  const scheduleAppointment = async (mode: 'now' | 'schedule') => {
    if (mode === 'schedule' && (!apptDate || !apptTime)) return
    setScheduling(true); setApptSuccess(null)
    try {
      const body: any = { sessionId, callMode: mode, notes: apptNotes.trim() || null, customMessage: customCallMsg.trim() || null }
      if (mode === 'schedule') { body.appointmentDate = apptDate; body.appointmentTime = apptTime }
      const res = await fetch('/api/twilio/schedule-call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  // ── Medication CRUD ──
  const saveMedication = async () => {
    if (!newMed.name.trim()) return
    setSavingMed(true)
    try {
      const r = await fetch(`/api/medications/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medication: { ...newMed, id: editingMedId || newMed.id } })
      })
      if (r.ok) { const d = await r.json(); setMedications(d.medications); setNewMed(EMPTY_MED()); setShowMedForm(false); setEditingMedId(null) }
    } catch (e) { console.error(e) }
    finally { setSavingMed(false) }
  }

  const deleteMedication = async (medicationId: string) => {
    try {
      const r = await fetch(`/api/medications/${sessionId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicationId })
      })
      if (r.ok) { const d = await r.json(); setMedications(d.medications) }
    } catch {}
  }

  const triggerMedCall = async (med: any, timingLabel: string) => {
    setCallingMed(`${med.id}-${timingLabel}`)
    try {
      const r = await fetch('/api/twilio/medication-call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, medicationName: med.name, dosage: med.dosage, timingLabel, notes: med.notes })
      })
      const d = await r.json()
      if (d.success) alert(`✓ Call initiated! Status: ${d.callStatus}`)
      else alert('Call failed: ' + d.error)
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setCallingMed(null) }
  }

  const startEditMed = (med: any) => { setNewMed({ ...med }); setEditingMedId(med.id); setShowMedForm(true) }

  // ── Finance Investment Reminders CRUD ──
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

  // ── Loading ──
  if (!session) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#666] font-mono text-sm">Loading session...</p>
      </div>
    </div>
  )

  const entityCount = Object.values(nerEntities).flat().length

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .session-root { background:#0A0A0A; min-height:100vh; font-family:'DM Sans',sans-serif; }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .dark-card { background:#111111; border:1px solid #1E1E1E; border-radius:12px; }
        .dark-card-elevated { background:#141414; border:1px solid #242424; border-radius:12px; }
        .single-pulse { animation:single-ring 1.5s ease-out infinite; }
        @keyframes single-ring { 0%{box-shadow:0 0 0 0 rgba(0,212,255,.4);} 70%{box-shadow:0 0 0 24px rgba(0,212,255,0);} 100%{box-shadow:0 0 0 0 rgba(0,212,255,0);} }
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:#111;} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .entity-badge { font-size:11px;padding:2px 8px;border-radius:4px;font-family:'IBM Plex Mono',monospace;border:1px solid #2A2A2A;background:transparent; }
        .ai-q-card { background:#0F0F1A;border:1px solid #2A2A40;border-radius:8px;cursor:pointer;transition:all .15s ease;padding:10px 14px;text-align:left;width:100%; }
        .ai-q-card:hover { background:#151525;border-color:#6366f1;transform:translateY(-1px); }
        .lang-btn { font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 6px;border-radius:4px;border:1px solid #2A2A2A;background:transparent;color:#666;cursor:pointer;transition:all .1s; }
        .lang-btn:hover { background:#1A1A1A;color:#CCC; }
        .lang-btn.active { background:#001A24;border-color:#00D4FF;color:#00D4FF; }
        .lang-btn.active-auto { background:#1A0F00;border-color:#F59E0B;color:#F59E0B; }
        .dark-input { background:#0D0D0D;border:1px solid #2A2A2A;border-radius:8px;color:#E8E8E8;padding:8px 12px;font-size:13px;width:100%;outline:none;transition:border-color .15s; }
        .dark-input:focus { border-color:#00D4FF44; } .dark-input::placeholder { color:#444; }
        .btn-icon { display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;transition:all .15s;border:1px solid #2A2A2A;background:#141414;color:#888; }
        .btn-icon:hover { background:#1A1A1A;color:#CCC; }
        .mic-single { background:linear-gradient(135deg,#001824,#002535);border:2px solid #00D4FF44;color:#00D4FF; }
        .mic-single:hover { border-color:#00D4FF88;box-shadow:0 0 20px #00D4FF22; }
        .recording-active { border-color:#ef4444 !important;background:linear-gradient(135deg,#1A0505,#200A0A) !important; }
        .status-active { color:#00F5A0;background:#001A0F;border:1px solid #00F5A022; }
        .status-completed { color:#00D4FF;background:#001824;border:1px solid #00D4FF22; }
        .section-label { font-size:10px;font-family:'IBM Plex Mono',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px; }
        .fade-in { animation:fadeIn .2s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;} }
        main { background:#0A0A0A !important; }
        .tab-bar { display:flex;gap:2px;padding:3px;background:#0D0D0D;border:1px solid #1E1E1E;border-radius:12px;margin:0 16px 12px; }
        .tab-btn { display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;background:transparent;color:#555;font-size:13px;font-family:'DM Sans',sans-serif;font-weight:500;cursor:pointer;transition:all .2s;flex:1;justify-content:center; }
        .tab-btn:hover { color:#AAA;background:#111; }
        .tab-btn.tab-active { background:#141414;color:#E8E8E8;border:1px solid #242424;box-shadow:0 2px 8px rgba(0,0,0,.3); }
        .tab-icon { opacity:.4;transition:opacity .2s; }
        .tab-btn.tab-active .tab-icon { opacity:1; }
        .tab-badge { font-size:10px;padding:1px 6px;border-radius:10px;font-family:'IBM Plex Mono',monospace;margin-left:2px; }
        .utterance-bubble { background:linear-gradient(135deg,#0D1520 0%,#0A1218 100%); border:1px solid #00D4FF18; border-left:2px solid #00D4FF; border-radius:8px; padding:10px 14px; }
        @keyframes spin { to { transform:rotate(360deg) } }
        [contenteditable] h2 { font-size:14px;font-weight:700;color:#E8E8E8;margin:12px 0 6px;border-left:3px solid #00D4FF;padding-left:10px; }
        [contenteditable] h3 { font-size:13px;font-weight:700;color:#CCC;margin:10px 0 5px; }
        [contenteditable] p { margin:0 0 6px;color:#BBB; }
        [contenteditable] ul { padding-left:20px;margin:4px 0 8px;color:#BBB; }
        [contenteditable] li { margin-bottom:3px; }
        [contenteditable] strong { color:#E8E8E8;font-weight:700; }
        [contenteditable]:focus { outline:none; }
        .appt-grid   { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px; }
        .appt-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px; }
        .script-textarea { width:100%;min-height:80px;background:#0A0A0A;border:1px solid #2A2A2A;border-radius:8px;color:#E8E8E8;font-size:12px;line-height:1.65;padding:10px 12px;outline:none;resize:vertical;font-family:'DM Sans',sans-serif;transition:border-color .15s; }
        .script-textarea:focus { border-color:#A78BFA88; } .script-textarea::placeholder { color:#333; }
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
      `}</style>

      <div className="session-root pb-8">
        <audio ref={audioRef} className="hidden" />

        {/* ── HEADER ── */}
        <div className="dark-card mx-4 mt-4 mb-4 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D4FF]" />
              <span className="font-semibold text-[#E8E8E8] text-sm">{session.person.name || 'Unknown'}</span>
            </div>
            <span className="text-[#333]">|</span>
            <span className="mono text-xs text-[#555]">{session.department.replace(/_/g, ' ')}</span>
            <span className="text-[#333]">|</span>
            <span className={`mono text-xs px-2 py-0.5 rounded-full ${session.status === 'COMPLETED' ? 'status-completed' : 'status-active'}`}>
              ● {session.status}
            </span>
            <span className="text-[#333]">|</span>
            <span className="mono text-xs px-2 py-0.5 rounded-full bg-[#1A1200] border border-[#F59E0B22] text-[#F59E0B]">
              SINGLE LANG
            </span>
            {detectedLang && (
              <>
                <span className="text-[#333]">|</span>
                <span className="mono text-xs px-2 py-0.5 rounded-full bg-[#0A1A14] border border-[#34D39922] text-[#34D399]">
                  🌐 {detectedLang}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={generateSummary} disabled={generatingSummary || utterances.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0A1A14,#051A10)', border: '1px solid #34D39944', color: '#34D399', fontFamily: 'IBM Plex Mono,monospace' }}>
              {generatingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              {generatingSummary ? 'generating...' : 'Smart Summary'}
            </button>
            <span className="mono text-[#333] text-xs">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div className="tab-bar">
          {[
            { id: 'chat' as const, icon: MessageCircle, label: 'Chat', badge: utterances.length > 0 ? utterances.length : null, color: '#00D4FF' },
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

        {/* ── CHAT TAB ── */}
        {sessionTab === 'chat' && (
          <div className="px-4 grid grid-cols-12 gap-3">

            {/* LEFT: RECORDING + AI */}
            <div className="col-span-3 space-y-3">
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-[#E8E8E8] text-sm font-medium">Recording</span>
                  </div>
                </div>

                {/* Language selector */}
                <div className="mb-4">
                  <p className="section-label text-[#555]">Language</p>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setSelectedLanguage('AUTO')}
                      className={`lang-btn ${selectedLanguage === 'AUTO' ? 'active-auto' : ''}`}>
                      🔍 Auto
                    </button>
                    {(['ENGLISH', 'HINDI', 'KANNADA'] as LangKey[]).map(l => (
                      <button key={l} onClick={() => setSelectedLanguage(l)}
                        className={`lang-btn ${selectedLanguage === l ? 'active' : ''}`}>
                        {LANG_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mic button */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    disabled={isProcessing}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${isRecording ? 'recording-active single-pulse' : isProcessing ? 'opacity-50 cursor-not-allowed mic-single' : 'mic-single'}`}>
                    {isProcessing ? <Loader2 className="w-7 h-7 text-[#00D4FF] animate-spin" /> : isRecording ? <MicOff className="w-7 h-7 text-[#ef4444]" /> : <Mic className="w-7 h-7" />}
                  </button>
                </div>
                <p className="text-center text-xs mono text-[#444] mb-4">
                  {isRecording ? '● REC – click to stop' : isProcessing ? 'processing...' : 'click to speak'}
                </p>

                {/* Manual input */}
                <div className="flex gap-2">
                  <input className="dark-input text-xs" placeholder="Type a note…" value={manualQuestion}
                    onChange={e => setManualQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendManualQuestion()} />
                  <button onClick={sendManualQuestion} disabled={!manualQuestion.trim() || sendingMessage}
                    className="btn-icon w-9 h-9 flex-shrink-0 disabled:opacity-40">
                    {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span className="text-xs font-medium text-[#A78BFA]">AI Suggestions</span>
                    {aiQuestions.length > 0 && <span className="mono text-xs text-[#555]">({aiQuestions.length})</span>}
                  </div>
                  {loadingQuestions && <Loader2 className="w-3 h-3 animate-spin text-[#555]" />}
                </div>
                <div className="space-y-2">
                  {aiQuestions.length === 0 && !loadingQuestions && (
                    <p className="text-xs text-[#333] mono text-center py-3">Suggestions appear after speech</p>
                  )}
                  {aiQuestions.map((q, i) => (
                    <button key={i} onClick={() => selectAIQuestion(q)} className="ai-q-card fade-in group">
                      <div className="flex items-start gap-2">
                        <span className="mono text-xs text-[#A78BFA] opacity-60 flex-shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-xs text-[#AAA] group-hover:text-[#E8E8E8] transition-colors leading-relaxed whitespace-normal break-words text-left">{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: CONVERSATION */}
            <div className="col-span-6">
              <div className="dark-card-elevated h-full flex flex-col" style={{ minHeight: 520 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#555]" />
                    <span className="text-sm text-[#888]">Conversation</span>
                    <span className="mono text-xs text-[#333]">({utterances.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {utterances.length > 0 && (
                      <button onClick={openTranscript}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs mono font-medium transition-all"
                        style={{ background: '#0F0A1A', border: '1px solid #A78BFA44', color: '#A78BFA' }}>
                        <Languages className="w-3 h-3" /> View Full Transcript
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#333]" />
                      <span className="mono text-xs text-[#333]">live</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse ml-1" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 260px)', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
                  {utterances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                      <Mic className="w-8 h-8 text-[#222]" />
                      <p className="text-xs mono text-[#333] text-center">No recordings yet<br />Click the mic to begin</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }} />
                      {utterances.map((u, i) => (
                        <div key={u.id} className="fade-in">
                          <div className="utterance-bubble">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="mono text-[10px] font-semibold text-[#00D4FF]">#{i + 1}</span>
                                <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#0A1A14] border border-[#34D39922] text-[#34D399]">
                                  {u.detectedLanguage}
                                </span>
                              </div>
                              <span className="mono text-[10px] text-[#333]">
                                {u.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-[#CCC] leading-relaxed">{u.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={scrollRef} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE EXTRACTION */}
            <div className="col-span-3 space-y-3">
              <div className="dark-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span className="text-xs font-medium text-[#F59E0B]">Live Extraction</span>
                  </div>
                  {entityCount > 0 && <span className="mono text-xs text-[#555]">{entityCount} entities</span>}
                </div>
                <div className="flex gap-1 mb-3 bg-[#0D0D0D] p-1 rounded-lg">
                  {(['entities', 'data'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 text-xs mono py-1 rounded transition-all ${activeTab === tab ? 'bg-[#1A1A1A] text-[#E8E8E8]' : 'text-[#444] hover:text-[#666]'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="h-72 overflow-y-auto">
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

        {/* ── REPORT TAB ── */}
        {sessionTab === 'report' && (
        <>
        <div className="px-4 mt-3">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#555]" />
                <span className="text-sm text-[#888]">Generated Report</span>
                {report && reportEditMode === 'view' && (
                  <button onClick={() => setReportExpanded(e => !e)} className="btn-icon w-6 h-6">
                    {reportExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={generateReport} disabled={generating || utterances.length === 0}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs mono font-medium transition-all ${utterances.length === 0 ? 'bg-[#111] text-[#333] cursor-not-allowed' : 'bg-[#001824] border border-[#00D4FF44] text-[#00D4FF] hover:border-[#00D4FF88] hover:bg-[#002535]'}`}>
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Sparkles className="w-3.5 h-3.5"/>}
                  {generating ? 'generating...' : 'Generate'}
                </button>
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

            {reportEditMode === 'edit' ? (
              <div style={{ border: '1px solid #242424', borderRadius: 10, overflow: 'hidden', background: '#0A0A0A' }}>
                <div contentEditable suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportHtmlDraft }}
                  onInput={e => setReportHtmlDraft((e.currentTarget as HTMLDivElement).innerHTML)}
                  style={{ minHeight: 320, maxHeight: 520, overflowY: 'auto', padding: '20px 24px', color: '#CCC', fontSize: 13, lineHeight: 1.75, fontFamily: 'Georgia, serif', outline: 'none', background: '#0A0A0A' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', gap: 8 }}>
                  <button onClick={cancelReportEdit} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveReportEdit} disabled={savingReport}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, border: '1px solid #00F5A044', background: '#0A1D0F', color: '#00F5A0', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: savingReport ? 0.5 : 1 }}>
                    {savingReport ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <CheckCheck style={{ width: 12, height: 12 }} />}
                    {savingReport ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
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

        {/* ── EXPORT HISTORY ── */}
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

        {/* ── PDF LANGUAGE PICKER MODAL ── */}
        {showPdfLangPicker && (
          <div
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPdfLangPicker(false) }}
          >
            <div style={{ background:'#0F0F0F', border:'1px solid #2A2A2A', borderRadius:16, padding:'28px 32px', width:380, boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
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
                      background: bg, border: `1px solid ${accent}44`, outline:'none',
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
              <p style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:10, color:'#444', textAlign:'center', lineHeight:1.5, margin:0 }}>
                Hindi &amp; Kannada versions are AI-translated.<br/>English is the original generated report.
              </p>
            </div>
          </div>
        )}
        </>
        )}

        {/* ── SCHEDULE TAB ── */}
        {sessionTab === 'schedule' && (
        <>
        {/* ══ APPOINTMENT SCHEDULER ══ */}
        <div className="px-4 mt-3">
          <div className="dark-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-sm text-[#888]">Appointment &amp; Call</span>
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

        {/* ══ DOMAIN-SPECIFIC: MEDICATION (Healthcare) / INVESTMENT REMINDERS (Finance) ══ */}
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
        /* ══ FINANCE: INVESTMENT REMINDERS ══ */
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

        {/* ── TRANSCRIPT MODAL ── */}
        {showTranscript && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowTranscript(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 750, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid #242424', borderRadius: 16, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-[#A78BFA]" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#E8E8E8' }}>Full Transcript</span>
                  <span className="mono text-xs text-[#555]">{utterances.length} segments</span>
                  {labelingInProgress && (
                    <span className="flex items-center gap-1.5 mono text-xs px-2 py-0.5 rounded-full" style={{ background: '#1A0F00', border: '1px solid #F59E0B33', color: '#F59E0B' }}>
                      <Loader2 style={{ width: 10, height: 10, animation: 'spin 1s linear infinite' }} />
                      labeling speakers…
                    </span>
                  )}
                  {!labelingInProgress && labeledLines.length > 0 && (
                    <span className="flex items-center gap-1.5 mono text-xs px-2 py-0.5 rounded-full" style={{ background: '#0A1D0F', border: '1px solid #00F5A033', color: '#00F5A0' }}>
                      ✓ speakers labeled
                    </span>
                  )}
                </div>
                <button onClick={() => setShowTranscript(false)} className="btn-icon w-7 h-7"><X className="w-4 h-4" /></button>
              </div>

              {/* Language selector */}
              <div style={{ padding: '12px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono text-xs text-[#555]">Translate to:</span>
                {(['ENGLISH', 'HINDI', 'KANNADA'] as LangKey[]).map(l => (
                  <button key={l} onClick={() => translateTranscript(l)} disabled={translatingTranscript}
                    className={`lang-btn ${transcriptLang === l ? 'active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: 11 }}>
                    {LANG_LABELS[l]} {l.charAt(0) + l.slice(1).toLowerCase()}
                  </button>
                ))}
                {translatingTranscript && <Loader2 className="w-3 h-3 animate-spin text-[#00D4FF]" />}
              </div>

              {/* Content — labeled transcript */}
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                {labeledLines.length > 0 ? (
                  <div style={{ background: '#0A0A0A', border: '1px solid #1E1E1E', borderRadius: 10, padding: '16px 20px', minHeight: 300 }}>
                    {labeledLines.map((line, i) => {
                      const isDoctor = line.speaker === 'doctor'
                      return (
                        <div key={i} style={{
                          marginBottom: 16,
                          paddingLeft: 14,
                          borderLeft: `2px solid ${isDoctor ? '#00D4FF' : '#F59E0B'}`,
                          animation: 'fadeIn .2s ease',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
                              padding: '2px 8px', borderRadius: 4,
                              background: isDoctor ? '#001824' : '#1A1200',
                              border: `1px solid ${isDoctor ? '#00D4FF33' : '#F59E0B33'}`,
                              color: isDoctor ? '#00D4FF' : '#F59E0B',
                            }}>
                              {isDoctor ? <Stethoscope style={{ width: 10, height: 10 }} /> : <User style={{ width: 10, height: 10 }} />}
                              {isDoctor ? 'Doctor' : 'Patient'}
                            </span>
                          </div>
                          <p
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => {
                              const newText = (e.currentTarget as HTMLParagraphElement).textContent || ''
                              setLabeledLines(prev => prev.map((l, idx) => idx === i ? { ...l, text: newText } : l))
                            }}
                            style={{
                              color: '#CCC', fontSize: 13, lineHeight: 1.8,
                              fontFamily: "'DM Sans', sans-serif",
                              outline: 'none', margin: 0,
                              cursor: 'text',
                            }}
                          >
                            {line.text}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    value={fullTranscript}
                    onChange={e => setFullTranscript(e.target.value)}
                    style={{
                      width: '100%', minHeight: 300, background: '#0A0A0A', border: '1px solid #1E1E1E',
                      borderRadius: 10, color: '#CCC', fontSize: 13, lineHeight: 1.8,
                      fontFamily: "'DM Sans', sans-serif", padding: '16px 20px', outline: 'none', resize: 'vertical',
                    }}
                    placeholder="Transcript will appear here..."
                  />
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="mono text-xs text-[#333]">✎ Edit freely — changes are preserved</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowTranscript(false)}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #2A2A2A', background: 'transparent', color: '#666', fontSize: 12, cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={saveTranscript}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, border: '1px solid #00D4FF44', background: '#001824', color: '#00D4FF', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    <CheckCheck style={{ width: 12, height: 12 }} />
                    Save Transcript
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY MODAL ── */}
        {showSummary && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowSummary(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', background: '#0D0D0D', border: '1px solid #242424', borderRadius: 16, overflow: 'auto', padding: 24 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#34D399]" />
                  <span style={{ fontWeight: 700, color: '#E8E8E8' }}>Smart Summary</span>
                </div>
                <button onClick={() => setShowSummary(false)} className="btn-icon w-7 h-7"><X className="w-4 h-4" /></button>
              </div>
              {generatingSummary ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#34D399]" />
                  <p className="mono text-xs text-[#555]">Analyzing conversation...</p>
                </div>
              ) : summary ? (
                <div className="prose prose-invert text-sm" style={{ color: '#BBB', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2) }} />
              ) : (
                <p className="text-center text-sm text-[#555] py-8">No summary generated</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
