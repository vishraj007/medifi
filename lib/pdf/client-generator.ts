// lib/pdf/client-generator.ts
'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generatePDFClient(elementId: string): Promise<Blob> {
  const source = document.getElementById(elementId)
  if (!source) throw new Error(`Element #${elementId} not found`)

  // ── 1. Temporarily remove height/overflow constraints on source ───────────
  const originalStyle = source.getAttribute('style') || ''
  source.style.maxHeight = 'none'
  source.style.height = 'auto'
  source.style.overflow = 'visible'

  const parents: { el: HTMLElement; overflow: string; maxHeight: string }[] = []
  let parent = source.parentElement
  while (parent && parent !== document.body) {
    const cs = getComputedStyle(parent)
    if (cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.maxHeight !== 'none') {
      parents.push({ el: parent, overflow: parent.style.overflow, maxHeight: parent.style.maxHeight })
      parent.style.overflow = 'visible'
      parent.style.maxHeight = 'none'
    }
    parent = parent.parentElement
  }

  await new Promise(r => setTimeout(r, 200))

  // ── 2. Clone and force FULL light theme ──────────────────────────────────
  const clone = source.cloneNode(true) as HTMLElement
  const fullHeight = source.scrollHeight

  clone.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: 780px;
    min-height: ${fullHeight}px;
    height: auto;
    max-height: none !important;
    overflow: visible !important;
    padding: 40px 52px;
    background: #ffffff !important;
    color: #111827 !important;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13px;
    line-height: 1.7;
    box-sizing: border-box;
    z-index: -9999;
  `

  // Aggressively strip ALL inline dark styles and background colors from every element
  clone.querySelectorAll<HTMLElement>('*').forEach(el => {
    // Remove all style properties that could cause dark backgrounds
    const propsToRemove = [
      'color', 'background', 'background-color', 'border-color',
      'max-height', 'overflow', 'overflow-y'
    ]
    propsToRemove.forEach(p => el.style.removeProperty(p))

    // For elements with inline style containing dark hex colors, nuke the whole style
    const inlineStyle = el.getAttribute('style') || ''
    if (
      inlineStyle.includes('#0') ||  // catches #0A..., #05..., #1A... etc dark hex
      inlineStyle.includes('#1') ||
      inlineStyle.includes('rgb(') ||
      inlineStyle.includes('rgba(')
    ) {
      // Keep only safe layout properties
      const safe = inlineStyle
        .split(';')
        .filter(rule => {
          const prop = rule.split(':')[0]?.trim().toLowerCase()
          return prop && [
            'width', 'max-width', 'min-width',
            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'font-size', 'font-weight', 'font-family',
            'text-align', 'text-transform', 'letter-spacing',
            'border-radius', 'border-left-width', 'border-left-style',
            'display', 'flex', 'flex-direction', 'align-items',
            'gap', 'column-span', 'colspan',
            'border-collapse',
          ].includes(prop)
        })
        .join(';')
      el.setAttribute('style', safe)
    }
  })

  // Inject comprehensive light theme override
  const lightStyle = document.createElement('style')
  lightStyle.textContent = `
    * { 
      background: transparent !important;
      background-color: transparent !important;
      color: #374151 !important;
      border-color: #d1d5db !important;
    }

    /* Report wrapper */
    .rpt-wrap { color: #111827 !important; }

    /* Header */
    .rpt-header { border-bottom: 2px solid #1a3a5c !important; }
    .rpt-title { color: #1a3a5c !important; font-size: 18px !important; font-weight: 700 !important; }
    .rpt-subtitle { color: #6b7280 !important; font-size: 11px !important; }

    /* Info box */
    .rpt-info-box {
      background: #eff6ff !important;
      background-color: #eff6ff !important;
      border: 1px solid #bfdbfe !important;
      border-radius: 6px !important;
      padding: 12px !important;
    }
    .rpt-table { border-collapse: collapse !important; width: 100% !important; }
    .rpt-table td {
      border: 1px solid #d1d5db !important;
      padding: 5px 10px !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .rpt-table tr:nth-child(even) td {
      background: #f9fafb !important;
      background-color: #f9fafb !important;
    }
    .rpt-td-label { color: #4b5563 !important; font-weight: 700 !important; }
    .rpt-td-value { color: #111827 !important; }

    /* Section titles */
    .rpt-section-title {
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      padding-left: 10px !important;
      margin: 0 0 7px 0 !important;
    }
    .rpt-section-title--blue  { color: #1d4ed8 !important; border-left: 3px solid #2563eb !important; }
    .rpt-section-title--green { color: #065f46 !important; border-left: 3px solid #059669 !important; }

    /* Body */
    .rpt-body { color: #374151 !important; font-size: 12px !important; line-height: 1.75 !important; }

    /* Clinical assessment subheadings — colored left border, light bg, NO dark bg */
    .rpt-assessment-body h3 {
      font-size: 12px !important;
      font-weight: 700 !important;
      margin: 14px 0 5px 0 !important;
      padding: 5px 10px 5px 12px !important;
      border-radius: 4px !important;
      border-left: 3px solid !important;
    }
    .rpt-assessment-body h3[data-section="Differential Diagnosis"]     { color: #1d4ed8 !important; background-color: #eff6ff !important; border-color: #2563eb !important; }
    .rpt-assessment-body h3[data-section="Most Likely Diagnosis"]      { color: #065f46 !important; background-color: #ecfdf5 !important; border-color: #059669 !important; }
    .rpt-assessment-body h3[data-section="Recommended Investigations"] { color: #92400e !important; background-color: #fffbeb !important; border-color: #f59e0b !important; }
    .rpt-assessment-body h3[data-section="Treatment Plan"]             { color: #9d174d !important; background-color: #fdf2f8 !important; border-color: #ec4899 !important; }
    .rpt-assessment-body h3[data-section="Follow-up Recommendations"]  { color: #4c1d95 !important; background-color: #f5f3ff !important; border-color: #8b5cf6 !important; }
    .rpt-assessment-body h3[data-section="Red Flags"]                  { color: #991b1b !important; background-color: #fef2f2 !important; border-color: #ef4444 !important; }

    .rpt-assessment-body p  { color: #374151 !important; font-size: 12px !important; line-height: 1.75 !important; }
    .rpt-assessment-body ul, .rpt-assessment-body ol { color: #374151 !important; font-size: 12px !important; }
    .rpt-assessment-body li { color: #374151 !important; line-height: 1.65 !important; }
    .rpt-assessment-body strong { color: #111827 !important; font-weight: 700 !important; }

    /* Finance section headings */
    .rpt-fin-heading {
      font-size: 12px !important;
      font-weight: 700 !important;
      padding: 5px 10px 5px 12px !important;
      border-radius: 4px !important;
      border-left: 3px solid !important;
      margin: 14px 0 6px 0 !important;
    }
    [data-fin="clientGoals"]     { color: #065f46 !important; background-color: #ecfdf5 !important; border-color: #059669 !important; }
    [data-fin="recommendations"] { color: #1d4ed8 !important; background-color: #eff6ff !important; border-color: #2563eb !important; }
    [data-fin="taxOptimization"] { color: #92400e !important; background-color: #fffbeb !important; border-color: #f59e0b !important; }
    [data-fin="actionItems"]     { color: #4c1d95 !important; background-color: #f5f3ff !important; border-color: #8b5cf6 !important; }

    /* Lists */
    ul, ol { padding-left: 20px !important; margin: 4px 0 8px 0 !important; }
    li { color: #374151 !important; margin-bottom: 4px !important; line-height: 1.65 !important; }
    strong, b { color: #111827 !important; font-weight: 700 !important; }

    /* Footer */
    .rpt-footer { color: #9ca3af !important; border-top: 1px solid #e5e7eb !important; }
  `
  clone.appendChild(lightStyle)
  document.body.appendChild(clone)

  try {
    await new Promise(r => setTimeout(r, 500))

    const cloneHeight = clone.scrollHeight

    const canvas = await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 780,
      height: cloneHeight,
      windowWidth: 780,
      windowHeight: cloneHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        // Final pass: nuke any remaining dark backgrounds in the cloned document
        doc.querySelectorAll<HTMLElement>('*').forEach(el => {
          const cs = window.getComputedStyle(el)
          const bg = cs.backgroundColor
          // If background is dark (not white/transparent), override it
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const rgb = bg.match(/\d+/g)?.map(Number) || [255, 255, 255]
            const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
            if (brightness < 128) {
              el.style.setProperty('background-color', 'transparent', 'important')
            }
          }
        })
      }
    })

    // Build multi-page A4 PDF
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })

    const A4_W_MM = 210
    const A4_H_MM = 297
    const MARGIN_MM = 12
    const contentW_MM = A4_W_MM - MARGIN_MM * 2
    const pxPerMM = canvas.width / contentW_MM
    const totalHeightMM = canvas.height / pxPerMM
    const pageContentH_MM = A4_H_MM - MARGIN_MM * 2

    let yMM = 0
    let firstPage = true

    while (yMM < totalHeightMM) {
      if (!firstPage) pdf.addPage()

      const sliceH_MM = Math.min(pageContentH_MM, totalHeightMM - yMM)
      const srcY_px = Math.round(yMM * pxPerMM)
      const srcH_px = Math.round(sliceH_MM * pxPerMM)

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = srcH_px
      const ctx = pageCanvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, srcY_px, canvas.width, srcH_px, 0, 0, canvas.width, srcH_px)

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.97)
      pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, contentW_MM, sliceH_MM)

      yMM += pageContentH_MM
      firstPage = false
    }

    return pdf.output('blob')

  } finally {
    source.setAttribute('style', originalStyle)
    parents.forEach(({ el, overflow, maxHeight }) => {
      el.style.overflow = overflow
      el.style.maxHeight = maxHeight
    })
    if (document.body.contains(clone)) document.body.removeChild(clone)
  }
}