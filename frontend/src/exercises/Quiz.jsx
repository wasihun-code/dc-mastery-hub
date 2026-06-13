import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Lightbulb, 
  Check, 
  X, 
  ArrowRight, 
  RotateCcw, 
  HelpCircle,
  Zap
} from 'lucide-react';
import CodeBlock from '../components/CodeBlock';

export default function Quiz() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  
  // Exercise state
  const [selectedOption, setSelectedOption] = useState(null);
  const [wrongSelectedOptions, setWrongSelectedOptions] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const [allowMultipleTries, setAllowMultipleTries] = useState(() => {
    return localStorage.getItem('allowMultipleTries') === 'true';
  });

  const handleToggleMultipleTries = () => {
    setAllowMultipleTries(prev => {
      const nextVal = !prev;
      localStorage.setItem('allowMultipleTries', String(nextVal));
      return nextVal;
    });
  };

  useEffect(() => {
    fetchCourseAndQuestions();
  }, [courseSlug]);

  useEffect(() => {
    if (step !== 2) return;

    const handleKeyDown = (e) => {
      // Ignore key events if focused on input elements
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;

      const options = [
        { key: 'a', text: currentQuestion.option_a },
        { key: 'b', text: currentQuestion.option_b },
        { key: 'c', text: currentQuestion.option_c },
        { key: 'd', text: currentQuestion.option_d },
      ].filter(o => o.text !== undefined && o.text !== null);

      // 1, 2, 3, 4 keys -> select option
      if (!isLocked && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < options.length) {
          const opt = options[idx];
          if (!wrongSelectedOptions.includes(opt.key)) {
            handleOptionClick(opt.key);
          }
        }
      }

      // Escape -> clear selections if not locked
      if (e.key === 'Escape') {
        if (!isLocked) {
          setSelectedOption(null);
          setWrongSelectedOptions([]);
          setWrongAttempts(0);
        }
      }

      // Enter -> next question (if answered/locked and explanation is shown)
      if (e.key === 'Enter') {
        if (showExplanation) {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step, currentIndex, questions, isLocked, wrongSelectedOptions, showExplanation]);

  const fetchCourseAndQuestions = async () => {
    try {
      setLoading(true);
      const [courseRes, questionsRes, attemptsRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/exercises/${courseSlug}/mcq`),
        fetch(`/api/progress/attempted-questions/${courseSlug}/quiz`)
      ]);
      
      if (!courseRes.ok || !questionsRes.ok || !attemptsRes.ok) {
        throw new Error("Failed to fetch data");
      }
      
      const courseData = await courseRes.json();
      if (courseData && courseData.reviewed !== 'Yes') {
        navigate('/courses');
        return;
      }
      const allQuestions = await questionsRes.json();
      const attemptedIds = await attemptsRes.json();
      
      setCourse(courseData);

      // Normalize attemptedIds to string
      const attemptedStrIds = attemptedIds.map(id => String(id));

      const unattempted = allQuestions.filter(q => !attemptedStrIds.includes(String(q.id)));
      const attempted = allQuestions.filter(q => attemptedStrIds.includes(String(q.id)));

      // Shuffle both lists independently for randomness
      unattempted.sort(() => Math.random() - 0.5);
      attempted.sort(() => Math.random() - 0.5);

      let selected = [];
      let replayMode = false;

      if (unattempted.length >= 10) {
        selected = unattempted.slice(0, 10);
      } else if (unattempted.length > 0) {
        const needed = 10 - unattempted.length;
        selected = [...unattempted, ...attempted.slice(0, needed)];
      } else {
        replayMode = true;
        selected = attempted.slice(0, 10);
      }
      
      setQuestions(selected);
      setIsReplaying(replayMode);
    } catch (err) {
      console.error('Error fetching quiz data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExercise = () => {
    setStep(2);
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setWrongSelectedOptions([]);
    setIsLocked(false);
    setHintsShown(0);
    setWrongAttempts(0);
    setShowExplanation(false);
  };

  const handleOptionClick = async (optionKey) => {
    if (isLocked) return;
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = optionKey === currentQuestion.correct_option;
    
    setSelectedOption(optionKey);
    let shouldPost = false;
    let finalCorrect = false;
    
    if (isCorrect) {
      setIsLocked(true);
      shouldPost = true;
      finalCorrect = wrongSelectedOptions.length === 0;
      if (wrongSelectedOptions.length === 0) {
        setFirstAttemptCorrectCount(prev => prev + 1);
      }
      setTimeout(() => setShowExplanation(true), 1000);
    } else {
      setWrongSelectedOptions(prev => [...prev, optionKey]);
      const nextWrongAttempts = wrongAttempts + 1;
      setWrongAttempts(nextWrongAttempts);
      
      if (!allowMultipleTries || nextWrongAttempts >= 3) {
        setIsLocked(true);
        shouldPost = true;
        finalCorrect = false;
        setTimeout(() => setShowExplanation(true), 1000);
      }
    }

    if (shouldPost) {
      try {
        await fetch('/api/progress/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_type: 'quiz',
            course_id: course.id,
            question_id: currentQuestion.id,
            concept_id: currentQuestion.concept_id,
            score: finalCorrect ? 1.0 : 0.0,
            was_correct: finalCorrect ? 1 : 0
          })
        });
      } catch (err) {
        console.error("Error saving question attempt:", err);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetQuestionState();
    } else {
      finishExercise();
    }
  };

  const finishExercise = async () => {
    setStep(3);
    const earnedXp = 30;
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

  const restart = () => {
    setCurrentIndex(0);
    setFirstAttemptCorrectCount(0);
    fetchCourseAndQuestions();
    setStep(1);
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
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--accent-green)] border border-[var(--border)]">
          <HelpCircle size={48} />
        </div>
        <h2 className="text-xl text-[var(--text-muted)] font-medium uppercase tracking-wider">{course?.name}</h2>
        <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Multiple Choice Quiz</h1>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            {questions.length} Questions
          </div>
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            ~{Math.round(questions.length * 0.5)} min
          </div>
          <div className="rounded-full bg-[rgba(3,239,98,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-green-bright)] border border-[rgba(3,239,98,0.3)] flex items-center gap-1.5">
            <Zap size={16} /> Earn 30 XP
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
    const currentQuestion = questions[currentIndex];

    const options = [
      { key: 'a', text: currentQuestion?.option_a },
      { key: 'b', text: currentQuestion?.option_b },
      { key: 'c', text: currentQuestion?.option_c },
      { key: 'd', text: currentQuestion?.option_d },
    ].filter(o => o.text !== undefined && o.text !== null);

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-exercise)] text-[var(--text-primary)] overflow-hidden">
        {/* Progress Bar & Stats */}
        <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20">
          <span>MCQ Progress</span>
          <span>{currentIndex + 1} / {questions.length} ({Math.round(((currentIndex + 1) / questions.length) * 100)}%)</span>
        </div>
        <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
          <div 
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
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
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Quiz • {course?.name}</span>
            <div className="font-bold text-sm">Question {currentIndex + 1} of {questions.length}</div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (hintsShown < 2 && currentQuestion?.hints) {
                  setHintsShown(prev => prev + 1);
                }
              }}
              disabled={isLocked || hintsShown >= (currentQuestion?.hints?.length || 0)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all ${
                isLocked || hintsShown >= (currentQuestion?.hints?.length || 0)
                  ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]' 
                  : 'border-[var(--accent-yellow)] text-[var(--accent-yellow)] hover:bg-[rgba(251,191,36,0.1)]'
              }`}
            >
              <Lightbulb size={14} /> Hint
            </button>
          </div>
        </header>

        {/* Main Content (Fullscreen Two Column Layout) */}
        <main className="flex-1 overflow-y-auto px-8 py-8 flex items-start justify-center pt-16">
          <div className="w-full max-w-[1280px]">
            <div className="exercise-layout">
              
              {/* LEFT COLUMN: Question text, inline/block code, and hints */}
              <div className="flex flex-col gap-4 text-left">
                <h2 className="text-2xl font-bold leading-snug">
                  {renderContentWithCode(currentQuestion?.question_text)}
                </h2>
                
                {/* Secondary fallback code rendering if present in DB schema */}
                {currentQuestion?.code && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <CodeBlock code={currentQuestion.code} language="python" />
                  </div>
                )}

                {hintsShown > 0 && currentQuestion?.hints && (
                  <div className="rounded-xl border border-[var(--accent-yellow)] bg-[rgba(251,191,36,0.05)] p-4 text-[var(--accent-yellow)] animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2.5 items-start">
                      <Lightbulb size={18} className="shrink-0 mt-0.5" />
                      <div className="space-y-1.5 text-sm font-medium">
                        <p>{currentQuestion.hints[0]}</p>
                        {hintsShown > 1 && currentQuestion.hints[1] && <p>{currentQuestion.hints[1]}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: MCQ options, Option Feedback, Explanation, and Next Button */}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3">
                  {options.map((option, idx) => {
                    const isSelected = selectedOption === option.key;
                    const isWrongSelected = wrongSelectedOptions.includes(option.key);
                    const isCorrect = option.key === currentQuestion?.correct_option;
                    
                    let buttonStyle = "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent-green)] hover:bg-[var(--card-hover)]";
                    
                    if (isLocked) {
                      if (isCorrect) {
                        buttonStyle = "bg-[var(--accent-green)] border-[var(--accent-green)] text-black font-semibold";
                      } else if (isWrongSelected) {
                        buttonStyle = "bg-[var(--accent-red)] border-[var(--accent-red)] text-white font-semibold";
                      } else {
                        buttonStyle = "border-[var(--border)] opacity-40";
                      }
                    } else if (isWrongSelected) {
                      buttonStyle = "bg-[var(--accent-red)] border-[var(--accent-red)] text-white cursor-not-allowed";
                    }

                    if (isLocked && isCorrect && selectedOption !== currentQuestion?.correct_option) {
                      buttonStyle = "border-2 border-[var(--accent-green)] bg-[var(--bg-card)] text-[var(--accent-green)]";
                    }

                    return (
                      <button
                        key={option.key}
                        disabled={isLocked || isWrongSelected}
                        onClick={() => handleOptionClick(option.key)}
                        className={`flex items-center justify-between rounded-xl border-2 p-5 min-h-[72px] w-full text-left transition-all duration-150 font-medium group ${buttonStyle}`}
                      >
                        <span className="text-lg">{option.text}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {!isLocked && !isWrongSelected && (
                            <kbd className="inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-primary)] border border-[var(--border)] rounded shadow-sm select-none transition-colors group-hover:border-[var(--accent-green)] group-hover:text-[var(--accent-green)]">
                              {idx + 1}
                            </kbd>
                          )}
                          {isLocked && isCorrect && <Check size={20} className="shrink-0" />}
                          {isWrongSelected && <X size={20} className="shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedOption && (
                  <div className="transition-all duration-300">
                    {showExplanation && (
                      <div className={`rounded-xl border p-5 mb-4 animate-in slide-in-from-bottom-3 duration-300 ${
                        selectedOption === currentQuestion?.correct_option 
                          ? 'border-[var(--accent-green)] bg-[rgba(3,239,98,0.03)]' 
                          : 'border-[var(--accent-red)] bg-[rgba(255,77,77,0.03)]'
                      }`}>
                        <h4 className="font-bold mb-1.5 text-xs uppercase tracking-wider">
                          {selectedOption === currentQuestion?.correct_option ? 'Correct Option Feedback' : 'Option Feedback'}
                        </h4>
                        <p className="text-[var(--text-muted)] text-xs mb-2.5">
                          {currentQuestion?.per_option_feedback?.[selectedOption]}
                        </p>
                        <hr className="border-[var(--border)] my-2.5" />
                        <h4 className="font-bold mb-1.5 text-xs uppercase tracking-wider text-[var(--text-primary)]">Explanation</h4>
                        <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                          {currentQuestion?.explanation}
                        </p>
                      </div>
                    )}
                    
                    {showExplanation && (
                      <button
                        onClick={handleNext}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-green)] py-4 text-base font-bold text-black hover:bg-[var(--accent-green-bright)] transition-colors"
                      >
                        {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>

        {/* Left Sidebar Controls Container */}
        <div className={`fixed ${localStorage.getItem('devMode') === 'true' ? 'bottom-[200px]' : 'bottom-6'} left-6 z-40 hidden md:flex flex-col gap-3 w-[220px] select-none text-left`}>
          {/* Multiple Tries Toggle Panel */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/85 backdrop-blur-md p-4 text-xs shadow-lg flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)]">Multiple Tries</span>
              <button
                type="button"
                onClick={handleToggleMultipleTries}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                  allowMultipleTries ? 'bg-[var(--accent-green)]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-255 ease-in-out ${
                    allowMultipleTries ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-medium">
              Enable to get up to 3 attempts to correct wrong answers before the question locks.
            </p>
          </div>

          {/* Keyboard Shortcuts Helper */}
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-md p-4 text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] border-b border-[var(--border)]/50 pb-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
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
        </div>

        {/* QA Debug Panel */}
        {localStorage.getItem('devMode') === 'true' && (
          <div className="fixed bottom-4 left-4 z-50 rounded-xl border border-[var(--accent-yellow)] bg-black/90 p-4 text-xs font-mono text-[var(--accent-yellow)] shadow-2xl max-w-sm select-none">
            <div className="font-bold border-b border-[var(--accent-yellow)]/30 pb-1.5 mb-2 flex items-center justify-between">
              <span>🛠️ QA DEBUG PANEL</span>
              <span className="text-[10px] bg-[var(--accent-yellow)]/20 px-1.5 py-0.5 rounded">Active</span>
            </div>
            <div className="space-y-1">
              <div>Questions Attempted: {currentIndex + (isLocked ? 1 : 0)}</div>
              <div>Questions Correct: {firstAttemptCorrectCount}</div>
              <div>Questions Incorrect: {wrongAttempts}</div>
              <div>Questions Remaining: {questions.length - currentIndex - (isLocked ? 1 : 0)}</div>
              <div>Current Exercise Count: {questions.length}</div>
              <div className="pt-1.5 border-t border-[var(--accent-yellow)]/10 text-[10px] text-zinc-500 overflow-x-auto max-w-xs whitespace-nowrap">
                IDs: {questions.map(q => q.id).join(', ')} | Replay: {isReplaying ? "YES" : "NO"}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 3) {
    const percentage = Math.round((firstAttemptCorrectCount / questions.length) * 100);
    let message = "Don't give up — practice makes perfect.";
    if (percentage >= 90) message = "Outstanding! You've mastered this! 🏆";
    else if (percentage >= 70) message = "Great work! Keep it up! 💪";
    else if (percentage >= 50) message = "Good effort. Review the concepts and retry.";

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
            <div className="text-3xl font-extrabold">{firstAttemptCorrectCount} / {questions.length}</div>
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
            onClick={restart}
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
