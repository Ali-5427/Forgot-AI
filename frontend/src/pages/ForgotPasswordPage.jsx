import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      setSubmitted(true);
      toast.success("If an account exists for this email, we'll send a reset link.");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
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

          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {submitted ? "Check your email" : "Reset your password"}
          </h1>
          <p className="text-[15px] text-muted-foreground mb-8">
            {submitted
              ? "We've sent a password reset link to your email if an account exists."
              : "Enter your email address and we'll send you a link to reset your password."}
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 bg-neutral-50/50"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-[15px] font-medium"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          ) : (
            <Button
              onClick={() => navigate("/")}
              className="w-full h-11 text-[15px] font-medium"
            >
              Back to home
            </Button>
          )}

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
