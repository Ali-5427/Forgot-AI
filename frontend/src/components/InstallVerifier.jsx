import React, { useState, useEffect } from "react";
import { Check, Share, Plus, X, Smartphone, Sparkles } from "lucide-react";

export function InstallVerifier() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // 1. Detect if running as standalone PWA
    const checkStandalone = () => {
      const isIOSStandalone = window.navigator.standalone === true;
      const isMatchMediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
      return isIOSStandalone || isMatchMediaStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // 2. Detect iOS (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // 3. Handle Standalone Launch Celebration
    if (standalone) {
      const alreadyCelebrated = localStorage.getItem("forgot_ai_pwa_celebrated") === "true";
      if (!alreadyCelebrated) {
        setShowCelebration(true);
      }
      return; // Do not show install prompt if already installed
    }

    // 4. If in browser: check if previously dismissed
    const dismissed = localStorage.getItem("forgot_ai_pwa_dismissed") === "true";
    if (dismissed) return;

    // 5. Capture Chromium native prompt if available
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 6. On mobile browsers (especially iOS Safari), show banner after brief delay
    const isMobile = isIOSDevice || /android|mobile/.test(userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          setShowBanner(false);
        }
        setDeferredPrompt(null);
      });
    } else {
      setShowIOSGuide(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("forgot_ai_pwa_dismissed", "true");
  };

  const handleFinishCelebration = () => {
    setShowCelebration(false);
    localStorage.setItem("forgot_ai_pwa_celebrated", "true");
  };

  return (
    <>
      {/* 1. Mobile In-Browser Install Banner */}
      {showBanner && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white text-neutral-900 border border-neutral-200/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-neutral-900 truncate">
                  Install Forgot AI
                </h4>
                <p className="text-xs text-neutral-500 truncate">
                  Add to home screen for 1-tap access
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS Safari Step-by-Step Guide Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-neutral-900 text-white rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-neutral-900">
                  Install on your iPhone
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm text-neutral-700">
              <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">1. Tap the Share button</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Found at the bottom bar of Safari (the square with an arrow pointing up).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">2. Tap "Add to Home Screen"</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Scroll down the options and tap Add to Home Screen, then tap "Add" in the top right.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-neutral-500">
              Open the app from your home screen to finish!
            </p>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm rounded-2xl transition-colors shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* 3. Celebration Modal Upon First Standalone Launch */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-6 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
                <Sparkles className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 tracking-tight">
                You're all set!
              </h3>
              <p className="text-xs text-neutral-500">
                Forgot AI is now installed as an app on your phone.
              </p>
            </div>

            {/* The 3 Clean Human Checkmarks */}
            <div className="space-y-2.5 text-left bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  Added to Home Screen
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  Installed as an App
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  Ready to Save Anything
                </span>
              </div>
            </div>

            <button
              onClick={handleFinishCelebration}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm rounded-2xl transition-colors shadow-sm"
            >
              Open Forgot AI
            </button>
          </div>
        </div>
      )}
    </>
  );
}
