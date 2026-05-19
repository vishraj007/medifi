'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

interface StatItem { id: number; count: number; suffix: string; short?: string; decimal?: boolean; label: string; sub: string; color: string; gradId: string; spark: string; sparkFill: string }
interface StepItem { num: string; title: string; desc: string }

const STATS: StatItem[] = [
  { id:1, count:500, suffix:'+', label:'Active Professionals', sub:'↑ Growing daily', color:'#22d3ee', gradId:'sg1', spark:'0,35 30,28 60,30 90,18 120,22 150,10 180,8 200,4', sparkFill:'0,35 30,28 60,30 90,18 120,22 150,10 180,8 200,4 200,40 0,40' },
  { id:2, count:10000, suffix:'+', short:'10K', label:'Reports Generated', sub:'↑ 2.4K this week', color:'#818cf8', gradId:'sg2', spark:'0,36 30,32 60,24 90,26 120,14 150,12 180,6 200,3', sparkFill:'0,36 30,32 60,24 90,26 120,14 150,12 180,6 200,3 200,40 0,40' },
  { id:3, count:70, suffix:'%', label:'Time Saved', sub:'vs manual workflow', color:'#34d399', gradId:'sg3', spark:'0,38 40,34 80,28 110,20 140,12 170,8 200,5', sparkFill:'0,38 40,34 80,28 110,20 140,12 170,8 200,5 200,40 0,40' },
  { id:4, count:99.5, suffix:'%', decimal:true, label:'Extraction Accuracy', sub:'Industry leading', color:'#f59e0b', gradId:'sg4', spark:'0,20 20,18 40,22 60,15 80,17 100,10 130,8 160,5 200,3', sparkFill:'0,20 20,18 40,22 60,15 80,17 100,10 130,8 160,5 200,3 200,40 0,40' },
]

const STEPS: StepItem[] = [
  { num:'01', title:'Select Domain', desc:'Healthcare or Finance — your AI model, templates, and entity vocabulary load instantly.' },
  { num:'02', title:'Register Record', desc:'Search existing patient or client by phone, or create a new profile in under ten seconds.' },
  { num:'03', title:'Speak Freely', desc:'Record in any supported language. AI transcribes, translates, and extracts entities live.' },
  { num:'04', title:'Export Report', desc:'One action produces a fully structured PDF ready for sharing or EHR integration.' },
]

const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setVisible(true), delay)
    }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' })
    obs.observe(el); return () => obs.disconnect()
  }, [delay])
  return { ref, visible }
}

function useCounter(target: number, decimal = false, short?: string, suffix = '') {
  const [display, setDisplay] = useState('0' + suffix)
  const [done, setDone] = useState(false)
  const run = useCallback(() => {
    if (done) return; setDone(true)
    const dur = 2400, t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const ease = easeOutExpo(p)
      const v = target * ease
      if (short && p >= 1) { setDisplay(short + suffix); return }
      setDisplay((decimal ? v.toFixed(1) : Math.floor(v)) + suffix)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [done, target, decimal, short, suffix])
  return { display, run }
}

function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal(delay)
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(.975)',
      transition: `opacity 0.9s ${delay}ms cubic-bezier(0.16,1,0.3,1), transform 0.9s ${delay}ms cubic-bezier(0.16,1,0.3,1)`,
      willChange: 'opacity, transform',
      ...style
    }}>
      {children}
    </div>
  )
}

// ─── DNA Helix ────────────────────────────────────────────────────────────────
function DNAHelix({ color1='#22d3ee', color2='#818cf8' }: { color1?:string; color2?:string }) {
  const dots = Array.from({ length: 20 }, (_, i) => i)
  return (
    <svg width="60" height="300" viewBox="0 0 60 300" style={{ overflow:'visible' }}>
      <defs>
        <filter id="dnaGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {dots.map(i => {
        const y = i * 15 + 5
        const x1 = 30 + Math.sin(i * 0.7) * 22
        const x2 = 30 - Math.sin(i * 0.7) * 22
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
            <circle cx={x1} cy={y} r="3.5" fill={color1} filter="url(#dnaGlow)" opacity="0.7"
              style={{ animation:`dnaPulse 3s ease-in-out infinite`, animationDelay:`${i*0.15}s` }}/>
            <circle cx={x2} cy={y} r="3.5" fill={color2} filter="url(#dnaGlow)" opacity="0.7"
              style={{ animation:`dnaPulse 3s ease-in-out infinite`, animationDelay:`${i*0.15+1.5}s` }}/>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Icosahedron ──────────────────────────────────────────────────────────────
function Icosahedron({ size=120, color='#22d3ee' }: { size?:number; color?:string; speed?:string }) {
  const edges = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[1,2],[2,3],[3,4],[4,5],[5,1],
    [1,6],[2,7],[3,8],[4,9],[5,10],[6,7],[7,8],[8,9],[9,10],[10,6],
    [6,11],[7,11],[8,11],[9,11],[10,11]
  ]
  const phi = (1 + Math.sqrt(5)) / 2
  const verts = [
    [0,1,phi],[0,-1,phi],[0,1,-phi],[0,-1,-phi],
    [1,phi,0],[-1,phi,0],[1,-phi,0],[-1,-phi,0],
    [phi,0,1],[phi,0,-1],[-phi,0,1],[-phi,0,-1],
  ].map(([x,y,z]) => {
    const len = Math.sqrt(x*x+y*y+z*z)
    return [x/len*size/2, y/len*size/2, z/len*size/2]
  })
  const project = ([x,y,z]: number[], rx: number, ry: number) => {
    const cosX = Math.cos(rx), sinX = Math.sin(rx)
    const cosY = Math.cos(ry), sinY = Math.sin(ry)
    const y2 = y*cosX - z*sinX, z2 = y*sinX + z*cosX
    const x3 = x*cosY + z2*sinY
    return [x3 + size/2, y2 + size/2]
  }
  const [rot, setRot] = useState([0.4, 0])
  useEffect(() => {
    let raf: number
    let lastTime = 0
    const animate = (time: number) => {
      if (time - lastTime > 16) {
        setRot(r => [r[0] + 0.004, r[1] + 0.007])
        lastTime = time
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])
  const uid = `ico${size}${color.replace('#','')}`
  return (
    <svg width={size} height={size} style={{ overflow:'visible' }}>
      <defs>
        <filter id={uid}>
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {edges.map(([a,b],i) => {
        const [x1,y1] = project(verts[a], rot[0], rot[1])
        const [x2,y2] = project(verts[b], rot[0], rot[1])
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" opacity="0.35" filter={`url(#${uid})`}/>
      })}
      {verts.map((v,i) => {
        const [x,y] = project(v, rot[0], rot[1])
        return <circle key={i} cx={x} cy={y} r="1.5" fill={color} opacity="0.6"/>
      })}
    </svg>
  )
}

// ─── Floating Orb ─────────────────────────────────────────────────────────────
function FloatingOrb({ x, y, size, color, delay, duration }: { x:string; y:string; size:number; color:string; delay:string; duration:string }) {
  return (
    <div style={{
      position:'absolute', left:x, top:y, width:size, height:size, borderRadius:'50%',
      background:`radial-gradient(circle at 30% 30%, ${color}40, ${color}08, transparent 70%)`,
      border:`1px solid ${color}15`,
      animation:`floatOrb ${duration} ease-in-out infinite`, animationDelay:delay,
      pointerEvents:'none',
      boxShadow:`0 0 ${size/3}px ${color}10, inset 0 0 ${size/4}px ${color}08`,
      willChange: 'transform',
    }}/>
  )
}

// ─── WireCube ─────────────────────────────────────────────────────────────────
function WireCube({ size=60, color='#22d3ee', animDur='12s', delay='0s' }: { size?:number; color?:string; animDur?:string; delay?:string }) {
  const h = size/2
  return (
    <div style={{ width:size, height:size, transformStyle:'preserve-3d', animation:`cubeY ${animDur} linear infinite`, animationDelay:delay, position:'relative', willChange:'transform' }}>
      {[`rotateY(0deg) translateZ(${h}px)`,`rotateY(90deg) translateZ(${h}px)`,`rotateY(180deg) translateZ(${h}px)`,`rotateY(-90deg) translateZ(${h}px)`,`rotateX(90deg) translateZ(${h}px)`,`rotateX(-90deg) translateZ(${h}px)`].map((t,i)=>(
        <div key={i} style={{ position:'absolute',inset:0,border:`1px solid ${color}50`,background:`${color}05`,transform:t }}/>
      ))}
    </div>
  )
}

// ─── TorusRing ────────────────────────────────────────────────────────────────
function TorusRing({ size=160, color='#22d3ee', opacity=0.2, animDur='20s', tiltX=70 }: { size?:number; color?:string; opacity?:number; animDur?:string; tiltX?:number }) {
  return (
    <div style={{ width:size, height:size, position:'relative', transformStyle:'preserve-3d', transform:`perspective(400px) rotateX(${tiltX}deg)` }}>
      {[0,1,2].map((r)=>(
        <div key={r} style={{ position:'absolute', inset:r*8, borderRadius:'50%', border:`1px solid ${color}`, opacity:opacity-r*0.05, animation:`torusRotate ${animDur} linear infinite`, animationDelay:`${r*-4}s`, willChange:'transform' }}/>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ s }: { s: StatItem }) {
  const { ref, visible } = useReveal((s.id-1)*120)
  const { display, run } = useCounter(s.count, s.decimal, s.short, s.suffix)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{ if(visible) run() },[visible,run])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current; if(!el) return
    const r = el.getBoundingClientRect()
    const x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5
    el.style.transform=`perspective(700px) rotateX(${-y*12}deg) rotateY(${x*12}deg) translateZ(16px) scale(1.02)`
    el.style.transition='transform 0.08s ease-out'
    el.style.setProperty('--sx',`${((e.clientX-r.left)/r.width)*100}%`)
    el.style.setProperty('--sy',`${((e.clientY-r.top)/r.height)*100}%`)
  }
  const onLeave = () => {
    const el = cardRef.current; if(!el) return
    el.style.transform='perspective(700px) rotateX(0) rotateY(0) translateZ(0) scale(1)'
    el.style.transition='transform 0.6s cubic-bezier(0.16,1,0.3,1)'
  }

  return (
    <div ref={ref} style={{ opacity:visible?1:0, transform:visible?'none':'translateY(28px)', transition:`opacity 0.7s ${(s.id-1)*120}ms cubic-bezier(0.16,1,0.3,1), transform 0.7s ${(s.id-1)*120}ms cubic-bezier(0.16,1,0.3,1)`, willChange:'opacity,transform' }}>
      <div ref={cardRef} onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ position:'relative', borderRadius:20, padding:'32px 24px 26px', textAlign:'center', background:'rgba(5,8,18,0.85)', backdropFilter:'blur(32px)', border:`1px solid ${s.color}22`, transformStyle:'preserve-3d', overflow:'hidden', cursor:'none', boxShadow:`0 20px 50px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.025),inset 0 1px 0 rgba(255,255,255,.055)`, willChange:'transform' }}>
        <div style={{ position:'absolute',inset:0,background:`radial-gradient(circle at var(--sx,50%) var(--sy,50%),${s.color}16,transparent 55%)`,pointerEvents:'none',transition:'background 0.15s ease' }}/>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.color}cc,transparent)` }}/>
        <div style={{ width:56,height:56,borderRadius:16,margin:'0 auto 20px',position:'relative',background:`${s.color}0c`,border:`1px solid ${s.color}28`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`5px 5px 16px rgba(0,0,0,.6),-3px -3px 9px rgba(255,255,255,.04),0 0 22px ${s.color}12` }}>
          <div style={{ position:'absolute',inset:-5,borderRadius:21,border:`1px dashed ${s.color}32`,animation:'spinRing 9s linear infinite', willChange:'transform' }}/>
          <svg viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth={1.6} style={{ width:24,height:24 }}>
            {s.id===1&&<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
            {s.id===2&&<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}
            {s.id===3&&<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
            {s.id===4&&<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
          </svg>
        </div>
        <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'2.9rem',lineHeight:1,marginBottom:6,background:`linear-gradient(135deg,#f8fafc 30%,${s.color})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',position:'relative',zIndex:1 }}>{display}</div>
        <div style={{ fontSize:'.78rem',color:'#64748b',letterSpacing:'.05em',marginBottom:10,position:'relative',zIndex:1 }}>{s.label}</div>
        <div style={{ display:'inline-block',padding:'3px 11px',borderRadius:100,fontSize:'.66rem',fontWeight:700,background:`${s.color}0e`,color:s.color,border:`1px solid ${s.color}20`,position:'relative',zIndex:1 }}>{s.sub}</div>
        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:42,opacity:.14 }}>
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{ width:'100%',height:'100%' }}>
            <defs><linearGradient id={s.gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".7"/><stop offset="100%" stopColor={s.color} stopOpacity="0"/></linearGradient></defs>
            <polyline points={s.spark} fill="none" stroke={s.color} strokeWidth="1.5"/>
            <polygon points={s.sparkFill} fill={`url(#${s.gradId})`}/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── Premium Feature Card ─────────────────────────────────────────────────────
function FeatureCard({ f, index }: { f: { num:string; accent:string; rgb:string; title:string; desc:string; icon:React.ReactNode }; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if(!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const rx = (y - 0.5) * -18, ry = (x - 0.5) * 18
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(20px) scale(1.01)`
    el.style.transition = 'transform 0.07s ease-out'
    if (shineRef.current) {
      shineRef.current.style.opacity = '1'
      shineRef.current.style.background = `radial-gradient(circle at ${x*100}% ${y*100}%, rgba(255,255,255,.09) 0%, transparent 60%)`
    }
    if (glowRef.current) {
      glowRef.current.style.opacity = '1'
      glowRef.current.style.left = `${e.clientX - r.left}px`
      glowRef.current.style.top = `${e.clientY - r.top}px`
    }
  }
  const onLeave = () => {
    const el = cardRef.current; if(!el) return
    el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0) scale(1)'
    el.style.transition = 'transform 0.65s cubic-bezier(0.16,1,0.3,1)'
    if (shineRef.current) { shineRef.current.style.opacity = '0'; shineRef.current.style.transition = 'opacity 0.4s ease' }
    if (glowRef.current) { glowRef.current.style.opacity = '0'; glowRef.current.style.transition = 'opacity 0.4s ease' }
  }

  const accentPairs: [string,string][] = [
    ['#22d3ee','#0e7490'],['#818cf8','#3730a3'],['#34d399','#047857'],
    ['#f59e0b','#92400e'],['#f87171','#991b1b'],['#22d3ee','#0e7490'],
    ['#a78bfa','#5b21b6'],['#fb923c','#9a3412'],
  ]
  const [c1, c2] = accentPairs[index] || ['#22d3ee','#0e7490']

  return (
    <Reveal delay={index * 65}>
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          position:'relative', overflow:'hidden', borderRadius:24,
          background:'linear-gradient(145deg, rgba(8,12,24,.97), rgba(5,8,18,.99))',
          border:`1px solid rgba(${f.rgb},.1)`,
          backdropFilter:'blur(40px)', padding:'36px 32px 32px',
          transformStyle:'preserve-3d', cursor:'none',
          boxShadow:`0 0 0 1px rgba(255,255,255,.025),16px 16px 40px rgba(0,0,0,.7),-4px -4px 14px rgba(255,255,255,.02),inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(0,0,0,.4)`,
          height:'100%', minHeight:240,
          willChange:'transform',
        }}
      >
        <div ref={shineRef} style={{ position:'absolute',inset:0,borderRadius:24,opacity:0,transition:'opacity 0.35s ease',pointerEvents:'none',zIndex:2 }}/>
        <div ref={glowRef} style={{ position:'absolute',width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle, rgba(${f.rgb},.1), transparent 60%)`,transform:'translate(-50%,-50%)',opacity:0,transition:'opacity 0.35s ease',pointerEvents:'none',zIndex:1 }}/>

        <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,rgba(${f.rgb},.5) 40%,rgba(${f.rgb},.2) 70%,transparent)`,zIndex:3 }}/>
        <div style={{ position:'absolute',top:0,right:0,width:160,height:160,background:`radial-gradient(circle at 100% 0%,rgba(${f.rgb},.07),transparent 65%)`,borderRadius:'0 24px 0 0',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:0,left:0,width:120,height:80,background:`radial-gradient(circle at 0% 100%,rgba(${f.rgb},.04),transparent 65%)`,pointerEvents:'none' }}/>
        <div style={{ position:'absolute',inset:0,opacity:.03,backgroundImage:`linear-gradient(rgba(${f.rgb},1) 1px,transparent 1px),linear-gradient(90deg,rgba(${f.rgb},1) 1px,transparent 1px)`,backgroundSize:'32px 32px',borderRadius:24,pointerEvents:'none' }}/>

        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:24,position:'relative',zIndex:4 }}>
          <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.58rem',color:`rgba(${f.rgb},.4)`,letterSpacing:'.15em',fontWeight:600 }}>{f.num}</span>
          <div style={{ flex:1,height:1,background:`linear-gradient(90deg,rgba(${f.rgb},.2),rgba(${f.rgb},.05),transparent)` }}/>
          <div style={{ width:6,height:6,borderRadius:'50%',background:`rgba(${f.rgb},.4)`,boxShadow:`0 0 8px rgba(${f.rgb},.3)`,animation:`blink2 ${2+index*.3}s ease-in-out infinite` }}/>
        </div>

        <div style={{ position:'relative',width:64,height:64,marginBottom:24,transform:'translateZ(30px)',zIndex:4 }}>
          <div style={{ position:'absolute',inset:-10,borderRadius:24,background:`conic-gradient(from ${index*60}deg,rgba(${f.rgb},.0),rgba(${f.rgb},.15),rgba(${f.rgb},.0))`,animation:`spinRing ${14+index*2}s linear infinite`,filter:'blur(3px)', willChange:'transform' }}/>
          <div style={{ position:'absolute',inset:0,borderRadius:18,background:`linear-gradient(135deg,rgba(${f.rgb},.12),rgba(${f.rgb},.04))`,border:`1px solid rgba(${f.rgb},.2)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`6px 6px 20px rgba(0,0,0,.6),-3px -3px 10px rgba(255,255,255,.03),0 0 30px rgba(${f.rgb},.08),inset 0 1px 0 rgba(255,255,255,.08)` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={f.accent} strokeWidth="1.6" style={{ width:26,height:26,filter:`drop-shadow(0 0 8px rgba(${f.rgb},.5)) drop-shadow(0 0 16px rgba(${f.rgb},.2))` }}>{f.icon}</svg>
          </div>
          <div style={{ position:'absolute',inset:-6,borderRadius:24,animation:`spinRing ${8+index}s linear infinite`, willChange:'transform' }}>
            <div style={{ position:'absolute',top:0,left:'50%',width:4,height:4,borderRadius:'50%',background:f.accent,boxShadow:`0 0 8px ${f.accent}`,transform:'translateX(-50%)',marginTop:-2 }}/>
          </div>
        </div>

        <h3 style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.02rem',marginBottom:12,lineHeight:1.25,letterSpacing:'-.015em',position:'relative',zIndex:4,background:`linear-gradient(135deg,#f8fafc 60%,${f.accent})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',transform:'translateZ(20px)' }}>{f.title}</h3>
        <p style={{ fontSize:'.82rem',lineHeight:1.75,color:'#4a5568',position:'relative',zIndex:4,transform:'translateZ(10px)' }}>{f.desc}</p>

        <div style={{ position:'absolute',bottom:20,right:20,zIndex:4,opacity:.5 }}>
          <div style={{ width:28,height:28,borderRadius:8,border:`1px solid rgba(${f.rgb},.15)`,display:'flex',alignItems:'center',justifyContent:'center',background:`rgba(${f.rgb},.05)` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={f.accent} strokeWidth="2" style={{ width:12,height:12,opacity:.6 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>

        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2.5,background:`linear-gradient(90deg,transparent,${c1}55,${c2}33,transparent)`,borderRadius:'0 0 24px 24px' }}/>
      </div>
    </Reveal>
  )
}

// ─── Healthcare Mini UI ───────────────────────────────────────────────────────
function HealthcareMiniUI() {
  return (
    <div style={{ background:'#080b12',borderRadius:12,overflow:'hidden',fontSize:10,fontFamily:'monospace',height:'100%',border:'1px solid rgba(34,211,238,.08)' }}>
      <div style={{ background:'#0c0f18',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'6px 12px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:16,height:16,borderRadius:5,background:'linear-gradient(135deg,#1e3a5f,#22d3ee33)',border:'1px solid #22d3ee44',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" style={{ width:8,height:8 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span style={{ color:'#c8d6e5',fontWeight:600,fontSize:8.5 }}>Voice Intelligence</span>
          <span style={{ color:'#3d4f63',fontSize:7.5,letterSpacing:'.06em' }}>DOCTOR · GENERAL MEDICINE</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
          <div style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:100,background:'rgba(34,211,238,.06)',border:'1px solid rgba(34,211,238,.18)' }}>
            <div style={{ width:4,height:4,borderRadius:'50%',background:'#22d3ee',boxShadow:'0 0 4px #22d3ee',animation:'blink2 1.5s infinite' }}/>
            <span style={{ color:'#22d3ee',fontSize:6.5,fontWeight:600 }}>active</span>
          </div>
          <span style={{ color:'#4b5c6e',fontSize:7.5 }}>Dr. Rajesh Kumar</span>
        </div>
      </div>
      <div style={{ background:'#0c0f18',borderBottom:'1px solid rgba(255,255,255,.03)',padding:'5px 12px',display:'flex',alignItems:'center',gap:8 }}>
        <span style={{ color:'#c8d6e5',fontWeight:700,fontSize:8.5,letterSpacing:'.04em' }}>VISHAL</span>
        <span style={{ color:'#3d4f63',fontSize:7.5 }}>|</span>
        <span style={{ color:'#4b5c6e',fontSize:7.5 }}>GENERAL MEDICINE</span>
        <span style={{ padding:'1.5px 6px',borderRadius:100,background:'rgba(34,211,238,.08)',border:'1px solid rgba(34,211,238,.2)',color:'#22d3ee',fontSize:6.5,fontWeight:700 }}>● COMPLETED</span>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.6fr 1fr',height:'calc(100% - 52px)' }}>
        <div style={{ borderRight:'1px solid rgba(255,255,255,.04)',padding:8,display:'flex',flexDirection:'column',alignItems:'center',gap:6 }}>
          <span style={{ color:'#7f8ea0',fontWeight:600,fontSize:7.5,alignSelf:'flex-start' }}>Doctor</span>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(34,211,238,.06)',border:'1.5px solid rgba(34,211,238,.2)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(34,211,238,.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" style={{ width:16,height:16 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>
          <span style={{ color:'#3d4f63',fontSize:6.5 }}>click to speak</span>
          <div style={{ display:'flex',alignItems:'center',gap:1.5,height:14 }}>
            {[6,12,8,18,11,20,7,15,9,17,5,13].map((h,i)=><div key={i} style={{ width:1.5,borderRadius:1,background:'linear-gradient(180deg,#22d3ee,#818cf8)',height:h*0.45,animation:`waveB 1.2s ease-in-out infinite`,animationDelay:`${i*.07}s` }}/>)}
          </div>
        </div>
        <div style={{ borderRight:'1px solid rgba(255,255,255,.04)',padding:'6px 8px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
            <span style={{ color:'#7f8ea0',fontSize:7.5,fontWeight:600 }}>Conversation</span>
            <div style={{ display:'flex',alignItems:'center',gap:3 }}>
              <div style={{ width:4,height:4,borderRadius:'50%',background:'#22d3ee',boxShadow:'0 0 3px #22d3ee',animation:'blink2 1.5s infinite' }}/>
              <span style={{ color:'#22d3ee',fontSize:6.5 }}>live</span>
            </div>
          </div>
          {[
            { s:'Patient',m:'I am having stomach ache for last six days.',c:'#22d3ee',r:true },
            { s:'Doctor',m:'How long have you been experiencing these symptoms?',c:'#818cf8',r:false },
            { s:'Patient',m:'I am having this problem for the last 6 days.',c:'#22d3ee',r:true },
            { s:'Patient',m:'I have a stomach ache.',c:'#22d3ee',r:true },
          ].map((m,i)=>(
            <div key={i} style={{ marginBottom:5,display:'flex',flexDirection:'column',alignItems:m.r?'flex-end':'flex-start' }}>
              <span style={{ color:m.c,fontSize:6,fontWeight:700,marginBottom:1 }}>{m.s}</span>
              <div style={{ padding:'4px 7px',borderRadius:m.r?'7px 7px 2px 7px':'7px 7px 7px 2px',background:m.r?'rgba(34,211,238,.06)':'rgba(255,255,255,.04)',border:`1px solid ${m.c}18`,maxWidth:'92%' }}>
                <span style={{ color:'#b0bec5',fontSize:7,lineHeight:1.3 }}>{m.m}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:8,display:'flex',flexDirection:'column',gap:6 }}>
          <span style={{ color:'#7f8ea0',fontWeight:600,fontSize:7.5 }}>Patient</span>
          <div style={{ width:30,height:30,borderRadius:'50%',background:'rgba(34,211,238,.06)',border:'1.5px solid rgba(34,211,238,.18)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',boxShadow:'0 0 10px rgba(34,211,238,.08)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" style={{ width:13,height:13 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>
          <span style={{ textAlign:'center',color:'#3d4f63',fontSize:6 }}>Patient speaks here</span>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.04)',paddingTop:5 }}>
            <div style={{ display:'flex',alignItems:'center',gap:3,marginBottom:4 }}>
              <span style={{ color:'#f59e0b',fontSize:6.5 }}>⚡</span>
              <span style={{ color:'#f59e0b',fontSize:6.5,fontWeight:700 }}>Live Extraction</span>
            </div>
            {[
              { cat:'DURATION',tags:['six days'],color:'#22d3ee' },
              { cat:'SYMPTOMS',tags:['stomach ache'],color:'#f87171' },
              { cat:'BODYPARTS',tags:['stomach'],color:'#818cf8' },
            ].map(s=>(
              <div key={s.cat} style={{ marginBottom:4 }}>
                <div style={{ color:'#3d4f63',fontSize:5.5,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2 }}>{s.cat}</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:2 }}>
                  {s.tags.map(t=><span key={t} style={{ padding:'1px 4px',borderRadius:3,background:`${s.color}14`,border:`1px solid ${s.color}20`,color:s.color,fontSize:6 }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Finance Mini UI ──────────────────────────────────────────────────────────
function FinanceMiniUI() {
  return (
    <div style={{ background:'#080b12',borderRadius:12,overflow:'hidden',fontSize:10,fontFamily:'monospace',height:'100%',border:'1px solid rgba(52,211,153,.08)' }}>
      <div style={{ background:'#0c0f18',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'6px 12px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:16,height:16,borderRadius:5,background:'linear-gradient(135deg,#163320,#34d39933)',border:'1px solid #34d39944',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" style={{ width:8,height:8 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <span style={{ color:'#c8d6e5',fontWeight:600,fontSize:8.5 }}>Voice Intelligence</span>
          <span style={{ color:'#3d4f63',fontSize:7.5,letterSpacing:'.06em' }}>FINANCE · TAXATION</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
          <div style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 6px',borderRadius:100,background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.18)' }}>
            <div style={{ width:4,height:4,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 4px #34d399',animation:'blink2 1.5s infinite' }}/>
            <span style={{ color:'#34d399',fontSize:6.5,fontWeight:600 }}>active</span>
          </div>
          <span style={{ color:'#4b5c6e',fontSize:7.5 }}>Priya Sharma</span>
        </div>
      </div>
      <div style={{ background:'#0c0f18',borderBottom:'1px solid rgba(255,255,255,.03)',padding:'5px 12px',display:'flex',alignItems:'center',gap:8 }}>
        <span style={{ color:'#c8d6e5',fontWeight:700,fontSize:8.5,letterSpacing:'.04em' }}>jatin</span>
        <span style={{ color:'#3d4f63',fontSize:7.5 }}>|</span>
        <span style={{ color:'#4b5c6e',fontSize:7.5 }}>TAXATION</span>
        <span style={{ padding:'1.5px 6px',borderRadius:100,background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',color:'#34d399',fontSize:6.5,fontWeight:700 }}>✓ APPROVED</span>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.6fr 1fr',height:'calc(100% - 52px)' }}>
        <div style={{ borderRight:'1px solid rgba(255,255,255,.04)',padding:8,display:'flex',flexDirection:'column',alignItems:'center',gap:6 }}>
          <span style={{ color:'#7f8ea0',fontWeight:600,fontSize:7.5,alignSelf:'flex-start' }}>Agent</span>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(52,211,153,.06)',border:'1.5px solid rgba(52,211,153,.2)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(52,211,153,.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" style={{ width:16,height:16 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>
          <span style={{ color:'#3d4f63',fontSize:6.5 }}>click to speak</span>
        </div>
        <div style={{ borderRight:'1px solid rgba(255,255,255,.04)',padding:'6px 8px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
            <span style={{ color:'#7f8ea0',fontSize:7.5,fontWeight:600 }}>Conversation</span>
            <div style={{ display:'flex',alignItems:'center',gap:3 }}>
              <div style={{ width:4,height:4,borderRadius:'50%',background:'#34d399',boxShadow:'0 0 3px #34d399',animation:'blink2 1.5s infinite' }}/>
              <span style={{ color:'#34d399',fontSize:6.5 }}>live</span>
            </div>
          </div>
          {[
            { s:'Client',m:'I am here to provide information on income tax filing.',c:'#34d399',r:true },
            { s:'Agent',m:'Can you tell me your income sources, salary or other?',c:'#818cf8',r:false },
            { s:'Client',m:'My main income is from salary and freelance income.',c:'#34d399',r:true },
            { s:'Agent',m:'Do you have any investment like LIC, PPF for tax saving?',c:'#818cf8',r:false },
          ].map((m,i)=>(
            <div key={i} style={{ marginBottom:5,display:'flex',flexDirection:'column',alignItems:m.r?'flex-end':'flex-start' }}>
              <span style={{ color:m.c,fontSize:6,fontWeight:700,marginBottom:1 }}>{m.s}</span>
              <div style={{ padding:'4px 7px',borderRadius:m.r?'7px 7px 2px 7px':'7px 7px 7px 2px',background:m.r?'rgba(52,211,153,.06)':'rgba(255,255,255,.04)',border:`1px solid ${m.c}18`,maxWidth:'92%' }}>
                <span style={{ color:'#b0bec5',fontSize:7,lineHeight:1.3 }}>{m.m}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding:8,display:'flex',flexDirection:'column',gap:6 }}>
          <span style={{ color:'#7f8ea0',fontWeight:600,fontSize:7.5 }}>Client</span>
          <div style={{ width:30,height:30,borderRadius:'50%',background:'rgba(52,211,153,.06)',border:'1.5px solid rgba(52,211,153,.18)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',boxShadow:'0 0 10px rgba(52,211,153,.08)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" style={{ width:13,height:13 }}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>
          <span style={{ textAlign:'center',color:'#3d4f63',fontSize:6 }}>Client speaks here</span>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.04)',paddingTop:5 }}>
            <div style={{ display:'flex',alignItems:'center',gap:3,marginBottom:4 }}>
              <span style={{ color:'#f59e0b',fontSize:6.5 }}>⚡</span>
              <span style={{ color:'#f59e0b',fontSize:6.5,fontWeight:700 }}>Live Extraction</span>
            </div>
            {[
              { cat:'TAXES',tags:['income tax'],color:'#f59e0b' },
              { cat:'INCOME',tags:['salary','freelance'],color:'#34d399' },
              { cat:'INVESTMENTS',tags:['PPF','mutual funds'],color:'#818cf8' },
            ].map(s=>(
              <div key={s.cat} style={{ marginBottom:4 }}>
                <div style={{ color:'#3d4f63',fontSize:5.5,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2 }}>{s.cat}</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:2 }}>
                  {s.tags.map(t=><span key={t} style={{ padding:'1px 4px',borderRadius:3,background:`${s.color}14`,border:`1px solid ${s.color}20`,color:s.color,fontSize:6 }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Patient Portal Section ────────────────────────────────────────────────────
function PatientPortalSection() {
  return (
    <section style={{ padding: '100px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent,rgba(99,102,241,.04),transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 600, height: 600, marginTop: -300, marginLeft: -300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.06),transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 56px', position: 'relative', zIndex: 1 }}>
        <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '.66rem', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#818cf8', marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>
            <span style={{ width: 20, height: 1, background: 'linear-gradient(90deg,#818cf8,transparent)', display: 'inline-block' }} />
            <LanguageCycler texts={['Patient Access', 'ರೋಗಿ ಪ್ರವೇಶ']} interval={3500} />
          </div>
          <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 'clamp(1.9rem,3.2vw,3rem)', fontWeight: 900, color: '#f8fafc', lineHeight: 1.08, marginBottom: 14, letterSpacing: '-.02em' }}>
            <LanguageCycler texts={['Your health, in your hands.', 'ನಿಮ್ಮ ಆರೋಗ್ಯ, ನಿಮ್ಮ ಕೈಯಲ್ಲಿ.']} interval={3500} />
          </h2>
          <p style={{ fontSize: '.95rem', lineHeight: 1.8, color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
            <LanguageCycler texts={['Patients can access their reports, medication schedules, and smart summaries — anytime, in their language.', 'ರೋಗಿಗಳು ತಮ್ಮ ವರದಿಗಳು, ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ, ಮತ್ತು ಸಾರಾಂಶಗಳನ್ನು ನೋಡಬಹುದು.']} interval={3500} />
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
            {[
              { icon: '📄', title: 'View Reports', desc: 'Full consultation reports and AI-generated summaries in English, Hindi, or Kannada.', color: '#06b6d4', rgb: '6,182,212' },
              { icon: '💊', title: 'Medication Tracker', desc: 'See all prescribed medicines, dosages, and timing reminders from your doctor.', color: '#818cf8', rgb: '129,140,248' },
              { icon: '🔊', title: 'Audio Summaries', desc: 'Listen to your health summary in your preferred language — no reading required.', color: '#34d399', rgb: '52,211,153' },
              { icon: '📅', title: 'Appointment History', desc: 'A timeline of all your consultations with status and doctor notes.', color: '#f59e0b', rgb: '245,158,11' },
            ].map((item) => (
              <div key={item.title} style={{ padding: '24px', borderRadius: 18, background: 'rgba(5,8,18,.9)', border: `1px solid rgba(${item.rgb},.12)`, backdropFilter: 'blur(24px)', transition: 'border-color .2s, transform .2s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${item.rgb},.35)`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${item.rgb},.12)`; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1rem', color: '#f8fafc', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: '.82rem', color: '#64748b', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div style={{ textAlign: 'center' }}>
            <Link href="/patient"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 40px',
                borderRadius: 100, textDecoration: 'none', fontFamily: 'Outfit,sans-serif',
                fontWeight: 700, fontSize: '.95rem',
                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                color: '#fff', boxShadow: '0 0 30px rgba(99,102,241,.4), 0 12px 28px rgba(0,0,0,.5)',
                transition: 'transform .3s cubic-bezier(0.16,1,0.3,1), box-shadow .3s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px) scale(1.03)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 50px rgba(99,102,241,.6), 0 20px 40px rgba(0,0,0,.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 30px rgba(99,102,241,.4), 0 12px 28px rgba(0,0,0,.5)' }}>
              🏥 <LanguageCycler texts={['Access Patient Portal', 'ರೋಗಿ ಪೋರ್ಟಲ್ ಪ್ರವೇಶಿಸಿ']} interval={3500} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <p style={{ fontSize: '.78rem', color: '#374151', marginTop: 14, fontFamily: 'JetBrains Mono,monospace' }}>
              <LanguageCycler texts={['No app download required · Works on any device', 'ಆ್ಯಪ್ ಡೌನ್‌ಲೋಡ್ ಅಗತ್ಯವಿಲ್ಲ · ಯಾವುದೇ ಸಾಧನದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ']} interval={3500} />
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Domain Card ─────────────────────────────────────────────────────────────
function DomainCard({ type, delay: revealDelay }: { type: 'healthcare' | 'finance'; delay: number }) {
  const isHealth = type === 'healthcare'
  const accent = isHealth ? '#22d3ee' : '#34d399'
  const accentRgb = isHealth ? '34,211,238' : '52,211,153'
  const accent2 = isHealth ? '#818cf8' : '#f59e0b'
  const label = isHealth ? 'Healthcare' : 'Finance'
  const cardRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)

  const features = isHealth
    ? ['Medical NER — symptoms, medications, diagnoses', 'Automated clinical assessment and plan', 'Structured report templates per speciality', 'Multi-department and multi-language support']
    : ['Income and expense analysis automation', 'Tax optimisation with actionable recommendations', 'Investment risk profiling and scoring', 'Professional financial advisory report generation']

  const tags = isHealth
    ? ['General Medicine', 'Cardiology', 'Orthopaedics', 'Paediatrics']
    : ['Taxation', 'Investment', 'Insurance', 'Loans']

  const stats = isHealth
    ? [{ v: '99.5%', l: 'Accuracy' }, { v: '<0.4s', l: 'Response' }, { v: '3', l: 'Languages' }]
    : [{ v: '10K+', l: 'Reports' }, { v: '70%', l: 'Time Saved' }, { v: '24/7', l: 'Available' }]

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const rx = (y - 0.5) * -7, ry = (x - 0.5) * 7
    el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`
    el.style.transition = 'transform 0.1s ease-out'
    if (shineRef.current) {
      shineRef.current.style.opacity = '1'
      shineRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(${accentRgb},.08) 0%, transparent 55%)`
    }
  }
  const onLeave = () => {
    const el = cardRef.current; if (!el) return
    el.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateZ(0)'
    el.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1)'
    if (shineRef.current) { shineRef.current.style.opacity = '0'; shineRef.current.style.transition = 'opacity 0.5s ease' }
  }

  return (
    <Reveal delay={revealDelay}>
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          position: 'relative', borderRadius: 28, overflow: 'hidden',
          background: 'linear-gradient(165deg, rgba(8,12,24,.98), rgba(3,6,15,.99))',
          border: `1px solid rgba(${accentRgb},.12)`,
          backdropFilter: 'blur(40px)',
          transformStyle: 'preserve-3d', cursor: 'none',
          boxShadow: `0 0 0 1px rgba(255,255,255,.02), 0 40px 80px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.06)`,
          willChange: 'transform',
        }}
      >
        <div ref={shineRef} style={{ position: 'absolute', inset: 0, borderRadius: 28, opacity: 0, transition: 'opacity 0.4s ease', pointerEvents: 'none', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}88, ${accent2}55, transparent)`, zIndex: 5 }} />
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: `radial-gradient(circle, rgba(${accentRgb},.1), transparent 65%)`, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: `radial-gradient(circle, rgba(${accentRgb},.06), transparent 65%)`, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(25px)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: .025, backgroundImage: `linear-gradient(rgba(${accentRgb},1) 1px,transparent 1px),linear-gradient(90deg,rgba(${accentRgb},1) 1px,transparent 1px)`, backgroundSize: '40px 40px', borderRadius: 28, pointerEvents: 'none' }} />

        <div style={{ padding: '32px 36px 0', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: `linear-gradient(135deg, rgba(${accentRgb},.15), rgba(${accentRgb},.05))`,
                border: `1px solid rgba(${accentRgb},.25)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 24px rgba(0,0,0,.5), 0 0 30px rgba(${accentRgb},.1), inset 0 1px 0 rgba(255,255,255,.08)`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', inset: -6, borderRadius: 22, border: `1px dashed rgba(${accentRgb},.2)`, animation: 'spinRing 12s linear infinite', willChange:'transform' }} />
                <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" style={{ width: 24, height: 24, filter: `drop-shadow(0 0 8px rgba(${accentRgb},.5))` }}>
                  {isHealth ? (
                    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /><circle cx="12" cy="12" r="1" fill={accent} /></>
                  ) : (
                    <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>
                  )}
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#f8fafc', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 4 }}>{label}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, animation: 'blink2 2s infinite' }} />
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.6rem', fontWeight: 600, color: accent, letterSpacing: '.1em' }}>DOMAIN ACTIVE</span>
                </div>
              </div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `rgba(${accentRgb},.06)`, border: `1px solid rgba(${accentRgb},.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" style={{ width: 16, height: 16, opacity: .6 }}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {stats.map(st => (
              <div key={st.l} style={{
                flex: 1, padding: '12px 14px', borderRadius: 14,
                background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.15rem', color: accent, lineHeight: 1, filter: `drop-shadow(0 0 6px rgba(${accentRgb},.4))`, marginBottom: 4 }}>{st.v}</div>
                <div style={{ fontSize: '.62rem', color: '#475569', fontFamily: 'JetBrains Mono,monospace', letterSpacing: '.04em', textTransform: 'uppercase' }}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 36px', position: 'relative', zIndex: 4 }}>
          <div style={{
            borderRadius: 14, overflow: 'hidden',
            border: `1px solid rgba(${accentRgb},.1)`,
            boxShadow: `0 20px 60px rgba(0,0,0,.7), 0 0 30px rgba(${accentRgb},.04)`,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,rgba(${accentRgb},.2),transparent)`, animation: 'scanLine 5s linear infinite', pointerEvents: 'none', zIndex: 5, willChange:'top' }} />
            <div style={{ height: 220 }}>
              {isHealth ? <HealthcareMiniUI /> : <FinanceMiniUI />}
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 36px 0', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.58rem', color: `rgba(${accentRgb},.5)`, letterSpacing: '.15em', fontWeight: 600 }}>CAPABILITIES</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,rgba(${accentRgb},.15),transparent)` }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {features.map((item, i) => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: '.82rem', color: '#7f8ea0', lineHeight: 1.5 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                  background: `rgba(${accentRgb},.06)`, border: `1px solid rgba(${accentRgb},.15)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: `all 0.3s cubic-bezier(0.16,1,0.3,1) ${i*40}ms`,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" style={{ width: 11, height: 11 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ paddingTop: 2 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 36px 32px', position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(t => (
              <span key={t} style={{
                padding: '6px 16px', borderRadius: 100, fontSize: '.7rem', fontWeight: 600,
                background: `rgba(${accentRgb},.05)`, color: accent,
                border: `1px solid rgba(${accentRgb},.16)`,
                fontFamily: 'JetBrains Mono,monospace',
                transition: 'all .25s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: `0 0 12px rgba(${accentRgb},.04)`,
              }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 5%, ${accent}44 30%, ${accent2}33 70%, transparent 95%)`, borderRadius: '0 0 28px 28px' }} />

        <div style={{ position: 'absolute', top: 30, right: 30, opacity: .08, zIndex: 1 }}>
          <Icosahedron size={80} color={accent} speed="20s" />
        </div>
        <div style={{ position: 'absolute', bottom: 80, left: -20, opacity: .06, zIndex: 1, perspective: 200 }}>
          <WireCube size={32} color={accent2} animDur="16s" />
        </div>
      </div>
    </Reveal>
  )
}

// ─── Background Scene ─────────────────────────────────────────────────────────
function BackgroundScene() {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden' }}>
      <div style={{ position:'absolute',width:900,height:900,borderRadius:'50%',filter:'blur(180px)',opacity:.07,background:'radial-gradient(circle,#22d3ee,transparent 70%)',top:-400,left:-300,animation:'orbDrift 18s ease-in-out infinite',willChange:'transform' }}/>
      <div style={{ position:'absolute',width:700,height:700,borderRadius:'50%',filter:'blur(160px)',opacity:.06,background:'radial-gradient(circle,#818cf8,transparent 70%)',bottom:-300,right:-200,animation:'orbDrift 22s ease-in-out infinite reverse',willChange:'transform' }}/>
      <div style={{ position:'absolute',width:500,height:500,borderRadius:'50%',filter:'blur(140px)',opacity:.05,background:'radial-gradient(circle,#34d399,transparent 70%)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',animation:'orbDrift 28s ease-in-out infinite 6s',willChange:'transform' }}/>

      <FloatingOrb x="8%" y="20%" size={80} color="#22d3ee" delay="0s" duration="8s"/>
      <FloatingOrb x="85%" y="15%" size={60} color="#818cf8" delay="-3s" duration="10s"/>
      <FloatingOrb x="15%" y="65%" size={50} color="#34d399" delay="-6s" duration="9s"/>
      <FloatingOrb x="78%" y="55%" size={70} color="#f59e0b" delay="-2s" duration="11s"/>
      <FloatingOrb x="45%" y="80%" size={45} color="#22d3ee" delay="-5s" duration="7s"/>
      <FloatingOrb x="92%" y="75%" size={55} color="#a78bfa" delay="-4s" duration="12s"/>

      <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,.055) 1px,transparent 1px)',backgroundSize:'28px 28px' }}/>

      <div style={{ position:'absolute',top:-60,left:-60,opacity:.12 }}>
        <TorusRing size={220} color="#22d3ee" opacity={0.3} animDur="15s" tiltX={60}/>
      </div>
      <div style={{ position:'absolute',bottom:-60,right:-60,opacity:.1 }}>
        <TorusRing size={200} color="#818cf8" opacity={0.25} animDur="20s" tiltX={65}/>
      </div>
      <div style={{ position:'absolute',top:'40%',right:-40,opacity:.08 }}>
        <TorusRing size={160} color="#34d399" opacity={0.2} animDur="25s" tiltX={70}/>
      </div>

      <div style={{ position:'absolute',top:'12%',right:'6%',opacity:.12,perspective:300 }}>
        <WireCube size={70} color="#22d3ee" animDur="14s"/>
      </div>
      <div style={{ position:'absolute',top:'35%',left:'3%',opacity:.09,perspective:260 }}>
        <WireCube size={50} color="#818cf8" animDur="18s" delay="-5s"/>
      </div>
      <div style={{ position:'absolute',bottom:'20%',right:'4%',opacity:.08,perspective:240 }}>
        <WireCube size={40} color="#34d399" animDur="22s" delay="-8s"/>
      </div>
      <div style={{ position:'absolute',bottom:'35%',left:'5%',opacity:.07,perspective:200 }}>
        <WireCube size={32} color="#f59e0b" animDur="16s" delay="-3s"/>
      </div>

      <div style={{ position:'absolute',left:20,top:'15%',opacity:.12,animation:'floatUp 12s ease-in-out infinite',willChange:'transform' }}>
        <DNAHelix color1="#22d3ee" color2="#818cf8"/>
      </div>
      <div style={{ position:'absolute',right:20,top:'35%',opacity:.1,animation:'floatUp 14s ease-in-out infinite',animationDelay:'-6s',willChange:'transform' }}>
        <DNAHelix color1="#34d399" color2="#f59e0b"/>
      </div>

      {[...Array(16)].map((_,i)=>(
        <div key={i} style={{ position:'absolute',width:i%3===0?3:2,height:i%3===0?3:2,borderRadius:'50%',background:['#22d3ee','#818cf8','#34d399','#f59e0b','#a78bfa'][i%5],left:`${5+i*6.2}%`,bottom:0,animation:`particleFloat ${10+i*2.5}s linear infinite`,animationDelay:`${i*1.3}s`,opacity:0 }}/>
      ))}

      <div style={{ position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.015) 2px,rgba(0,0,0,.015) 4px)',pointerEvents:'none' }}/>
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.6) 100%)' }}/>
    </div>
  )
}

// ─── Language Cycler ────────────────────────────────────────────────────────────
function LanguageCycler({ texts, interval = 3000, style = {} }: { texts: string[]; interval?: number; style?: React.CSSProperties }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % texts.length)
        setVisible(true)
      }, 400)
    }, interval)
    return () => clearInterval(timer)
  }, [texts.length, interval])

  return (
    <span style={{
      ...style,
      display: 'inline-block',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
    }}>
      {texts[index]}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef   = useRef<HTMLDivElement>(null)
  const trailRef  = useRef<HTMLDivElement>(null)
  const mx = useRef(0), my = useRef(0), rx = useRef(0), ry = useRef(0)
  const heroRef = useRef<HTMLDivElement>(null)
  const heroThrottle = useRef(0)

  useEffect(() => {
    let raf: number
    const loop = () => {
      rx.current += (mx.current - rx.current) * 0.09
      ry.current += (my.current - ry.current) * 0.09
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx.current-18}px,${ry.current-18}px,0)`
      }
      raf = requestAnimationFrame(loop)
    }

    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX; my.current = e.clientY
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${e.clientX-6}px,${e.clientY-6}px,0)`
      if (trailRef.current) trailRef.current.style.transform = `translate3d(${e.clientX-3}px,${e.clientY-3}px,0)`

      const now = performance.now()
      if (heroRef.current && now - heroThrottle.current > 33) {
        heroThrottle.current = now
        const r = heroRef.current.getBoundingClientRect()
        const dx = (e.clientX - r.left - r.width/2) / window.innerWidth
        const dy = (e.clientY - r.top - r.height/2) / window.innerHeight
        heroRef.current.style.transform = `perspective(1600px) rotateX(${-dy*5}deg) rotateY(${dx*8}deg)`
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    loop()
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  const FEATURES = [
    { num:'01', accent:'#22d3ee', rgb:'34,211,238', title:'Multi-Language Voice',
      desc:'English, Hindi, Kannada — Sarvam AI transcribes with sub-word accuracy across three Indic languages simultaneously.',
      icon:<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></> },
    { num:'02', accent:'#818cf8', rgb:'129,140,248', title:'Clinical NER Engine',
      desc:'Real-time named entity recognition extracts symptoms, medications, dosages, diagnoses and ICD codes without post-processing.',
      icon:<><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></> },
    { num:'03', accent:'#34d399', rgb:'52,211,153', title:'Instant PDF Reports',
      desc:'Structured clinical and financial reports generated under two seconds. Templates configurable per speciality and department.',
      icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
    { num:'04', accent:'#f59e0b', rgb:'245,158,11', title:'Real-Time Translation',
      desc:'Live multilingual pipeline normalises consultations into English mid-session. Zero post-session translation overhead.',
      icon:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></> },
    { num:'05', accent:'#f87171', rgb:'248,113,113', title:'HIPAA-Grade Security',
      desc:'End-to-end AES-256 encryption, immutable audit trails, RBAC, and full HIPAA/DPDP compliance from infrastructure to UI.',
      icon:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> },
    { num:'06', accent:'#22d3ee', rgb:'34,211,238', title:'Groq LPU Inference',
      desc:'Powered by Groq\'s Language Processing Unit — sub-300ms AI responses ensure consultations are never interrupted.',
      icon:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/> },
    { num:'07', accent:'#a78bfa', rgb:'167,139,250', title:'Outbound Voice Automation',
      desc:'Automated calls for healthcare follow-ups, financial reminders, and tax compliance alerts. Boost engagement and reduce delays.',
      icon:<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M14.05 2a9 9 0 0 1 8 7.94"/><path d="M14.05 6A5 5 0 0 1 18 10"/></> },
    { num:'08', accent:'#fb923c', rgb:'251,146,60', title:'Patient Portal Access',
      desc:'Patients view reports, medications, audio summaries, and appointment timelines in their language — no app needed.',
      icon:<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        body{font-family:'Outfit',sans-serif;background:#020408;color:#cbd5e1;overflow-x:hidden;cursor:none}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#000}::-webkit-scrollbar-thumb{background:rgba(34,211,238,.2);border-radius:2px}

        @keyframes cubeY{0%{transform:rotateX(16deg) rotateY(0deg)}100%{transform:rotateX(16deg) rotateY(360deg)}}
        @keyframes torusRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes orbDrift{0%,100%{transform:translate3d(0,0,0) scale(1)}33%{transform:translate3d(20px,-40px,0) scale(1.04)}66%{transform:translate3d(-15px,-60px,0) scale(1.08)}}
        @keyframes floatOrb{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}50%{transform:translate3d(0,-30px,0) rotate(180deg)}}
        @keyframes scanLine{0%{top:-4%}100%{top:104%}}
        @keyframes blink2{0%,100%{opacity:1}50%{opacity:.18}}
        @keyframes waveB{0%,100%{transform:scaleY(1);opacity:.9}50%{transform:scaleY(.25);opacity:.5}}
        @keyframes floatUp{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-18px,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translate3d(0,32px,0) scale(.97)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
        @keyframes shimmer{0%{left:-100%}100%{left:200%}}
        @keyframes ctaPulse{0%,100%{box-shadow:0 0 40px rgba(34,211,238,.06),0 40px 80px rgba(0,0,0,.8)}50%{box-shadow:0 0 80px rgba(34,211,238,.18),0 50px 100px rgba(0,0,0,.9)}}
        @keyframes borderGlow{0%,100%{opacity:.35}50%{opacity:1}}
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes screenTilt3d{0%,100%{transform:perspective(1600px) rotateX(4deg) rotateY(-7deg) translateY(0)}50%{transform:perspective(1600px) rotateX(-2deg) rotateY(4deg) translateY(-14px)}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(34,211,238,.12)}50%{box-shadow:0 0 50px rgba(34,211,238,.38),0 0 80px rgba(34,211,238,.08)}}
        @keyframes particleFloat{0%{transform:translate3d(0,0,0);opacity:0}10%{opacity:.8}90%{opacity:.4}100%{transform:translate3d(60px,-500px,0);opacity:0}}
        @keyframes dnaPulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes rotateSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes domainPulse{0%,100%{opacity:.08}50%{opacity:.16}}
        @keyframes connectLine{0%{stroke-dashoffset:200}100%{stroke-dashoffset:0}}
        @keyframes torusOrbit{0%{transform:rotateX(68deg) rotateZ(0deg)}100%{transform:rotateX(68deg) rotateZ(360deg)}}
        @keyframes testiFloat1{0%,100%{transform:translate3d(0,0,0) rotateZ(-.5deg)}50%{transform:translate3d(0,-16px,0) rotateZ(.5deg)}}
        @keyframes testiFloat2{0%,100%{transform:translate3d(0,0,0) rotateZ(.3deg)}50%{transform:translate3d(0,-20px,0) rotateZ(-.3deg)}}
        @keyframes testiFloat3{0%,100%{transform:translate3d(0,0,0) rotateZ(-.2deg)}50%{transform:translate3d(0,-12px,0) rotateZ(.2deg)}}

        .fade-up{animation:fadeUp .9s cubic-bezier(0.16,1,0.3,1) both}
        .d1{animation-delay:.12s}.d2{animation-delay:.24s}.d3{animation-delay:.38s}.d4{animation-delay:.52s}

        .nav-link{color:#475569;font-size:.75rem;font-weight:500;text-decoration:none;letter-spacing:.09em;text-transform:uppercase;transition:color .28s cubic-bezier(0.16,1,0.3,1);font-family:'JetBrains Mono',monospace;position:relative}
        .nav-link::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:#22d3ee;transition:width .35s cubic-bezier(0.16,1,0.3,1)}
        .nav-link:hover{color:#22d3ee}
        .nav-link:hover::after{width:100%}

        .btn-main{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:9px;padding:14px 36px;border-radius:100px;font-family:'Outfit',sans-serif;font-weight:700;font-size:.88rem;letter-spacing:.04em;cursor:none;border:none;color:#000;background:linear-gradient(135deg,#22d3ee,#818cf8,#34d399);background-size:200% 200%;animation:gradShift 4s ease infinite;box-shadow:0 0 28px rgba(34,211,238,.35),0 0 60px rgba(34,211,238,.1),0 12px 28px rgba(0,0,0,.6);transition:transform .4s cubic-bezier(0.16,1,0.3,1),box-shadow .4s;text-decoration:none;will-change:transform}
        .btn-main::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:shimmer 3.5s ease-in-out infinite}
        .btn-main:hover{transform:translateY(-3px) scale(1.035);box-shadow:0 0 50px rgba(34,211,238,.55),0 20px 40px rgba(0,0,0,.7)}

        .btn-ghost{display:inline-flex;align-items:center;gap:9px;padding:14px 32px;border-radius:100px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.88rem;cursor:none;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);color:#94a3b8;backdrop-filter:blur(16px);transition:all .35s cubic-bezier(0.16,1,0.3,1);text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.05);will-change:transform}
        .btn-ghost:hover{color:#f8fafc;border-color:rgba(34,211,238,.4);background:rgba(34,211,238,.07);box-shadow:0 0 30px rgba(34,211,238,.12);transform:translateY(-2px)}

        .btn-patient{display:inline-flex;align-items:center;gap:9px;padding:11px 24px;border-radius:100px;font-family:'Outfit',sans-serif;font-weight:700;font-size:.82rem;cursor:none;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.3);color:#818cf8;transition:all .35s;text-decoration:none}
        .btn-patient:hover{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.6);box-shadow:0 0 20px rgba(99,102,241,.2);transform:translateY(-2px)}

        .holo-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 18px;border-radius:100px;background:rgba(34,211,238,.04);border:1px solid rgba(34,211,238,.18);color:#67e8f9;font-size:.68rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-family:'JetBrains Mono',monospace;position:relative;overflow:hidden;box-shadow:0 0 20px rgba(34,211,238,.05),inset 0 1px 0 rgba(255,255,255,.04)}
        .holo-badge::after{content:'';position:absolute;top:0;left:-100%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(34,211,238,.2),transparent);animation:shimmer 5s ease-in-out infinite}

        .sec-label{display:inline-flex;align-items:center;gap:8px;font-size:.66rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#22d3ee;margin-bottom:12px;font-family:'JetBrains Mono',monospace}
        .sec-label::before{content:'';width:20px;height:1px;background:linear-gradient(90deg,#22d3ee,transparent)}

        .testi-card{position:relative;border-radius:24px;overflow:hidden;background:rgba(5,8,18,.9);border:1px solid rgba(255,255,255,.06);backdrop-filter:blur(30px);padding:36px;box-shadow:16px 16px 40px rgba(0,0,0,.65),-3px -3px 10px rgba(255,255,255,.02),inset 0 1px 0 rgba(255,255,255,.04);cursor:none}
        .testi-card:hover{border-color:rgba(34,211,238,.14);box-shadow:0 40px 80px rgba(0,0,0,.7),0 0 40px rgba(34,211,238,.05)}
        .testi-card::before{content:'"';position:absolute;top:10px;right:20px;font-size:6rem;line-height:1;color:rgba(34,211,238,.03);font-family:'Outfit',sans-serif;font-weight:900;pointer-events:none}

        .cta-wrap{border-radius:28px;position:relative;overflow:hidden;background:rgba(3,5,12,.88);border:1px solid rgba(34,211,238,.1);backdrop-filter:blur(44px);padding:88px;text-align:center;box-shadow:0 60px 120px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.04);animation:ctaPulse 6s ease-in-out infinite}
        .cta-wrap::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,.7),rgba(129,140,248,.4),rgba(34,211,238,.7),transparent);animation:borderGlow 3.5s ease-in-out infinite}

        .screen-card{position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.07);box-shadow:0 40px 80px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.025);transform-style:preserve-3d}

        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}}

        @media(max-width:1100px){
          .hero-grid{grid-template-columns:1fr !important}
          .feat-grid{grid-template-columns:repeat(2,1fr) !important}
          .feat-bottom{grid-template-columns:1fr !important}
          .stats-grid{grid-template-columns:repeat(2,1fr) !important}
          .steps-grid{grid-template-columns:repeat(2,1fr) !important}
          .domain-showcase{grid-template-columns:1fr !important}
          .testi-grid{grid-template-columns:1fr !important}
          .cta-wrap{padding:52px 32px !important}
        }
        @media(max-width:640px){
          .nav-links{display:none !important}
          .feat-grid{grid-template-columns:1fr !important}
          .feat-bottom{grid-template-columns:1fr !important}
          .stats-grid{grid-template-columns:1fr 1fr !important}
          .steps-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      {/* Custom cursors */}
      <div ref={cursorRef} style={{ width:12,height:12,background:'#22d3ee',borderRadius:'50%',position:'fixed',top:0,left:0,pointerEvents:'none',zIndex:9999,mixBlendMode:'difference',willChange:'transform' }}/>
      <div ref={ringRef} style={{ width:36,height:36,border:'1.5px solid rgba(34,211,238,.45)',borderRadius:'50%',position:'fixed',top:0,left:0,pointerEvents:'none',zIndex:9998,willChange:'transform' }}/>
      <div ref={trailRef} style={{ width:6,height:6,background:'rgba(34,211,238,.35)',borderRadius:'50%',position:'fixed',top:0,left:0,pointerEvents:'none',zIndex:9997,filter:'blur(2px)',willChange:'transform' }}/>

      <BackgroundScene/>

      <div style={{ position:'relative',zIndex:1 }}>

        {/* ══════════ NAV ══════════ */}
        <nav style={{ position:'fixed',top:0,width:'100%',zIndex:200,padding:'0 56px',height:66,display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(2,4,8,0.82)',backdropFilter:'blur(40px) saturate(1.8)',borderBottom:'1px solid rgba(255,255,255,.04)',boxShadow:'0 1px 0 rgba(34,211,238,.04)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#0e7490,#22d3ee)',display:'flex',alignItems:'center',justifyContent:'center',animation:'glowPulse 4.5s ease-in-out infinite',boxShadow:'0 0 0 1px rgba(34,211,238,.2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" style={{ width:19,height:19 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.05rem',color:'#f8fafc',letterSpacing:'-.01em' }}>MediFi Voice</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.58rem',color:'#334155',letterSpacing:'.12em',textTransform:'uppercase',marginTop:-1 }}>Voice Intelligence</div>
            </div>
          </div>
          <div className="nav-links" style={{ display:'flex',gap:36,alignItems:'center' }}>
            {[['Features','#features'],['Workflow','#workflow'],['Domains','#domains'],['Results','#stats']].map(([l,h])=>(
              <a key={l} href={h} className="nav-link">{l}</a>
            ))}
            {/* Patient Portal nav link restored from v1 */}
            <Link href="/patient" className="btn-patient" style={{ padding:'6px 16px',fontSize:'.72rem' }}>🏥 <LanguageCycler texts={['Patient Portal', 'ರೋಗಿ ಪೋರ್ಟಲ್']} interval={3500} /></Link>
          </div>
          <Link href="/login" className="btn-main" style={{ padding:'9px 24px',fontSize:'.78rem' }}>
            <LanguageCycler texts={['Doctor Login', 'ಡಾಕ್ಟರ್ ಲಾಗಿನ್']} interval={3500} />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </nav>

        {/* ══════════ HERO ══════════ */}
        <section style={{ minHeight:'100vh',display:'flex',alignItems:'center',padding:'140px 56px 80px',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',bottom:0,left:0,right:0,height:320,backgroundImage:'linear-gradient(rgba(34,211,238,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.045) 1px,transparent 1px)',backgroundSize:'80px 80px',transform:'perspective(800px) rotateX(68deg)',transformOrigin:'bottom',maskImage:'linear-gradient(to top,black 5%,transparent 80%)',pointerEvents:'none' }}/>

          <div className="hero-grid" style={{ maxWidth:1380,margin:'0 auto',width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center' }}>
            <div>
              <div className="holo-badge fade-up" style={{ marginBottom:28 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22d3ee',boxShadow:'0 0 10px #22d3ee',animation:'blink2 2s infinite',flexShrink:0 }}/>
                <LanguageCycler texts={['AI-Powered Voice Intelligence', 'AI-ಆಧಾರಿತ ಧ್ವನಿ ಬುದ್ಧಿಮತ್ತೆ']} interval={3500} />
              </div>
              <h1 className="fade-up d1" style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(2.6rem,4.5vw,4.4rem)',fontWeight:900,lineHeight:1.04,letterSpacing:'-.03em',color:'#f8fafc',marginBottom:20 }}>
                <LanguageCycler texts={['The AI that listens', 'ಕೇಳುವ AI']} interval={3500} /><br/>
                <LanguageCycler texts={['while you consult.', 'ನೀವು ಸಮಾಲೋಚನೆ ಮಾಡುವಾಗ']} interval={3500} /><br/>
              </h1><br/>
              <p className="fade-up d2" style={{ fontSize:'.98rem',lineHeight:1.82,color:'#64748b',maxWidth:480,marginBottom:40 }}>
                <LanguageCycler
                  texts={[
                    'Purpose-built for Healthcare and Finance professionals. Speak in any language — AI transcribes, extracts critical entities, and delivers structured reports in seconds.',
                    'ಆರೋಗ್ಯ ಮತ್ತು ಹಣಕಾಸು ವೃತ್ತಿಪರರಿಗಾಗಿ ಉದ್ದೇಶಿತ: ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ - AI ಲಿಪ್ಯಂತರ ಮಾಡುತ್ತದೆ, ನಿರ್ಣಾಯಕ ಘಟಕಗಳನ್ನು ಹೊರತೆಗೆಯುತ್ತದೆ ಮತ್ತು ಸೆಕೆಂಡುಗಳಲ್ಲಿ ರಚನಾತ್ಮಕ ವರದಿಗಳನ್ನು ನೀಡುತ್ತದೆ.',
                  ]}
                  interval={3500}
                />
              </p>
              <div className="fade-up d3" style={{ display:'flex',gap:14,flexWrap:'wrap',marginBottom:32 }}>
                <Link href="/login" className="btn-main">
                  <LanguageCycler texts={['Doctor Login', 'ಡಾಕ್ಟರ್ ಲಾಗಿನ್']} interval={3500} />
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link href="#domains" className="btn-ghost"><LanguageCycler texts={['See It In Action', 'ಕ್ರಿಯೆಯಲ್ಲಿ ನೋಡಿ']} interval={3500} /></Link>
              </div>

              {/* ── Patient Portal CTA in hero (from v1) ─────────────────── */}
              <div className="fade-up d4" style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderRadius:14,background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)',marginBottom:32,cursor:'default' }}>
                <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <span style={{ fontSize:18 }}>🏥</span>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'.82rem',fontWeight:700,color:'#c7d2fe',marginBottom:2 }}>
                    <LanguageCycler texts={['Are you a patient?', 'ನೀವು ರೋಗಿಯೇ?']} interval={3500} />
                  </p>
                  <p style={{ fontSize:'.75rem',color:'#6b7280' }}>
                    <LanguageCycler texts={['View your reports, medications, and summaries', 'ನಿಮ್ಮ ವರದಿಗಳು, ಔಷಧಿಗಳು ನೋಡಿ']} interval={3500} />
                  </p>
                </div>
                <Link href="/patient" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:100,background:'linear-gradient(135deg,#6366f1,#4f46e5)',color:'#fff',fontSize:'.75rem',fontWeight:700,textDecoration:'none',fontFamily:'Outfit,sans-serif',flexShrink:0,boxShadow:'0 4px 12px rgba(99,102,241,.3)',transition:'transform .2s' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLAnchorElement).style.transform='scale(1.05)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLAnchorElement).style.transform='none'}>
                  <LanguageCycler texts={['Open Portal →', 'ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ →']} interval={3500} />
                </Link>
              </div>

              <div className="fade-up" style={{ display:'flex',alignItems:'center',gap:24,paddingTop:24,borderTop:'1px solid rgba(255,255,255,.05)' }}>
                <div style={{ display:'flex' }}>
                  {[['PS','#0e7490,#22d3ee'],['RK','#047857,#34d399'],['AP','#b45309,#f59e0b'],['MK','#1d4ed8,#818cf8'],['SJ','#9d174d,#f472b6']].map(([i,g],n)=>(
                    <div key={n} style={{ width:30,height:30,borderRadius:'50%',border:'2px solid #020408',background:`linear-gradient(135deg,${g})`,marginLeft:n?-8:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.5rem',fontWeight:800,color:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,.4)' }}>{i}</div>
                  ))}
                </div>
                <div>
                  <div style={{ color:'#f59e0b',fontSize:'.7rem',letterSpacing:3 }}>★★★★★</div>
                  <p style={{ fontSize:'.7rem',color:'#475569',marginTop:1 }}>500+ professionals trust MediFi</p>
                </div>
                <div style={{ width:1,height:28,background:'rgba(255,255,255,.06)' }}/>
                <div style={{ display:'flex',gap:20 }}>
                  {[['99.5%','#22d3ee','accuracy'],['<0.4s','#818cf8','response'],['3 langs','#34d399','support']].map(([v,c,l])=>(
                    <div key={l}>
                      <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,color:c,fontSize:'.88rem',filter:`drop-shadow(0 0 6px ${c}55)` }}>{v}</div>
                      <p style={{ fontSize:'.65rem',color:'#475569',letterSpacing:'.04em' }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hero right panel */}
            <div className="fade-up d2" style={{ position:'relative',perspective:1600 }}>
              <div style={{ position:'absolute',top:-80,right:-80,width:380,height:380,pointerEvents:'none',zIndex:0 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{ position:'absolute',inset:i*22,borderRadius:'50%',border:`1px solid rgba(34,211,238,${.07-i*.018})`,transform:`rotateX(68deg) rotateZ(${i*55}deg)`,animation:`torusOrbit ${18+i*6}s linear infinite ${i%2?'reverse':''}`,transformStyle:'preserve-3d',willChange:'transform' }}/>
                ))}
              </div>
              <div style={{ position:'absolute',top:-10,right:-30,zIndex:3,perspective:300,animation:'floatUp 7s ease-in-out infinite',animationDelay:'-2s',willChange:'transform' }}>
                <WireCube size={50} color="#22d3ee" animDur="10s"/>
              </div>
              <div style={{ position:'absolute',bottom:20,left:-28,zIndex:3,perspective:300,animation:'floatUp 8s ease-in-out infinite',animationDelay:'-4s',willChange:'transform' }}>
                <WireCube size={36} color="#818cf8" animDur="14s" delay="-3s"/>
              </div>
              <div style={{ position:'absolute',top:'42%',left:-44,zIndex:3,perspective:240,animation:'floatUp 6s ease-in-out infinite',animationDelay:'-1s',willChange:'transform' }}>
                <WireCube size={22} color="#34d399" animDur="19s"/>
              </div>
              <div style={{ position:'absolute',top:-40,left:20,zIndex:2,opacity:.5 }}>
                <Icosahedron size={70} color="#22d3ee" speed="20s"/>
              </div>
              <div style={{ position:'absolute',bottom:-30,right:-10,zIndex:2,opacity:.4 }}>
                <Icosahedron size={55} color="#818cf8" speed="25s"/>
              </div>
              <div style={{ position:'absolute',top:-22,right:44,background:'rgba(3,8,20,.96)',border:'1px solid rgba(52,211,153,.25)',borderRadius:14,padding:'12px 18px',animation:'floatUp 5s ease-in-out infinite',animationDelay:'-1s',boxShadow:'0 20px 40px rgba(0,0,0,.7),0 0 20px rgba(52,211,153,.06)',zIndex:4,backdropFilter:'blur(24px)',willChange:'transform' }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.56rem',color:'#475569',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:3 }}>Accuracy</div>
                <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.3rem',color:'#34d399',lineHeight:1,filter:'drop-shadow(0 0 8px rgba(52,211,153,.4))' }}>99.5%</div>
              </div>
              <div style={{ position:'absolute',bottom:14,left:-18,background:'rgba(3,8,20,.96)',border:'1px solid rgba(129,140,248,.25)',borderRadius:14,padding:'12px 18px',animation:'floatUp 5.5s ease-in-out infinite',animationDelay:'-3.5s',boxShadow:'0 20px 40px rgba(0,0,0,.7),0 0 20px rgba(129,140,248,.06)',zIndex:4,backdropFilter:'blur(24px)',willChange:'transform' }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.56rem',color:'#475569',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:3 }}>Entities</div>
                <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.3rem',color:'#818cf8',lineHeight:1,filter:'drop-shadow(0 0 8px rgba(129,140,248,.4))' }}>16</div>
              </div>
              <div ref={heroRef} style={{ animation:'screenTilt3d 9s ease-in-out infinite',transformStyle:'preserve-3d',position:'relative',zIndex:2,willChange:'transform',transition:'transform 0.1s ease-out' }}>
                <div className="screen-card">
                  <div style={{ position:'absolute',left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(34,211,238,.2),transparent)',animation:'scanLine 5s linear infinite',pointerEvents:'none',zIndex:5 }}/>
                  <div style={{ height:300 }}><HealthcareMiniUI/></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ LOGOS ══════════ */}
        <div style={{ padding:'36px 0',borderTop:'1px solid rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.04)',background:'rgba(2,4,8,.7)',backdropFilter:'blur(20px)' }}>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px' }}>
            <p style={{ textAlign:'center',fontFamily:'JetBrains Mono,monospace',fontSize:'.62rem',fontWeight:600,letterSpacing:'.15em',textTransform:'uppercase',color:'#1e2a3b',marginBottom:20 }}>Powered by leading AI infrastructure</p>
            <div style={{ display:'flex',justifyContent:'center',alignItems:'center',flexWrap:'wrap',gap:56,opacity:.3 }}>
              {['Groq','Sarvam AI','Next.js','Prisma','Vercel'].map(t=>(
                <span key={t} style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.02rem',color:'#f8fafc',letterSpacing:'.04em' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ FEATURES ══════════ */}
        <section id="features" style={{ padding:'140px 0',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:'50%',left:'50%',width:800,height:800,marginTop:-400,marginLeft:-400,borderRadius:'50%',border:'1px solid rgba(34,211,238,.02)',animation:'rotateSlow 80s linear infinite',pointerEvents:'none',willChange:'transform' }}/>
          <div style={{ position:'absolute',top:'50%',left:'50%',width:600,height:600,marginTop:-300,marginLeft:-300,borderRadius:'50%',border:'1px solid rgba(129,140,248,.025)',animation:'rotateSlow 60s linear infinite reverse',pointerEvents:'none',willChange:'transform' }}/>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%,rgba(34,211,238,.04),transparent 60%),radial-gradient(ellipse at 50% 100%,rgba(129,140,248,.03),transparent 60%)',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',top:80,right:80,opacity:.15 }}>
            <Icosahedron size={100} color="#22d3ee" speed="18s"/>
          </div>
          <div style={{ position:'absolute',bottom:80,left:80,opacity:.12 }}>
            <Icosahedron size={80} color="#818cf8" speed="24s"/>
          </div>

          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px' }}>
            <Reveal style={{ textAlign:'center',marginBottom:80 }}>
              <div className="sec-label" style={{ justifyContent:'center' }}><LanguageCycler texts={['Capabilities', 'ಸಾಮರ್ಥ್ಯಗಳು']} interval={3500} /></div>
              <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(1.9rem,3.2vw,3rem)',fontWeight:900,color:'#f8fafc',lineHeight:1.08,marginBottom:16,letterSpacing:'-.02em' }}>
                <LanguageCycler texts={['Enterprise AI built for', 'ಉದ್ಯಮಗಳಿಗಾಗಿ ನಿರ್ಮಿಸಲಾದ ಎಐ']} interval={3500} /><br/>
                <span style={{ background:'linear-gradient(135deg,#22d3ee,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}><LanguageCycler texts={['clinical precision', 'ವೈದ್ಯಕೀಯ ನಿಖರತೆ']} interval={3500} /></span>
              </h2>
              <p style={{ fontSize:'.95rem',lineHeight:1.8,color:'#64748b',maxWidth:500,margin:'0 auto' }}><LanguageCycler texts={['Every feature engineered to remove friction, eliminate manual work, and deliver trusted documentation.', 'ಪ್ರತಿ ವೈಶಿಷ್ಟ್ಯವೂ ಅಡಚಣೆಗಳನ್ನು ತೆಗೆದುಹಾಕಲು, ಕೈಯಾರೆ ಮಾಡುವ ಕೆಲಸವನ್ನು ಕಡಿಮೆ ಮಾಡಲು, ಮತ್ತು ನಂಬಲರ್ಹ ದಾಖಲೆಗಳನ್ನು ಒದಗಿಸಲು ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ.']} interval={3500} /></p>
            </Reveal>

            <div className="feat-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginBottom:20 }}>
              {FEATURES.slice(0,6).map((f,i) => <FeatureCard key={i} f={f} index={i}/>)}
            </div>

            <div className="feat-bottom" style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20 }}>
              <FeatureCard f={FEATURES[6]} index={6}/>
              <FeatureCard f={FEATURES[7]} index={7}/>

              <Reveal delay={8*65}>
                <div style={{
                  position:'relative',borderRadius:24,overflow:'hidden',
                  background:'linear-gradient(145deg,rgba(8,12,24,.97),rgba(5,8,18,.99))',
                  border:'1px solid rgba(34,211,238,.08)',
                  backdropFilter:'blur(40px)',padding:'36px 32px',
                  boxShadow:'0 0 0 1px rgba(255,255,255,.025),16px 16px 40px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05)',
                  display:'flex',flexDirection:'column',justifyContent:'center',gap:20,
                  minHeight:240,
                }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(34,211,238,.4),transparent)' }}/>
                  <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 70% 30%,rgba(34,211,238,.04),transparent 60%)',pointerEvents:'none' }}/>
                  <div style={{ position:'absolute',right:20,top:'50%',transform:'translateY(-50%)',opacity:.22 }}>
                    <Icosahedron size={88} color="#22d3ee" speed="20s"/>
                  </div>
                  <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(34,211,238,.4),rgba(129,140,248,.2),transparent)',borderRadius:'0 0 24px 24px' }}/>
                  <p style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.6rem',color:'rgba(34,211,238,.4)',letterSpacing:'.15em',position:'relative',zIndex:1 }}>LIVE PLATFORM STATS</p>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,position:'relative',zIndex:1 }}>
                    {[['500+','Professionals','#22d3ee'],['10K+','Reports','#818cf8'],['99.5%','Accuracy','#34d399'],['<0.4s','Response','#f59e0b']].map(([v,l,c])=>(
                      <div key={l} style={{ padding:'14px 16px',borderRadius:14,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.05)' }}>
                        <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'1.35rem',color:c,lineHeight:1,filter:`drop-shadow(0 0 8px ${c}44)` }}>{v}</div>
                        <div style={{ fontSize:'.68rem',color:'#475569',marginTop:4,fontFamily:'JetBrains Mono,monospace',letterSpacing:'.04em' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══════════ PATIENT PORTAL SECTION (from v1) ══════════ */}
        <PatientPortalSection />

        {/* ══════════ DOMAINS ══════════ */}
        <section id="domains" style={{ padding: '160px 0', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,4,8,.3) 0%, rgba(5,10,20,.6) 30%, rgba(3,6,14,.8) 70%, rgba(2,4,8,.3) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,.06), transparent 60%)', filter: 'blur(80px)', animation: 'orbDrift 20s ease-in-out infinite', pointerEvents: 'none', willChange:'transform' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,.05), transparent 60%)', filter: 'blur(70px)', animation: 'orbDrift 24s ease-in-out infinite reverse', pointerEvents: 'none', willChange:'transform' }} />
          <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', opacity: .06 }}><TorusRing size={280} color="#22d3ee" opacity={0.15} animDur="30s" tiltX={75} /></div>
          <div style={{ position: 'absolute', left: 30, top: '20%', opacity: .08, animation: 'floatUp 15s ease-in-out infinite', willChange:'transform' }}><DNAHelix color1="#22d3ee" color2="#34d399" /></div>
          <div style={{ position: 'absolute', right: 30, top: '30%', opacity: .06, animation: 'floatUp 17s ease-in-out infinite', animationDelay: '-8s', willChange:'transform' }}><DNAHelix color1="#818cf8" color2="#f59e0b" /></div>

          <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 56px', position: 'relative', zIndex: 1 }}>
            <Reveal style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="sec-label" style={{ justifyContent: 'center' }}><LanguageCycler texts={['Specialisations', 'ವಿಶೇಷತೆಗಳು']} interval={3500} /></div>
              <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 'clamp(2rem,3.6vw,3.3rem)', fontWeight: 900, color: '#f8fafc', lineHeight: 1.06, marginBottom: 18, letterSpacing: '-.025em' }}>
                <LanguageCycler texts={['Two Domains.', 'ಎರಡು ಕ್ಷೇತ್ರಗಳು.']} interval={3500} /><br />
                <span style={{ background: 'linear-gradient(135deg,#22d3ee,#818cf8,#34d399)', backgroundSize: '200% 200%', animation: 'gradShift 5s ease infinite', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}><LanguageCycler texts={['One Unified Engine.', 'ಒಂದು ಏಕೀಕೃತ ಎಂಜಿನ್.']} interval={3500} /></span>
              </h2>
              <p style={{ fontSize: '.95rem', lineHeight: 1.8, color: '#64748b', maxWidth: 520, margin: '0 auto' }}>
                <LanguageCycler texts={['Purpose-built AI pipelines for each domain — same elegant interface, specialised intelligence underneath.', 'ಪ್ರತಿ ಕ್ಷೇತ್ರಕ್ಕೆ ಉದ್ದೇಶಪೂರ್ವಕವಾಗಿ ರಚಿಸಲಾದ AI — ಒಂದೇ ಸುಂದರ ಇಂಟರ್ಫೇಸ್, ವಿಶೇಷ ಬುದ್ಧಿಮತ್ತೆ.']} interval={3500} />
              </p>
            </Reveal>

            <Reveal delay={100}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderRadius: 100, background: 'rgba(34,211,238,.04)', border: '1px solid rgba(34,211,238,.12)', backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 12px #22d3ee66', animation: 'blink2 2s infinite' }} />
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.65rem', fontWeight: 600, color: '#22d3ee', letterSpacing: '.08em' }}>HEALTHCARE</span>
                </div>
                <svg width="80" height="20" viewBox="0 0 80 20" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="connGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="10" x2="80" y2="10" stroke="url(#connGrad)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'connectLine 3s linear infinite' }} />
                  <circle cx="40" cy="10" r="4" fill="#818cf8" opacity="0.6">
                    <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  </circle>
                </svg>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderRadius: 100, background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)', backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 12px #34d39966', animation: 'blink2 2.5s infinite' }} />
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.65rem', fontWeight: 600, color: '#34d399', letterSpacing: '.08em' }}>FINANCE</span>
                </div>
              </div>
            </Reveal>

            <div className="domain-showcase" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <DomainCard type="healthcare" delay={0} />
              <DomainCard type="finance" delay={160} />
            </div>

            <Reveal delay={300}>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 24, padding: '18px 36px',
                  borderRadius: 20, background: 'rgba(5,8,18,.9)',
                  border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(30px)',
                  boxShadow: '0 20px 50px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #818cf8)', boxShadow: '0 0 12px rgba(34,211,238,.3)' }} />
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.62rem', color: '#64748b', letterSpacing: '.1em' }}>UNIFIED AI ENGINE</span>
                  </div>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.06)' }} />
                  {[
                    { icon: '🎙️', label: 'Voice Input', color: '#22d3ee' },
                    { icon: '🧠', label: 'NER Engine', color: '#818cf8' },
                    { icon: '📄', label: 'PDF Export', color: '#34d399' },
                    { icon: '⚡', label: 'Groq LPU', color: '#f59e0b' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '.8rem' }}>{item.icon}</span>
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '.6rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════ WORKFLOW ══════════ */}
        <section id="workflow" style={{ padding:'130px 0',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 50%,rgba(34,211,238,.03),transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px',position:'relative',zIndex:1 }}>
            <Reveal style={{ textAlign:'center',marginBottom:84 }}>
              <div className="sec-label" style={{ justifyContent:'center' }}><LanguageCycler texts={['Workflow', 'ಕಾರ್ಯವಿಧಾನ']} interval={3500} /></div>
              <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(1.9rem,3.2vw,3rem)',fontWeight:900,color:'#f8fafc',lineHeight:1.08,marginBottom:14,letterSpacing:'-.02em' }}>
                <LanguageCycler texts={['Voice to report', 'ಧ್ವನಿಯಿಂದ ವರದಿಗೆ']} interval={3500} /><br/>
                <span style={{ background:'linear-gradient(135deg,#22d3ee,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}><LanguageCycler texts={['in under two minutes.', 'ಎರಡು ನಿಮಿಷದಲ್ಲಿ.']} interval={3500} /></span>
              </h2>
            </Reveal>
            <div className="steps-grid" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:0,position:'relative' }}>
              <div style={{ position:'absolute',top:52,left:'12.5%',width:'75%',height:1,background:'linear-gradient(90deg,rgba(34,211,238,.08),rgba(129,140,248,.12),rgba(52,211,153,.08))',zIndex:0 }}/>
              {STEPS.map((s,i)=>(
                <Reveal key={i} delay={i*110}>
                  <div style={{ textAlign:'center',padding:'0 16px',position:'relative',zIndex:1 }}>
                    <div style={{ width:104,height:104,margin:'0 auto 28px',position:'relative',perspective:500 }}>
                      <div style={{ width:'100%',height:'100%',borderRadius:26,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'JetBrains Mono,monospace',fontWeight:700,fontSize:'1.7rem',color:'#22d3ee',background:'rgba(3,6,15,.96)',border:'1px solid rgba(34,211,238,.09)',boxShadow:`10px 10px 28px rgba(0,0,0,.8),-4px -4px 14px rgba(255,255,255,.03),inset 0 1px 0 rgba(255,255,255,.05),0 0 30px rgba(34,211,238,.05)`,animation:`orbDrift ${7+i}s ease-in-out infinite`,animationDelay:`${i*.8}s`,position:'relative',willChange:'transform' }}>
                        {s.num}
                        <div style={{ position:'absolute',inset:-1,borderRadius:26,background:'linear-gradient(135deg,rgba(34,211,238,.08),transparent 40%,rgba(129,140,248,.06))',pointerEvents:'none' }}/>
                      </div>
                    </div>
                    <h3 style={{ fontFamily:'Outfit,sans-serif',fontWeight:700,fontSize:'.94rem',color:'#f8fafc',marginBottom:9 }}>{s.title}</h3>
                    <p style={{ fontSize:'.8rem',lineHeight:1.7,color:'#64748b' }}>{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ STATS ══════════ */}
        <section id="stats" style={{ padding:'130px 0',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 20% 50%,rgba(34,211,238,.06),transparent 55%),radial-gradient(ellipse at 80% 50%,rgba(129,140,248,.05),transparent 55%)',borderTop:'1px solid rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.04)' }}/>
          <div style={{ position:'absolute',top:'10%',left:'2%',opacity:.1 }}>
            <Icosahedron size={90} color="#34d399" speed="28s"/>
          </div>
          <div style={{ position:'absolute',bottom:'10%',right:'2%',opacity:.1 }}>
            <Icosahedron size={80} color="#f59e0b" speed="22s"/>
          </div>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px',position:'relative',zIndex:1 }}>
            <Reveal style={{ textAlign:'center',marginBottom:68 }}>
              <div className="sec-label" style={{ justifyContent:'center' }}><LanguageCycler texts={['Impact', 'ಪರಿಣಾಮ']} interval={3500} /></div>
              <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(1.9rem,3.2vw,3rem)',fontWeight:900,color:'#f8fafc',lineHeight:1.08,letterSpacing:'-.02em' }}>
                <LanguageCycler texts={['Numbers that define', 'ಸಂಖ್ಯೆಗಳು ಹೇಳುತ್ತವೆ']} interval={3500} /><br/>
                <span style={{ background:'linear-gradient(135deg,#22d3ee,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}><LanguageCycler texts={['our standard.', 'ನಮ್ಮ ಗುಣಮಟ್ಟ.']} interval={3500} /></span>
              </h2>
            </Reveal>
            <div className="stats-grid" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:18,perspective:1200 }}>
              {STATS.map(s=><StatCard key={s.id} s={s}/>)}
            </div>
          </div>
        </section>

        {/* ══════════ TESTIMONIALS ══════════ */}
        <section style={{ padding:'130px 0',overflow:'hidden',position:'relative' }}>
          <div style={{ position:'absolute',right:40,top:'20%',opacity:.08,animation:'floatUp 14s ease-in-out infinite',willChange:'transform' }}>
            <DNAHelix color1="#818cf8" color2="#22d3ee"/>
          </div>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px' }}>
            <Reveal style={{ textAlign:'center',marginBottom:80 }}>
              <div className="sec-label" style={{ justifyContent:'center' }}><LanguageCycler texts={['Testimonials', 'ಪ್ರಶಂಸೆಗಳು']} interval={3500} /></div>
              <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(1.9rem,3.2vw,3rem)',fontWeight:900,color:'#f8fafc',lineHeight:1.08,marginBottom:14,letterSpacing:'-.02em' }}>
                <LanguageCycler texts={['Trusted by those who', 'ನಂಬಿದವರಿಂದ']} interval={3500} /><br/>
                <span style={{ background:'linear-gradient(135deg,#22d3ee,#818cf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}><LanguageCycler texts={['demand precision.', 'ನಿಖರತೆ ಬಯಸುವವರು.']} interval={3500} /></span>
              </h2>
            </Reveal>
            <div className="testi-grid" style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,alignItems:'start' }}>
              {[
                { initials:'PS', color:'#22d3ee', grad:'linear-gradient(135deg,#0e7490,#22d3ee)', quote:'Documentation time dropped 80% on day one. I see four more patients per shift without any compromise on note quality.', name:'Dr. Priya Sharma', role:'Cardiologist', org:'Apollo Hospitals, Chennai', anim:'testiFloat1', dur:'6s', del:'0s' },
                { initials:'RK', color:'#818cf8', grad:'linear-gradient(135deg,#3730a3,#818cf8)', quote:'The Hindi voice support is flawless. My patients feel heard in their own language. I recover two full hours every day.', name:'Dr. Rajesh Kumar', role:'General Physician', org:'Fortis, Mumbai', anim:'testiFloat2', dur:'7s', del:'-2s' },
                { initials:'AP', color:'#34d399', grad:'linear-gradient(135deg,#047857,#34d399)', quote:"My clients receive polished financial reports that used to take hours. Now it's two minutes. My close rate improved by 30%.", name:'Amit Patel', role:'Senior Tax Consultant', org:'Deloitte, Bangalore', anim:'testiFloat3', dur:'5.5s', del:'-1s' },
              ].map((t,i)=>(
                <Reveal key={i} delay={i*100}>
                  <div style={{ animation:`${t.anim} ${t.dur} ease-in-out infinite`,animationDelay:t.del,willChange:'transform' }}>
                    <div className="testi-card">
                      <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${t.color}60,transparent 60%)` }}/>
                      <div style={{ display:'flex',gap:3,marginBottom:20 }}>
                        {[...Array(5)].map((_,si)=>(
                          <div key={si} style={{ width:15,height:15,borderRadius:5,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.6rem',color:'#f59e0b' }}>★</div>
                        ))}
                      </div>
                      <p style={{ fontSize:'.88rem',lineHeight:1.8,color:'#4a5568',marginBottom:28,fontStyle:'italic',position:'relative',zIndex:1 }}>&quot;{t.quote}&quot;</p>
                      <div style={{ display:'flex',alignItems:'center',gap:14 }}>
                        <div style={{ width:46,height:46,borderRadius:14,background:t.grad,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Outfit,sans-serif',fontWeight:800,fontSize:'.78rem',color:'#fff',flexShrink:0,boxShadow:`0 0 24px ${t.color}30,0 8px 20px rgba(0,0,0,.4)`,border:'1px solid rgba(255,255,255,.08)' }}>{t.initials}</div>
                        <div>
                          <div style={{ fontFamily:'Outfit,sans-serif',fontWeight:700,fontSize:'.88rem',color:'#e2e8f0',letterSpacing:'-.01em' }}>{t.name}</div>
                          <div style={{ fontSize:'.72rem',color:t.color,marginTop:2,fontFamily:'JetBrains Mono,monospace',filter:`drop-shadow(0 0 4px ${t.color}44)` }}>{t.role}</div>
                          <div style={{ fontSize:'.7rem',color:'#334155',marginTop:2 }}>{t.org}</div>
                        </div>
                      </div>
                      <div style={{ position:'absolute',bottom:0,left:0,width:60,height:2,background:`linear-gradient(90deg,${t.color}50,transparent)`,borderRadius:'0 0 0 24px' }}/>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <section style={{ padding:'60px 0 130px' }}>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px' }}>
            <Reveal>
              <div className="cta-wrap">
                <div style={{ position:'absolute',top:-10,left:64,opacity:.3,perspective:260 }}><WireCube size={56} color="#22d3ee" animDur="12s"/></div>
                <div style={{ position:'absolute',bottom:-6,right:88,opacity:.28,perspective:220 }}><WireCube size={42} color="#818cf8" animDur="15s" delay="-4s"/></div>
                <div style={{ position:'absolute',top:38,right:200,opacity:.18,perspective:200 }}><WireCube size={26} color="#34d399" animDur="19s"/></div>
                <div style={{ position:'absolute',top:'50%',right:-60,transform:'translateY(-50%)',opacity:.12 }}><TorusRing size={200} color="#22d3ee" opacity={0.28} animDur="25s" tiltX={65}/></div>
                <div style={{ position:'absolute',top:'50%',left:-60,transform:'translateY(-50%)',opacity:.1 }}><TorusRing size={160} color="#818cf8" opacity={0.22} animDur="30s" tiltX={68}/></div>
                <div style={{ position:'absolute',top:20,right:160,opacity:.2 }}><Icosahedron size={60} color="#22d3ee" speed="22s"/></div>
                <div style={{ position:'absolute',bottom:20,left:160,opacity:.15 }}><Icosahedron size={50} color="#818cf8" speed="18s"/></div>
                <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse at 30% 50%,rgba(34,211,238,.06),transparent 60%),radial-gradient(ellipse at 70% 50%,rgba(129,140,248,.04),transparent 60%)',pointerEvents:'none' }}/>
                <div className="sec-label" style={{ justifyContent:'center',marginBottom:18 }}><LanguageCycler texts={['Get Started', 'ಪ್ರಾರಂಭಿಸಿ']} interval={3500} /></div>
                <h2 style={{ fontFamily:'Outfit,sans-serif',fontSize:'clamp(2rem,3.8vw,3.4rem)',fontWeight:900,color:'#f8fafc',lineHeight:1.06,marginBottom:18,position:'relative',zIndex:1,letterSpacing:'-.025em' }}>
                  <LanguageCycler texts={['Ready to redefine', 'ನಿಮ್ಮ ಅಭ್ಯಾಸವನ್ನು']} interval={3500} /><br/><LanguageCycler texts={['your practice?', 'ಮರುವ್ಯಾಖ್ಯಾನಿಸಲು ಸಿದ್ಧರೇ?']} interval={3500} />
                </h2>
                <p style={{ fontSize:'.95rem',color:'#64748b',maxWidth:440,margin:'0 auto 44px',lineHeight:1.82,position:'relative',zIndex:1 }}>
                  <LanguageCycler texts={['Join 500+ healthcare and finance professionals delivering faster, more accurate outcomes with AI-powered voice documentation.', '500+ ಆರೋಗ್ಯ ಮತ್ತು ಹಣಕಾಸು ವೃತ್ತಿಪರರೋಡನೆ ಸೇರಿ ವೇಗವಾಗಿ ಮತ್ತು ನಿಖರವಾಗಿ AI ಧ್ವನಿ ದಾಖಲೆಗಳನ್ನು ನೀಡಿ.']} interval={3500} />
                </p>
                <div style={{ display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap',position:'relative',zIndex:1 }}>
                  <Link href="/login" className="btn-main">
                    <LanguageCycler texts={['Doctor Login', 'ಡಾಕ್ಟರ್ ಲಾಗಿನ್']} interval={3500} />
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </Link>
                  {/* Patient Portal ghost button in CTA (from v1) */}
                  <Link href="/patient" className="btn-ghost"><LanguageCycler texts={['Patient Portal', 'ರೋಗಿ ಪೋರ್ಟಲ್']} interval={3500} /> 🏥</Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════ FOOTER ══════════ */}
        <footer style={{ borderTop:'1px solid rgba(255,255,255,.05)',padding:'36px 0',background:'rgba(2,4,8,.8)',backdropFilter:'blur(20px)' }}>
          <div style={{ maxWidth:1380,margin:'0 auto',padding:'0 56px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#0e7490,#22d3ee)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(34,211,238,.25)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" style={{ width:13,height:13 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <span style={{ fontFamily:'Outfit,sans-serif',fontWeight:700,fontSize:'.85rem',color:'#94a3b8' }}>MediFi Voice</span>
            </div>
            <div style={{ display:'flex',gap:28,flexWrap:'wrap',alignItems:'center' }}>
              {['Features','Domains','Privacy','Terms'].map(l=>(
                <a key={l} href="#" style={{ fontSize:'.73rem',color:'#334155',textDecoration:'none',fontFamily:'JetBrains Mono,monospace',transition:'color .25s',letterSpacing:'.04em' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#64748b')}
                  onMouseLeave={e=>(e.currentTarget.style.color='#334155')}
                >{l}</a>
              ))}
              {/* Patient Portal footer link (from v1) */}
              <Link href="/patient" style={{ fontSize:'.73rem',color:'#6366f1',textDecoration:'none',fontFamily:'JetBrains Mono,monospace' }}>🏥 <LanguageCycler texts={['Patient Portal', 'ರೋಗಿ ಪೋರ್ಟಲ್']} interval={3500} /></Link>
            </div>
            <p style={{ fontFamily:'JetBrains Mono,monospace',fontSize:'.62rem',color:'#1e293b' }}>© 2026 MediFi Voice · Powered by Groq & Sarvam AI</p>
          </div>
        </footer>

      </div>
    </>
  )
}