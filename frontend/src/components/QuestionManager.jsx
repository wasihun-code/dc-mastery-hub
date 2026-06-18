import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Archive, X, Save, Search, Filter, CheckCircle2 } from 'lucide-react'
import EditQuestionModal from './EditQuestionModal'

export default function QuestionManager({ courseSlug }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingQ, setEditingQ] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/manage/courses/${courseSlug}/questions`)
      if (res.ok) setQuestions(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (courseSlug) fetchQuestions()
  }, [courseSlug])

  const handleDelete = async (q) => {
    if (!window.confirm('Delete this question globally for all users?')) return
    try {
      const res = await fetch(`/api/manage/courses/${courseSlug}/questions/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType: q._exerciseType, questionId: q.id })
      })
      if (res.ok) fetchQuestions()
      else alert('Failed to delete')
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = questions.filter(q => {
    if (filterType !== 'all' && q._exerciseType !== filterType) return false
    if (search) {
      const txt = (q.question_text || q.front || q.task_description || q.title || q.term || '').toLowerCase()
      if (!txt.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-primary)] flex justify-between items-center shrink-0">
        <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-xs">Course Question Pool ({questions.length})</h3>
        <div className="flex gap-2">
          <select 
            className="text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer hover:border-zinc-500 transition-all outline-none"
            onChange={(e) => {
              if (e.target.value) {
                setEditingQ({ _exerciseType: e.target.value, id: '' })
                e.target.value = ''
              }
            }}
          >
            <option value="">+ Add New...</option>
            <option value="mcq">MCQ</option>
            <option value="flashcards">Flashcard</option>
            <option value="ftb">Fill in Blank</option>
            <option value="challenge">Dataset Challenge</option>
            <option value="matching">Matching</option>
            <option value="bossbattle">Boss Battle</option>
          </select>
        </div>
      </div>
      
      <div className="p-4 border-b border-[var(--border)] shrink-0 flex gap-2 bg-[var(--bg-primary)]/40">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)] transition-all shadow-inner"
          />
        </div>
        <select 
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer hover:border-zinc-500 transition-all"
        >
          <option value="all">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="flashcards">Flashcards</option>
          <option value="ftb">Fill in Blank</option>
          <option value="challenge">Dataset</option>
          <option value="matching">Matching</option>
          <option value="bossbattle">Boss Battle</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-primary)]/20">
        {loading ? (
          <div className="text-center text-xs text-[var(--text-muted)] p-8 animate-pulse font-bold tracking-widest uppercase">Loading questions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-[var(--text-muted)] p-8 flex flex-col items-center gap-3">
             <Filter size={32} className="opacity-20" />
             No matching items found.
          </div>
        ) : (
          filtered.map(q => (
            <div key={`${q._exerciseType}-${q.id}`} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-card)] hover:border-zinc-600 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-[var(--accent-blue)] bg-blue-950/20 border border-blue-900/30 px-1.5 py-0.5 rounded">
                  {q._exerciseType}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingQ(q)} className="p-1 rounded hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"><Edit2 size={12} /></button>
                  <button onClick={() => handleDelete(q)} className="p-1 rounded hover:bg-red-950/30 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2 leading-relaxed">
                {q.question_text || q.front || q.task_description || q.title || q.term || '(Untitled/No Text)'}
              </div>
              {(q.correct_option || q.back || q.match) && (
                <div className="text-[10px] text-[var(--accent-green)] mt-2 font-mono flex items-center gap-1.5 bg-green-950/10 px-2 py-1 rounded border border-green-900/10">
                  <CheckCircle2 size={10} className="shrink-0" />
                  <span className="truncate">ANS: {q.options?.[q.correct_option] || q.correct_option || q.back || q.match}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editingQ && (
        <EditQuestionModal
          courseSlug={courseSlug}
          exerciseType={editingQ._exerciseType}
          questionData={editingQ}
          onClose={() => setEditingQ(null)}
          onSave={() => {
            fetchQuestions()
            setEditingQ(null)
          }}
        />
      )}
    </div>
  )
}
