import { useState, useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";

export const FeedbackPrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const optedOut = localStorage.getItem("feedback_opt_out") === "true";
      if (optedOut) return;

      const lastPromptStr = localStorage.getItem("feedback_last_prompt");
      const lastPrompt = lastPromptStr ? parseInt(lastPromptStr, 10) : 0;
      
      const now = Date.now();
      const daysSince = (now - lastPrompt) / (1000 * 60 * 60 * 24);
      
      // Show if never shown, or if > 7 days have passed
      if (!lastPromptStr || daysSince >= 7) {
        setShow(true);
      }
    } catch (e) {
      // ignore localstorage errors (e.g. incognito)
    }
  }, []);

  const handleAction = (action) => {
    setShow(false);
    try {
      const now = Date.now();
      localStorage.setItem("feedback_last_prompt", now.toString());

      if (action === "send") {
        window.dispatchEvent(new CustomEvent("open-feedback"));
      } else if (action === "skip") {
        const skips = parseInt(localStorage.getItem("feedback_skip_count") || "0", 10);
        localStorage.setItem("feedback_skip_count", (skips + 1).toString());
      } else if (action === "stop") {
        localStorage.setItem("feedback_opt_out", "true");
      }
    } catch (e) {}
  };

  if (!show) return null;

  const skipCount = parseInt(localStorage.getItem("feedback_skip_count") || "0", 10);
  const showStop = skipCount >= 1;

  return (
    <div className="mb-8 w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shrink-0 mt-0.5 sm:mt-0">
          <MessageSquarePlus className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-neutral-900 text-[15px]">Help make Forgot AI better</h4>
          <p className="text-sm text-neutral-600 mt-0.5">I rely on your feedback to build new features. Got 30 seconds?</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button 
          onClick={() => handleAction("send")}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors text-center"
        >
          Give Feedback
        </button>
        <button 
          onClick={() => handleAction("skip")}
          className="px-4 py-2.5 text-neutral-500 hover:bg-neutral-100 text-sm font-medium rounded-xl transition-colors"
        >
          Skip
        </button>
        {showStop && (
          <button 
            onClick={() => handleAction("stop")}
            className="p-2.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
            title="Stop asking"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
