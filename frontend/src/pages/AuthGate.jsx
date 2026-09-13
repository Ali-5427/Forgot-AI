import { useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth";
import { formatApiErrorDetail } from "@/api";

export default function AuthGate() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-md bg-neutral-900 flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight">Forgot AI</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-[15px] text-muted-foreground mb-8">
            {mode === "login" ? "Sign in to your memory library." : "Start saving anything you want to remember."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                data-testid="auth-email"
                className="h-11 bg-neutral-50/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                data-testid="auth-password"
                className="h-11 bg-neutral-50/50"
              />
            </div>
            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2" data-testid="auth-error">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full h-11 text-[15px] mt-2 font-medium" disabled={loading} data-testid="auth-submit">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-[14px] text-muted-foreground mt-8 text-center">
            {mode === "login" ? "New to Forgot AI?" : "Already have an account?"}{" "}
            <button
              className="text-neutral-900 font-semibold hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              data-testid="auth-switch"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: Graphic */}
      <div className="hidden lg:flex w-1/2 bg-neutral-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
        <div className="relative z-10 max-w-lg text-center p-12">
          <div className="mx-auto mb-8 h-32 w-32 bg-white rounded-3xl shadow-xl p-2 flex items-center justify-center overflow-hidden">
            <img src="/logo512.png" alt="Forgot AI Logo" className="w-full h-full object-contain rounded-2xl" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
            <Brain className="h-16 w-16 text-neutral-900 hidden" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Your external brain.</h2>
          <p className="text-lg text-neutral-400 leading-relaxed">
            Save links, screenshots, and notes. Instantly find them later by asking your AI in plain English.
          </p>
        </div>
      </div>
    </div>
  );
}
