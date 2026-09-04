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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-8 w-8 rounded-md bg-neutral-900 flex items-center justify-center">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Forgot AI</span>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h1 className="text-xl font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {mode === "login" ? "Sign in to your memory library." : "Start saving anything you want to remember."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              data-testid="auth-email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              data-testid="auth-password"
            />
            {error && (
              <p className="text-sm text-destructive" data-testid="auth-error">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="auth-submit">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            {mode === "login" ? "New to Forgot AI?" : "Already have an account?"}{" "}
            <button
              className="text-foreground font-medium hover:underline"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              data-testid="auth-switch"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
