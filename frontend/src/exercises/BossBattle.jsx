import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Heart, 
  Zap, 
  RotateCcw, 
  Skull,
  Trophy,
  Flame,
  Lightbulb
} from 'lucide-react';
import CodeBlock from '../components/CodeBlock';

export default function BossBattle() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  
  // Battle state
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0); // number of correct answers
  const [survivedCount, setSurvivedCount] = useState(0); // number of questions completed
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong' | null
  const [hintsShown, setHintsShown] = useState(0);
  const [gameOverReason, setGameOverReason] = useState(null); // 'lives' | 'complete'
  
  // Track wave performance (questions completed/survived per wave)
  const [waveSurvival, setWaveSurvival] = useState({ 1: 0, 2: 0, 3: 0 });
  
  const timerRef = useRef(null);
  const advanceTimeoutRef = useRef(null);

  useEffect(() => {
    fetchCourseAndBattle();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, [courseSlug]);

  useEffect(() => {
    if (step !== 2) return;

    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      const keys = ['a', 'b', 'c', 'd'];

      // 1, 2, 3, 4 keys -> select option
      if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        const optionKey = keys[idx];
        if (currentQuestion[`option_${optionKey}`]) {
          handleOptionClick(optionKey);
        }
      }

      // Escape -> clear selected option if not answered
      if (e.key === 'Escape') {
        if (!isAnswered) {
          setSelectedOption(null);
        }
      }

      // Enter -> immediately advance next if already answered
      if (e.key === 'Enter') {
        if (isAnswered) {
          advanceNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step, currentIndex, questions, isAnswered, lives]);

  const fetchCourseAndBattle = async () => {
    try {
      setLoading(true);
      const [courseRes, battleRes, attemptsRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/exercises/${courseSlug}/bossbattle`),
        fetch(`/api/progress/attempted-questions/${courseSlug}/bossbattle`)
      ]);
      
      if (!courseRes.ok || !battleRes.ok || !attemptsRes.ok) {
        throw new Error("Failed to fetch boss battle data");
      }
      
      const courseData = await courseRes.json();
      const allQuestions = await battleRes.json();
      const attemptedIds = await attemptsRes.json();
      
      setCourse(courseData);

      // Filter out attempted questions
      let unattempted = allQuestions.filter(q => !attemptedIds.includes(String(q.id)));
      let selected = [];
      let replayMode = false;

      if (unattempted.length > 0) {
        // Shuffle unattempted questions so player gets new order
        unattempted.sort(() => Math.random() - 0.5);
        selected = unattempted;
      } else {
        // Replay all
        replayMode = true;
        const shuffledAll = [...allQuestions].sort(() => Math.random() - 0.5);
        selected = shuffledAll;
      }
      
      setQuestions(selected);
      setIsReplaying(replayMode);
    } catch (err) {
      console.error('Error fetching boss battle data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = () => {
    setStep(2);
    setLives(5);
    setScore(0);
    setSurvivedCount(0);
    setCurrentIndex(0);
    setWaveSurvival({ 1: 0, 2: 0, 3: 0 });
    resetQuestionState();
    startTimer();
  };

  const startTimer = () => {
    setTimeLeft(15);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeOut = async () => {
    setIsAnswered(true);
    setFlash('wrong');
    setSelectedOption(null);
    
    setSurvivedCount(prev => prev + 1);
    updateWaveSurvival(currentIndex);

    const currentQuestion = questions[currentIndex];
    // Post attempt for individual question on timeout
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'bossbattle',
          course_id: course.id,
          question_id: currentQuestion?.id,
          concept_id: currentQuestion?.concept_id,
          score: 0.0,
          time_taken_secs: 15,
          was_correct: 0
        })
      });
    } catch (err) {
      console.error("Error saving battle question attempt:", err);
    }

    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        advanceTimeoutRef.current = setTimeout(() => finishBattle('lives'), 1000);
      } else {
        advanceTimeoutRef.current = setTimeout(() => {
          advanceNext();
        }, 1200);
      }
      return nextLives;
    });
  };

  const resetQuestionState = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setFlash(null);
    setHintsShown(0);
    setTimeLeft(15);
  };

  const updateWaveSurvival = (index) => {
    const wave = Math.floor(index / 20) + 1;
    setWaveSurvival(prev => ({
      ...prev,
      [wave]: Math.min(prev[wave] + 1, 20)
    }));
  };

  const handleOptionClick = async (optionKey) => {
    if (isAnswered) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    setSelectedOption(optionKey);
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = optionKey === currentQuestion?.correct_option;
    const timeTaken = 15 - timeLeft;
    
    setSurvivedCount(prev => prev + 1);
    updateWaveSurvival(currentIndex);

    // Post attempt for individual question
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'bossbattle',
          course_id: course.id,
          question_id: currentQuestion.id,
          concept_id: currentQuestion.concept_id,
          score: isCorrect ? 1.0 : 0.0,
          time_taken_secs: timeTaken,
          was_correct: isCorrect ? 1 : 0
        })
      });
    } catch (err) {
      console.error("Error saving battle question attempt:", err);
    }

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFlash('correct');
      advanceTimeoutRef.current = setTimeout(() => {
        advanceNext();
      }, 800);
    } else {
      setFlash('wrong');
      setLives(prev => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          advanceTimeoutRef.current = setTimeout(() => finishBattle('lives'), 1000);
        } else {
          advanceTimeoutRef.current = setTimeout(() => {
            advanceNext();
          }, 1200);
        }
        return nextLives;
      });
    }
  };

  const handleHintClick = () => {
    const wave = Math.floor(currentIndex / 20) + 1;
    if (isAnswered || wave === 3) return;
    
    const currentQuestion = questions[currentIndex];
    if (currentQuestion?.hints && hintsShown < currentQuestion.hints.length) {
      setHintsShown(prev => prev + 1);
      setTimeLeft(prev => {
        const nextTime = prev - 3;
        if (nextTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return nextTime;
      });
    }
  };

  const advanceNext = () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (lives <= 0) return;
    
    const nextIdx = currentIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentIndex(nextIdx);
      resetQuestionState();
      startTimer();
    } else {
      finishBattle('complete');
    }
  };

  const finishBattle = async (reason) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameOverReason(reason);
    setStep(3);
    
    const finalXp = survivedCount * 5;
    
    try {
      // Update XP
      const statsRes = await fetch('/api/progress/stats');
      if (statsRes.ok) {
        const stats = await statsRes.json();
        await fetch('/api/progress/stats', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total_xp: (stats.total_xp || 0) + finalXp
          })
        });
      }
    } catch (err) {
      console.error('Error saving boss battle progress:', err);
    }
  };

  const renderContentWithCode = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const firstLine = lines[0];
        const lang = firstLine.replace('```', '').trim() || 'python';
        const code = lines.slice(1, lines.length - 1).join('\n');
        return (
          <div key={idx} className="my-4 text-left rounded-xl border border-[var(--border)] overflow-hidden">
            <CodeBlock code={code} language={lang} />
          </div>
        );
      }
      return (
        <span key={idx} className="whitespace-pre-wrap leading-relaxed">
          {part.split(/(`[^`]+`)/g).map((subpart, subidx) => {
            if (subpart.startsWith('`')) {
              return <code key={subidx} className="inline-code">{subpart.slice(1, -1)}</code>;
            }
            return subpart;
          })}
        </span>
      );
    });
  };

  const currentWave = Math.floor(currentIndex / 20) + 1;

  let waveBgStyle = "bg-[#111219]"; // default wave 1
  if (currentWave === 2) {
    waveBgStyle = "bg-[#1a0f12]";
  } else if (currentWave === 3) {
    waveBgStyle = "bg-[#1f140f]";
  }

  let flashOverlay = "";
  if (flash === 'correct') {
    flashOverlay = "after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(3,239,98,0.2)] after:pointer-events-none after:transition-all after:z-50";
  } else if (flash === 'wrong') {
    flashOverlay = "after:absolute after:inset-0 after:shadow-[inset_0_0_40px_rgba(255,77,77,0.35)] after:pointer-events-none after:transition-all after:z-50";
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-exercise)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-red)] border-t-transparent"></div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black p-6 text-center overflow-y-auto">
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900 rounded-full blur-[140px] animate-pulse"></div>
        </div>
        
        <div className="relative z-10 max-w-lg flex flex-col items-center justify-center">
          <div className="w-[300px] mb-8 bg-zinc-900 h-2.5 rounded-full border border-red-950 overflow-hidden p-0.5">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 w-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          </div>

          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-red-950/40 text-[var(--accent-red)] border border-red-900/60 shadow-[0_0_40px_rgba(255,77,77,0.25)]">
            <Flame size={64} className="animate-pulse" />
          </div>
          <h2 className="text-lg text-red-500 font-bold uppercase tracking-widest">{course?.name}</h2>
          <h1 className="mt-2 text-5xl font-black text-white italic tracking-tighter uppercase">Boss Battle 🔥</h1>
          
          <div className="mt-10 flex flex-wrap gap-6 justify-center">
             <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-white">5</div>
                <div className="text-xxs uppercase tracking-wider text-red-400 font-bold">Lives</div>
             </div>
             <div className="w-px h-10 bg-red-950"></div>
             <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-white">15s</div>
                <div className="text-xxs uppercase tracking-wider text-red-400 font-bold">Timer</div>
             </div>
             <div className="w-px h-10 bg-red-950"></div>
             <div className="flex flex-col items-center">
                <div className="text-3xl font-extrabold text-white">5 XP</div>
                <div className="text-xxs uppercase tracking-wider text-red-400 font-bold">Per Survived</div>
             </div>
          </div>
          
          <button 
            onClick={startBattle}
            className="mt-14 min-w-[240px] rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 py-5 text-xl font-black text-white shadow-[0_0_35px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 hover:brightness-110 uppercase"
          >
            {isReplaying ? 'REPLAY BATTLE' : 'ENTER BATTLE'}
          </button>
          
          <Link to={`/courses/${courseSlug}?refresh=1`} className="mt-8 text-zinc-600 hover:text-red-500 flex items-center justify-center gap-1.5 font-bold uppercase text-xs tracking-wider transition-colors">
            <ChevronLeft size={16} />
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const currentQuestion = questions[currentIndex];

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-exercise)] text-[var(--text-primary)] overflow-hidden">
        {/* Progress Bar & Stats */}
        <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20">
          <span>Boss Battle Progress</span>
          <span>Wave {currentWave} • Question {currentIndex + 1} / {questions.length} ({Math.round(((currentIndex + 1) / questions.length) * 100)}%)</span>
        </div>
        <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
          <div 
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Boss Health Bar */}
        <div className="w-full h-1.5 bg-[var(--bg-card)] shrink-0 border-b border-[var(--border)]/10">
          <div 
            className="h-full bg-gradient-to-r from-[var(--accent-red)] to-orange-500 transition-all duration-500 shadow-[0_0_8px_rgba(255,77,77,0.3)]"
            style={{ width: `${((questions.length - score) / (questions.length || 1)) * 100}%` }}
          />
        </div>

        {/* Timer Bar */}
        <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
          <div 
            className="h-full bg-[var(--accent-red)] transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)] shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)} 
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold border-r border-[var(--border)] pr-4"
            >
              <ChevronLeft size={16} /> Quit
            </button>
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={20} 
                  className={`transition-all duration-300 ${i < lives ? 'text-[var(--accent-red)] fill-[var(--accent-red)]' : 'text-[var(--text-muted)] opacity-30 scale-90'}`}
                />
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Boss Battle • {course?.name}</span>
            <div className="font-bold text-sm">Wave {currentWave} • Question {currentIndex + 1} of {questions.length}</div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleHintClick}
              disabled={isAnswered || currentWave === 3 || hintsShown >= (currentQuestion?.hints?.length || 0)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-all ${
                isAnswered || currentWave === 3 || hintsShown >= (currentQuestion?.hints?.length || 0)
                  ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]' 
                  : 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] hover:bg-[rgba(251,191,36,0.1)]'
              }`}
            >
              <Lightbulb size={12} /> Hint
            </button>
            <div className="flex items-center gap-1 text-orange-500 font-extrabold text-sm italic">
              <Zap size={16} className="fill-orange-500 animate-pulse" />
              <span>{score} pts</span>
            </div>
          </div>
        </header>

        {/* Main Content (Fullscreen Two Column Layout) */}
        <main className="flex-1 overflow-y-auto px-8 py-8 flex items-start justify-center pt-16">
          <div className="w-full max-w-[1280px]">
            <div className="exercise-layout">
              
              {/* LEFT COLUMN: Question with larger code blocks */}
              <div className="flex flex-col gap-4 text-left">
                <h2 className="text-2xl font-black leading-snug text-[var(--text-primary)]">
                  {renderContentWithCode(currentQuestion?.question_text)}
                </h2>
                
                {/* Secondary fallback code rendering if present in DB schema */}
                {currentQuestion?.code && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-2xl">
                    <CodeBlock code={currentQuestion.code} language="python" />
                  </div>
                )}

                {hintsShown > 0 && currentQuestion?.hints && (
                  <div className="rounded-xl border border-[var(--accent-yellow)] bg-[rgba(251,191,36,0.05)] p-4 text-[var(--accent-yellow)] animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2.5 items-start">
                      <Lightbulb size={18} className="shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs font-semibold">
                        <p>{currentQuestion.hints[0]}</p>
                        {hintsShown > 1 && currentQuestion.hints[1] && <p>{currentQuestion.hints[1]}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Options */}
              <div className="grid grid-cols-1 gap-3">
                {['a', 'b', 'c', 'd'].map((key, idx) => {
                  const text = currentQuestion?.[`option_${key}`];
                  if (!text) return null;
                  
                  const isCorrect = key === currentQuestion?.correct_option;
                  const isSelected = selectedOption === key;
                  
                  let buttonStyle = "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--accent-red)] hover:bg-[var(--card-hover)]";
                  
                  if (isAnswered) {
                    if (isCorrect) {
                      buttonStyle = "bg-[var(--accent-green)] border-[var(--accent-green)] text-black font-extrabold shadow-[0_0_15px_rgba(3,239,98,0.25)]";
                    } else if (isSelected) {
                      buttonStyle = "bg-[var(--accent-red)] border-[var(--accent-red)] text-white font-extrabold shadow-[0_0_15px_rgba(255,77,77,0.25)]";
                    } else {
                      buttonStyle = "border-transparent opacity-20";
                    }
                    
                    if (!isSelected && isCorrect && selectedOption !== null) {
                      buttonStyle = "border-2 border-[var(--accent-green)] bg-[var(--bg-card)] text-[var(--accent-green)]";
                    }
                  }

                  return (
                    <button
                      key={key}
                      disabled={isAnswered}
                      onClick={() => handleOptionClick(key)}
                      className={`flex items-center justify-between rounded-xl border-2 p-5 min-h-[72px] w-full text-left font-bold text-base transition-all duration-155 group ${buttonStyle}`}
                    >
                      <span>{text}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!isAnswered && (
                          <kbd className="inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-sm select-none transition-colors group-hover:border-[var(--accent-red)] group-hover:text-[var(--accent-red)]">
                            {idx + 1}
                          </kbd>
                        )}
                        {isAnswered && isCorrect && <Check size={20} className="shrink-0" />}
                        {isAnswered && isSelected && !isCorrect && <X size={20} className="shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </main>

        {/* Keyboard Shortcuts Helper */}
        <div className={`fixed ${localStorage.getItem('devMode') === 'true' ? 'bottom-[200px]' : 'bottom-6'} left-6 z-40 hidden md:flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md p-4 text-xs shadow-lg w-[220px] text-left select-none animate-in fade-in slide-in-from-bottom-2`}>
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] border-b border-[var(--border)]/50 pb-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-red)] animate-pulse"></span>
            <span>Keyboard Shortcuts</span>
          </div>
          <div className="space-y-2 font-medium text-[var(--text-muted)]">
            <div className="flex justify-between items-center">
              <span>Select Option</span>
              <span className="flex gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded font-mono text-[10px]">1</kbd>
                <span>-</span>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded font-mono text-[10px]">4</kbd>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Clear Choice</span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded font-mono text-[10px]">Esc</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Next Question</span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded font-mono text-[10px]">Enter</kbd>
            </div>
          </div>
        </div>

        {/* QA Debug Panel */}
        {localStorage.getItem('devMode') === 'true' && (
          <div className="fixed bottom-4 left-4 z-50 rounded-xl border border-[var(--accent-yellow)] bg-black/90 p-4 text-xs font-mono text-[var(--accent-yellow)] shadow-2xl max-w-sm select-none">
            <div className="font-bold border-b border-[var(--accent-yellow)]/30 pb-1.5 mb-2 flex items-center justify-between">
              <span>🛠️ QA DEBUG PANEL</span>
              <span className="text-[10px] bg-[var(--accent-yellow)]/20 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="space-y-1">
              <div>Questions Attempted: {survivedCount}</div>
              <div>Questions Correct: {score}</div>
              <div>Questions Incorrect: {survivedCount - score}</div>
              <div>Questions Remaining: {questions.length - currentIndex}</div>
              <div>Current Exercise Count: {questions.length}</div>
              <div className="pt-1.5 border-t border-[var(--accent-yellow)]/10 text-[10px] text-zinc-500 overflow-x-auto max-w-xs whitespace-nowrap">
                IDs: {questions.map(q => q.id).join(', ')} | Lives: {lives}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 3) {
    const isVictory = gameOverReason === 'complete' && lives > 0;
    const finalXp = survivedCount * 5;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] ${
            isVictory ? 'bg-yellow-950/20' : 'bg-red-950/20'
          } rounded-full blur-[140px]`}></div>
        </div>

        <div className="relative z-10 max-w-xl w-full flex flex-col items-center justify-center">
          <div className={`mb-6 flex h-28 w-28 items-center justify-center rounded-full ${
            isVictory ? 'bg-[var(--accent-yellow)] text-black shadow-[0_0_40px_rgba(251,191,36,0.25)]' : 'bg-[var(--accent-red)] text-white shadow-[0_0_40px_rgba(255,77,77,0.25)]'
          }`}>
            {isVictory ? <Trophy size={64} strokeWidth={2.5} /> : <Skull size={64} strokeWidth={2.5} />}
          </div>
          
          <h1 className="text-4xl font-black text-[var(--text-primary)] italic tracking-tight">
            {isVictory ? 'UNDEFEATED! 🏆' : 'GAME OVER!'}
          </h1>
          <p className="mt-2 text-lg text-[var(--accent-red)] font-bold uppercase tracking-widest">
            {isVictory ? 'You completely conquered the Boss!' : 'The Boss overpowered you...'}
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[440px]">
            <div className="rounded-xl bg-[var(--bg-card)] p-5 border border-[var(--border)] text-center">
              <div className="text-xxs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">Survived</div>
              <div className="text-2xl font-black text-[var(--text-primary)]">{survivedCount} / {questions.length}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-card)] p-5 border border-[var(--border)] text-center">
              <div className="text-xxs uppercase tracking-wider text-[var(--accent-red)] font-bold mb-1">XP Earned</div>
              <div className="text-2xl font-black text-[var(--accent-green-bright)]">+{finalXp} XP</div>
            </div>
          </div>
          
          {/* Wave breakdown card */}
          <div className="mt-5 w-full max-w-[440px] rounded-xl bg-[var(--bg-card)] p-5 border border-[var(--border)] text-left">
            <h4 className="text-xxs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3">Wave Breakdown</h4>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Wave 1 (Python Basics)</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{waveSurvival[1]} / 20</span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-red)]" style={{ width: `${(waveSurvival[1] / 20) * 100}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Wave 2 (Data Control)</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{waveSurvival[2]} / 20</span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${(waveSurvival[2] / 20) * 100}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[var(--text-muted)]">Wave 3 (Advanced/Volcanic)</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{waveSurvival[3]} / 20</span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent-yellow)]" style={{ width: `${(waveSurvival[3] / 20) * 100}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-10 flex flex-wrap justify-center gap-4 w-full max-w-[440px]">
            <button 
              onClick={startBattle}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] py-4 font-bold text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              <RotateCcw size={18} /> Try Again
            </button>
            <button 
              onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)}
              className="flex-1 rounded-xl bg-[var(--accent-green)] py-4 font-bold text-sm text-black hover:bg-[var(--accent-green-bright)] transition-colors shadow-md"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
