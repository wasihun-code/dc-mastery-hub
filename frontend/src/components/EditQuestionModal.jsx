import React, { useState, useRef } from 'react'
import { X, Save, PenLine, CheckCircle2, Hash, Code, HelpCircle, List, Plus, Trash2 } from 'lucide-react'

function transformCodeTemplate(codeTemplate) {
  if (!codeTemplate) return ''
  let code = codeTemplate
  code = code.replace(/___(\d+)___/g, (match, numStr) => `[[${parseInt(numStr, 10) - 1}]]`)
  let count = 0
  const existing = code.match(/\[\[(\d+)\]\]/g)
  if (existing) {
    count = Math.max(...existing.map(m => parseInt(m.match(/\d+/)[0], 10))) + 1
  }
  while (code.match(/_{3,}/)) {
    code = code.replace(/_{3,}/, `[[${count}]]`)
    count++
  }
  return code
}

const extractPositions = (code) => {
  if (!code) return []
  const matches = code.match(/\[\[(\d+)\]\]/g)
  if (!matches) return []
  const nums = matches.map(m => parseInt(m.match(/\d+/)[0], 10))
  return [...new Set(nums)].sort((a, b) => a - b)
}

const mergeBlanks = (existingBlanks, positions) => {
  const map = {}
  if (Array.isArray(existingBlanks)) {
    existingBlanks.forEach(b => { map[b.position] = b })
  }
  return positions.map(pos => ({
    position: pos,
    answer: map[pos]?.answer || '',
    answer_alternatives: map[pos]?.answer_alternatives || map[pos]?.distractors || []
  }))
}

export default function EditQuestionModal({ courseSlug, exerciseType, questionData, onClose, onSave }) {
  const initialCode = exerciseType === 'ftb'
    ? transformCodeTemplate(questionData.code_template || questionData.code || '')
    : (questionData.code || '')

  const initialPositions = extractPositions(initialCode)
  const initialBlanks = mergeBlanks(questionData.blanks, initialPositions)

  const [editingQ, setEditingQ] = useState({
    _exerciseType: exerciseType,
    ...questionData,
    code: initialCode,
    code_template: initialCode,
    blanksArray: exerciseType === 'ftb' ? initialBlanks : []
  })

  const [saveStatus, setSaveStatus] = useState(null)
  const [newAltText, setNewAltText] = useState({})

  const handleCodeChange = (newCode) => {
    const positions = extractPositions(newCode)
    const updatedBlanks = mergeBlanks(editingQ.blanksArray, positions)
    setEditingQ({ ...editingQ, code: newCode, code_template: newCode, blanksArray: updatedBlanks })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveStatus(null)

    let payload = { ...editingQ }

    if (exerciseType === 'ftb') {
      const templateCode = payload.code || ''
      const templateCodeTemplate = templateCode.replace(/\[\[(\d+)\]\]/g, '_____')

      payload.blanks = payload.blanksArray.map(b => ({
        position: b.position,
        answer: b.answer,
        answer_alternatives: b.answer_alternatives?.length ? b.answer_alternatives : undefined
      }))

      delete payload.blanksArray
      delete payload.code
      payload.code_template = templateCodeTemplate
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
        }, 1500)
      } else {
        setSaveStatus('error')
      }
    } catch (err) {
      setSaveStatus('error')
    }
  }

  const handleCodeTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const val = e.target.value
      const newText = val.substring(0, start) + '    ' + val.substring(end)
      handleCodeChange(newText)
      setTimeout(() => {
        if (e.target) {
          e.target.selectionStart = e.target.selectionEnd = start + 4
        }
      }, 0)
    }
  }

  const updateBlank = (position, field, value) => {
    const updated = editingQ.blanksArray.map(b =>
      b.position === position ? { ...b, [field]: value } : b
    )
    setEditingQ({ ...editingQ, blanksArray: updated })
  }

  const addAlternative = (position) => {
    const text = (newAltText[position] || '').trim()
    if (!text) return
    const blank = editingQ.blanksArray.find(b => b.position === position)
    if (!blank) return
    updateBlank(position, 'answer_alternatives', [...(blank.answer_alternatives || []), text])
    setNewAltText(prev => ({ ...prev, [position]: '' }))
  }

  const removeAlternative = (position, index) => {
    const blank = editingQ.blanksArray.find(b => b.position === position)
    if (!blank) return
    const updated = (blank.answer_alternatives || []).filter((_, i) => i !== index)
    updateBlank(position, 'answer_alternatives', updated)
  }

  const renderFtbPreview = () => {
    const code = editingQ.code || ''
    if (!code) return null

    const parts = code.split(/(\[\[\d+\]\])/)
    return (
      <div className="mt-2 p-4 bg-[#0d1117] rounded-lg border border-[var(--border)] font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre" style={{ color: 'var(--code-text)' }}>
        {parts.map((part, i) => {
          const match = part.match(/\[\[(\d+)\]\]/)
          if (match) {
            return (
              <span key={i} className="inline-block border-b-2 border-[var(--accent-blue)] bg-[rgba(96,165,250,0.12)] px-3 mx-0.5 rounded select-none text-[var(--accent-blue)] text-xs font-bold" style={{ minWidth: '36px', textAlign: 'center' }}>
                ●
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-left"
        style={{ width: 'min(780px, 90vw)', maxHeight: '85vh' }}
      >
        {/* MODAL HEADER */}
        <div className="px-[32px] pt-[28px] pb-[20px] shrink-0">
          <div className="flex justify-between items-center mb-[20px]">
            <div className="flex items-center gap-2 text-[18px] font-bold text-[var(--text-primary)] uppercase tracking-tight">
              <PenLine size={20} className="text-[var(--accent-green)]" />
              Edit {exerciseType === 'ftb' ? 'Fill-in-the-Blank' : exerciseType.toUpperCase()} Question
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <div className="h-[1px] w-full bg-[var(--border)]" />
        </div>

        {/* MODAL BODY (Form) */}
        <form id="edit-question-form" onSubmit={handleSave} className="px-[32px] overflow-y-auto flex-1 space-y-6 pb-6">

          {['mcq', 'bossbattle'].includes(exerciseType) && (
            <>
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Question Text</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.question_text || editingQ.question || ''} onChange={e => setEditingQ({...editingQ, question_text: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['a', 'b', 'c', 'd'].map(opt => (
                  <div key={opt}>
                    <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Option {opt}</label>
                    <input className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.options?.[opt] || editingQ[`option_${opt}`] || ''} onChange={e => setEditingQ({...editingQ, options: {...(editingQ.options || {}), [opt]: e.target.value}})} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Correct Option (a/b/c/d)</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] uppercase focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.correct_option || ''} onChange={e => setEditingQ({...editingQ, correct_option: e.target.value.toLowerCase()})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Explanation</label>
                <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={2} value={editingQ.explanation || ''} onChange={e => setEditingQ({...editingQ, explanation: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'flashcards' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Front (Question)</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.front || ''} onChange={e => setEditingQ({...editingQ, front: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Back (Answer)</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.back || ''} onChange={e => setEditingQ({...editingQ, back: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'ftb' && (
            <>
              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Code size={16} className="text-[var(--accent-blue)]" />
                  Task
                </div>
                <textarea
                  required
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] transition-all resize-none"
                  rows={2}
                  value={editingQ.description || editingQ.task_description || ''}
                  onChange={e => setEditingQ({...editingQ, description: e.target.value})}
                  placeholder="Describe what the user needs to complete..."
                />
              </div>

              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Code size={16} className="text-[var(--accent-blue)]" />
                  Code Template
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-[-8px]">
                  Use <code className="text-[var(--accent-blue)] bg-[var(--bg-sidebar)] px-1 rounded text-[11px] font-mono">[[0]]</code>, <code className="text-[var(--accent-blue)] bg-[var(--bg-sidebar)] px-1 rounded text-[11px] font-mono">[[1]]</code> etc. to mark blanks.
                </p>
                <textarea
                  required
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-[6px] p-[12px] text-[13px] leading-relaxed text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] transition-all"
                  style={{ fontFamily: "'Courier New', Courier, monospace", minHeight: '100px', resize: 'vertical' }}
                  value={editingQ.code || ''}
                  onChange={e => handleCodeChange(e.target.value)}
                  onKeyDown={handleCodeTab}
                  placeholder="recipe = [[0]]&quot;pasta&quot;[[1]] 500, &quot;tomatoes&quot;: 400}"
                />

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Preview</label>
                  {renderFtbPreview()}
                </div>
              </div>

              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <List size={16} className="text-[var(--accent-yellow)]" />
                  Blanks
                  <span className="text-[10px] font-mono text-[var(--text-muted)] ml-1">
                    {editingQ.blanksArray.length} slot{editingQ.blanksArray.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-[-8px]">
                  Each <code className="text-[var(--accent-yellow)] bg-[var(--bg-sidebar)] px-1 rounded text-[11px] font-mono">[[N]]</code> in the template above gets a slot below.
                </p>

                {editingQ.blanksArray.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)] text-sm">
                    No blanks yet. Add <code className="text-[var(--accent-blue)] bg-[var(--bg-sidebar)] px-1 rounded text-[11px] font-mono">[[0]]</code>, <code className="text-[var(--accent-blue)] bg-[var(--bg-sidebar)] px-1 rounded text-[11px] font-mono">[[1]]</code> etc. to the code template above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {editingQ.blanksArray.map((blank, idx) => (
                      <div key={blank.position} className="bg-[var(--bg-sidebar)] rounded-lg border border-[var(--border)] p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[var(--accent-yellow)] font-mono bg-[var(--bg-primary)] px-2 py-0.5 rounded">
                            [[{blank.position}]]
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Slot {idx + 1} of {editingQ.blanksArray.length}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                            Correct Answer
                          </label>
                          <input
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[8px_10px] text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] transition-all"
                            value={blank.answer}
                            onChange={e => updateBlank(blank.position, 'answer', e.target.value)}
                            placeholder="Enter the correct answer..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">
                            Alternative Answers
                          </label>
                          {blank.answer_alternatives && blank.answer_alternatives.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {blank.answer_alternatives.map((alt, ai) => (
                                <span key={ai} className="inline-flex items-center gap-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-0.5 text-[12px] font-mono text-[var(--text-muted)]">
                                  {alt}
                                  <button
                                    type="button"
                                    onClick={() => removeAlternative(blank.position, ai)}
                                    className="hover:text-[var(--accent-red)] transition-colors cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-[var(--text-muted)] mb-1 italic">No alternatives</p>
                          )}
                          <div className="flex gap-2">
                            <input
                              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[6px_10px] text-[12px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] transition-all"
                              value={newAltText[blank.position] || ''}
                              onChange={e => setNewAltText(prev => ({ ...prev, [blank.position]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlternative(blank.position) } }}
                              placeholder="Add alternative..."
                            />
                            <button
                              type="button"
                              onClick={() => addAlternative(blank.position)}
                              disabled={!(newAltText[blank.position] || '').trim()}
                              className="px-3 py-1.5 bg-[var(--accent-yellow)] text-black rounded-[6px] text-[11px] font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={14} /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Hash size={16} className="text-[var(--accent-yellow)]" />
                  Word Bank
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-[-8px]">
                  Comma-separated words shown as clickable choices.
                </p>
                <input
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-yellow)] transition-all"
                  value={Array.isArray(editingQ.word_bank) ? editingQ.word_bank.join(', ') : (editingQ.word_bank || '')}
                  onChange={e => setEditingQ({...editingQ, word_bank: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                  placeholder="a + b, a - b, a * b, a / b"
                />
              </div>

              <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] p-4 space-y-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <HelpCircle size={16} className="text-[var(--accent-green)]" />
                  Explanation
                </div>
                <textarea
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all resize-none"
                  rows={2}
                  value={editingQ.explanation || ''}
                  onChange={e => setEditingQ({...editingQ, explanation: e.target.value})}
                  placeholder="Explain the concept this exercise teaches..."
                />
              </div>
            </>
          )}

          {exerciseType === 'matching' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Term</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.term || ''} onChange={e => setEditingQ({...editingQ, term: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Match (Definition)</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.match || ''} onChange={e => setEditingQ({...editingQ, match: e.target.value})} />
              </div>
            </>
          )}

          {exerciseType === 'challenge' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Title</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.title || ''} onChange={e => setEditingQ({...editingQ, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Description / Context</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.description || editingQ.context || ''} onChange={e => setEditingQ({...editingQ, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Dataset File</label>
                <input required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" value={editingQ.dataset_file || ''} onChange={e => setEditingQ({...editingQ, dataset_file: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Starter Code</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.starter_code || ''} onChange={e => setEditingQ({...editingQ, starter_code: e.target.value})} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Solution Code / Expected Code</label>
                <textarea required className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[6px] p-[10px_12px] text-[14px] font-mono text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-green)] transition-all" rows={3} value={editingQ.solution_code || editingQ.expected_output_code || ''} onChange={e => setEditingQ({...editingQ, solution_code: e.target.value})} />
              </div>
            </>
          )}

        </form>

        {/* MODAL FOOTER */}
        <div className="px-[32px] pb-[28px] pt-[16px] shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)]/10">
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
              className="px-[16px] py-[8px] text-[14px] font-bold bg-[var(--accent-green)] text-black rounded-[6px] shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
