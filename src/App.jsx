import { useState, useEffect, useRef } from 'react'
import './App.css'

const loadingPhrases = [
  'reading between the lines…',
  'questioning your life choices…',
  'consulting the oracle…',
  'mapping the unknown…',
  'thinking harder than your last interview…',
  'plotting your escape…',
]

function PathTree({ paths, selectedPath, onSelect }) {
  const svgRef = useRef(null)
  const width = 700
  const nodeX = 120
  const endX = 580
  const midX = 350
  const centerY = 160
  const spread = 70

  const pathY = paths.map((_, i) => {
    const total = paths.length
    const offset = (i - (total - 1) / 2) * spread
    return centerY + offset
  })

  const fitColor = (fit) => {
    if (fit === 'high') return '#4ade80'
    if (fit === 'medium') return '#fbbf24'
    return '#f87171'
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${centerY * 2 + 20}`} width="100%" style={{ overflow: 'visible', marginBottom: '1rem' }}>
      {/* Start node */}
      <circle cx={nodeX} cy={centerY} r={28} fill="#1a1730" stroke="#7c6fff" strokeWidth={2} />
      <text x={nodeX} y={centerY - 6} textAnchor="middle" fill="#7c6fff" fontSize={9} fontWeight="600">YOU</text>
      <text x={nodeX} y={centerY + 7} textAnchor="middle" fill="#7c6fff" fontSize={9} fontWeight="600">ARE</text>
      <text x={nodeX} y={centerY + 18} textAnchor="middle" fill="#7c6fff" fontSize={9} fontWeight="600">HERE</text>

      {paths.map((p, i) => {
        const y = pathY[i]
        const isSelected = selectedPath === i
        const color = isSelected ? fitColor(p.fit) : '#333'
        const textColor = isSelected ? fitColor(p.fit) : '#666'
        const labelColor = isSelected ? '#e8e8e8' : '#555'

        // Control points for curve
        const cp1x = midX - 40
        const cp2x = midX + 40

        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            {/* Branch line */}
            <path
              d={`M ${nodeX + 28} ${centerY} C ${cp1x} ${centerY}, ${cp2x} ${y}, ${endX - 20} ${y}`}
              fill="none"
              stroke={color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={isSelected ? 'none' : '4 3'}
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* End node */}
            <circle
              cx={endX}
              cy={y}
              r={18}
              fill={isSelected ? '#1a1730' : '#111'}
              stroke={color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* Fit indicator dot */}
            <circle cx={endX} cy={y} r={6} fill={fitColor(p.fit)} opacity={isSelected ? 1 : 0.4} />

            {/* Path name label */}
            <text
              x={endX + 28}
              y={y - 6}
              fill={labelColor}
              fontSize={12}
              fontWeight={isSelected ? '600' : '400'}
              style={{ transition: 'all 0.3s ease' }}
            >
              {p.name}
            </text>

            {/* Fit badge text */}
            <text x={endX + 28} y={y + 8} fill={textColor} fontSize={10} style={{ transition: 'all 0.3s ease' }}>
              {p.fit === 'high' ? 'strong fit' : p.fit === 'medium' ? 'possible fit' : 'harder path'}
            </text>

            {/* Hover area */}
            <rect
              x={endX - 20}
              y={y - 24}
              width={220}
              height={48}
              fill="transparent"
            />
          </g>
        )
      })}
    </svg>
  )
}

function App() {
  const [step, setStep] = useState(1)
  const [currentRole, setCurrentRole] = useState('')
  const [background, setBackground] = useState('')
  const [goal, setGoal] = useState('')
  const [extra, setExtra] = useState('')
  const [constraints, setConstraints] = useState([])
  const [paths, setPaths] = useState([])
  const [selectedPath, setSelectedPath] = useState(null)
  const [actionPlan, setActionPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    if (!loading) { setPhraseIndex(0); return }
    const interval = setInterval(() => {
      setPhraseIndex(i => (i + 1) % loadingPhrases.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [loading])

  const constraintOptions = [
    { val: 'time', label: 'Time (< 1yr horizon)' },
    { val: 'money', label: 'Budget / finances' },
    { val: 'location', label: 'Location tied' },
    { val: 'visa', label: 'Visa / immigration' },
    { val: 'risk', label: 'Risk averse' },
    { val: 'network', label: 'Weak network in target' },
  ]

  function toggleConstraint(val) {
    setConstraints(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    )
  }

  async function callClaude(prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error('API error ' + res.status)
    const data = await res.json()
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('')
    return text.replace(/```json|```/g, '').trim()
  }

  async function runAnalysis() {
    if (!currentRole || !goal) return
    setLoading(true)
    setError('')
    try {
      const prompt = `You are upath, a career reasoning engine. Return ONLY valid JSON, no markdown fences.

Person:
- Current role: ${currentRole}
- Background: ${background || 'not specified'}
- Goal: ${goal}
- Constraints: ${constraints.length ? constraints.join(', ') : 'none'}
- Extra context: ${extra || 'none'}

Return exactly this JSON structure:
{"paths":[{"name":"3-5 word path name","fit":"high"|"medium"|"low","description":"2-3 sentences specific to this person","pro":"strongest single upside","con":"most honest tradeoff"}]}

Generate 3-4 realistic distinct paths. Be specific, not generic. Be honest about cons.`

      const json = await callClaude(prompt)
      const parsed = JSON.parse(json)
      setPaths(parsed.paths)
      setStep(2)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function runActionPlan() {
    if (selectedPath === null) return
    const path = paths[selectedPath]
    setLoading(true)
    setError('')
    try {
      const prompt = `You are upath. Return ONLY valid JSON, no markdown fences.

Person:
- Current: ${currentRole}
- Background: ${background}
- Goal: ${goal}
- Constraints: ${constraints.join(', ') || 'none'}
- Chosen path: ${path.name} — ${path.description}

Return:
{"summary":"1 sentence on why this is the right bet for them","blind_spot":"1 sentence on what could derail this","actions":[{"horizon":"30d"|"60d"|"90d","action":"specific concrete action"}]}

5-7 actions total. Specific to this person, not generic.`

      const json = await callClaude(prompt)
      const parsed = JSON.parse(json)
      setActionPlan({ ...parsed, pathName: path.name })
      setStep(3)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="app">
      {loading && (
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>
      )}
      <header className="header">
        <span className="logo">u<span className="accent">path</span></span>
        <span className="tagline">your career, reasoned through</span>
      </header>

      <nav className="steps">
        {['your situation', 'path map', 'next steps'].map((label, i) => (
          <div key={i} className={`step ${step === i+1 ? 'active' : step > i+1 ? 'done' : ''}`}>
            <div className="step-dot">{step > i+1 ? '✓' : i+1}</div>
            <span>{label}</span>
            {i < 2 && <div className="step-line" />}
          </div>
        ))}
      </nav>

      {step === 1 && (
        <div className="view">
          <div className="card">
            <div className="card-title">Where are you now?</div>
            <div className="field">
              <label className="label">Current role or situation</label>
              <input className="input" value={currentRole} onChange={e => setCurrentRole(e.target.value)} placeholder="e.g. Product analyst at a fintech startup, 2 years" />
            </div>
            <div className="field">
              <label className="label">Your background</label>
              <textarea className="textarea" value={background} onChange={e => setBackground(e.target.value)} placeholder="e.g. BSc in Computer Science, internship at McKinsey..." />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Where do you want to go?</div>
            <div className="field">
              <label className="label">Direction or goal (vague is fine)</label>
              <textarea className="textarea" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. I want to work in tech in a senior role, ideally in the US..." />
            </div>
            <div className="field">
              <label className="label">Constraints</label>
              <div className="tags">
                {constraintOptions.map(c => (
                  <div key={c.val} className={`tag ${constraints.includes(c.val) ? 'selected' : ''}`} onClick={() => toggleConstraint(c.val)}>{c.label}</div>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">Anything else the AI should know?</label>
              <textarea className="textarea small" value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. competing offer, fear of making the wrong call..." />
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" onClick={runAnalysis} disabled={loading || !currentRole || !goal}>
            {loading ? loadingPhrases[phraseIndex] : 'Map my paths ↗'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="view">
          <div className="back" onClick={() => setStep(1)}>← back</div>
          <div className="section-label">Your path map — click a path to select it</div>
          <PathTree paths={paths} selectedPath={selectedPath} onSelect={setSelectedPath} />
          {selectedPath !== null && (
            <div className="card" style={{marginTop: '0.5rem'}}>
              <div className="path-name">{paths[selectedPath].name}</div>
              <div className="path-desc" style={{marginTop: '6px'}}>{paths[selectedPath].description}</div>
              <div className="tradeoffs" style={{marginTop: '10px'}}>
                <div className="pro"><div className="trade-label">↑ upside</div>{paths[selectedPath].pro}</div>
                <div className="con"><div className="trade-label">↓ tradeoff</div>{paths[selectedPath].con}</div>
              </div>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <button className="btn primary" onClick={runActionPlan} disabled={loading || selectedPath === null} style={{marginTop: '1rem'}}>
            {loading ? loadingPhrases[phraseIndex] : 'Get my action plan ↗'}
          </button>
        </div>
      )}

      {step === 3 && actionPlan && (
        <div className="view">
          <div className="back" onClick={() => setStep(2)}>← back to paths</div>
          <div className="card">
            <div className="path-name">{actionPlan.pathName}</div>
            <div className="path-desc" style={{marginTop: '8px'}}>{actionPlan.summary}</div>
            <div className="divider" />
            <div className="blind-spot">
              <strong>blind spot: </strong>{actionPlan.blind_spot}
            </div>
          </div>
          <div className="section-label">your action plan</div>
          <div className="card">
            {actionPlan.actions.map((a, i) => (
              <div key={i} className="action">
                <span className="horizon">{a.horizon}</span>
                <span>{a.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App