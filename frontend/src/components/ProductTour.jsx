import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, ArrowRight, ArrowLeft, X, Check, Brain, Plus, Search, MessageSquare, Layers, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_STORAGE_KEY = "forgot_ai_tour_completed";

export const TOUR_STEPS = [
  {
    target: null, // Centered
    title: "Welcome to Forgot AI 👋",
    description: "Your AI-powered second brain. Save text notes, web links, and screenshots now—and retrieve them effortlessly later without remembering exact keywords.",
    icon: Brain,
    badge: "Welcome",
  },
  {
    target: '[data-testid="sidebar-save-btn"], [data-testid="mobile-save-fab"], [data-testid="home-save-btn"]',
    title: "1. Capture Anything",
    description: "Click here to save text snippets, website URLs, or upload images and screenshots. Our AI automatically extracts text, classifies categories, and creates instant summaries.",
    icon: Plus,
    badge: "Capture",
  },
  {
    target: '[data-testid="home-search-input"]',
    title: "2. Search by Meaning",
    description: "No need for exact keywords! Search naturally like 'that pricing tool I saw last week' or 'screenshot with blue chart'. Forgot AI matches by semantic meaning, context, and time.",
    icon: Search,
    badge: "Search",
  },
  {
    target: '[data-testid="nav-search"]',
    title: "3. Ask Your Memory",
    description: "Ask questions in plain language! Forgot AI searches your personal memory library and answers your questions grounded strictly in what you have saved.",
    icon: MessageSquare,
    badge: "Ask AI",
  },
  {
    target: '[data-testid="nav-all-saved"]',
    title: "4. Filter & Organize",
    description: "Browse all memories with instant filters for Images, Text, and Links. You can also create custom color-coded groups in the sidebar and pin key items to the top.",
    icon: Layers,
    badge: "Library",
  },
  {
    target: '[data-testid="nav-settings"]',
    title: "5. Browser Extension & Settings",
    description: "Install our Chrome sidebar extension to capture selected text, full pages, and screenshots while browsing. You can also replay this tour anytime from Settings!",
    icon: SettingsIcon,
    badge: "Extension",
  },
];

export const startTour = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("start-product-tour"));
  }
};

export const resetTour = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("start-product-tour"));
  }
};

export default function ProductTour({ autoStart = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const popoverRef = useRef(null);

  // Open tour on custom event or first login
  useEffect(() => {
    const handleStart = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener("start-product-tour", handleStart);

    if (autoStart) {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!completed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 800);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("start-product-tour", handleStart);
        };
      }
    }

    return () => {
      window.removeEventListener("start-product-tour", handleStart);
    };
  }, [autoStart]);

  // Update target rect
  const updateRect = useCallback(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStep];
    if (!step || !step.target) {
      setTargetRect(null);
      return;
    }

    const selectors = step.target.split(",").map((s) => s.trim());
    let el = null;
    for (const sel of selectors) {
      const found = document.querySelector(sel);
      if (found && found.offsetParent !== null) {
        el = found;
        break;
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon || Sparkles;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Calculate popover coordinates
  let popoverStyle = {};
  const padding = 8;
  const popoverWidth = 360;

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;

    let top = targetRect.bottom + 16;
    let left = targetRect.left;

    if (spaceRight >= popoverWidth + 24 && targetRect.width < 120) {
      // Place to the right (ideal for sidebar items)
      top = Math.max(16, targetRect.top - 20);
      left = targetRect.right + 16;
    } else if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      // Place above
      top = Math.max(16, targetRect.top - 210);
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - popoverWidth - 20));
    } else {
      // Place below
      top = Math.min(window.innerHeight - 230, targetRect.bottom + 16);
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - popoverWidth - 20));
    }

    // Viewport clamping
    top = Math.max(16, Math.min(top, window.innerHeight - 240));
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 20));

    popoverStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxWidth: "calc(100vw - 32px)",
    };
  } else {
    // Center of screen
    popoverStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: `${popoverWidth + 20}px`,
      maxWidth: "calc(100vw - 32px)",
    };
  }

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden">
      {/* SVG Spotlight Mask */}
      <svg className="fixed inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 9991 }}>
        <defs>
          <mask id="forgot-ai-tour-mask">
            {/* White reveals the dark overlay */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cuts out the spotlight hole */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="14"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        {/* Darkened backdrop */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 15, 15, 0.68)"
          mask="url(#forgot-ai-tour-mask)"
          onClick={handleClose}
          className="cursor-pointer"
        />
      </svg>

      {/* Target Glow / Pulse Ring */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            zIndex: 9992,
          }}
          className="pointer-events-none rounded-[14px] ring-2 ring-white/90 ring-offset-2 ring-offset-black/40 animate-pulse transition-all duration-300"
        />
      )}

      {/* Tour Popover Card */}
      <div
        ref={popoverRef}
        style={{ ...popoverStyle, zIndex: 9995 }}
        className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-200/80 p-5 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-200 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <StepIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {step.badge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-neutral-400">
              {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleClose}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="Close tour (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="font-bold text-[16px] text-neutral-900 tracking-tight leading-snug">
            {step.title}
          </h3>
          <p className="text-[13px] text-neutral-600 mt-1.5 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1.5 py-1">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? "w-6 bg-neutral-900"
                  : idx < currentStep
                  ? "w-1.5 bg-neutral-400"
                  : "w-1.5 bg-neutral-200"
              }`}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 mt-1">
          <button
            onClick={handleClose}
            className="text-[12px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2.5 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="h-8 px-3.5 text-xs bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg shadow-xs font-semibold flex items-center gap-1"
            >
              {isLast ? (
                <>
                  Got it <Check className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
