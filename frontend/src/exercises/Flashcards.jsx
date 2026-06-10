import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Lightbulb, 
  RotateCcw, 
  Check,
  CreditCard,
  Zap
} from 'lucide-react';
import CodeBlock from '../components/CodeBlock';

export default function Flashcards() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Greeting, 2: Exercise, 3: Summary
  const [course, setCourse] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReplaying, setIsReplaying] = useState(false);
  
  // Exercise state
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    fetchCourseAndCards();
  }, [courseSlug]);

  const fetchCourseAndCards = async () => {
    try {
      setLoading(true);
      const [courseRes, cardsRes, attemptsRes] = await Promise.all([
        fetch(`/api/courses/${courseSlug}`),
        fetch(`/api/content/exercises/${courseSlug}/flashcards`),
        fetch(`/api/progress/attempted-questions/${courseSlug}/flashcard`)
      ]);
      
      if (!courseRes.ok || !cardsRes.ok || !attemptsRes.ok) {
        throw new Error("Failed to fetch data");
      }
      
      const courseData = await courseRes.json();
      const allCards = await cardsRes.json();
      const attemptedIds = await attemptsRes.json();
      
      setCourse(courseData);

      // Filter out attempted cards
      let unattempted = allCards.filter(c => !attemptedIds.includes(String(c.id)));
      let selected = [];
      let replayMode = false;

      if (unattempted.length > 0) {
        // Shuffle unattempted cards and take up to 15
        unattempted.sort(() => Math.random() - 0.5);
        selected = unattempted.slice(0, 15);
      } else {
        // All cards completed! Replay mode.
        replayMode = true;
        const shuffledAll = [...allCards].sort(() => Math.random() - 0.5);
        selected = shuffledAll.slice(0, 15);
      }
      
      setCards(selected);
      setIsReplaying(replayMode);
    } catch (err) {
      console.error('Error fetching flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExercise = () => {
    setStep(2);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setReviewedCount(0);
  };

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  const handleRate = async (rating) => {
    // rating: 'again', 'hard', 'good', 'easy'
    const nextReviewedCount = reviewedCount + 1;
    setReviewedCount(nextReviewedCount);
    
    // Determine performance score from rating
    const wasCorrect = rating !== 'again';
    const score = rating === 'easy' ? 1.0 : rating === 'good' ? 0.8 : rating === 'hard' ? 0.5 : 0.0;
    
    // Post question-level attempt immediately
    try {
      await fetch('/api/progress/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_type: 'flashcard',
          course_id: course.id,
          question_id: cards[currentIndex].id,
          score: score,
          was_correct: wasCorrect ? 1 : 0
        })
      });
    } catch (err) {
      console.error("Error saving card attempt:", err);
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      finishExercise();
    }
  };

  const finishExercise = async () => {
    setStep(3);
    const earnedXp = 20;
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

  const formatCardType = (typeStr) => {
    if (!typeStr) return '';
    return typeStr
      .replace('code_to_concept', 'code → concept')
      .replace('concept_to_code', 'concept → code')
      .toUpperCase();
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
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--accent-blue)] border border-[var(--border)]">
          <CreditCard size={48} />
        </div>
        <h2 className="text-xl text-[var(--text-muted)] font-medium uppercase tracking-wider">{course?.name}</h2>
        <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Flashcard Study</h1>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            {cards.length} Cards
          </div>
          <div className="rounded-full bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)]">
            ~{Math.round(cards.length * 0.2)} min
          </div>
          <div className="rounded-full bg-[rgba(3,239,98,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-green-bright)] border border-[rgba(3,239,98,0.3)] flex items-center gap-1.5">
            <Zap size={16} /> Earn 20 XP
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
    const currentCard = cards[currentIndex];

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-exercise)] text-[var(--text-primary)] overflow-hidden">
        {/* Progress Bar */}
        <div className="w-full h-1 bg-[var(--bg-card)]">
          <div 
            className="h-full bg-[var(--accent-green)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <button 
            onClick={() => navigate(`/courses/${courseSlug}`)} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <ChevronLeft size={16} /> Quit
          </button>
          
          <div className="text-center">
            <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">Flashcards • {course?.name}</span>
            <div className="font-bold text-sm">Card {currentIndex + 1} of {cards.length}</div>
          </div>
          
          <div className="w-20"></div> {/* Spacer */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-[600px] flex flex-col items-center justify-center">
            
            {/* 3D Flashcard Wrapper */}
            <div className="w-full perspective-1000 mb-8">
              <div 
                onClick={handleFlip}
                className={`relative min-h-[340px] w-full cursor-pointer transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              >
                {/* FRONT SIDE */}
                <div className="absolute inset-0 flex flex-col items-center justify-between rounded-3xl border-2 border-[var(--border)] bg-[var(--bg-card)] p-8 text-center backface-hidden shadow-xl hover:border-[var(--accent-blue)] transition-colors">
                  <div className="w-full flex justify-start">
                    <span className="rounded-full bg-[rgba(96,165,250,0.1)] px-3 py-1 text-xs font-extrabold text-[var(--accent-blue)] tracking-wider">
                      {formatCardType(currentCard?.card_type)}
                    </span>
                  </div>
                  
                  <div className="w-full my-6 flex flex-col justify-center items-center">
                    <div className="text-xl font-semibold leading-relaxed max-w-[500px]">
                      {renderContentWithCode(currentCard?.front)}
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center">
                    {showHint && currentCard?.hint && (
                      <div className="mb-4 rounded-xl border border-[var(--accent-yellow)] bg-[rgba(251,191,36,0.05)] px-4 py-2 text-sm text-[var(--accent-yellow)] font-medium animate-in fade-in zoom-in-95">
                        💡 {currentCard.hint}
                      </div>
                    )}
                    {!showHint && currentCard?.hint && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                        className="mb-4 flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent-yellow)] transition-colors"
                      >
                        <Lightbulb size={14} /> Show Hint
                      </button>
                    )}
                    <span className="text-xxs uppercase tracking-widest text-[var(--text-muted)] font-extrabold opacity-60">Click Card to Flip</span>
                  </div>
                </div>

                {/* BACK SIDE */}
                <div className="absolute inset-0 flex flex-col items-center justify-between rounded-3xl border-2 border-[var(--accent-green)] bg-[var(--bg-card)] p-8 text-center backface-hidden rotate-y-180 shadow-2xl">
                  <div className="w-full flex justify-start">
                    <span className="rounded-full bg-[rgba(3,239,98,0.1)] px-3 py-1 text-xs font-extrabold text-[var(--accent-green)] tracking-wider">
                      ANSWER
                    </span>
                  </div>
                  
                  {/* Back side contents are ONLY rendered when flipped to prevent leaks */}
                  <div className="w-full my-4 flex flex-col justify-center items-center overflow-y-auto max-h-[220px]">
                    {isFlipped && (
                      <div className="text-lg font-semibold leading-relaxed text-[var(--text-primary)] max-w-[500px]">
                        {renderContentWithCode(currentCard?.back)}
                      </div>
                    )}
                  </div>

                  <div className="w-full flex flex-col items-center">
                    <span className="text-xxs uppercase tracking-widest text-[var(--text-muted)] font-extrabold opacity-60">Click Card to Flip Back</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ratings and Explanation */}
            {isFlipped && (
              <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-full grid grid-cols-4 gap-2 mb-6">
                  <button 
                    onClick={() => handleRate('again')}
                    className="rounded-xl bg-[rgba(255,77,77,0.1)] py-4 text-sm font-bold text-[var(--accent-red)] border border-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white transition-colors"
                  >
                    Again
                  </button>
                  <button 
                    onClick={() => handleRate('hard')}
                    className="rounded-xl bg-[rgba(251,191,36,0.1)] py-4 text-sm font-bold text-[var(--accent-yellow)] border border-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-black transition-colors"
                  >
                    Hard
                  </button>
                  <button 
                    onClick={() => handleRate('good')}
                    className="rounded-xl bg-[rgba(96,165,250,0.1)] py-4 text-sm font-bold text-[var(--accent-blue)] border border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] hover:text-white transition-colors"
                  >
                    Good
                  </button>
                  <button 
                    onClick={() => handleRate('easy')}
                    className="rounded-xl bg-[rgba(3,239,98,0.1)] py-4 text-sm font-bold text-[var(--accent-green)] border border-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-black transition-colors"
                  >
                    Easy
                  </button>
                </div>
                
                {currentCard?.explanation && (
                  <div className="w-full p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-left">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Explanation</span>
                    <p className="text-xs leading-relaxed text-[var(--text-muted)] font-medium">
                      {currentCard.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-exercise)] p-6 text-center overflow-y-auto">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-green)] text-black">
          <Check size={64} strokeWidth={3} />
        </div>
        
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)]">Session Complete!</h1>
        <p className="mt-4 text-lg text-[var(--text-muted)] max-w-md mx-auto">Outstanding! You've reviewed all cards! 🏆</p>
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-[500px]">
          <div className="rounded-2xl bg-[var(--bg-card)] p-6 border border-[var(--border)]">
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-1 font-bold">Cards Reviewed</div>
            <div className="text-3xl font-extrabold">{cards.length}</div>
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
            <RotateCcw size={20} /> Review Again
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
