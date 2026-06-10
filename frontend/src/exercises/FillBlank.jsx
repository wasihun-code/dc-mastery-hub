import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Check, 
  X, 
  RotateCcw, 
  Code2,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function FillBlank() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  
  // Exercise state
  const [userAnswers, setUserAnswers] = useState({}); // { slotIndex: word }
  const [isChecked, setIsChecked] = useState(false);
  const [correctExerciseCount, setCorrectExerciseCount] = useState(0);
  const [activeSlot, setActiveSlot] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  
  // Store the shuffled word bank for the current question
  const [shuffledWordBank, setShuffledWordBank] = useState([]);

  useEffect(() => {
    fetchCourseAndExercises();
  }, [courseSlug]);

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
      const allExercises = await exercisesRes.json();
      const attemptedIds = await attemptsRes.json();
      
      setCourse(courseData);

      // Filter out attempted questions
      let unattempted = allExercises.filter(ex => !attemptedIds.includes(String(ex.id)));
      let selected = [];
      let replayMode = false;

      if (unattempted.length > 0) {
        // Shuffle unattempted questions and take up to 10
        unattempted.sort(() => Math.random() - 0.5);
        selected = unattempted.slice(0, 10);
      } else {
        // All questions completed! Replay mode.
        replayMode = true;
        const shuffledAll = [...allExercises].sort(() => Math.random() - 0.5);
        selected = shuffledAll.slice(0, 10);
      }
      
      setExercises(selected);
      setIsReplaying(replayMode);
    } catch (err) {
      console.error('Error fetching fill-blank data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExercise = () => {
    setStep(2);
    setCurrentIndex(0);
    setCorrectExerciseCount(0);
    resetState();
  };

  const resetState = () => {
    setUserAnswers({});
    setIsChecked(false);
    setActiveSlot(0);
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
          score: allCorrect ? 1.0 : 0.0,
          was_correct: allCorrect ? 1 : 0
        })
      });
    } catch (err) {
      console.error("Error saving question attempt:", err);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetState();
    } else {
      finishExercise();
    }
  };

  const finishExercise = async () => {
    setStep(3);
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
    const tokens = text.split(/(\bdef\b|\breturn\b|\bif\b|\belse\b|\bfor\b|\bin\b|\bimport\b|\bas\b|\bprint\b|\bnp\b|\bpd\b|"[^"]*"|'[^']*'|\b\d+\b|#.*)/g);
    return tokens.map((token, tokenIdx) => {
      if (['def', 'return', 'if', 'else', 'for', 'in', 'import', 'as'].includes(token)) {
        return <span key={tokenIdx} className="text-[#ff79c6] font-bold">{token}</span>;
      }
      if (['print', 'np', 'pd'].includes(token)) {
        return <span key={tokenIdx} className="text-[#50fa7b]">{token}</span>;
      }
      if (token.startsWith('"') || token.startsWith("'")) {
        return <span key={tokenIdx} className="text-[#f1fa8c]">{token}</span>;
      }
      if (token.startsWith('#')) {
        return <span key={tokenIdx} className="text-[#6272a4] italic">{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={tokenIdx} className="text-[#bd93f9]">{token}</span>;
      }
      return <span key={tokenIdx}>{token}</span>;
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
        
        <Link to={`/courses/${courseSlug}`} className="mt-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 text-sm font-medium">
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
          
          let slotClass = "inline-flex min-w-[90px] h-[32px] items-center justify-center px-3 mx-1.5 rounded-lg border-2 transition-all font-mono text-sm font-bold cursor-pointer select-none vertical-middle ";
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
            onClick={() => navigate(`/courses/${courseSlug}`)} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <ChevronLeft size={16} /> Quit
          </button>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Fill Blank • {course?.name}</span>
            <div className="font-bold text-sm">Exercise {currentIndex + 1} of {exercises.length}</div>
          </div>
          
          <div className="w-20"></div> {/* Spacer */}
        </header>

        {/* Main Content (Fullscreen Two Column Layout) */}
        <main className="flex-1 overflow-y-auto px-8 py-8 flex items-start justify-center pt-16">
          <div className="w-full max-w-[1280px]">
            <div className="exercise-layout">
              
              {/* LEFT COLUMN: Task Description & Code Block */}
              <div className="flex flex-col gap-3 text-left">
                <h2 className="text-xl font-bold max-w-[640px] leading-relaxed text-[var(--text-primary)]">
                  {currentEx?.description}
                </h2>
                
                <div className={isMultiLine 
                  ? "rounded-2xl border border-[var(--border)] bg-[#0d1117] p-6 font-mono text-base leading-relaxed mb-4 overflow-x-auto whitespace-pre" 
                  : "inline-flex items-center rounded-xl border border-[var(--border)] bg-[#0d1117] px-5 py-3 font-mono text-base mb-4 overflow-x-auto max-w-full whitespace-pre"
                }>
                  {renderCodeWithSlots()}
                </div>
              </div>

              {/* RIGHT COLUMN: Word Bank tiles, Clear/Submit Actions, and Feedback panel */}
              <div className="flex flex-col gap-4">
                {/* Word Bank */}
                <div className="flex flex-wrap gap-2.5 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] mb-2">
                  <h4 className="w-full text-xxs uppercase tracking-wider text-zinc-500 font-extrabold mb-1.5 text-left">Word Bank</h4>
                  {shuffledWordBank.map((word, i) => {
                    const isUsed = Object.values(userAnswers).includes(word);
                    return (
                      <button
                        key={i}
                        onClick={() => handleTileClick(word)}
                        disabled={isChecked || isUsed}
                        className={`px-4 py-2.5 rounded-lg border font-mono text-xs font-bold transition-all ${
                          isUsed 
                            ? 'bg-[var(--bg-primary)] border-[var(--border)] opacity-35 cursor-not-allowed text-[var(--text-muted)]' 
                            : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-blue)] hover:bg-[var(--card-hover)]'
                        }`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setUserAnswers({})}
                    disabled={isChecked || Object.keys(userAnswers).length === 0}
                    className="flex-1 py-4 rounded-xl border border-[var(--border)] font-bold text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Clear
                  </button>
                  
                  {!isChecked ? (
                    <button
                      onClick={checkAnswer}
                      disabled={!allFilled}
                      className="flex-[2] py-4 rounded-xl bg-[var(--accent-green)] text-black font-bold text-sm hover:bg-[var(--accent-green-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[rgba(3,239,98,0.15)]"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="flex-[2] py-4 rounded-xl bg-[var(--accent-green)] text-black font-bold text-sm hover:bg-[var(--accent-green-bright)] flex items-center justify-center gap-2 transition-all"
                    >
                      {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish Exercise'}
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>

                {/* Feedback & Explanations */}
                {isChecked && (
                  <div className="animate-in slide-in-from-bottom-3 duration-300">
                    <div className={`rounded-xl border p-5 ${
                      Object.keys(userAnswers).every(k => userAnswers[k] === currentEx?.answers?.[k]) 
                        ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.02)]' 
                        : 'border-[var(--accent-red)] bg-[rgba(255,77,77,0.02)]'
                    }`}>
                      <h4 className="font-bold mb-1.5 text-xs uppercase tracking-wider text-[var(--text-primary)]">Explanation</h4>
                      <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                        {currentEx?.explanation}
                      </p>
                      
                      {currentEx?.per_tile_feedback && (
                        <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-1.5">
                          <h5 className="text-xxs uppercase font-extrabold text-[var(--text-muted)] tracking-wider">Tile Feedback</h5>
                          {Object.entries(userAnswers).map(([idx, word]) => (
                            <div key={idx} className="text-xxs flex gap-2 items-start">
                              <span className={`font-bold ${word === currentEx.answers[idx] ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>{word}:</span>
                              <span className="text-[var(--text-muted)]">{currentEx.per_tile_feedback[word]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>

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
            onClick={() => navigate(`/courses/${courseSlug}`)}
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
