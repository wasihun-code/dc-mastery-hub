import React, { useState } from 'react'
import { X, Save, PenLine, CheckCircle2 } from 'lucide-react'

// Convert blanks array to text area format: answer|distractor1,distractor2
const blanksToText = (blanks) => {
  if (!Array.isArray(blanks)) return ''
  return blanks.map(b => `${b.answer || ''}|${(b.distractors || []).join(',')}`).join('\n')
}

// Convert text area format back to blanks array
const textToBlanks = (text) => {
  if (!text) return []
  return text.trim().split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      const [answer, distractorStr] = line.split('|')
      const distractors = distractorStr 
        ? distractorStr.split(',').map(d => d.trim()).filter(Boolean)
        : []
      return { position: index, answer: answer?.trim() || '', distractors }
    })
}

export default function EditQuestionModal({ courseSlug, exerciseType, questionData, onClose, onSave }) {
  const [editingQ, setEditingQ] = useState({ 
    _exerciseType: exerciseType, 
    ...questionData,
    // Initialize blanks text if it's an FTB question
    blanksText: exerciseType === 'ftb' ? blanksToText(questionData.blanks) : ''
  })
  const [saveStatus, setSaveStatus] = useState(null) // null, 'success', 'error'

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveStatus(null)

    // Prepare payload
    let payload = { ...editingQ }
    
    // Parse blanks string back to array before saving
    if (exerciseType === 'ftb') {
      payload.blanks = textToBlanks(payload.blanksText)
      delete payload.blanksText // Clean up UI-only field
    }

    try {
      const res = await fetch(`/api/manage/courses/${courseSlug}/questions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseType, questionData: payload })
      })
      
      if (res.ok) {
        setSaveStatus('success')
        onSave(payload)
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setSaveStatus('error')
      }
    } catch (err) {
      setSaveStatus('error')
    }
  }

  // Handle Tab key in code editor
  const handleCodeTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const val = e.target.value
      const newText = val.substring(0, start) + '    ' + val.substring(end)
      setEditingQ({ ...editingQ, code_template: newText, code: newText })
      
      // Need a tiny delay for React state to update before setting selection
      setTimeout(() => {
        if (e.target) {
          e.target.selectionStart = e.target.selectionEnd = start + 4
        }
      }, 0)
    }
  }

  // Live preview renderer for FTB
  const renderFtbPreview = () => {
    const code = editingQ.code_template || editingQ.code || ''
    if (!code) return null
    
    const parts = code.split(/(\[\[\d+\]\])/)
    return (
      <div className="mt-3 p-4 bg-[#0d1117] rounded-lg border border-[var(--border)] font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre">
        {parts.map((part, i) => {
          const match = part.match(/\[\[(\d+)\]\]/)
          if (match) {
            return (
              <span key={i} className="inline-block min-w-[40px] border-b-2 border-[var(--accent-blue)] bg-[rgba(96,165,250,0.1)] px-2 text-transparent select-none mx-1">
                _
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div 
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-left"
        style={{ width: 'min(780px, 90vw)', maxHeight: '85vh' }}
      >
        {/* MODAL HEADER */}
        <div className="px-[32px] pt-[28px] pb-[20px] shrink-0">
          <div className="flex justify-between items-center mb-[20px]">
            <div className="flex items-center gap-2 text-[18px] font-bold text-[var(--text-primary)]">
              <PenLine size={20} className="text-[var(--accent-green)]" />
              Edit {exerciseType.toUpperCase()} Question
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="h-[1px] w-full bg-[var(--border)]" />
        </div>

        {/* MODAL BODY (Form) */}
        <form id="edit-question-form" onSubmit={handleSave} className="px-[32px] overflow-y-auto flex-1 space-y-6 pb-4">
          
          {['mcq', 'bossbattle'].includes(exerciseType) && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Question Text</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.question_text || editingQ.question || ''} onChange={e => setEditingQ({...editingQ, question_text: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['a', 'b', 'c', 'd'].map(opt => (
                  <div key={opt}>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Option {opt}</label>
                    <input className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.options?.[opt] || editingQ[`option_${opt}`] || ''} onChange={e => setEditingQ({...editingQ, options: {...(editingQ.options || {}), [opt]: e.target.value}})} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Correct Option (a/b/c/d)</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] uppercase focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.correct_option || ''} onChange={e => setEditingQ({...editingQ, correct_option: e.target.value.toLowerCase()})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Explanation</label>
                <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={2} value={editingQ.explanation || ''} onChange={e => setEditingQ({...editingQ, explanation: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'flashcards' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Front (Question)</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.front || ''} onChange={e => setEditingQ({...editingQ, front: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Back (Answer)</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.back || ''} onChange={e => setEditingQ({...editingQ, back: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'ftb' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Task Description</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.description || editingQ.task_description || ''} onChange={e => setEditingQ({...editingQ, description: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Code Template</label>
                <p className="text-[11px] italic text-[var(--text-muted)] mb-2 mt-[-4px]">Use [[0]], [[1]], etc. to mark blanks.</p>
                <textarea 
                  required 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[12px] text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" 
                  style={{ fontFamily: "'Courier New', Courier, monospace", lineHeight: 1.6, minHeight: '120px', resize: 'vertical' }}
                  value={editingQ.code || editingQ.code_template || ''} 
                  onChange={e => setEditingQ({...editingQ, code: e.target.value, code_template: e.target.value})}
                  onKeyDown={handleCodeTab}
                />
                
                <div className="mt-4">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em]">Preview</label>
                  {renderFtbPreview()}
                </div>
              </div>

              <div className="h-[1px] w-full bg-[var(--border)] my-[16px]" />

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Blanks</label>
                <textarea 
                  required 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" 
                  rows={Math.max(3, (editingQ.blanksText?.split('\n').length || 1) + 1)}
                  value={editingQ.blanksText} 
                  onChange={e => setEditingQ({...editingQ, blanksText: e.target.value})} 
                />
                <p className="text-[11px] italic text-[var(--text-muted)] mt-1.5">
                  One blank per line. Format: correctAnswer|wrong1,wrong2,wrong3<br/>
                  Line order matches [[0]], [[1]], [[2]]... in the code template.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Explanation</label>
                <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.explanation || ''} onChange={e => setEditingQ({...editingQ, explanation: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'matching' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Term</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.term || ''} onChange={e => setEditingQ({...editingQ, term: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Match (Definition)</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.match || ''} onChange={e => setEditingQ({...editingQ, match: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'challenge' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Title</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.title || ''} onChange={e => setEditingQ({...editingQ, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Description / Context</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.description || editingQ.context || ''} onChange={e => setEditingQ({...editingQ, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Dataset File</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" value={editingQ.dataset_file || ''} onChange={e => setEditingQ({...editingQ, dataset_file: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Starter Code</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.starter_code || ''} onChange={e => setEditingQ({...editingQ, starter_code: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Solution Code / Expected Code</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)]" rows={3} value={editingQ.solution_code || editingQ.expected_output_code || ''} onChange={e => setEditingQ({...editingQ, solution_code: e.target.value})} />
              </div>
            </>
          )}

        </form>

        {/* MODAL FOOTER */}
        <div className="px-[32px] pb-[28px] pt-[16px] shrink-0 border-t border-[var(--border)]">
          <div className="flex justify-end items-center gap-[10px]">
            {saveStatus === 'error' && (
              <span className="text-[var(--accent-red)] text-sm mr-auto font-medium">
                Failed to save. Check format and try again.
              </span>
            )}
            {saveStatus === 'success' && (
              <span className="text-[var(--accent-green)] text-sm mr-auto font-medium flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 size={16} /> Question updated
              </span>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="px-[16px] py-[8px] text-[14px] font-bold bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border)] rounded-[6px] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="edit-question-form"
              className="px-[16px] py-[8px] text-[14px] font-bold bg-[var(--accent-green)] text-black rounded-[6px] shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
