import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API, getToken, setToken } from "@/api";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get access_token from URL params (Supabase sends this)
  const accessToken = searchParams.get("access_token");

  useEffect(() => {
    if (!accessToken) {
      setError("Invalid or expired reset link. Please request a new password reset.");
    } else {
      // Set the token temporarily for the API call
      setToken(accessToken);
    }
  }, [accessToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!accessToken) {
      setError("Invalid or expired reset link. Please request a new password reset.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Password updated successfully");
        // Clear the token since all sessions are invalidated
        setToken(null);
        navigate("/");
      } else {
        setError(data.detail || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to home
          </Link>

          <div className="flex items-center gap-2 mb-10">
            <img src="/logo.jpg" alt="Forgot AI Logo" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-semibold text-xl tracking-tight">Forgot AI</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">Set new password</h1>
          <p className="text-[15px] text-muted-foreground mb-8">
            Enter your new password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">New password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-11 bg-neutral-50/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Confirm password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 bg-neutral-50/50"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-[15px] font-medium"
              disabled={loading || !accessToken}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
            </Button>
          </form>

          <p className="text-[14px] text-muted-foreground mt-8 text-center">
            Remember your password?{" "}
            <Link to="/" className="text-neutral-900 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

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
