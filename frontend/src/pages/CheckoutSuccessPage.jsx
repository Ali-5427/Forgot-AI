import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing-page/reveal";

export default function CheckoutSuccessPage() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-5 text-center text-ink">
      <Reveal>
        <div className="bg-paper border border-line rounded-3xl p-8 md:p-12 shadow-soft max-w-lg mx-auto">
          <div className="text-4xl mb-6">🧠</div>
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight mb-4">
            You're in.
          </h1>
          <p className="text-lg text-ink-muted mb-8">
            Your Forgot AI plan is now being activated.
          </p>
          <Button asChild className="w-full rounded-full h-12 text-base font-medium bg-ink text-paper hover:opacity-90">
            <Link to="/">
              Go to Forgot AI
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
