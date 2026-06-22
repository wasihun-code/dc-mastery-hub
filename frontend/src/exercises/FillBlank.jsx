import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ftbFeedback, triggerCorrectFeedback, triggerWrongFeedback, triggerSuccessFeedback } from '../services/feedbackService';
import { 
  ChevronLeft,
  Check,
  X,
  RotateCcw,
  Code2,
  ArrowRight,
  Zap,
  } from 'lucide-react';
  import { getSessionLimit, getTimerEnabled, getTimerDuration } from '../services/settingsService';
  import EditQuestionModal from '../components/EditQuestionModal';
  import ConfirmModal from '../components/admin/ConfirmModal';
  import ExerciseTimer from '../components/ExerciseTimer';
  import AnswerFeedbackModal from '../components/AnswerFeedbackModal';
  import ExerciseBottomControls from '../components/ExerciseBottomControls';

const AutoResizingInput = React.forwardRef(({ slotIndex, value, isChecked, isCorrect, activeSlot, onFocus, onChange }, ref) => {
  const spanRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(60);

  useEffect(() => {
    if (spanRef.current) {
      const calculatedWidth = Math.max(60, spanRef.current.offsetWidth + 24);
      setInputWidth(Math.min(calculatedWidth, 320));
    }
  }, [value]);

  const inputClass = `inline-flex h-[38px] text-center px-2 mx-1.5 rounded-lg border-2 transition-all font-mono text-lg font-bold bg-[var(--bg-primary)] focus:outline-none align-middle ${
    isChecked
      ? isCorrect
        ? "!bg-[var(--accent-green)] !border-[var(--accent-green)] !text-black opacity-100"
        : "!bg-[var(--accent-red)] !border-[var(--accent-red)] !text-white opacity-100"
      : activeSlot === slotIndex
      ? "border-[var(--accent-blue)] bg-[rgba(96,165,250,0.15)] text-[var(--accent-blue)]"
      : "border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent-blue)]"
  }`;

  return (
    <span className="relative inline-flex items-center align-middle">
      <span
        ref={spanRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontFamily: 'monospace',
          fontSize: '1.125rem',
          fontWeight: 'bold',
          padding: '0 8px'
        }}
      >
        {value || "_____"}
      </span>
      <input
        ref={ref}
        type="text"
        value={value || ""}
        readOnly={isChecked}
        onChange={onChange}
        onFocus={onFocus}
        placeholder="_____"
        className={inputClass}
        style={{
          width: `${inputWidth}px`,
          minWidth: '60px',
          maxWidth: '320px',
          overflowX: 'auto',
          textOverflow: 'clip'
        }}
      />
    </span>
  );
});

export default function FillBlank() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  // Exercise state
  const [userAnswers, setUserAnswers] = useState({}); // { slotIndex: word }
  const [isChecked, setIsChecked] = useState(false);
  const [correctExerciseCount, setCorrectExerciseCount] = useState(0);
  const [activeSlot, setActiveSlot] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [timerEnabled] = useState(() => getTimerEnabled('ftb'));
  const [timerDuration] = useState(() => getTimerDuration('ftb'));
  const [timerExpired, setTimerExpired] = useState(false);
  const [questionsWithChoicesUsed, setQuestionsWithChoicesUsed] = useState(new Set());
  const [choicesEnabled, setChoicesEnabled] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [isWide, setIsWide] = useState(window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsWide(mq.matches)
    const handler = (e) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const maxChoicesAllowed = exercises.length >= 15 ? 5 : 3;
  const choicesUsedCount = questionsWithChoicesUsed.size;
  const choicesLeft = maxChoicesAllowed - choicesUsedCount;

  const [showShortcuts, setShowShortcuts] = useState(() => {
    return localStorage.getItem('showKeyboardShortcuts') !== 'false';
  });

  const handleToggleShortcuts = () => {
    setShowShortcuts(prev => {
      const nextVal = !prev;
      localStorage.setItem('showKeyboardShortcuts', String(nextVal));
      return nextVal;
    });
  };
  
  // Store the shuffled word bank for the current question
  const [shuffledWordBank, setShuffledWordBank] = useState([]);

  useEffect(() => {
    fetchCourseAndExercises();
  }, [courseSlug]);

  useEffect(() => {
    if (step !== 2) return;

    const handleKeyDown = (e) => {
      if (showFeedbackModal) return;

      // Ctrl+S -> toggle choices
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (!isChecked) {
          if (choicesEnabled) {
            setChoicesEnabled(false);
          } else {
            if (choicesLeft > 0 || questionsWithChoicesUsed.has(currentIndex)) {
              setChoicesEnabled(true);
              if (!questionsWithChoicesUsed.has(currentIndex)) {
                setQuestionsWithChoicesUsed(prev => new Set(prev).add(currentIndex));
              }
            }
          }
        }
        return;
      }

      // Ctrl+D -> delete current question
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const ex = exercises[currentIndex];
        if (ex) setConfirmDelete(ex);
        return;
      }

      // Self-Typing mode shortcuts (when choices are NOT enabled)
      if (!choicesEnabled) {
        // Ctrl+Shift+Enter -> check answer (submit)
        if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
          const currentEx = exercises[currentIndex];
          const allFilled = currentEx?.answers?.every((_, i) => userAnswers[i]) ?? false;
          if (!isChecked && allFilled) {
            e.preventDefault();
            checkAnswer();
          }
        }
      } else {
        // Choices Mode: numeric keys to select tiles
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }

        if (!isChecked && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (idx < shuffledWordBank.length) {
            const word = shuffledWordBank[idx];
            const isUsed = Object.values(userAnswers).includes(word);
            if (!isUsed) {
              handleTileClick(word);
            }
          }
        }
      }

      // Escape key -> clear answers if not checked
      if (e.key === 'Escape') {
        if (!isChecked) {
          if (Object.keys(userAnswers).length > 0) {
            setUserAnswers({});
          }
        }
      }

      // Double Escape -> quit confirmation
      if (e.key === 'Escape') {
        if (isChecked || Object.keys(userAnswers).length === 0) {
          setConfirmDelete({quit: true});
        }
      }

      // Enter key -> proceed to next exercise (if checked)
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        if (isChecked) {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step, currentIndex, exercises, userAnswers, isChecked, choicesEnabled, shuffledWordBank, showFeedbackModal, questionsWithChoicesUsed, choicesLeft]);

  useEffect(() => {
    if (step === 2 && !choicesEnabled && !isChecked && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, activeSlot, choicesEnabled, isChecked, step]);

  useEffect(() => {
    if (exercises.length > 0 && exercises[currentIndex]) {
      const originalBank = exercises[currentIndex].word_bank || [];
      // Shuffle the word bank so correct answer isn't always first
      const shuffled = [...originalBank].sort(() => Math.random() - 0.5);
      setShuffledWordBank(shuffled);
    }
  }, [currentIndex, exercises]);

  const fetchCourseAndExercises = async () => {
    try {
      setLoading(true);
      const [courseRes, exercisesRes, attemptsRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/exercises/${courseSlug}/ftb`),
        fetch(`/api/progress/attempted-questions/${courseSlug}/fillblank`)
      ]);
      
      if (!courseRes.ok || !exercisesRes.ok || !attemptsRes.ok) {
        throw new Error("Failed to fetch data");
      }
      
      const courseData = await courseRes.json();
      if (courseData && courseData.reviewed !== 'Yes') {
        navigate('/courses');
        return;
      }
      const allExercises = await exercisesRes.json();
      const attemptedIds = await attemptsRes.json();
      
      setCourse(courseData);

      // Normalize attemptedIds to string
      const attemptedStrIds = attemptedIds.map(id => String(id));

      const unattempted = allExercises.filter(ex => !attemptedStrIds.includes(String(ex.id)));
      const attempted = allExercises.filter(ex => attemptedStrIds.includes(String(ex.id)));

      // Shuffle both lists independently for randomness
      unattempted.sort(() => Math.random() - 0.5);
      attempted.sort(() => Math.random() - 0.5);

      let selected = [];
      let replayMode = false;

      const trackSlug = courseData.track?.slug || courseData.track_slug;
      const sessionLimit = getSessionLimit('ftb', courseSlug, trackSlug, allExercises.length);

      if (unattempted.length >= sessionLimit) {
        selected = unattempted.slice(0, sessionLimit);
      } else if (unattempted.length > 0) {
        const needed = sessionLimit - unattempted.length;
        selected = [...unattempted, ...attempted.slice(0, needed)];
      } else {
        replayMode = true;
        selected = attempted.slice(0, sessionLimit);
      }
      
      setExercises(selected);
      setIsReplaying(replayMode);
    } catch (err) {
      console.error('Error fetching fill-blank data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      const res = await fetch('/api/progress/delete-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug,
          exerciseType: 'ftb',
          questionId
        })
      });
      if (res.ok) {
        const updated = exercises.filter(ex => ex.id !== questionId);
        setExercises(updated);
        if (updated.length === 0) {
          setStep(3);
        } else if (currentIndex >= updated.length) {
          setCurrentIndex(updated.length - 1);
          resetState();
        } else {
          resetState();
        }
      }
    } catch (err) {
      console.error("Failed to delete exercise:", err);
    }
  };

  const startExercise = () => {
    setStep(2);
    setCurrentIndex(0);
    setCorrectExerciseCount(0);
    setQuestionsWithChoicesUsed(new Set());
    resetState();
  };

  const resetState = () => {
    setUserAnswers({});
    setIsChecked(false);
    setShowFeedbackModal(false);
    setActiveSlot(0);
    setChoicesEnabled(false);
  };

  const handleToggleChoices = () => {
    if (isChecked) return;
    if (choicesEnabled) {
      setChoicesEnabled(false);
    } else {
      if (choicesLeft > 0 || questionsWithChoicesUsed.has(currentIndex)) {
        setChoicesEnabled(true);
        if (!questionsWithChoicesUsed.has(currentIndex)) {
          const updated = new Set(questionsWithChoicesUsed);
          updated.add(currentIndex);
          setQuestionsWithChoicesUsed(updated);
        }
      }
    }
  };

  const handleTileClick = (word) => {
    if (isChecked) return;
    
    // Find if word is already used
    const usedInSlotStr = Object.keys(userAnswers).find(key => userAnswers[key] === word);
    if (usedInSlotStr !== undefined) {
      // Remove it
      const newAnswers = { ...userAnswers };
      delete newAnswers[usedInSlotStr];
      setUserAnswers(newAnswers);
      return;
    }

    // Place in active slot or first empty slot
    const currentEx = exercises[currentIndex];
    const totalSlots = currentEx.answers.length;
    
    let targetSlot = activeSlot;
    if (userAnswers[targetSlot]) {
      // Find first empty
      for (let i = 0; i < totalSlots; i++) {
        if (!userAnswers[i]) {
          targetSlot = i;
          break;
        }
      }
    }

    setUserAnswers({ ...userAnswers, [targetSlot]: word });
    
    // Move active slot to next empty
    for (let i = 0; i < totalSlots; i++) {
      if (!userAnswers[i] && i !== targetSlot) {
        setActiveSlot(i);
        break;
      }
    }
  };

  const handleSlotClick = (index) => {
    if (isChecked) return;
    if (userAnswers[index]) {
      const newAnswers = { ...userAnswers };
      delete newAnswers[index];
      setUserAnswers(newAnswers);
    }
    setActiveSlot(index);
  };

  const checkAnswer = async () => {
    const currentEx = exercises[currentIndex];
    const allCorrect = currentEx.answers.every((ans, idx) => userAnswers[idx] === ans);
    if (allCorrect) {
      setCorrectExerciseCount(prev => prev + 1);
      ftbFeedback.correct();
    } else {
      ftbFeedback.wrong();
    }
    setIsChecked(true);

    // Post attempt per question
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'fillblank',
          course_id: course.id,
          question_id: currentEx.id,
          concept_id: currentEx.concept_id || currentEx.id,
          score: allCorrect ? 1.0 : 0.0,
          was_correct: allCorrect ? 1 : 0
        })
      });
    } catch (err) {
      console.error("Error saving question attempt:", err);
    }

    setShowFeedbackModal(true);
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetState();
    } else {
      finishExercise();
    }
  };

  const finishExercise = async (expired) => {
    setStep(3);
    if (expired) setTimerExpired(true);
    triggerSuccessFeedback();
    const earnedXp = 25;
    setXpEarned(earnedXp);
    
    try {
      // Update XP
      const statsRes = await fetch('/api/progress/stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        await fetch('/api/progress/stats', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_xp: (stats.total_xp || 0) + earnedXp
          })
        });
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  // Helper to apply basic syntax coloring to regular code parts
  const highlightPythonSyntax = (text) => {
    if (!text) return null;
    const cleanText = text.replace(/\t/g, '    ');
    const tokens = cleanText.split(/(\bdef\b|\breturn\b|\bif\b|\belse\b|\bfor\b|\bin\b|\bimport\b|\bas\b|\bprint\b|\bnp\b|\bpd\b|"[^"]*"|'[^']*'|\b\d+\b|#.*)/g);
    return tokens.map((token, tokenIdx) => {
      if (['def', 'return', 'if', 'else', 'for', 'in', 'import', 'as'].includes(token)) {
        return <span key={tokenIdx} className="text-[#ff79c6] font-bold whitespace-pre">{token}</span>;
      }
      if (['print', 'np', 'pd'].includes(token)) {
        return <span key={tokenIdx} className="text-[#50fa7b] whitespace-pre">{token}</span>;
      }
      if (token.startsWith('"') || token.startsWith("'")) {
        return <span key={tokenIdx} className="text-[#f1fa8c] whitespace-pre">{token}</span>;
      }
      if (token.startsWith('#')) {
        return <span key={tokenIdx} className="text-[#03ef62] italic whitespace-pre">{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={tokenIdx} className="text-[#60a5fa] whitespace-pre">{token}</span>;
      }
      return <span key={tokenIdx} className="whitespace-pre">{token}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-exercise)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-green)] border-t-transparent"></div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--accent-yellow)] border border-[var(--border)]">
          <Code2 size={48} />
        </div>
        <h2 className="text-xl text-[var(--text-muted)] font-medium uppercase tracking-wider">{course?.name}</h2>
        <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Fill in the Blanks</h1>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            {exercises.length} Exercises
          </div>
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            ~{Math.round(exercises.length * 1.5)} min
          </div>
          <div className="rounded-full bg-[rgba(3,239,98,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-green-bright)] border border-[rgba(3,239,98,0.3)] flex items-center gap-1.5">
            <Zap size={16} /> Earn 25 XP
          </div>
        </div>
        
        <button 
          onClick={startExercise}
          className="mt-12 min-w-[220px] rounded-xl bg-[var(--accent-green)] py-4 text-xl font-bold text-black shadow-lg shadow-[rgba(3,239,98,0.2)] transition-all duration-200 hover:bg-[var(--accent-green-bright)] hover:scale-105 active:scale-95 uppercase"
        >
          {isReplaying ? 'REPLAY' : 'START'}
        </button>
        
        <Link to={`/courses/${courseSlug}?refresh=1`} className="mt-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 text-sm font-medium">
          <ChevronLeft size={18} />
          Back to Course
        </Link>
      </div>
    );
  }

  if (step === 2) {
    const currentEx = exercises[currentIndex];
    const allFilled = currentEx?.answers?.every((_, i) => userAnswers[i]) ?? false;
    const isMultiLine = currentEx?.code && currentEx.code.trim().includes('\n');

    // Render code blocks with blanks replaced by buttons
    const renderCodeWithSlots = () => {
      if (!currentEx?.code) return null;
      let parts = currentEx.code.split(/(\[\[\d+\]\])/);
      return parts.map((part, i) => {
        const match = part.match(/\[\[(\d+)\]\]/);
        if (match) {
          const slotIndex = parseInt(match[1]);
          const answer = userAnswers[slotIndex];
          const isCorrect = isChecked && answer === currentEx.answers[slotIndex];
          
          if (isChecked) {
            console.log(`[FillBlank debug] slotIndex: ${slotIndex}, answer: "${answer}", correct: "${currentEx?.answers?.[slotIndex]}", isCorrect: ${isCorrect}`);
          }
          
          if (!choicesEnabled) {
            return (
              <AutoResizingInput
                key={i}
                ref={slotIndex === activeSlot ? inputRef : null}
                slotIndex={slotIndex}
                value={userAnswers[slotIndex] || ""}
                isChecked={isChecked}
                isCorrect={isCorrect}
                activeSlot={activeSlot}
                onChange={(e) => {
                  setUserAnswers({ ...userAnswers, [slotIndex]: e.target.value });
                }}
                onFocus={() => setActiveSlot(slotIndex)}
              />
            );
          } else {
            let slotClass = "inline-flex min-w-[110px] h-[38px] items-center justify-center px-3 mx-1.5 rounded-lg border-2 transition-all font-mono text-lg font-bold cursor-pointer select-none vertical-middle ";
            if (isChecked) {
              slotClass += isCorrect ? "bg-[var(--accent-green)] border-[var(--accent-green)] text-black" : "bg-[var(--accent-red)] border-[var(--accent-red)] text-white";
            } else {
              slotClass += activeSlot === slotIndex ? "border-[var(--accent-blue)] bg-[rgba(96,165,250,0.15)] text-[var(--accent-blue)]" : "border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--text-muted)] text-[var(--text-muted)]";
            }

            return (
              <span 
                key={i} 
                onClick={() => handleSlotClick(slotIndex)}
                className={slotClass}
              >
                {answer || (isChecked ? currentEx.answers[slotIndex] : "_____")}
              </span>
            );
          }
        }
        return <React.Fragment key={i}>{highlightPythonSyntax(part)}</React.Fragment>;
      });
    };

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-exercise)] text-[var(--text-primary)] overflow-hidden">
        {/* Progress Bar & Stats */}
        <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20">
          <span>Fill-in-the-Blank Progress</span>
          <span>{currentIndex + 1} / {exercises.length} ({Math.round(((currentIndex + 1) / exercises.length) * 100)}%)</span>
        </div>
        <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
          <div 
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
          <button 
            onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <ChevronLeft size={16} /> Quit
          </button>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Fill Blank • {course?.name}</span>
            <div className="font-bold text-sm flex items-center justify-center gap-2">
              Exercise {currentIndex + 1} of {exercises.length}
              {timerEnabled && !timerExpired && (
                <ExerciseTimer
                  durationSeconds={timerDuration}
                  isRunning={true}
                  onExpire={() => {
                    setTimerExpired(true);
                    finishExercise();
                  }}
                  resetKey="ftb-session-timer"
                />
              )}
            </div>
          </div>
          
          <div className="w-20"></div> {/* Spacer */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-16">
          <div className="w-full" style={{ maxWidth: '90vw', margin: '0 auto', padding: '32px 40px' }}>
            <div className="flex flex-col gap-6">
              
              {/* Task Description & Code Block */}
              <div className="flex flex-col gap-3 text-left">
                <h2 className="text-base sm:text-xl font-bold leading-relaxed text-[var(--text-primary)]">
                  {currentEx?.description}
                </h2>
                
                <div style={{ width: '100%', color: 'var(--code-text)' }} className={isMultiLine 
                  ? "rounded-2xl border border-[var(--border)] bg-[#0d1117] p-4 sm:p-6 font-mono text-sm sm:text-lg leading-relaxed overflow-x-auto whitespace-pre" 
                  : "flex items-center rounded-xl border border-[var(--border)] bg-[#0d1117] px-3 sm:px-5 py-2 sm:py-3 font-mono text-sm sm:text-lg overflow-x-auto max-w-full whitespace-pre"
                }>
                  {renderCodeWithSlots()}
                </div>
              </div>

              {/* Word Bank tiles, Clear/Submit Actions, and Feedback panel */}
              <div className="flex flex-col gap-4">

                {/* Word Bank */}
                {choicesEnabled && (
                  <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] mb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="w-full text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold mb-1.5 text-left">Word Bank</h4>
                    {shuffledWordBank.map((word, i) => {
                      const isUsed = Object.values(userAnswers).includes(word);
                      return (
                        <button
                          key={i}
                          onClick={() => handleTileClick(word)}
                          disabled={isChecked || isUsed}
                          className={`px-3 py-2 rounded-lg border font-mono text-[11px] font-bold transition-all flex items-center gap-2 group ${
                            isUsed 
                              ? 'bg-[var(--bg-primary)] border-[var(--border)] opacity-35 cursor-not-allowed text-[var(--text-muted)]' 
                              : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] hover:bg-[var(--card-hover)]'
                          }`}
                        >
                          <span>{word}</span>
                          {!isChecked && !isUsed && i < 9 && (
                            <kbd className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[8px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border)] rounded shadow-sm select-none transition-colors group-hover:border-[var(--accent-blue)] group-hover:text-[var(--accent-blue)]">
                              {i + 1}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-6 sm:gap-8">
                  <button
                    onClick={() => setUserAnswers({})}
                    disabled={isChecked || Object.keys(userAnswers).length === 0}
                    className="px-5 py-3 sm:py-4 rounded-xl border border-[var(--border)] font-bold text-xs sm:text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Clear
                  </button>
                  
                  {!isChecked ? (
                    <button
                      onClick={checkAnswer}
                      disabled={!allFilled}
                      className="px-6 py-3 sm:py-4 rounded-xl bg-[var(--accent-green)] text-black font-bold text-xs sm:text-sm hover:bg-[var(--accent-green-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[rgba(3,239,98,0.15)]"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 sm:py-4 rounded-xl bg-[var(--accent-green)] text-black font-bold text-xs sm:text-sm hover:bg-[var(--accent-green-bright)] flex items-center justify-center gap-2 transition-all"
                    >
                      {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish Exercise'}
                      <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  )}
                </div>

                {isChecked && (
                  <p className="text-xs text-[var(--text-muted)] text-center">
                    {Object.keys(userAnswers).every(k => userAnswers[k] === currentEx?.answers?.[k])
                      ? 'Correct!'
                      : 'Incorrect'}
                  </p>
                )}
              </div>

            </div>
          </div>
        </main>
        <ExerciseBottomControls
          onEdit={() => setEditingQuestion(exercises[currentIndex])}
          onDelete={() => setConfirmDelete(exercises[currentIndex])}
          shortcutItems={
            choicesEnabled
              ? [
                  { label: 'Toggle Choices', keys: ['Ctrl+S'] },
                  { label: 'Select Word', keys: ['1', '-', '9'] },
                  { label: 'Delete Question', keys: ['Ctrl+D'] },
                  { label: 'Clear Answers', keys: ['Esc'] },
                  { label: 'Next Question', keys: ['Enter'] },
                ]
              : [
                  { label: 'Toggle Choices', keys: ['Ctrl+S'] },
                  { label: 'Submit Answer', keys: ['Ctrl+Shift+Enter'] },
                  { label: 'Delete Question', keys: ['Ctrl+D'] },
                  { label: 'Clear Input', keys: ['Esc'] },
                  { label: 'Next Question', keys: ['Enter'] },
                ]
          }
          dotColor="var(--accent-blue)"
          showShortcuts={showShortcuts}
          onToggleShortcuts={handleToggleShortcuts}
          rightContent={
            <button
              onClick={handleToggleChoices}
              className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity group"
            >
              <div className={`relative w-9 h-5 rounded-full transition-colors ${choicesEnabled ? 'bg-[var(--accent-blue)]' : 'bg-[var(--border)]'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${choicesEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                {choicesEnabled ? 'Choices' : 'Self-Type'}
              </span>
              <span className="text-xs font-bold text-[var(--accent-blue)]">{choicesLeft}/{maxChoicesAllowed}</span>
            </button>
          }
        />
        <AnswerFeedbackModal
          isOpen={showFeedbackModal}
          isCorrect={isChecked && Object.keys(userAnswers).every(k => userAnswers[k] === exercises[currentIndex]?.answers?.[k])}
          explanation={exercises[currentIndex]?.explanation || ''}
          onContinue={handleNext}
        >
          {isChecked && exercises[currentIndex]?.per_tile_feedback && (
            <div className="mt-4 space-y-1.5 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Tile Feedback
              </p>
              {Object.entries(userAnswers).map(([idx, word]) => (
                <div key={idx} className="flex gap-2 items-start text-xs">
                  <span className={`font-bold ${word === exercises[currentIndex].answers[idx] ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    {word}:
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {exercises[currentIndex].per_tile_feedback[word]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AnswerFeedbackModal>

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <ConfirmModal
            isOpen={!!confirmDelete}
            title={confirmDelete.quit ? 'Quit Exercise' : 'Delete Exercise'}
            message={confirmDelete.quit ? 'Are you sure you want to quit this exercise? Your progress will be saved.' : 'Are you sure you want to delete this exercise? It will not be shown again.'}
            confirmLabel={confirmDelete.quit ? 'Quit' : 'Delete'}
            confirmDanger={!confirmDelete.quit}
            onConfirm={() => {
              if (confirmDelete.quit) {
                navigate(`/courses/${courseSlug}?refresh=1`);
              } else {
                const id = confirmDelete.id;
                setConfirmDelete(null);
                handleDeleteQuestion(id);
              }
            }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}

        {/* QA Debug Panel */}
        {localStorage.getItem('devMode') === 'true' && (
          <div className="fixed bottom-4 left-4 z-50 rounded-xl border border-[var(--accent-yellow)] bg-black/90 p-4 text-xs font-mono text-[var(--accent-yellow)] shadow-2xl max-w-sm select-none">
            <div className="font-bold border-b border-[var(--accent-yellow)]/30 pb-1.5 mb-2 flex items-center justify-between">
              <span>🛠️ QA DEBUG PANEL</span>
              <span className="text-[10px] bg-[var(--accent-yellow)]/20 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="space-y-1">
              <div>Questions Attempted: {currentIndex + (isChecked ? 1 : 0)}</div>
              <div>Questions Correct: {correctExerciseCount}</div>
              <div>Questions Incorrect: {currentIndex - correctExerciseCount + (isChecked && !Object.keys(userAnswers).every(k => userAnswers[k] === currentEx?.answers?.[k]) ? 1 : 0)}</div>
              <div>Questions Remaining: {exercises.length - currentIndex - (isChecked ? 1 : 0)}</div>
              <div>Current Exercise Count: {exercises.length}</div>
              <div className="pt-1.5 border-t border-[var(--accent-yellow)]/10 text-[10px] text-zinc-500 overflow-x-auto max-w-xs whitespace-nowrap">
                IDs: {exercises.map(ex => ex.id).join(', ')} | Replay: {isReplaying ? "YES" : "NO"}
              </div>
            </div>
          </div>
        )}

        {editingQuestion && (
          <EditQuestionModal
            courseSlug={courseSlug}
            exerciseType="ftb"
            questionData={editingQuestion}
            onClose={() => setEditingQuestion(null)}
            onSave={(updatedQ) => {
              setExercises(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
              setEditingQuestion(null);
            }}
          />
        )}
      </div>
    );
  }

  if (step === 3) {
    const percentage = Math.round((correctExerciseCount / exercises.length) * 100);
    let message = "Don't give up — practice makes perfect.";
    if (percentage >= 90) message = "Outstanding! You've mastered the syntax! 🏆";
    else if (percentage >= 70) message = "Great work! Keep it up! 💪";
    else if (percentage >= 50) message = "Good effort. Code takes practice!";

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        {timerExpired && (
          <div style={{ background: 'color-mix(in srgb, var(--accent-blue) 10%, transparent)', borderLeft: '3px solid var(--accent-blue)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', maxWidth: '600px', margin: '0 auto 16px', textAlign: 'left' }}>
            <span className="text-sm text-[var(--text-primary)]">⏱ Time's up! Session ended early — your progress up to this point has been saved.</span>
          </div>
        )}
        <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full ${percentage >= 70 ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--accent-red)] text-white'}`}>
          {percentage >= 70 ? <Check size={64} strokeWidth={3} /> : <X size={64} strokeWidth={3} />}
        </div>
        
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">Session Complete!</h1>
        <p className="mt-4 text-lg text-[var(--text-muted)] max-w-md mx-auto">{message}</p>
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-[600px]">
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Correct</div>
            <div className="text-3xl font-extrabold">{correctExerciseCount} / {exercises.length}</div>
          </div>
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Accuracy</div>
            <div className="text-3xl font-extrabold">{percentage}%</div>
          </div>
          <div className="rounded-2xl bg-[var(--accent-green)] p-6 text-black flex flex-col justify-center items-center">
            <div className="text-xs uppercase tracking-wider opacity-75 mb-1 font-bold">XP Earned</div>
            <div className="text-3xl font-extrabold">+{xpEarned} XP</div>
          </div>
        </div>
        
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <button 
            onClick={startExercise}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-8 py-4 font-bold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <RotateCcw size={20} /> Try Again
          </button>
          <button 
            onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)}
            className="rounded-xl bg-[var(--accent-green)] px-8 py-4 font-bold text-black hover:bg-[var(--accent-green-bright)] transition-colors shadow-md shadow-[rgba(3,239,98,0.2)]"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return null;
}
