import { useEffect } from "react";
import { Brain, ExternalLink } from "lucide-react";
import { CONFIG } from "../lib/config";

export default function AuthApp() {
  const loginUrl = `${CONFIG.APP_URL}/login?source=extension`;

  useEffect(() => {
    // Automatically redirect to unified web login page
    window.location.replace(loginUrl);
  }, [loginUrl]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4 animate-in fade-in duration-300">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-xl mb-2 shadow-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Opening Forgot AI...</h1>
        <p className="text-sm text-neutral-400">
          Redirecting you to the unified login page.
        </p>
        <div className="pt-2">
          <a
            href={loginUrl}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            Click here if not redirected automatically <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
