import { useState, useEffect, useCallback, useRef } from "react";
import { Brain, Plus, MessageSquare, ArrowRight, ArrowLeft, X, Check, Sparkles, Link, PenTool } from "lucide-react";

const EXT_TOUR_STORAGE_KEY = "extension_tour_completed";

interface TourStep {
  target: string | null;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to Forgot AI ✨",
    description: "Your AI memory assistant right in the browser. Save anything you find while browsing and ask questions about your saved memories.",
    icon: Brain,
    badge: "Welcome",
  },
  {
    target: '[title="Save to Memory"]',
    title: "1. Quick Capture",
    description: "Tap the + button to save text notes, web links, or upload screenshots. You can also use the action cards above to save the current tab instantly!",
    icon: Plus,
    badge: "Capture",
  },
  {
    target: 'textarea[placeholder="Ask AI..."]',
    title: "2. Ask Your Memory",
    description: "Type any question here to search your saved memories using AI. Try 'What did I save today?' or 'Summarize my recent links' — it only answers from your library.",
    icon: MessageSquare,
    badge: "Ask AI",
  },
  {
    target: '[title="Open menu"]',
    title: "3. Menu & Settings",
    description: "Open the menu to access your full library on the web, manage settings, check your plan, or get help. Everything syncs in real-time with your web dashboard!",
    icon: Sparkles,
    badge: "Menu",
  },
];

export function startExtensionTour() {
  window.dispatchEvent(new CustomEvent("start-extension-tour"));
}

export function resetExtensionTour() {
  chrome.storage.local.remove(EXT_TOUR_STORAGE_KEY, () => {
    window.dispatchEvent(new CustomEvent("start-extension-tour"));
  });
}

export default function ExtensionTour({ autoStart = true }: { autoStart?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStart = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener("start-extension-tour", handleStart);

    if (autoStart) {
      chrome.storage.local.get([EXT_TOUR_STORAGE_KEY], (res) => {
        if (!res[EXT_TOUR_STORAGE_KEY]) {
          setTimeout(() => setIsOpen(true), 600);
        }
      });
    }

    return () => {
      window.removeEventListener("start-extension-tour", handleStart);
    };
  }, [autoStart]);

  const updateRect = useCallback(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStep];
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  const handleClose = () => {
    setIsOpen(false);
    chrome.storage.local.set({ [EXT_TOUR_STORAGE_KEY]: true });
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const padding = 6;

  // Calculate popover position for narrow extension
  let popoverTop = "50%";
  let popoverTransform = "translateY(-50%)";

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow >= 240) {
      popoverTop = `${targetRect.bottom + 12}px`;
      popoverTransform = "none";
    } else if (spaceAbove >= 240) {
      popoverTop = `${targetRect.top - 12}px`;
      popoverTransform = "translateY(-100%)";
    } else {
      // Center
      popoverTop = "50%";
      popoverTransform = "translateY(-50%)";
    }
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden">
      {/* SVG Spotlight Mask */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 9991 }}>
        <defs>
          <mask id="ext-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
                style={{ transition: "all 0.3s ease-out" }}
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 15, 15, 0.65)"
          mask="url(#ext-tour-mask)"
          onClick={handleClose}
          className="cursor-pointer"
        />
      </svg>

      {/* Spotlight Glow Ring */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 9992,
            transition: "all 0.3s ease-out",
          }}
          className="pointer-events-none rounded-[12px] ring-2 ring-white/80 ring-offset-1 ring-offset-black/30"
        />
      )}

      {/* Tour Card */}
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          top: popoverTop,
          left: "8px",
          right: "8px",
          transform: popoverTransform,
          zIndex: 9995,
        }}
        className="bg-white rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-neutral-200/80 p-4 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <StepIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {step.badge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-neutral-400">
              {currentStep + 1}/{TOUR_STEPS.length}
            </span>
            <button
              onClick={handleClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-bold text-[14px] text-neutral-900 tracking-tight leading-snug">
            {step.title}
          </h3>
          <p className="text-[12px] text-neutral-600 mt-1 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-5 bg-neutral-900"
                  : idx < currentStep
                  ? "w-1.5 bg-neutral-400"
                  : "w-1.5 bg-neutral-200"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
          <button
            onClick={handleClose}
            className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="h-7 px-2 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="h-7 px-3 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              {isLast ? (
                <>Got it <Check className="w-3 h-3" /></>
              ) : (
                <>Next <ArrowRight className="w-3 h-3" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
