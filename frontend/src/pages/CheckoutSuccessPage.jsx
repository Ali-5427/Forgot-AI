import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing-page/reveal";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth";
import { api } from "@/api";

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const email = params.get("email") || "";
  const subId = params.get("subscription_id");
  const payId = params.get("payment_id");
  const statusParam = params.get("status");

  useEffect(() => {
    // 1. Instant 0ms Optimistic Unlock
    if (subId || payId || statusParam === "active") {
      const isLifetime = Boolean(payId && !subId);
      const optimisticPlan = {
        plan_type: isLifetime ? "lifetime" : "pro",
        status: isLifetime ? "lifetime" : "trial",
        current_period_end: isLifetime ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_id: subId || null,
        payment_id: payId || null,
        has_access: true,
      };

      try {
        localStorage.setItem("forgot_ai_optimistic_billing", JSON.stringify(optimisticPlan));
        localStorage.setItem("forgot_ai_pro_pass", JSON.stringify(optimisticPlan));
      } catch {}

      // Broadcast to extension immediately so it unlocks on the spot
      if (typeof window !== "undefined") {
        window.postMessage(
          {
            type: "FORGOT_AI_BILLING_SYNC",
            billing: optimisticPlan,
          },
          "*"
        );
      }
    }

    // 2. Background Database Persist
    if (subId || payId || email) {
      api.syncCheckout({ subscription_id: subId, payment_id: payId, email })
        .catch((err) => {
          console.warn("Background checkout sync:", err);
        });
    }
  }, [subId, payId, email, statusParam]);

  return (
    <div className="w-full min-h-[75vh] flex flex-col items-center justify-center px-5 text-center text-ink py-16">
      <Reveal>
        <div className="bg-cream border border-line rounded-3xl p-8 md:p-12 shadow-soft max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Payment Approved
          </span>

          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight mb-3">
            You're all set!
          </h1>

          <p className="text-sm text-ink-muted mb-6 leading-relaxed">
            Your Forgot AI plan is active and your memory library is unlocked.
            {email && (
              <span className="block mt-2 font-medium text-ink bg-white/70 py-1.5 px-3 rounded-xl border border-line/50 inline-block text-xs">
                Account: {email}
              </span>
            )}
          </p>

          <div className="space-y-3 pt-2">
            {user ? (
              <Button
                variant="outline"
                onClick={() => navigate("/settings?billing=success")}
                className="w-full rounded-full h-11 text-sm font-medium border-line hover:bg-paper text-ink transition-colors flex items-center justify-center gap-2"
              >
                Go to Dashboard & Settings <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate(`/login?email=${encodeURIComponent(email)}&redirect=/settings`)}
                className="w-full rounded-full h-11 text-sm font-medium border-line hover:bg-paper text-ink transition-colors flex items-center justify-center gap-2"
              >
                Sign in to your account <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full rounded-full h-11 text-sm font-medium border-line hover:bg-paper transition-colors"
            >
              Back to Home
            </Button>
          </div>

          {(subId || payId) && (
            <p className="text-[11px] text-ink-muted/70 font-mono mt-6">
              Reference ID: {subId || payId}
            </p>
          )}
        </div>
      </Reveal>
    </div>
  );
}
