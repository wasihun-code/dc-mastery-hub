import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Archive, X, Save, Search, Filter } from 'lucide-react'

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

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/manage/courses/${courseSlug}/questions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType: editingQ._exerciseType, questionData: editingQ })
      })
      if (res.ok) {
        setEditingQ(null)
        fetchQuestions()
      } else {
        alert('Failed to save question')
      }
    } catch (err) {
      alert('Error saving question')
    }
  }

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
        <h3 className="font-bold text-[var(--text-primary)]">Manage Questions ({questions.length})</h3>
        <div className="flex gap-2">
          <select 
            className="text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer hover:border-zinc-500"
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
      
      <div className="p-4 border-b border-[var(--border)] shrink-0 flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]"
          />
        </div>
        <select 
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-xs text-[var(--text-muted)] p-4 animate-pulse">Loading questions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-[var(--text-muted)] p-4">No questions found.</div>
        ) : (
          filtered.map(q => (
            <div key={`${q._exerciseType}-${q.id}`} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-primary)] hover:border-zinc-600 transition-colors">
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-blue)] bg-blue-950/30 px-1.5 py-0.5 rounded">
                  {q._exerciseType}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setEditingQ(q)} className="text-[var(--text-muted)] hover:text-white"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(q)} className="text-[var(--text-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-xs text-[var(--text-primary)] line-clamp-2">
                {q.question_text || q.front || q.task_description || q.title || q.term || '(Untitled/No Text)'}
              </div>
              {(q.correct_option || q.back || q.match) && (
                <div className="text-[10px] text-[var(--accent-green)] mt-1 line-clamp-1 font-mono">
                  Answer: {q.options?.[q.correct_option] || q.correct_option || q.back || q.match}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editingQ && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-[var(--text-primary)] capitalize">{editingQ.id ? 'Edit' : 'Add'} {editingQ._exerciseType} Question</h3>
              <button onClick={() => setEditingQ(null)} className="text-[var(--text-muted)] hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
              {['mcq', 'bossbattle'].includes(editingQ._exerciseType) && (
                <>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Question Text</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.question_text || editingQ.question || ''} onChange={e => setEditingQ({...editingQ, question_text: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <div key={opt}><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Option {opt}</label>
                      <input className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.options?.[opt] || editingQ[`option_${opt}`] || ''} onChange={e => setEditingQ({...editingQ, options: {...(editingQ.options || {}), [opt]: e.target.value}})} /></div>
                    ))}
                  </div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Correct Option (a/b/c/d)</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] uppercase focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.correct_option || ''} onChange={e => setEditingQ({...editingQ, correct_option: e.target.value.toLowerCase()})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Explanation</label>
                  <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={2} value={editingQ.explanation || ''} onChange={e => setEditingQ({...editingQ, explanation: e.target.value})} /></div>
                </>
              )}

              {editingQ._exerciseType === 'flashcards' && (
                <>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Front (Question)</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.front || ''} onChange={e => setEditingQ({...editingQ, front: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Back (Answer)</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.back || ''} onChange={e => setEditingQ({...editingQ, back: e.target.value})} /></div>
                </>
              )}

              {editingQ._exerciseType === 'ftb' && (
                <>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Task Description</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={2} value={editingQ.description || editingQ.task_description || ''} onChange={e => setEditingQ({...editingQ, description: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Code Template (use ___ for blanks)</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={4} value={editingQ.code || editingQ.code_template || ''} onChange={e => setEditingQ({...editingQ, code: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Blanks (comma separated)</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={(editingQ.blanks || []).join(', ')} onChange={e => setEditingQ({...editingQ, blanks: e.target.value.split(',').map(s=>s.trim())})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Explanation</label>
                  <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={2} value={editingQ.explanation || ''} onChange={e => setEditingQ({...editingQ, explanation: e.target.value})} /></div>
                </>
              )}

              {editingQ._exerciseType === 'matching' && (
                <>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Term</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.term || ''} onChange={e => setEditingQ({...editingQ, term: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Match (Definition)</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.match || ''} onChange={e => setEditingQ({...editingQ, match: e.target.value})} /></div>
                </>
              )}

              {editingQ._exerciseType === 'challenge' && (
                <>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Title</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.title || ''} onChange={e => setEditingQ({...editingQ, title: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Description / Context</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.description || editingQ.context || ''} onChange={e => setEditingQ({...editingQ, description: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Dataset File</label>
                  <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.dataset_file || ''} onChange={e => setEditingQ({...editingQ, dataset_file: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Starter Code</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.starter_code || ''} onChange={e => setEditingQ({...editingQ, starter_code: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Solution Code / Expected Code</label>
                  <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.solution_code || editingQ.expected_output_code || ''} onChange={e => setEditingQ({...editingQ, solution_code: e.target.value})} /></div>
                </>
              )}

              <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setEditingQ(null)} className="px-4 py-2 text-sm font-bold bg-transparent text-[var(--text-primary)] hover:underline cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold bg-[var(--accent-green)] text-black rounded-lg shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer"><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
