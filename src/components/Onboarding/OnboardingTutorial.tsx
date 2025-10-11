/**
 * Onboarding Tutorial Component
 *
 * A thoughtful, skippable introduction to BrainVault that explains:
 * 1. WHY it exists (the problem)
 * 2. WHAT it does (the solution)
 * 3. HOW to use it (interactive steps)
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Brain, Zap, Lock, Network, Folder, Search, MessageSquare, Keyboard } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotesStore } from '../../stores/notesStore';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  highlight?: string; // CSS selector to highlight
  interactive?: boolean;
}

export const OnboardingTutorial: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { createNote } = useNotesStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if tutorial should be shown
  useEffect(() => {
    const tutorialCompleted = settings.general?.tutorialCompleted || false;
    if (!tutorialCompleted) {
      setIsVisible(true);
    }
  }, [settings]);

  const steps: TutorialStep[] = [
    // Step 0: The Problem
    {
      id: 'problem',
      title: 'Your Mind is Overflowing',
      description: `Every day, you have brilliant ideas, important notes, random thoughts, meeting summaries, and things to remember.

They're scattered across:
• Random text files
• Phone notes
• Email drafts
• Post-it notes
• Your head

When you need them later... they're gone. Or you can't find them. Or they're in 5 different apps.

Sound familiar?`,
      icon: <Brain className="w-12 h-12 text-primary" />,
    },

    // Step 1: The Solution
    {
      id: 'solution',
      title: 'Your Second Brain',
      description: `BrainVault is your **second brain** - a place to:

✅ Capture everything (ideas, notes, todos)
✅ Connect ideas (like your mind does)
✅ Find anything instantly
✅ Keep it 100% private (your data, your device)
✅ Think with AI assistance

No cloud. No subscriptions. No tracking.
Just you and your thoughts.`,
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
    },

    // Step 2: Privacy First
    {
      id: 'privacy',
      title: 'Your Data Stays Yours',
      description: `Unlike Notion, Evernote, or other cloud apps:

🔒 Everything is stored on YOUR device
🔒 No internet required
🔒 No one can read your notes
🔒 No telemetry or tracking
🔒 You own your data (plain Markdown files)

Your thoughts are private. Period.`,
      icon: <Lock className="w-12 h-12 text-green-500" />,
    },

    // Step 3: Creating Notes
    {
      id: 'create-note',
      title: 'Create Your First Note',
      description: `Let's capture a thought!

1. Click the + button (or press Cmd+N)
2. Give it a title
3. Write anything
4. It auto-saves in 1 second

Try it now! I'll wait... 😊`,
      icon: <Brain className="w-12 h-12 text-blue-500" />,
      highlight: '[data-tutorial="create-note"]',
      interactive: true,
      action: async () => {
        // Create a sample note to guide the user
        await createNote('My First Note', 'Welcome to BrainVault! This is where your ideas live.\n\nTry editing this note or creating a new one.');
      },
    },

    // Step 4: Organizing with Folders
    {
      id: 'folders',
      title: 'Organize with Drag & Drop',
      description: `Keep things organized:

📁 Create folders (right-click sidebar)
📁 Drag notes into folders
📁 Nest folders inside folders
📁 Move things around anytime

Just like your file system, but smarter!`,
      icon: <Folder className="w-12 h-12 text-orange-500" />,
      highlight: '[data-tutorial="folders"]',
    },

    // Step 5: Connecting Ideas
    {
      id: 'wiki-links',
      title: 'Connect Your Ideas',
      description: `Your mind doesn't think in folders - it makes connections!

Use Wiki Links to connect notes:
[[Another Note Name]]

Use Tags to categorize:
#project #work #important

Then press Cmd+G to see your knowledge graph in 3D!`,
      icon: <Network className="w-12 h-12 text-purple-500" />,
    },

    // Step 6: Search Everything
    {
      id: 'search',
      title: 'Find Anything Instantly',
      description: `Lost something? Never again.

Press Cmd+K to open the Command Palette:
• Search all your notes (full-text)
• Filter by tags
• Navigate anywhere
• Run commands

It's like Spotlight for your brain.`,
      icon: <Search className="w-12 h-12 text-indigo-500" />,
      highlight: '[data-tutorial="search"]',
    },

    // Step 7: AI Assistant
    {
      id: 'ai',
      title: 'Think with AI (Optional)',
      description: `Press Cmd+I to chat with your AI assistant:

"What did I write about project X?"
"Summarize my notes from this week"
"Find connections I might have missed"

100% private - runs locally with Ollama.
(You'll need to install Ollama separately)`,
      icon: <MessageSquare className="w-12 h-12 text-pink-500" />,
    },

    // Step 8: Keyboard Shortcuts
    {
      id: 'shortcuts',
      title: 'Work at the Speed of Thought',
      description: `Master these shortcuts:

⌘N - New note
⌘K - Command palette / Search
⌘D - Today's daily note
⌘G - Graph view
⌘B - Toggle sidebar
⌘I - AI chat
⌘S - Save (auto-saves anyway!)

You'll be flying in no time! 🚀`,
      icon: <Keyboard className="w-12 h-12 text-cyan-500" />,
    },

    // Step 9: Done
    {
      id: 'complete',
      title: 'You\'re Ready!',
      description: `That's it! You now have a superpower:

🧠 A second brain that never forgets
⚡ Lightning-fast capture and retrieval
🔐 Complete privacy
🌐 Connected thoughts
🤖 AI-assisted thinking

Start by creating some notes. Capture your ideas. Connect them. Watch your knowledge graph grow.

Welcome to BrainVault! 🎉`,
      icon: <Check className="w-12 h-12 text-green-500" />,
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (confirm('Skip tutorial? You can always restart it from Settings.')) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    updateSettings({
      general: {
        ...settings.general,
        tutorialCompleted: true,
      },
    });
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      {/* Tutorial Card */}
      <div className="bg-background border-2 border-primary/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-base leading-relaxed whitespace-pre-line">
              {currentStepData.description}
            </div>
          </div>

          {/* Interactive Step Indicator */}
          {currentStepData.interactive && (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary font-medium">
                👆 Try it now! When you're ready, click Next to continue.
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/20">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {/* Step Dots */}
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? 'bg-primary w-6'
                      : idx < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted-foreground/20'
                  }`}
                  title={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {currentStep === steps.length - 1 ? (
              <>
                <Check className="w-4 h-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Highlight Overlay for Interactive Steps */}
      {currentStepData.highlight && (
        <style>
          {`
            ${currentStepData.highlight} {
              position: relative;
              z-index: 51;
              box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
              animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.5); }
              50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.8); }
            }
          `}
        </style>
      )}
    </div>
  );
};

// Tutorial restart button for settings
export const TutorialRestartButton: React.FC = () => {
  const { updateSettings } = useSettingsStore();

  const handleRestart = () => {
    updateSettings({
      general: {
        tutorialCompleted: false,
      } as any,
    });
    window.location.reload(); // Reload to show tutorial
  };

  return (
    <button
      onClick={handleRestart}
      className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-accent transition-colors"
    >
      <Brain className="w-4 h-4" />
      Restart Tutorial
    </button>
  );
};
