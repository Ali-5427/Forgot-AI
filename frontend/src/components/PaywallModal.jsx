import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth";

export function PaywallModal({ open, onOpenChange, reason }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckout = async (plan) => {
    // 1. Instant 0ms direct navigation
    const directUrl = api.getDirectCheckoutUrl(plan, user);
    if (directUrl) {
      window.location.href = directUrl;
      return;
    }

    if (loadingPlan) return;
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await api.billingCheckout(plan);
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        setError("Failed to create checkout session. Please try again.");
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error("Paywall checkout error:", err);
      setError(err.response?.data?.detail || "Unable to open checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <div className="p-6 sm:p-8 bg-gradient-to-b from-amber-50/50 via-white to-white">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mb-4 shadow-md">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>

          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-neutral-900">
              Keep your memory active
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-600 leading-relaxed">
              {reason || "Your 7-day free trial has concluded. Subscribe to continue saving links, images, and notes with AI semantic search."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {/* Pro Card */}
            <div className="rounded-2xl border border-neutral-200 p-5 bg-neutral-50/50 flex flex-col justify-between hover:border-neutral-300 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Pro</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Popular
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-extrabold text-neutral-900">$5</span>
                  <span className="text-xs text-neutral-500">/ month</span>
                </div>
                <ul className="space-y-2 text-xs text-neutral-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> Unlimited saves & notes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> AI semantic memory search
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> Web & Chrome extension
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleCheckout("pro")}
                disabled={loadingPlan !== null}
                className="w-full h-10 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium"
              >
                {loadingPlan === "pro" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Subscribe for $5/mo"
                )}
              </Button>
            </div>

            {/* Lifetime Card */}
            <div className="rounded-2xl border-2 border-neutral-900 p-5 bg-white flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4">
                <span className="bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Early Bird
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Lifetime</span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-extrabold text-neutral-900">$49</span>
                  <span className="text-xs text-neutral-500">one-time</span>
                </div>
                <ul className="space-y-2 text-xs text-neutral-600 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> Everything in Pro forever
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> Never pay monthly fees
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" /> Founding member badge
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => handleCheckout("lifetime")}
                disabled={loadingPlan !== null}
                variant="outline"
                className="w-full h-10 rounded-xl border-neutral-300 hover:bg-neutral-50 text-neutral-900 text-xs font-medium"
              >
                {loadingPlan === "lifetime" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  "Get Lifetime for $49"
                )}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-100">
            <span>Secure billing by Dodo Payments</span>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate("/pricing");
              }}
              className="text-neutral-700 hover:text-neutral-900 font-medium inline-flex items-center gap-1"
            >
              View full details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
