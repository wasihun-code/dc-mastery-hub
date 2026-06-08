import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, XCircle, Award, Terminal as TerminalIcon, RotateCcw, ArrowRight } from 'lucide-react'
import Editor from '@monaco-editor/react'

export default function DatasetChallenge() {
  const { courseSlug } = useParams()
  const [challenges, setChallenges] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [code, setCode] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [terminalLines, setTerminalLines] = useState([])
  const [runCounter, setRunCounter] = useState(1)
  const [result, setResult] = useState(null)
  const [hintsShown, setHintsShown] = useState([false, false])
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    fetchChallenges()
  }, [courseSlug])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/content/challenges/${courseSlug}`)
      if (!res.ok) {
        if (res.status === 404) {
          setErrorMsg("No datasets available for this course yet. Add CSV files to: content/tracks/[track]/[course]/datasets/")
        } else {
          setErrorMsg("Failed to load challenges.")
        }
        return
      }
      const data = await res.json()
      if (data.length > 0) {
        setChallenges(data)
        setCode(data[0].starter_code)
      } else {
        setErrorMsg("No datasets available for this course yet.")
      }
    } catch (err) {
      console.error('Error fetching challenges:', err)
      setErrorMsg("Failed to load challenges.")
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    if (isRunning || isSubmitting) return
    setIsRunning(true)
    const challenge = challenges[currentIndex]

    setTerminalLines(prev => [
      ...prev,
      { type: 'input', text: code, counter: runCounter }
    ])

    try {
      const res = await fetch('/api/content/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseSlug,
          datasetFile: challenge.dataset_file
        })
      })
      const data = await res.json()
      
      setTerminalLines(prev => [
        ...prev,
        { type: data.success ? 'output' : 'error', text: data.success ? data.output : data.error }
      ])
    } catch (err) {
      setTerminalLines(prev => [
        ...prev,
        { type: 'error', text: 'Connection failed or server error.' }
      ])
    } finally {
      setRunCounter(prev => prev + 1)
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (isRunning || isSubmitting) return
    setIsSubmitting(true)
    const challenge = challenges[currentIndex]

    try {
      const res = await fetch('/api/content/submit-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          courseSlug,
          challengeId: challenge.id,
          datasetFile: challenge.dataset_file,
          expectedOutputCode: challenge.expected_output_code
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setResult(data)
        setSessionScore(prev => ({
          correct: prev.correct + (data.passed ? 1 : 0),
          total: prev.total + 1
        }))
      } else {
        setResult({ passed: false, feedback: data.error, error: true })
      }
    } catch (err) {
      setResult({ passed: false, feedback: 'Connection failed or server error.', error: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < challenges.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCode(challenges[currentIndex + 1].starter_code)
      setResult(null)
      setTerminalLines([])
      setRunCounter(1)
      setHintsShown([false, false])
    } else {
      setCurrentIndex(challenges.length) // End state
    }
  }

  const handleReset = () => {
    setCode(challenges[currentIndex].starter_code)
    setTerminalLines([])
    setRunCounter(1)
    setResult(null)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)' }}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (errorMsg || challenges.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center p-8" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)' }}>
        <TerminalIcon size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Dataset Challenge Unavailable</h2>
        <p className="mt-2 text-[var(--text-muted)] max-w-lg">{errorMsg || "No datasets available."}</p>
        <Link
          to={`/courses/${courseSlug}`}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--bg-card)] px-6 py-2 border border-[var(--border)]"
        >
          <ChevronLeft size={20} />
          Back to Course
        </Link>
      </div>
    )
  }

  // Summary screen
  if (currentIndex >= challenges.length) {
    const percentage = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)', overflowY: 'auto', padding: '2rem 1rem' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12">
            <Award size={64} className="mx-auto text-[var(--accent-green)] mb-6" />
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Session Complete!</h2>
            
            <div className="mt-8 grid grid-cols-2 gap-8">
              <div className="rounded-lg bg-[var(--bg-primary)] p-4 border border-[var(--border)]">
                <div className="text-3xl font-bold text-[var(--accent-green)]">{sessionScore.correct} / {sessionScore.total}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Challenges Passed</div>
              </div>
              <div className="rounded-lg bg-[var(--bg-primary)] p-4 border border-[var(--border)]">
                <div className="text-3xl font-bold text-[var(--accent-blue)]">{percentage}%</div>
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">Accuracy</div>
              </div>
            </div>
            
            <div className="mt-12 flex flex-col gap-3">
              <Link
                to={`/courses/${courseSlug}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] px-6 py-3 font-bold text-black hover:opacity-90"
              >
                Return to Course
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const challenge = challenges[currentIndex]

  return (
    <div className="flex h-screen" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background: 'var(--bg-primary)' }}>
      {/* LEFT PANEL */}
      <div className="w-[38%] h-full border-r border-[var(--border)] flex flex-col bg-[var(--bg-primary)]">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]">
          <Link
            to={`/courses/${courseSlug}`}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium transition-colors"
          >
            <ChevronLeft size={20} />
            Quit
          </Link>
          <span className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Challenge {currentIndex + 1} of {challenges.length}
          </span>
        </div>
        
        <div className="p-6 overflow-y-auto grow">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
              challenge.difficulty === 1 ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
              challenge.difficulty === 2 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
              'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {challenge.difficulty === 1 ? 'EASY' : challenge.difficulty === 2 ? 'MEDIUM' : 'HARD'}
            </span>
            <span className="bg-[var(--bg-card)] px-3 py-1 rounded-md border border-[var(--border)] text-xs text-[var(--text-primary)] font-mono flex items-center gap-2">
               📊 {challenge.dataset_file}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{challenge.title}</h2>
          
          <div className="prose prose-invert max-w-none text-[var(--text-primary)] leading-relaxed mb-6">
            {challenge.description}
          </div>

          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-8">
            <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Variable Names</h4>
            <p className="text-sm text-yellow-500/80">
              Ensure you use the exact variable names requested in the description so the tests can verify your code!
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {challenge.hints.map((hint, idx) => (
              <div key={idx} className="border border-[var(--border)] rounded-lg bg-[var(--bg-card)] overflow-hidden">
                <button 
                  onClick={() => {
                    const newShown = [...hintsShown]
                    newShown[idx] = true
                    setHintsShown(newShown)
                  }}
                  className="w-full text-left p-3 flex justify-between items-center text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors"
                >
                  <span className="text-[var(--text-primary)]">💡 Hint {idx + 1}</span>
                  {!hintsShown[idx] && <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">Reveal</span>}
                </button>
                {hintsShown[idx] && (
                  <div className="p-3 border-t border-[var(--border)] text-sm text-[var(--text-muted)] bg-[var(--bg-primary)]">
                    {hint}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
             <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Concepts Tested</h4>
             <div className="flex flex-wrap gap-2">
               {challenge.concepts_tested.map((c, i) => (
                 <span key={i} className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-[var(--text-muted)]">
                   {c}
                 </span>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[62%] h-full flex flex-col bg-[#1e1e1e]">
        {/* Editor Section */}
        <div className="flex flex-col border-b border-[var(--border)] min-h-[300px]" style={{ flex: '3 1 0%' }}>
          <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3c3c3c] text-sm text-[#cccccc] font-mono flex items-center gap-2 shrink-0">
             <span className="text-yellow-400">🐍</span> script.py
          </div>
          <div className="grow relative">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: 1.6,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                wordWrap: 'on'
              }}
            />
          </div>
          <div className="bg-[#2d2d2d] p-3 border-t border-[#3c3c3c] flex items-center justify-between shrink-0">
             <div className="flex gap-3">
               <button 
                 onClick={handleRun}
                 disabled={isRunning || isSubmitting}
                 className="bg-[var(--accent-blue)] hover:opacity-90 text-white px-6 py-2 rounded font-bold text-sm transition-opacity disabled:opacity-50 flex items-center gap-2"
               >
                 {isRunning ? 'Running...' : '▶ Run Code'}
               </button>
               <button 
                 onClick={handleReset}
                 disabled={isRunning || isSubmitting}
                 className="bg-transparent border border-[#555] hover:bg-[#333] text-[#ccc] px-4 py-2 rounded font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 <RotateCcw size={16} /> Reset
               </button>
             </div>
             <button 
                 onClick={handleSubmit}
                 disabled={isRunning || isSubmitting}
                 className="bg-[var(--accent-green)] hover:opacity-90 text-black px-6 py-2 rounded font-bold text-sm transition-opacity disabled:opacity-50 flex items-center gap-2"
               >
                 {isSubmitting ? 'Checking...' : '✓ Submit'}
             </button>
          </div>
        </div>

        {/* Terminal Section */}
        <div className="flex flex-col bg-black min-h-[200px] overflow-hidden" style={{ flex: '2 1 0%' }}>
          <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3c3c3c] text-sm text-[#cccccc] font-mono shrink-0">
             IPython Shell
          </div>
          <div className="grow overflow-y-auto p-4 font-mono text-sm">
             <div className="text-gray-500 mb-2">Python 3.10.x (default, DC Mastery Hub)</div>
             {terminalLines.map((line, i) => (
               <div key={i} className="mb-2">
                 {line.type === 'input' && (
                   <div className="text-blue-400">
                     <span className="text-green-500 mr-2">In [{line.counter}]:</span>
                     <span className="text-gray-300">{line.text.split('\n')[0]}{line.text.split('\n').length > 1 ? ' ...' : ''}</span>
                   </div>
                 )}
                 {line.type === 'output' && (
                   <div className="text-white mt-1 whitespace-pre-wrap">{line.text || '(no output)'}</div>
                 )}
                 {line.type === 'error' && (
                   <div className="text-red-400 mt-1 whitespace-pre-wrap">{line.text}</div>
                 )}
               </div>
             ))}
             {!isRunning && !isSubmitting && (
                <div className="text-blue-400 mt-2">
                  <span className="text-green-500 mr-2">In [{runCounter}]:</span>
                  <span className="animate-pulse">_</span>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Result Overlay (appears on Submit) */}
      {result && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-full">
             <div className={`p-6 border-b flex items-center justify-between shrink-0 ${result.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-3">
                  {result.passed ? <CheckCircle2 className="text-green-500" size={32} /> : <XCircle className="text-red-500" size={32} />}
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {result.passed ? 'Correct! Excellent work.' : 'Not quite right.'}
                  </h2>
                </div>
                {result.passed ? (
                  <button onClick={handleNext} className="bg-green-500 hover:bg-green-400 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                    Next Challenge <ArrowRight size={20} />
                  </button>
                ) : (
                  <button onClick={() => setResult(null)} className="bg-[var(--bg-primary)] border border-[var(--border)] hover:bg-[#333] text-white px-6 py-2 rounded-lg font-bold">
                    Try Again
                  </button>
                )}
             </div>
             
             <div className="p-6 text-[var(--text-primary)] overflow-y-auto grow">
                <p className="mb-6 text-lg">{result.feedback}</p>
                
                {!result.passed && !result.error && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-red-400 mb-2 uppercase tracking-wider text-sm">Your Output</h4>
                      <pre className="bg-[#0d1117] p-4 rounded border border-red-500/30 text-gray-300 font-mono text-sm overflow-x-auto">
                        {result.user_output || '(no output)'}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-bold text-green-400 mb-2 uppercase tracking-wider text-sm">Expected Output</h4>
                      <pre className="bg-[#0d1117] p-4 rounded border border-green-500/30 text-gray-300 font-mono text-sm overflow-x-auto">
                        {result.expected_output || '(no output)'}
                      </pre>
                    </div>
                  </div>
                )}
             </div>
           </div>
        </div>
      )}
    </div>
  )
}