import React, { useState } from 'react'
import { X, Save } from 'lucide-react'

export default function EditQuestionModal({ courseSlug, exerciseType, questionData, onClose, onSave }) {
  const [editingQ, setEditingQ] = useState({ _exerciseType: exerciseType, ...questionData })

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/manage/courses/${courseSlug}/questions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType, questionData: editingQ })
      })
      if (res.ok) {
        onSave(editingQ)
      } else {
        alert('Failed to save question')
      }
    } catch (err) {
      alert('Error saving question')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl text-left">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-[var(--text-primary)] capitalize">Edit {exerciseType} Question</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
          {['mcq', 'bossbattle'].includes(exerciseType) && (
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

          {exerciseType === 'flashcards' && (
            <>
              <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Front (Question)</label>
              <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.front || ''} onChange={e => setEditingQ({...editingQ, front: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Back (Answer)</label>
              <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" rows={3} value={editingQ.back || ''} onChange={e => setEditingQ({...editingQ, back: e.target.value})} /></div>
            </>
          )}

          {exerciseType === 'ftb' && (
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

          {exerciseType === 'matching' && (
            <>
              <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Term</label>
              <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.term || ''} onChange={e => setEditingQ({...editingQ, term: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-[var(--text-muted)] mb-1 block uppercase tracking-wider">Match (Definition)</label>
              <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]" value={editingQ.match || ''} onChange={e => setEditingQ({...editingQ, match: e.target.value})} /></div>
            </>
          )}

          {exerciseType === 'challenge' && (
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold bg-transparent text-[var(--text-primary)] hover:underline cursor-pointer">Cancel</button>
            <button type="submit" className="px-6 py-2 text-sm font-bold bg-[var(--accent-green)] text-black rounded-lg shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer"><Save size={16} /> Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
