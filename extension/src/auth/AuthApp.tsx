import { useEffect, useState } from "react";
import { Brain, Lock, Mail, Loader2, Sparkles, Eye, EyeOff, Check } from "lucide-react";
import { api, persistAuth } from "../lib/api";
import { getSession } from "../lib/storage";

type Mode = "login" | "signup";

export default function AuthApp() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<{ email: string } | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      if (s) setSignedIn({ email: s.user.email });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setBusy(true);
    try {
      const fn = mode === "login" ? api.login : api.signup;
      const res = await fn(email.trim(), password);
      await persistAuth(res);
      setSignedIn({ email: res.user.email });
      // Auto-close after a moment so the flow feels seamless.
      setTimeout(() => {
        if (typeof chrome !== "undefined" && chrome.tabs?.getCurrent) {
          chrome.tabs.getCurrent((t) => t?.id && chrome.tabs.remove(t.id));
        } else {
          window.close();
        }
      }, 900);
    } catch (err: any) {
      setError(err.message || "Failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (signedIn) {
    return (
      <div className="min-h-screen bg-bg text-textPrimary font-sans flex items-center justify-center p-6">
        <div className="max-w-[320px] w-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20">
            <Check className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">You're in.</h2>
          <p className="text-sm text-textMuted">Signed in as <br/><span className="text-textPrimary font-medium">{signedIn.email}</span></p>
          <p className="text-xs text-textMuted mt-4 opacity-60">You can close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-textPrimary font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[340px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 rounded-xl mb-4 shadow-sm shadow-black/50">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Forgot AI</h1>
          <p className="text-sm text-textMuted">{mode === "login" ? "Sign in to your library" : "Create your memory vault"}</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl shadow-black/40 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-textSecondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <input
                data-testid={mode === "login" ? "login-email-input" : "signup-email-input"}
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surfaceHover border border-border text-textPrimary placeholder-textMuted text-sm rounded-lg focus:border-borderFocus focus:ring-0 transition-colors duration-150 h-10 px-3 w-full"
                placeholder="you@example.com"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-textSecondary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Password
              </span>
              <div className="relative">
                <input
                  data-testid={mode === "login" ? "login-password-input" : "signup-password-input"}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-surfaceHover border border-border text-textPrimary placeholder-textMuted text-sm rounded-lg focus:border-borderFocus focus:ring-0 transition-colors duration-150 h-10 px-3 pr-10 w-full"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            {error && (
            <div
              data-testid="auth-error"
              className="text-xs text-red-300 bg-[#450A0A] border border-[#991B1B] rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
          <button
            data-testid={mode === "login" ? "login-submit-button" : "signup-submit-button"}
            type="submit"
            disabled={busy}
            className="bg-textPrimary hover:bg-[#E4E4E7] text-bg font-semibold text-sm rounded-lg h-10 px-4 w-full transition-opacity duration-150 cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          data-testid="toggle-auth-mode-button"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="text-xs text-textMuted hover:text-textPrimary transition-colors duration-150 w-full text-center"
        >
          {mode === "login"
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
      <p className="text-[11px] text-textMuted mt-4">
        Your session is stored locally in this browser only.
      </p>
    </div>
    </div>
  );
}
