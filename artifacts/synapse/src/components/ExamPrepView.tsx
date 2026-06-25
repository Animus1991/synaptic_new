import { useState, useEffect, useCallback } from 'react';
import { X, Timer, GraduationCap, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import type { ExamQuestion } from '../lib/taskFlows';
import { cn } from '../utils/cn';

interface ExamPrepViewProps {
  onClose: () => void;
  onOpenAgent: () => void;
  onComplete: () => void;
  onQuizAttempt?: (concept: string, correct: boolean, confidence: number) => void;
  taskTitle?: string;
  courseName?: string;
  quizConcept?: string;
  xpReward?: number;
  durationSeconds?: number;
  questions?: ExamQuestion[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ExamPrepView({
  onClose,
  onOpenAgent,
  onComplete,
  onQuizAttempt,
  taskTitle,
  courseName,
  quizConcept = 'Exam topic',
  xpReward = 80,
  durationSeconds = 180,
  questions = [],
}: ExamPrepViewProps) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const examQuestions = questions.length > 0 ? questions : [];
  const sessionTitle = taskTitle ?? `Exam: ${quizConcept}`;
  const allAnswered = answers.every((a) => a !== null);
  const score = submitted
    ? answers.filter((a, i) => a === examQuestions[i]?.correctIndex).length
    : 0;

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    examQuestions.forEach((q, i) => {
      const correct = answers[i] === q.correctIndex;
      onQuizAttempt?.(quizConcept, correct, 75);
    });
  }, [submitted, examQuestions, answers, onQuizAttempt, quizConcept]);

  useEffect(() => {
    if (!started || submitted || timeLeft <= 0) return;
    const id = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [started, submitted, timeLeft]);

  useEffect(() => {
    if (started && !submitted && timeLeft <= 0) {
      handleSubmit();
    }
  }, [timeLeft, started, submitted, handleSubmit]);

  const handleFinish = () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-primary flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface-secondary/50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
          <div>
            <p className="text-sm font-semibold">{sessionTitle}</p>
            <p className="text-xs text-text-tertiary flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-accent-rose" />
              {courseName ?? 'Exam prep'} · Timed simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {started && !submitted && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-mono font-semibold px-2 py-1 rounded-lg',
                timeLeft <= 30 ? 'bg-accent-rose/15 text-accent-rose' : 'bg-surface-hover text-text-secondary',
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {formatTime(Math.max(0, timeLeft))}
            </span>
          )}
          <button
            onClick={onOpenAgent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle hover:border-brand-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Ask Agent
          </button>
          <span className="text-xs text-accent-amber font-medium">+{xpReward} XP</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto w-full">
        {!started ? (
          <div className="space-y-5 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-rose/10 border border-accent-rose/20 flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-accent-rose" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{quizConcept}</h2>
              <p className="text-sm text-text-secondary mt-2">
                {examQuestions.length} questions · {formatTime(durationSeconds)} timed (exam pace simulation)
              </p>
            </div>
            <ul className="text-left text-xs text-text-secondary space-y-2 max-w-sm mx-auto">
              <li>• No hints during the exam — use Agent only before submitting</li>
              <li>• Auto-submit when time runs out</li>
              <li>• Review score before marking task complete</li>
            </ul>
            <button
              onClick={() => setStarted(true)}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-all"
            >
              Begin exam
            </button>
          </div>
        ) : submitted ? (
          <div className="space-y-5 py-6">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-accent-emerald mx-auto mb-3" />
              <h2 className="text-xl font-bold">Exam submitted</h2>
              <p className="text-2xl font-bold text-brand-300 mt-2">
                {score}/{examQuestions.length} correct
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {score === examQuestions.length
                  ? 'Excellent — ready for the real exam!'
                  : score >= examQuestions.length / 2
                    ? 'Solid attempt — review weak spots.'
                    : 'Focus on fundamentals before exam day.'}
              </p>
            </div>
            <button
              onClick={handleFinish}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-all"
            >
              Complete exam prep
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Question {currentQ + 1} of {examQuestions.length}</span>
              <span>{answers.filter((a) => a !== null).length}/{examQuestions.length} answered</span>
            </div>

            {examQuestions[currentQ] && (
              <div className="p-5 rounded-xl bg-surface-card border border-border-subtle">
                <p className="text-sm font-medium mb-4">{examQuestions[currentQ]!.question}</p>
                <div className="space-y-2">
                  {examQuestions[currentQ]!.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[currentQ] = i;
                          return next;
                        });
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border text-sm transition-all',
                        answers[currentQ] === i
                          ? 'border-brand-500/50 bg-brand-600/10 text-brand-300'
                          : 'border-border-subtle hover:border-brand-500/30',
                      )}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                disabled={currentQ === 0}
                className="text-xs text-text-secondary disabled:text-text-muted"
              >
                ← Previous
              </button>
              {currentQ < examQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((q) => q + 1)}
                  className="text-xs text-brand-400 font-medium"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-medium transition-all',
                    allAnswered
                      ? 'bg-accent-rose/90 hover:bg-accent-rose text-white'
                      : 'bg-surface-hover text-text-muted cursor-not-allowed',
                  )}
                >
                  Submit exam
                </button>
              )}
            </div>

            {timeLeft <= 30 && timeLeft > 0 && (
              <p className="text-xs text-accent-rose flex items-center gap-1 justify-center">
                <AlertTriangle className="w-3.5 h-3.5" /> Less than 30 seconds remaining
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
