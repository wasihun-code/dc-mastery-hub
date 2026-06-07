import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Database, CheckCircle2, XCircle, Timer, Award, Send, FileCode, Info } from 'lucide-react'

export default function DatasetChallenge() {
  const { courseSlug } = useParams()
  const [datasets, setDatasets] = useState([])
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [wasCorrect, setWasCorrect] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [scenario, setScenario] = useState(null)

  useEffect(() => {
    fetchData()
  }, [courseSlug])

  useEffect(() => {
    let timer
    if (startTime && !isSubmitted) {
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [startTime, isSubmitted])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const courseRes = await fetch(`/api/courses/${courseSlug}`)
      const courseData = await courseRes.json()
      setCourse(courseData)

      const datasetsRes = await fetch(`/api/content/datasets/${courseSlug}`)
      const datasetsData = await datasetsRes.json()
      setDatasets(datasetsData)

      if (datasetsData.length > 0) {
        generateScenario(datasetsData[0], courseData.track?.language || 'python')
      }
      
      setStartTime(Date.now())
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateScenario = (dataset, language) => {
    const scenarios = {
      python: [
        {
          title: 'Basic Ingestion',
          task: `Load '${dataset.name}' into a pandas DataFrame named 'df' and display the first 5 rows.`,
          required: ['pd.read_csv', 'df.head()'],
          hint: 'Use pd.read_csv() and .head()'
        },
        {
          title: 'Summary Statistics',
          task: `Calculate the mean of all numeric columns in '${dataset.name}' after loading it with pandas.`,
          required: ['pd.read_csv', '.mean()'],
          hint: 'Use .mean() method on your DataFrame'
        },
        {
          title: 'Missing Values',
          task: `Identify how many missing values exist in each column of '${dataset.name}'.`,
          required: ['pd.read_csv', '.isna().sum()'],
          hint: 'Chain .isna() and .sum()'
        }
      ],
      sql: [
        {
          title: 'Select All',
          task: `Write a query to select all columns and rows from the '${dataset.name.split('.')[0]}' table.`,
          required: ['SELECT', '*', 'FROM'],
          hint: 'Use SELECT * FROM table_name'
        },
        {
          title: 'Filtered Select',
          task: `Select the name and value columns from '${dataset.name.split('.')[0]}' where the ID is greater than 100.`,
          required: ['SELECT', 'FROM', 'WHERE', '>'],
          hint: 'Don\'t forget the WHERE clause'
        }
      ]
    }

    const langScenarios = scenarios[language.toLowerCase()] || scenarios.python
    const randomScenario = langScenarios[Math.floor(Math.random() * langScenarios.length)]
    setScenario(randomScenario)
  }

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitted) return

    const correct = scenario.required.every(req => 
      answer.toLowerCase().includes(req.toLowerCase())
    )

    setWasCorrect(correct)
    setIsSubmitted(true)
    setFeedback(correct 
      ? 'Great job! Your code correctly uses the required methods.' 
      : `Not quite. Make sure to use: ${scenario.required.join(', ')}`
    )

    // Record attempt
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'dataset',
          course_id: course.id,
          score: correct ? 100 : 0,
          time_taken_secs: timeElapsed,
          was_correct: correct ? 1 : 0,
        }),
      })
    } catch (err) {
      console.error('Error recording attempt:', err)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    )
  }

  if (datasets.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Database size={48} className="text-[var(--text-muted)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">No Datasets Found</h2>
        <p className="mt-2 text-[var(--text-muted)]">This course doesn't have any accompanying datasets to practice with.</p>
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to={`/courses/${courseSlug}`}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={20} />
          Quit Challenge
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <Timer size={16} />
            {formatTime(timeElapsed)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dataset Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] mb-4">
              <Database size={18} className="text-[var(--accent-blue)]" />
              Available Files
            </h3>
            <div className="space-y-3">
              {datasets.map((ds, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode size={16} className="text-[var(--text-muted)]" />
                    <span className="text-sm font-medium truncate">{ds.name}</span>
                  </div>
                  <span className="text-[10px] uppercase bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                    {ds.size_kb}KB
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[rgba(59,130,246,0.05)] p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--accent-blue)] mb-3">
              <Info size={16} />
              Platform Tip
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Use standard {course?.track?.language || 'Python'} conventions. For pandas, assume it's imported as <code className="text-[var(--accent-yellow)]">pd</code>.
            </p>
          </div>
        </div>

        {/* Challenge Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(3,239,98,0.1)] px-3 py-1 text-xs font-bold text-[var(--accent-green)] uppercase mb-4">
              {scenario?.title || 'Challenge'}
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
              {scenario?.task}
            </h2>

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={isSubmitted}
                  placeholder={course?.track?.language?.toLowerCase() === 'sql' ? "SELECT * FROM..." : "import pandas as pd\ndf = pd.read_csv(...)"}
                  className="w-full h-48 p-4 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border)] text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-green)] outline-none transition-all resize-none"
                />
                {!isSubmitted && (
                  <button
                    onClick={handleSubmit}
                    className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-[var(--accent-green)] px-4 py-2 font-bold text-black hover:opacity-90 shadow-lg"
                  >
                    <Send size={18} />
                    Run Code
                  </button>
                )}
              </div>

              {isSubmitted && (
                <div className={`rounded-xl p-6 animate-in fade-in slide-in-from-top-4 duration-300 ${wasCorrect ? 'bg-[rgba(3,239,98,0.05)] border border-[var(--accent-green)]' : 'bg-[rgba(239,68,68,0.05)] border border-[var(--accent-red)]'}`}>
                  <div className="flex items-center gap-2 font-bold mb-2">
                    {wasCorrect ? (
                      <><CheckCircle2 size={20} className="text-[var(--accent-green)]" /> Output Verified!</>
                    ) : (
                      <><XCircle size={20} className="text-[var(--accent-red)]" /> Syntax Error / Incorrect Logic</>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    {feedback}
                  </p>
                  
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setIsSubmitted(false)
                        setWasCorrect(false)
                        setAnswer('')
                        generateScenario(datasets[0], course.track?.language || 'python')
                        setStartTime(Date.now())
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] py-3 font-bold text-[var(--text-primary)]"
                    >
                      New Scenario
                    </button>
                    <Link
                      to={`/courses/${courseSlug}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-green)] py-3 font-bold text-black"
                    >
                      Finish Challenge
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="p-2 rounded-lg bg-[var(--bg-primary)] text-[var(--accent-yellow)]">
              <Info size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">How verification works</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                We check for specific method calls and patterns required to solve the task. No actual execution occurs on the server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
