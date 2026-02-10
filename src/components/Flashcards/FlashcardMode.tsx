/**
 * Flashcard Mode Component
 * Spaced repetition learning with SM-2 algorithm
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { X, RotateCcw, ChevronLeft, ChevronRight, Brain, Zap, Clock, Check } from "lucide-react";
import { Note } from "../../types";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FlashcardModeProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

// SM-2 quality scale: 0-5

// SM-2 Algorithm implementation
function calculateSM2(card: Flashcard, quality: number): Flashcard {
  let { easeFactor, interval, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview,
  };
}

// Parse flashcards from note content
function parseFlashcards(content: string, noteId: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = content.split("\n");

  // Look for Q: A: patterns
  let currentQuestion = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("Q:") || line.startsWith("q:")) {
      currentQuestion = line.substring(2).trim();
    } else if ((line.startsWith("A:") || line.startsWith("a:")) && currentQuestion) {
      const answer = line.substring(2).trim();
      cards.push({
        id: `${noteId}-qa-${cards.length}`,
        question: currentQuestion,
        answer,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
      });
      currentQuestion = "";
    }
  }

  // Also parse headers as questions (## Header -> content until next header)
  const headerPattern = /^#{1,3}\s+(.+)$/;
  let currentHeader = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(headerPattern);
    if (headerMatch) {
      if (currentHeader && currentContent.length > 0) {
        const answer = currentContent.join("\n").trim();
        if (answer && answer.length > 10) {
          cards.push({
            id: `${noteId}-header-${cards.length}`,
            question: currentHeader,
            answer,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: new Date(),
          });
        }
      }
      currentHeader = headerMatch[1];
      currentContent = [];
    } else if (currentHeader && line.trim()) {
      currentContent.push(line);
    }
  }

  // Don't forget last header
  if (currentHeader && currentContent.length > 0) {
    const answer = currentContent.join("\n").trim();
    if (answer && answer.length > 10) {
      cards.push({
        id: `${noteId}-header-${cards.length}`,
        question: currentHeader,
        answer,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date(),
      });
    }
  }

  return cards;
}

// Load/save flashcard progress
function loadProgress(noteId: string): Record<string, Partial<Flashcard>> {
  const stored = localStorage.getItem(`brainvault_flashcards_${noteId}`);
  return stored ? JSON.parse(stored) : {};
}

function saveProgress(noteId: string, cards: Flashcard[]): void {
  const progress: Record<string, Partial<Flashcard>> = {};
  cards.forEach((card) => {
    progress[card.id] = {
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      nextReview: card.nextReview,
    };
  });
  localStorage.setItem(`brainvault_flashcards_${noteId}`, JSON.stringify(progress));
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ isOpen, onClose, note }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  // Parse and merge with saved progress
  const cards = useMemo(() => {
    if (!note) return [];
    const parsed = parseFlashcards(note.content, note.id);
    const progress = loadProgress(note.id);

    return parsed.map((card) => {
      const saved = progress[card.id];
      if (saved) {
        return {
          ...card,
          ...saved,
          nextReview: saved.nextReview ? new Date(saved.nextReview) : card.nextReview,
        };
      }
      return card;
    });
  }, [note]);

  // Cards due for review today
  const dueCards = useMemo(() => {
    const now = new Date();
    return cards.filter((card) => new Date(card.nextReview) <= now);
  }, [cards]);

  const currentCard = dueCards[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionStats({ correct: 0, total: 0 });
  }, [note?.id]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
      if (!currentCard || !note) return;

      // Update card with SM-2
      const updatedCard = calculateSM2(currentCard, quality);
      const cardIndex = cards.findIndex((c) => c.id === currentCard.id);
      if (cardIndex >= 0) {
        cards[cardIndex] = updatedCard;
        saveProgress(note.id, cards);
      }

      // Update stats
      setSessionStats((prev) => ({
        correct: prev.correct + (quality >= 3 ? 1 : 0),
        total: prev.total + 1,
      }));

      // Next card
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
    },
    [currentCard, currentIndex, dueCards.length, cards, note]
  );

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionStats({ correct: 0, total: 0 });
  };

  if (!isOpen || !note) return null;

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-2xl w-full max-w-md p-8 text-center">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Flashcards Found</h2>
          <p className="text-muted-foreground mb-6">
            Add Q: and A: lines to your note, or use headers to create flashcards.
          </p>
          <div className="p-4 bg-muted rounded-lg text-left text-sm mb-6">
            <p className="font-medium mb-2">Example formats:</p>
            <pre className="text-muted-foreground">
              {`Q: What is spaced repetition?
A: A learning technique that reviews information at increasing intervals.

## What is SM-2?
The algorithm used to calculate optimal review intervals.`}
            </pre>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (dueCards.length === 0 && !sessionComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-2xl w-full max-w-md p-8 text-center">
          <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
          <p className="text-muted-foreground mb-6">No cards due for review right now.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Next review: {new Date(Math.min(...cards.map((c) => new Date(c.nextReview).getTime()))).toLocaleDateString()}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    const percentage = Math.round((sessionStats.correct / sessionStats.total) * 100);

    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-2xl w-full max-w-md p-8 text-center">
          <div
            className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              percentage >= 80 ? "bg-green-500/20" : percentage >= 50 ? "bg-yellow-500/20" : "bg-red-500/20"
            )}
          >
            <span className="text-2xl font-bold">{percentage}%</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground mb-6">
            You got {sessionStats.correct} out of {sessionStats.total} correct.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-muted hover:bg-accent rounded-md flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Study Again
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-md">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-medium">{note.title}</h2>
            <p className="text-sm text-muted-foreground">
              Card {currentIndex + 1} of {dueCards.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{sessionStats.total} reviewed</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="w-full max-w-2xl aspect-[3/2] perspective-1000 cursor-pointer"
          onClick={handleFlip}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isFlipped ? "back" : "front"}
              initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-full h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center",
                isFlipped
                  ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30"
                  : "bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/30"
              )}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                {isFlipped ? "Answer" : "Question"}
              </p>
              <p className="text-2xl font-medium leading-relaxed max-h-[60%] overflow-y-auto">
                {isFlipped ? currentCard.answer : currentCard.question}
              </p>
              {!isFlipped && (
                <p className="text-sm text-muted-foreground mt-8">Click to reveal answer</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border-t border-white/10"
        >
          <p className="text-center text-sm text-muted-foreground mb-4">How well did you know this?</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleRate(0)}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
            >
              Again
              <span className="block text-xs opacity-60">1 day</span>
            </button>
            <button
              onClick={() => handleRate(2)}
              className="px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg font-medium transition-colors"
            >
              Hard
              <span className="block text-xs opacity-60">3 days</span>
            </button>
            <button
              onClick={() => handleRate(4)}
              className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg font-medium transition-colors"
            >
              Good
              <span className="block text-xs opacity-60">{currentCard.interval || 1} days</span>
            </button>
            <button
              onClick={() => handleRate(5)}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Easy
              <span className="block text-xs opacity-60">{Math.round((currentCard.interval || 1) * 1.5)} days</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-center gap-4 pb-6">
        <button
          onClick={() => {
            setCurrentIndex((prev) => Math.max(0, prev - 1));
            setIsFlipped(false);
          }}
          disabled={currentIndex === 0}
          className="p-2 hover:bg-white/10 rounded-md disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setCurrentIndex((prev) => Math.min(dueCards.length - 1, prev + 1));
            setIsFlipped(false);
          }}
          disabled={currentIndex === dueCards.length - 1}
          className="p-2 hover:bg-white/10 rounded-md disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardMode;
