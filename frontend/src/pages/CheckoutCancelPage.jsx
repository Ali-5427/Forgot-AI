import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing-page/reveal";

export default function CheckoutCancelPage() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-5 text-center text-ink">
      <Reveal>
        <div className="bg-paper border border-line rounded-3xl p-8 md:p-12 shadow-soft max-w-lg mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight mb-4">
            No problem.
          </h1>
          <p className="text-lg text-ink-muted mb-8">
            Your checkout wasn't completed. You can come back whenever you're ready.
          </p>
          <Button asChild variant="outline" className="w-full rounded-full h-12 text-base font-medium border-line hover:bg-cream">
            <Link to="/pricing">
              Back to Pricing
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
