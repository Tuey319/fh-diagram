import { useState } from 'react'

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  bg:     '#07081A',
  surf:   '#0D0F22',
  card:   '#111528',
  bdr:    '#1C1F38',
  ind:    '#6366F1',
  vio:    '#8B5CF6',
  cyn:    '#22D3EE',
  grn:    '#4ADE80',
  amb:    '#FBBF24',
  red:    '#F87171',
  t1:     '#EEEEFF',
  t2:     '#6E70A0',
  t3:     '#2E3050',
}

// ─── STRICT GRID ─────────────────────────────────────────────────────────────
// Column X centres — wide gaps so edges have clear corridors
const X = { c1: 180, c2: 520, c3: 860, c4: 1220, c5: 1600 }
// Row Y centres — tall gaps so nothing crowds
const Y = { r1: 130, r2: 310, r3: 490, r4: 670, r5: 820 }

// Node card dimensions
const NW = 188, NH = 58
// Diamond half-dimensions
const DX = 60, DY = 42

// ─── NODE DEFINITIONS ─────────────────────────────────────────────────────────
// Each node: id, cx (centre-x), cy (centre-y), color, label, sub, icon, shape
const NODES = [
  // ── Column 1: Install ──
  { id:'install',   cx:X.c1, cy:Y.r1, color:C.amb, icon:'⬇',  label:'Install Extension',     sub:'Chrome Web Store'           },
  { id:'toolbar',   cx:X.c1, cy:Y.r2, color:C.amb, icon:'🔍', label:'Toolbar Icon',           sub:'Default: OFF'               },

  // ── Column 2: Activate ──
  { id:'idle',      cx:X.c2, cy:Y.r2, color:C.ind, icon:'○',  label:'Popup — Idle',           sub:'Toggle is OFF'              },
  { id:'settings',  cx:X.c2, cy:Y.r4, color:C.t2,  icon:'⚙',  label:'Settings Page',          sub:'Sensitivity · Highlights'   },

  // ── Column 3: Scan ──
  { id:'off',       cx:X.c3, cy:Y.r1, color:C.red, icon:'✕',  label:'Toggle OFF',             sub:'Page fully restored'        },
  { id:'scanning',  cx:X.c3, cy:Y.r2, color:C.vio, icon:'◌',  label:'Popup — Scanning',       sub:'Progress bar active'        },
  { id:'decision',  cx:X.c3, cy:Y.r3, color:C.vio, shape:'diamond', label:'Fallacies\nfound?' },
  { id:'empty',     cx:X.c3, cy:Y.r4, color:C.grn, icon:'✓',  label:'Popup — Clean',          sub:'No fallacies detected'      },

  // ── Column 4: Discover ──
  { id:'results',   cx:X.c4, cy:Y.r2, color:C.cyn, icon:'◉',  label:'Popup — Results',        sub:'Count · Types · List'       },
  { id:'highlight', cx:X.c4, cy:Y.r3, color:C.cyn, icon:'▬',  label:'In-Page Highlights',     sub:'13 color-coded types'       },
  { id:'sidebar',   cx:X.c4, cy:Y.r4, color:C.cyn, icon:'▣',  label:'Floating Sidebar',       sub:'Grammarly-style panel'      },

  // ── Column 5: Learn ──
  { id:'tooltip',   cx:X.c5, cy:Y.r3, color:C.vio, icon:'◈',  label:'Hover Tooltip',          sub:'Name · Desc · AI Explain'   },
  { id:'chatpanel', cx:X.c5, cy:Y.r4, color:C.grn, icon:'💬', label:'AI Ask (Chat)',           sub:'Chips + free-form input'    },
  { id:'llm',       cx:X.c5, cy:Y.r5, color:C.grn, icon:'🧠', label:'AI Explanation Engine',  sub:'Mock → Claude API'          },
]

const NM = Object.fromEntries(NODES.map(n => [n.id, n]))

// ── Precise pixel anchors ─────────────────────────────────────────────────────
function pt(id, side) {
  const n = NM[id]
  if (n.shape === 'diamond') {
    if (side === 'l') return [n.cx - DX, n.cy]
    if (side === 'r') return [n.cx + DX, n.cy]
    if (side === 't') return [n.cx, n.cy - DY]
    if (side === 'b') return [n.cx, n.cy + DY]
  }
  if (side === 'l') return [n.cx - NW/2, n.cy]
  if (side === 'r') return [n.cx + NW/2, n.cy]
  if (side === 't') return [n.cx, n.cy - NH/2]
  if (side === 'b') return [n.cx, n.cy + NH/2]
}

// ── Cubic bezier builder ──────────────────────────────────────────────────────
function cb(x1,y1, cx1,cy1, cx2,cy2, x2,y2) {
  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`
}
function midPt(x1,y1,cx1,cy1,cx2,cy2,x2,y2,t=0.5) {
  const u=1-t
  return [
    u*u*u*x1+3*u*u*t*cx1+3*u*t*t*cx2+t*t*t*x2,
    u*u*u*y1+3*u*u*t*cy1+3*u*t*t*cy2+t*t*t*y2
  ]
}

// ─── ALL EDGES — fully explicit, zero-overlap routing ─────────────────────────
// Each edge: { from, to, label, col, dashed, path, lx, ly }
function buildEdges() {
  const edges = []

  function add(from, to, label, col, dashed, x1,y1,cx1,cy1,cx2,cy2,x2,y2) {
    const path = cb(x1,y1,cx1,cy1,cx2,cy2,x2,y2)
    const [lx,ly] = midPt(x1,y1,cx1,cy1,cx2,cy2,x2,y2)
    edges.push({ from, to, label, col: col||NM[from].color, dashed:!!dashed, path, lx, ly })
  }

  // install → toolbar  (straight down, same column)
  add('install','toolbar','First launch',C.amb,false,
    X.c1, Y.r1+NH/2,  X.c1, Y.r1+100,  X.c1, Y.r2-100,  X.c1, Y.r2-NH/2)

  // toolbar → idle  (right, same row)
  add('toolbar','idle','Click icon',C.amb,false,
    X.c1+NW/2, Y.r2,  X.c1+120, Y.r2,  X.c2-120, Y.r2,  X.c2-NW/2, Y.r2)

  // idle → scanning  (right, same row)
  add('idle','scanning','Toggle ON',C.ind,false,
    X.c2+NW/2, Y.r2,  X.c2+120, Y.r2,  X.c3-120, Y.r2,  X.c3-NW/2, Y.r2)

  // idle → settings  (down-left arc via left corridor)
  add('idle','settings','⚙ Settings',C.t2,true,
    X.c2-NW/2, Y.r2,  X.c2-NW/2-80, Y.r2,  X.c2-NW/2-80, Y.r4,  X.c2-NW/2, Y.r4)

  // settings → idle  (return up, offset +30 so it doesnt overlap forward path)
  add('settings','idle','Save & back',C.t2,true,
    X.c2-NW/2+10, Y.r4,  X.c2-NW/2-120, Y.r4,  X.c2-NW/2-120, Y.r2,  X.c2-NW/2+10, Y.r2)

  // scanning → decision  (down, same column)
  add('scanning','decision','Scan done',C.vio,false,
    X.c3, Y.r2+NH/2,  X.c3, Y.r2+90,  X.c3, Y.r3-DY-60,  X.c3, Y.r3-DY)

  // decision → results  (right + up arc to row2 col4)
  add('decision','results','Yes',C.cyn,false,
    X.c3+DX, Y.r3,  X.c3+160, Y.r3,  X.c4-160, Y.r2,  X.c4-NW/2, Y.r2)

  // decision → empty  (down, same column)
  add('decision','empty','No',C.grn,false,
    X.c3, Y.r3+DY,  X.c3, Y.r3+100,  X.c3, Y.r4-90,  X.c3, Y.r4-NH/2)

  // scanning → off  (up, same column — route via small arc)
  add('scanning','off','Toggle OFF',C.red,true,
    X.c3, Y.r2-NH/2,  X.c3, Y.r2-120,  X.c3, Y.r1+90,  X.c3, Y.r1+NH/2)

  // off → toolbar  (left back — arcs high above everything)
  add('off','toolbar','Page restored',C.red,true,
    X.c3-NW/2, Y.r1,  X.c3-200, Y.r1-70,  X.c1+200, Y.r1-70,  X.c1+NW/2, Y.r2)

  // results → highlight  (down, same column)
  add('results','highlight','Injects DOM',C.cyn,false,
    X.c4, Y.r2+NH/2,  X.c4, Y.r2+90,  X.c4, Y.r3-90,  X.c4, Y.r3-NH/2)

  // results → sidebar  (down further, offset to right side so it clears highlight)
  add('results','sidebar','Opens panel',C.cyn,false,
    X.c4+NW/2-20, Y.r2+NH/2,  X.c4+NW/2+30, Y.r2+80,  X.c4+NW/2+30, Y.r4-80,  X.c4+NW/2-20, Y.r4-NH/2)

  // highlight → tooltip  (right, row3)
  add('highlight','tooltip','Hover',C.vio,false,
    X.c4+NW/2, Y.r3,  X.c4+130, Y.r3,  X.c5-130, Y.r3,  X.c5-NW/2, Y.r3)

  // sidebar → chatpanel  (right, row4)
  add('sidebar','chatpanel','AI Ask tab',C.grn,false,
    X.c4+NW/2, Y.r4,  X.c4+130, Y.r4,  X.c5-130, Y.r4,  X.c5-NW/2, Y.r4)

  // tooltip → llm  (down)
  add('tooltip','llm','Explain request',C.grn,false,
    X.c5, Y.r3+NH/2,  X.c5, Y.r3+110,  X.c5, Y.r5-90,  X.c5, Y.r5-NH/2)

  // chatpanel → llm  (down, offset left so it doesnt overlap tooltip→llm)
  add('chatpanel','llm','Chat request',C.grn,false,
    X.c5-40, Y.r4+NH/2,  X.c5-40, Y.r4+80,  X.c5-40, Y.r5-80,  X.c5-40, Y.r5-NH/2)

  // llm → tooltip  (return dashed — arc left then up)
  add('llm','tooltip','Renders in',C.vio,true,
    X.c5-NW/2, Y.r5,  X.c5-NW/2-100, Y.r5,  X.c5-NW/2-100, Y.r3,  X.c5-NW/2, Y.r3)

  // llm → chatpanel  (return dashed — arc further left)
  add('llm','chatpanel','Renders in',C.grn,true,
    X.c5-NW/2-20, Y.r5,  X.c5-NW/2-160, Y.r5,  X.c5-NW/2-160, Y.r4,  X.c5-NW/2-20, Y.r4)

  return edges
}

const EDGES = buildEdges()

// ─── POPUP SCREEN MOCKUPS ─────────────────────────────────────────────────────
function MockIdle() {
  return (
    <div style={{width:138,fontFamily:'system-ui',background:'#0D0F22',borderRadius:8,overflow:'hidden',border:'1px solid #1C1F38',boxShadow:'0 8px 32px #00000088'}}>
      <div style={{background:'#111528',padding:'7px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:8.5,color:'#EEEEFF',fontWeight:700}}>Fallacy Hunter</span>
        <div style={{width:22,height:11,borderRadius:6,background:'#1C1F38',border:'1px solid #252850'}}/>
      </div>
      <div style={{padding:'14px 10px',textAlign:'center'}}>
        <div style={{fontSize:22,marginBottom:5}}>🧠</div>
        <div style={{color:'#EEEEFF',fontWeight:700,fontSize:9,marginBottom:3}}>Ready to Hunt</div>
        <div style={{color:'#2E3050',fontSize:7.5,lineHeight:1.4}}>Toggle on to scan this page<br/>for logical fallacies</div>
      </div>
      <div style={{borderTop:'1px solid #1C1F38',padding:'5px 10px',display:'flex',justifyContent:'center'}}>
        <span style={{fontSize:7,color:'#2E3050',letterSpacing:'0.04em'}}>Powered by mock AI</span>
      </div>
    </div>
  )
}

function MockScanning() {
  return (
    <div style={{width:138,fontFamily:'system-ui',background:'#0D0F22',borderRadius:8,overflow:'hidden',border:'1px solid #1C1F38',boxShadow:'0 8px 32px #00000088'}}>
      <div style={{background:'#111528',padding:'7px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:8.5,color:'#EEEEFF',fontWeight:700}}>Fallacy Hunter</span>
        <div style={{width:22,height:11,borderRadius:6,background:'linear-gradient(135deg,#6366F1,#8B5CF6)'}}/>
      </div>
      <div style={{height:2,background:'#1C1F38'}}>
        <div style={{height:'100%',width:'65%',background:'linear-gradient(90deg,#6366F1,#22D3EE)'}}/>
      </div>
      <div style={{padding:'12px 10px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#6366F1',boxShadow:'0 0 6px #6366F1'}}/>
          <span style={{color:'#6366F1',fontWeight:700,fontSize:9}}>Analyzing page…</span>
        </div>
        <div style={{color:'#2E3050',paddingLeft:12,fontSize:8}}>Detecting patterns</div>
      </div>
    </div>
  )
}

function MockResults() {
  return (
    <div style={{width:138,fontFamily:'system-ui',background:'#0D0F22',borderRadius:8,overflow:'hidden',border:'1px solid #1C1F38',boxShadow:'0 8px 32px #00000088'}}>
      <div style={{background:'#111528',padding:'7px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:8.5,color:'#EEEEFF',fontWeight:700}}>Fallacy Hunter</span>
        <div style={{width:22,height:11,borderRadius:6,background:'linear-gradient(135deg,#6366F1,#8B5CF6)'}}/>
      </div>
      <div style={{padding:'8px 10px',borderBottom:'1px solid #1C1F38',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:800,background:'linear-gradient(135deg,#C7D2FE,#818CF8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>5</div>
          <div style={{color:'#2E3050',fontSize:7,letterSpacing:'0.1em'}}>FOUND</div>
        </div>
        <div style={{width:1,height:20,background:'#1C1F38'}}/>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:800,background:'linear-gradient(135deg,#C7D2FE,#818CF8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>3</div>
          <div style={{color:'#2E3050',fontSize:7}}>TYPES</div>
        </div>
      </div>
      {[['#E05252','Ad Hominem'],['#527AE0','Fallacy of Logic'],['#E07A52','Ad Populum']].map(([c,l])=>(
        <div key={l} style={{display:'flex',gap:6,padding:'4px 8px',borderBottom:'1px solid #0A0B1A'}}>
          <div style={{width:2,background:c,borderRadius:1,alignSelf:'stretch',boxShadow:`0 0 4px ${c}88`}}/>
          <span style={{color:c,fontWeight:700,fontSize:8}}>{l}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MARKER COLOR MAP ─────────────────────────────────────────────────────────
const MCOLORS = [C.amb, C.ind, C.vio, C.cyn, C.grn, C.red, C.t2]
function mIdx(col) { const i = MCOLORS.indexOf(col); return i >= 0 ? i : 6 }

// ─── CANVAS SIZE ──────────────────────────────────────────────────────────────
const CW = 1860, CH = 920

// ─── PHASE BANDS ─────────────────────────────────────────────────────────────
const BANDS = [
  { label:'1 · INSTALL',  x:56,   w:268, col:C.amb },
  { label:'2 · ACTIVATE', x:360,  w:268, col:C.ind },
  { label:'3 · SCAN',     x:680,  w:268, col:C.vio },
  { label:'4 · DISCOVER', x:1020, w:330, col:C.cyn },
  { label:'5 · LEARN',    x:1398, w:400, col:C.grn },
]

// ─── SWIM LANES ───────────────────────────────────────────────────────────────
const LANES = [
  { label:'USER',       y:Y.r1, col:C.amb },
  { label:'POPUP',      y:Y.r2, col:C.ind },
  { label:'IN-PAGE',    y:Y.r3, col:C.cyn },
  { label:'SIDEBAR / CHAT', y:Y.r4, col:C.grn },
  { label:'AI ENGINE',  y:Y.r5, col:C.grn },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState(null)

  const connected = active
    ? new Set(EDGES.filter(e => e.from===active||e.to===active).flatMap(e=>[e.from,e.to]))
    : null

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans',system-ui,sans-serif", display:'flex', flexDirection:'column' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding:'28px 44px 22px', borderBottom:`1px solid ${C.bdr}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between', position:'relative' }}>
        <div style={{ position:'absolute', bottom:0, left:44, right:44, height:1, background:`linear-gradient(90deg,transparent,${C.ind},${C.cyn},transparent)`, opacity:.45 }}/>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.ind},${C.vio})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,boxShadow:`0 0 18px ${C.ind}55` }}>🔍</div>
            <span style={{ fontSize:10, fontWeight:700, color:C.t2, letterSpacing:'0.14em', textTransform:'uppercase' }}>Fallacy Hunter</span>
          </div>
          <h1 style={{ fontSize:32, fontWeight:800, color:C.t1, letterSpacing:'-0.025em', lineHeight:1 }}>User Flow</h1>
          <p style={{ fontSize:12, color:C.t2, marginTop:6 }}>Full extension — from install to insight</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['1. Install',C.amb],['2. Activate',C.ind],['3. Scan',C.vio],['4. Discover',C.cyn],['5. Learn',C.grn]].map(([l,c])=>(
            <div key={l} style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 13px',borderRadius:20,background:C.card,border:`1px solid ${C.bdr}` }}>
              <div style={{ width:6,height:6,borderRadius:'50%',background:c,boxShadow:`0 0 6px ${c}` }}/>
              <span style={{ fontSize:9, fontWeight:700, color:C.t2, letterSpacing:'0.06em', textTransform:'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DIAGRAM ────────────────────────────────────────────────────── */}
      <div style={{ overflowX:'auto', padding:'0 24px 32px', flex:1 }}>
        <div style={{ position:'relative', width:CW, minHeight:CH, margin:'0 auto' }}>

          {/* SVG */}
          <svg width={CW} height={CH} style={{ display:'block', overflow:'visible' }}
            onClick={e => { if (e.target.tagName==='svg') setActive(null) }}>
            <defs>
              {MCOLORS.map((c,i)=>(
                <marker key={i} id={`m${i}`} markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto">
                  <path d="M0,1 L0,7 L9,4 z" fill={c}/>
                </marker>
              ))}
            </defs>

            {/* Phase column bands */}
            {BANDS.map(b=>(
              <g key={b.label}>
                <rect x={b.x} y={50} width={b.w} height={CH-70} rx={12}
                  fill={`${C.card}EE`} stroke={`${b.col}1A`} strokeWidth={1}/>
                <path d={`M ${b.x+12} 50 L ${b.x} 50 L ${b.x} 62`} fill="none" stroke={b.col} strokeWidth={1.5} opacity={.4} strokeLinecap="round"/>
                <path d={`M ${b.x+b.w-12} ${CH-20} L ${b.x+b.w} ${CH-20} L ${b.x+b.w} ${CH-32}`} fill="none" stroke={b.col} strokeWidth={1.5} opacity={.4} strokeLinecap="round"/>
                <text x={b.x+b.w/2} y={72} textAnchor="middle" fontSize={8.5} fontWeight="700" fill={b.col} opacity={.5} letterSpacing="0.14em" fontFamily="DM Sans,system-ui">{b.label}</text>
              </g>
            ))}

            {/* Swim lane guide lines */}
            {LANES.map(l=>(
              <g key={l.label}>
                <line x1={56} y1={l.y} x2={CW-56} y2={l.y} stroke={l.col} strokeWidth={.5} strokeDasharray="2,14" opacity={.1}/>
                <rect x={0} y={l.y-10} width={52} height={20} rx={3} fill={`${l.col}18`}/>
                <text x={26} y={l.y+4} textAnchor="middle" fontSize={7} fontWeight="700" fill={l.col} opacity={.7} letterSpacing="0.1em" fontFamily="DM Sans,system-ui">{l.label}</text>
              </g>
            ))}

            {/* ── EDGES ──────────────────────────────────────────────── */}
            {EDGES.map((e,i)=>{
              const mi = mIdx(e.col)
              const isActive = active && (e.from===active||e.to===active)
              const dim = active && !isActive
              const lw = e.label ? e.label.length*5.2+14 : 0
              return (
                <g key={i} opacity={dim ? .06 : isActive ? 1 : .7} style={{transition:'opacity .15s'}}>
                  {isActive && <path d={e.path} fill="none" stroke={e.col} strokeWidth={10} opacity={.1} strokeDasharray={e.dashed?'6,4':'none'}/>}
                  <path d={e.path} fill="none" stroke={e.col}
                    strokeWidth={isActive ? 2.4 : 1.7}
                    strokeDasharray={e.dashed ? '6,4' : 'none'}
                    markerEnd={`url(#m${mi})`}/>
                  {e.label && (
                    <g style={{pointerEvents:'none'}}>
                      <rect x={e.lx-lw/2} y={e.ly-8.5} width={lw} height={16} rx={4} fill={C.bg} stroke={e.col} strokeWidth={.8} opacity={.97}/>
                      <text x={e.lx} y={e.ly+4} textAnchor="middle" fontSize={8} fontWeight="600" fill={e.col} fontFamily="DM Sans,system-ui">{e.label}</text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* ── NODES ──────────────────────────────────────────────── */}
            {NODES.map(n=>{
              const isSel = active===n.id
              const dim = active && !connected?.has(n.id)
              const isDia = n.shape==='diamond'
              const bx = n.cx-NW/2, by = n.cy-NH/2

              return (
                <g key={n.id} opacity={dim?.09:1} style={{cursor:'pointer',transition:'opacity .15s'}}
                  onClick={e=>{e.stopPropagation();setActive(isSel?null:n.id)}}>

                  {isDia ? <>
                    {isSel && <polygon
                      points={`${n.cx},${n.cy-DY-9} ${n.cx+DX+9},${n.cy} ${n.cx},${n.cy+DY+9} ${n.cx-DX-9},${n.cy}`}
                      fill={`${n.color}10`} stroke={n.color} strokeWidth={1} opacity={.45}/>}
                    <polygon
                      points={`${n.cx},${n.cy-DY} ${n.cx+DX},${n.cy} ${n.cx},${n.cy+DY} ${n.cx-DX},${n.cy}`}
                      fill={`${n.color}1C`} stroke={n.color} strokeWidth={isSel?1.8:1.2}/>
                    {n.label.split('\n').map((line,li,arr)=>(
                      <text key={li} x={n.cx} y={n.cy+(li-(arr.length-1)/2)*15}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={10} fontWeight="700" fill={n.color} fontFamily="DM Sans,system-ui">{line}</text>
                    ))}
                  </> : <>
                    {/* Selection glow */}
                    {isSel && <rect x={bx-8} y={by-8} width={NW+16} height={NH+16} rx={13} fill={`${n.color}0D`} stroke={n.color} strokeWidth={1} opacity={.5}/>}

                    {/* Card */}
                    <rect x={bx} y={by} width={NW} height={NH} rx={9}
                      fill={`${n.color}16`}
                      stroke={isSel ? n.color : `${n.color}52`}
                      strokeWidth={isSel ? 1.8 : 1.1}/>

                    {/* Corner brackets */}
                    <path d={`M ${bx+10} ${by} L ${bx} ${by} L ${bx} ${by+10}`} fill="none" stroke={n.color} strokeWidth={isSel?1.8:1.4} opacity={.65} strokeLinecap="round"/>
                    <path d={`M ${bx+NW-10} ${by+NH} L ${bx+NW} ${by+NH} L ${bx+NW} ${by+NH-10}`} fill="none" stroke={n.color} strokeWidth={isSel?1.8:1.4} opacity={.65} strokeLinecap="round"/>

                    {/* Bottom glow line */}
                    <line x1={bx+16} y1={by+NH} x2={bx+NW-16} y2={by+NH} stroke={n.color} strokeWidth={1} opacity={isSel?.65:.2}/>

                    {/* Left accent bar */}
                    <rect x={bx} y={by+11} width={2.5} height={NH-22} rx={1.5} fill={n.color} opacity={.8}/>

                    {/* Icon */}
                    {n.icon && <text x={bx+16} y={n.cy} dominantBaseline="middle" fontSize={13} fontFamily="system-ui">{n.icon}</text>}

                    {/* Label */}
                    <text x={bx+34} y={n.sub ? n.cy-7 : n.cy+1}
                      dominantBaseline="middle" fontSize={10.5} fontWeight="700"
                      fill={n.color} fontFamily="DM Sans,system-ui">{n.label}</text>

                    {/* Sub */}
                    {n.sub && <text x={bx+34} y={n.cy+9}
                      dominantBaseline="middle" fontSize={8}
                      fill={`${n.color}72`} fontFamily="DM Sans,system-ui">{n.sub}</text>}
                  </>}
                </g>
              )
            })}

          </svg>

          {/* ── POPUP MOCKUPS — HTML overlaid precisely below their nodes ── */}
          {[
            { id:'idle',     Comp:MockIdle     },
            { id:'scanning', Comp:MockScanning },
            { id:'results',  Comp:MockResults  },
          ].map(({id,Comp})=>{
            const n = NM[id]
            const isFoc = active===id
            const dim   = active && !connected?.has(id)
            return (
              <div key={id} style={{
                position:'absolute',
                left: n.cx - 69,
                top:  n.cy + NH/2 + 14,
                pointerEvents:'none',
                opacity: dim ? .08 : isFoc ? 1 : .55,
                transform: isFoc ? 'scale(1.06)' : 'scale(1)',
                transformOrigin:'top center',
                transition:'opacity .15s, transform .15s',
                zIndex:4,
              }}>
                <Comp/>
              </div>
            )
          })}

        </div>
      </div>

      {/* ── LEGEND ─────────────────────────────────────────────────────── */}
      <div style={{ padding:'16px 44px', borderTop:`1px solid ${C.bdr}`, display:'flex', gap:22, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:8.5, fontWeight:700, color:C.t3, letterSpacing:'0.14em', textTransform:'uppercase' }}>Legend</span>
        {[[C.amb,'User Action'],[C.ind,'Popup Screen'],[C.cyn,'In-Page UI'],[C.grn,'AI / Chat'],[C.red,'Deactivate'],[C.t2,'Config / Setting']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:`${c}28`, border:`1.5px solid ${c}70` }}/>
            <span style={{ fontSize:9.5, color:C.t2 }}>{l}</span>
          </div>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:18, alignItems:'center' }}>
          {[['none','Direct flow'],['6,4','Return / async']].map(([d,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <svg width={28} height={8}><line x1={0} y1={4} x2={28} y2={4} stroke={C.t2} strokeWidth={1.5} strokeDasharray={d}/></svg>
              <span style={{ fontSize:9.5, color:C.t2 }}>{l}</span>
            </div>
          ))}
          <span style={{ fontSize:9.5, color:C.t3, marginLeft:10 }}>Click any node to highlight its connections</span>
        </div>
      </div>

    </div>
  )
}
