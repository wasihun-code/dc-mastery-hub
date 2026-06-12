import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Check, 
  RotateCcw, 
  Layers,
  Clock,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function MatchingGame() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [allRounds, setAllRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Round state
  const [terms, setTerms] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDef, setSelectedDef] = useState(null);
  const [matches, setMatches] = useState([]); // Array of matched pair IDs
  const [wrongMatch, setWrongMatch] = useState(null); // { termId, defId }
  const [roundCompleted, setRoundCompleted] = useState(false);
  
  // Stats
  const [totalTime, setTotalTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [roundTime, setRoundTime] = useState(0);

  const [savedProgress, setSavedProgress] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchCourseAndMatching();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [courseSlug]);

  useEffect(() => {
    if (allRounds.length > 0) {
      const saved = localStorage.getItem(`matching_progress_${courseSlug}`);
      if (saved) {
        try {
          const progress = JSON.parse(saved);
          if (progress && typeof progress.currentRoundIndex === 'number' && progress.currentRoundIndex < allRounds.length) {
            setSavedProgress(progress);
          }
        } catch (e) {
          console.error("Failed to parse matching progress", e);
        }
      }
    }
  }, [allRounds, courseSlug]);

  // Auto-save progress during exercise
  useEffect(() => {
    if (step === 2 && allRounds.length > 0) {
      const progress = {
        currentRoundIndex,
        totalTime,
        attempts,
        xpEarned,
        step: 2
      };
      localStorage.setItem(`matching_progress_${courseSlug}`, JSON.stringify(progress));
    }
  }, [step, currentRoundIndex, totalTime, attempts, xpEarned, courseSlug, allRounds]);

  const fetchCourseAndMatching = async () => {
    try {
      setLoading(true);
      const [courseRes, matchingRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/exercises/${courseSlug}/matching`)
      ]);
      
      if (!courseRes.ok || !matchingRes.ok) {
        throw new Error("Failed to fetch matching data");
      }
      
      const courseData = await courseRes.json();
      const matchingData = await matchingRes.json();
      
      setCourse(courseData);
      setAllRounds(matchingData.slice(0, 10)); // Max 10 rounds
    } catch (err) {
      console.error('Error fetching matching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExercise = () => {
    localStorage.removeItem(`matching_progress_${courseSlug}`);
    setSavedProgress(null);
    setStep(2);
    setTotalTime(0);
    setAttempts(0);
    setXpEarned(0);
    setCurrentRoundIndex(0);
    startRound(0);
  };

  const resumeExercise = () => {
    if (!savedProgress) return;
    setStep(2);
    setTotalTime(savedProgress.totalTime || 0);
    setAttempts(savedProgress.attempts || 0);
    setXpEarned(savedProgress.xpEarned || 0);
    setCurrentRoundIndex(savedProgress.currentRoundIndex);
    startRound(savedProgress.currentRoundIndex);
  };

  const startRound = (index) => {
    const roundData = allRounds[index];
    if (!roundData) return;

    setRoundCompleted(false);
    setRoundTime(0);
    
    // Shuffle terms and definitions independently
    const shuffledTerms = [...roundData.pairs]
      .map(p => ({ id: p.id, term: p.term }))
      .sort(() => Math.random() - 0.5);
      
    const shuffledDefs = [...roundData.pairs]
      .map(p => ({ id: p.id, definition: p.match }))
      .sort(() => Math.random() - 0.5);
    
    setTerms(shuffledTerms);
    setDefinitions(shuffledDefs);
    setMatches([]);
    setSelectedTerm(null);
    setSelectedDef(null);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTotalTime(prev => prev + 1);
      setRoundTime(prev => prev + 1);
    }, 1000);
  };

  const handleTermClick = (term) => {
    if (matches.includes(term.id) || wrongMatch) return;
    
    if (selectedTerm?.id === term.id) {
      setSelectedTerm(null);
      return;
    }
    
    setSelectedTerm(term);
    if (selectedDef) {
      checkMatch(term, selectedDef);
    }
  };

  const handleDefClick = (def) => {
    if (matches.includes(def.id) || wrongMatch) return;
    
    if (selectedDef?.id === def.id) {
      setSelectedDef(null);
      return;
    }
    
    setSelectedDef(def);
    if (selectedTerm) {
      checkMatch(selectedTerm, def);
    }
  };

  const checkMatch = (term, def) => {
    setAttempts(prev => prev + 1);
    if (term.id === def.id) {
      // Correct Match
      const nextMatches = [...matches, term.id];
      setMatches(nextMatches);
      setSelectedTerm(null);
      setSelectedDef(null);
      
      if (nextMatches.length === 6) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRoundCompleted(true);
      }
    } else {
      // Wrong Match: trigger shake animation and reset selections
      setWrongMatch({ termId: term.id, defId: def.id });
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 500);
    }
  };

  const handleNextRound = () => {
    const roundXp = 15;
    const currentTotalXp = xpEarned + roundXp;
    setXpEarned(currentTotalXp);
    
    if (currentRoundIndex < allRounds.length - 1) {
      const nextIdx = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIdx);
      startRound(nextIdx);
    } else {
      finishExercise(currentTotalXp);
    }
  };

  const finishExercise = async (finalXp) => {
    setStep(3);
    localStorage.removeItem(`matching_progress_${courseSlug}`);
    setSavedProgress(null);
    
    try {
      const totalPairs = allRounds.reduce((acc, r) => acc + (r.pairs ? r.pairs.length : 0), 0);
      const isPerfect = attempts === totalPairs;
      const accuracyScore = totalPairs / Math.max(attempts, totalPairs);

      // Record attempt
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'matching',
          course_id: course.id,
          concept_id: null,
          score: accuracyScore,
          was_correct: isPerfect ? 1 : 0,
          time_taken_secs: totalTime
        })
      });

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
      console.error('Error saving matching progress:', err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
          <Layers size={48} />
        </div>
        <h2 className="text-xl text-[var(--text-muted)] font-medium uppercase tracking-wider">{course?.name}</h2>
        <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Matching Game</h1>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)] flex items-center gap-2">
            <Layers size={16} /> {allRounds.length} Rounds
          </div>
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={16} /> Time-based
          </div>
          <div className="rounded-full bg-[rgba(3,239,98,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-green-bright)] border border-[rgba(3,239,98,0.3)] flex items-center gap-1.5">
            <Zap size={16} /> 15 XP / Round
          </div>
        </div>
        
        {savedProgress ? (
          <div className="mt-12 flex flex-col items-center gap-4">
            <button 
              onClick={resumeExercise}
              className="min-w-[240px] rounded-xl bg-[var(--accent-green)] py-4 px-6 text-xl font-bold text-black shadow-lg shadow-[rgba(3,239,98,0.2)] transition-all duration-200 hover:bg-[var(--accent-green-bright)] hover:scale-105 active:scale-95 uppercase tracking-wide"
            >
              Resume Round {savedProgress.currentRoundIndex + 1}
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem(`matching_progress_${courseSlug}`);
                setSavedProgress(null);
                startExercise();
              }}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors animate-pulse"
            >
              Reset and Start from Round 1
            </button>
          </div>
        ) : (
          <button 
            onClick={startExercise}
            className="mt-12 min-w-[220px] rounded-xl bg-[var(--accent-green)] py-4 text-xl font-bold text-black shadow-lg shadow-[rgba(3,239,98,0.2)] transition-all duration-200 hover:bg-[var(--accent-green-bright)] hover:scale-105 active:scale-95"
          >
            START
          </button>
        )}
        
        <Link to={`/courses/${courseSlug}?refresh=1`} className="mt-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 text-sm font-medium">
          <ChevronLeft size={18} />
          Back to Course
        </Link>
      </div>
    );
  }

  if (step === 2) {
    const roundData = allRounds[currentRoundIndex];

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-exercise)] text-[var(--text-primary)] overflow-hidden">
        {/* Progress Bar & Stats */}
        <div className="w-full bg-[var(--bg-primary)] px-6 py-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)] select-none shrink-0 border-b border-[var(--border)]/20">
          <span>Matching Progress</span>
          <span>Round {currentRoundIndex + 1} / {allRounds.length} ({Math.round(((currentRoundIndex) / allRounds.length) * 100)}%)</span>
        </div>
        <div className="w-full h-1 bg-[var(--bg-card)] shrink-0">
          <div 
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${((currentRoundIndex + (matches.length / 6)) / allRounds.length) * 100}%` }}
          />
        </div>
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <button 
            onClick={() => navigate(`/courses/${courseSlug}?refresh=1`)} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <ChevronLeft size={16} /> Quit
          </button>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">
              Round {currentRoundIndex + 1} of {allRounds.length} • {roundData?.theme || 'Match Pairs'}
            </span>
            <div className="font-bold text-sm">NumPy Fundamentals</div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-sm font-semibold text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={15} /> {formatTime(totalTime)}
            </div>
            <div className="text-sm font-bold text-[var(--accent-green)]">
              {matches.length} / 6 matched
            </div>
          </div>
        </header>

        {/* Main Exercise Area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-start pt-16">
          <div className="w-full max-w-[900px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Terms Column */}
              <div className="flex flex-col gap-3">
                <h3 className="text-center text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-2">Terms</h3>
                {terms.map((term) => {
                  const isMatched = matches.includes(term.id);
                  const isSelected = selectedTerm?.id === term.id;
                  const isWrong = wrongMatch?.termId === term.id;
                  
                  let itemStyle = "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)] hover:bg-[var(--card-hover)]";
                  if (isMatched) {
                    itemStyle = "bg-[rgba(3,239,98,0.08)] border-[var(--accent-green)] text-[var(--accent-green)] opacity-50 cursor-not-allowed";
                  } else if (isWrong) {
                    itemStyle = "border-[var(--accent-red)] bg-[rgba(255,77,77,0.15)] animate-shake text-[var(--accent-red)]";
                  } else if (isSelected) {
                    itemStyle = "border-[var(--accent-blue)] bg-[rgba(96,165,250,0.15)] text-[var(--accent-blue)] scale-102";
                  }

                  return (
                    <button
                      key={term.id}
                      disabled={isMatched}
                      onClick={() => handleTermClick(term)}
                      className={`w-full min-h-[76px] p-5 rounded-xl border-2 text-left font-mono font-bold text-base transition-all flex items-center ${itemStyle}`}
                    >
                      {term.term}
                    </button>
                  );
                })}
              </div>

              {/* Definitions Column */}
              <div className="flex flex-col gap-3">
                <h3 className="text-center text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-2">Definitions</h3>
                {definitions.map((def) => {
                  const isMatched = matches.includes(def.id);
                  const isSelected = selectedDef?.id === def.id;
                  const isWrong = wrongMatch?.defId === def.id;
                  
                  let itemStyle = "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)] hover:bg-[var(--card-hover)]";
                  if (isMatched) {
                    itemStyle = "bg-[rgba(3,239,98,0.08)] border-[var(--accent-green)] text-[var(--accent-green)] opacity-50 cursor-not-allowed";
                  } else if (isWrong) {
                    itemStyle = "border-[var(--accent-red)] bg-[rgba(255,77,77,0.15)] animate-shake text-[var(--accent-red)]";
                  } else if (isSelected) {
                    itemStyle = "border-[var(--accent-blue)] bg-[rgba(96,165,250,0.15)] text-[var(--accent-blue)] scale-102";
                  }

                  return (
                    <button
                      key={def.id}
                      disabled={isMatched}
                      onClick={() => handleDefClick(def)}
                      className={`w-full min-h-[76px] p-5 rounded-xl border-2 text-left font-semibold text-sm leading-snug transition-all flex items-center ${itemStyle}`}
                    >
                      {def.definition}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Post-Round Transition panel */}
            {roundCompleted && (
              <div className="mt-8 flex flex-col items-center justify-center p-6 border-t border-[var(--border)] animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-[var(--accent-green)] font-bold text-xl mb-3">
                  <Check size={24} />
                  <span>All pairs matched!</span>
                </div>
                <div className="mb-6 flex flex-wrap gap-4 justify-center">
                  <div className="px-4 py-2 rounded-xl bg-[rgba(3,239,98,0.08)] border border-[rgba(3,239,98,0.3)] text-sm font-bold text-[var(--accent-green)]">
                    +15 XP Earned
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)]">
                    Round Time: <span className="text-[var(--accent-green)] font-mono">{formatTime(roundTime)}</span>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)]">
                    Accuracy: <span className="text-[var(--accent-green)] font-bold">{Math.round((6 / (attempts || 1)) * 100)}%</span>
                  </div>
                </div>
                
                <button
                  onClick={handleNextRound}
                  className="flex items-center gap-2 rounded-xl bg-[var(--accent-green)] px-10 py-4 text-base font-bold text-black hover:bg-[var(--accent-green-bright)] transition-colors shadow-md shadow-[rgba(3,239,98,0.2)] uppercase tracking-wider"
                >
                  {currentRoundIndex < allRounds.length - 1 ? 'Continue to Next Round' : 'Finish Match Game'}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

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
              <div>Questions Attempted: {attempts} matches</div>
              <div>Questions Correct: {matches.length} pairs</div>
              <div>Questions Incorrect: {attempts - matches.length} pairs</div>
              <div>Questions Remaining: {allRounds.length - currentRoundIndex - (roundCompleted ? 1 : 0)}</div>
              <div>Current Exercise Count: {allRounds.length}</div>
              <div className="pt-1.5 border-t border-[var(--accent-yellow)]/10 text-[10px] text-zinc-500 overflow-x-auto max-w-xs whitespace-nowrap">
                Round ID: {roundData?.id} | XP: {xpEarned}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 3) {
    const accuracy = Math.round(((allRounds.length * 6) / (attempts || 1)) * 100);

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-green)] text-black">
          <Check size={64} strokeWidth={3} />
        </div>
        
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">Game Complete!</h1>
        <p className="mt-4 text-lg text-[var(--text-muted)] max-w-md mx-auto">Lightning fast! You've matched them all. ⚡</p>
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-[700px]">
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Total Time</div>
            <div className="text-3xl font-extrabold">{formatTime(totalTime)}</div>
          </div>
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Accuracy</div>
            <div className="text-3xl font-extrabold">{accuracy}%</div>
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
            <RotateCcw size={20} /> Play Again
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
