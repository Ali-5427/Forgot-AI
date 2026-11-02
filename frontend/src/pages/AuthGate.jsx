import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { Loader2, Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth";
import { api, formatApiErrorDetail, getToken, getRefreshToken } from "@/api";

export default function AuthGate({ initialMode = "login", onClose }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExtension = searchParams.get("source") === "extension";
  const urlMode = searchParams.get("mode");
  const targetPlan = searchParams.get("plan");
  const isTargetPlan = targetPlan === "pro" || targetPlan === "lifetime";

  const [mode, setMode] = useState(() => {
    if (urlMode === "login") return "login";
    if (urlMode === "signup" || isTargetPlan) return "register";
    return initialMode;
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);

  // Sync to extension and optionally auto-close if authenticated
  useEffect(() => {
    if (user && isExtension) {
      if (typeof window !== "undefined") {
        window.postMessage(
          {
            type: "FORGOT_AI_AUTH_SYNC",
            session: {
              token: getToken(),
              refresh_token: getRefreshToken() || undefined,
              user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at || new Date().toISOString(),
              },
            },
          },
          "*"
        );
      }
      const timer = setTimeout(() => {
        try {
          window.close();
        } catch {}
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [user, isExtension]);

  // If already authenticated and arriving with a plan intent, forward straight to checkout
  useEffect(() => {
    if (user && !isExtension && isTargetPlan && !redirectingToCheckout) {
      const directUrl = api.getDirectCheckoutUrl(targetPlan, user);
      if (directUrl) {
        window.location.href = directUrl;
        return;
      }
      setRedirectingToCheckout(true);
      api.billingCheckout(targetPlan)
        .then((res) => {
          if (res?.checkout_url) {
            window.location.href = res.checkout_url;
          } else {
            navigate("/pricing");
          }
        })
        .catch((err) => {
          console.error("Auto checkout error:", err);
          navigate("/pricing");
        });
    }
  }, [user, isExtension, isTargetPlan, targetPlan, redirectingToCheckout, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let authData;
      if (mode === "login") authData = await login(email, password);
      else authData = await register(email, password);

      if (isTargetPlan) {
        const authedUser = authData?.user || user || { email };
        const directUrl = api.getDirectCheckoutUrl(targetPlan, authedUser);
        if (directUrl) {
          window.location.href = directUrl;
          return;
        }

        setRedirectingToCheckout(true);
        try {
          const res = await api.billingCheckout(targetPlan);
          if (res?.checkout_url) {
            window.location.href = res.checkout_url;
            return;
          }
        } catch (checkoutErr) {
          console.error("Auto checkout error after auth:", checkoutErr);
          navigate("/pricing");
          return;
        }
      }
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // If redirecting to checkout session
  if (redirectingToCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center space-y-4 max-w-sm animate-in fade-in zoom-in-95 duration-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-900" />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Opening secure checkout...</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {targetPlan === "pro"
              ? "Preparing your 7-day free trial of Pro. A payment method is required to begin, but you won't be charged today."
              : "Preparing your Founding Lifetime membership checkout."}
          </p>
        </div>
      </div>
    );
  }

  // If already authenticated:
  if (user) {
    if (isExtension) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6 relative">
          <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Connected to Extension
              </h1>
              <p className="text-sm text-neutral-600 mt-2">
                Signed in as <span className="font-semibold text-neutral-900">{user.email}</span>
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Your Forgot AI extension is now synced. You can close this tab.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => window.close()}
                className="h-10 px-5 text-sm font-medium"
              >
                Close tab
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="h-10 px-5 text-sm font-medium"
              >
                Open Web Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-white relative">
      {/* Back button */}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute left-6 top-6 z-20 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : (
        <Link
          to="/"
          className="absolute left-6 top-6 z-20 flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      )}

      {/* Left: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-semibold text-xl tracking-tight">Forgot AI</span>
          </div>

          {isExtension && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/60 text-neutral-700 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sign in to connect Forgot AI Extension
            </div>
          )}

          {isTargetPlan && (
            <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl text-left">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">✨</span>
                <div>
                  <h4 className="text-xs font-semibold text-amber-950 uppercase tracking-wider">
                    {targetPlan === "pro" ? "7-Day Free Trial Included" : "Founding Lifetime Offer ($49)"}
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                    {targetPlan === "pro"
                      ? "Create an account to start your trial. A payment method is required to begin, but you won't be charged today."
                      : "Create an account to complete your one-time payment for lifetime access."}
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  data-testid="auth-password"
                  className="h-11 bg-neutral-50/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === "login" && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}
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
            <img src="/logo.jpg" alt="Forgot AI Logo" className="w-full h-full object-contain rounded-2xl" />
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
