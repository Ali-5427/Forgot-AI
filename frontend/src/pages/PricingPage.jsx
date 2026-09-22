import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Reveal } from "@/components/landing-page/reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function PricingPage() {
  const navigate = useNavigate();
  const STRIPE_PRO_MONTHLY_PRICE_ID = 'price_placeholder_pro_monthly';
  const STRIPE_LIFETIME_PRICE_ID = 'price_placeholder_lifetime';

  const handleCheckout = (priceId) => {
    // Placeholder handler for Stripe Checkout
    alert(`Stripe Checkout will be connected here.\nPrice ID: ${priceId}`);
    // Simulate flow
    // navigate('/checkout/success');
  };

  const PRO_FEATURES = [
    "Save useful information",
    "AI understands what you save",
    "Ask your memory",
    "Search and retrieve memories",
    "Save text, links, images and notes",
    "Preserve original context"
  ];

  const LIFETIME_FEATURES = [
    "Everything in Pro",
    "Lifetime Pro access",
    "No recurring subscription",
    "Built for early users of Forgot AI"
  ];

  const FAQS = [
    {
      q: "Can I try Forgot AI before paying?",
      a: "Yes. New users can start with a 7-day free trial. After the trial, you can continue with Pro or choose Founding Lifetime access."
    },
    {
      q: "How much is Pro?",
      a: "Pro is $5/month after the 7-day trial."
    },
    {
      q: "Is Founding Lifetime a subscription?",
      a: "No. Founding Lifetime is a one-time $49 payment."
    },
    {
      q: "Can I cancel Pro?",
      a: "Yes. Pro can be cancelled anytime through your account settings once billing is connected."
    },
    {
      q: "What happens after my trial ends?",
      a: "Your trial ends after 7 days. You can then continue with the paid Pro subscription if you have an active subscription, or choose another available paid option."
    },
    {
      q: "Will the price change?",
      a: "Founding Lifetime is an early-user offer. Future pricing may change."
    }
  ];

  return (
    <div className="w-full pb-24 text-ink">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-5 sm:px-8 max-w-4xl mx-auto text-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-4">Simple pricing for your memory</p>
          <h1 className="text-4xl md:text-5xl font-display font-medium tracking-tight mb-6">
            Forgot AI is simple to use, and simple to pay for.
          </h1>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Start free for 7 days. Keep using Forgot AI for $5/month, or get Founding Lifetime access for $49 once.
          </p>
          <div className="mt-8 inline-block bg-cream rounded-full px-4 py-2 text-sm font-medium border border-line">
            Enjoy a full 7-day free trial. No credit card required to start.
          </div>
        </Reveal>
      </section>

      {/* Pricing Cards */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {/* Pro Card */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-line bg-cream p-8 shadow-soft flex flex-col h-full lift">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">PRO</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">$5</span>
                  <span className="text-ink-muted">/month</span>
                </div>
                <p className="text-sm font-medium text-ink-muted">7-day free trial</p>
              </div>
              <Button 
                onClick={() => handleCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
                variant="outline"
                className="w-full rounded-full h-12 text-base font-medium mb-8 border-line hover:bg-paper"
              >
                Start 7-day free trial
              </Button>
              <div className="space-y-4 flex-1 mb-8">
                {PRO_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-ink shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-muted text-center mt-auto">
                7 days free. Then $5/month. Cancel anytime.
              </p>
            </div>
          </Reveal>

          {/* Lifetime Card */}
          <Reveal delay={0.2}>
            <div className="rounded-3xl border-2 border-ink bg-cream p-8 shadow-soft flex flex-col h-full relative lift">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-ink text-paper text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full">
                  FOUNDING OFFER
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">FOUNDING LIFETIME</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">$49</span>
                </div>
                <p className="text-sm font-medium text-ink-muted">one-time</p>
              </div>
              <Button 
                onClick={() => handleCheckout(STRIPE_LIFETIME_PRICE_ID)}
                variant="outline"
                className="w-full rounded-full h-12 text-base font-medium mb-8 border-line hover:bg-paper text-ink"
              >
                Get Lifetime Access
              </Button>
              <div className="space-y-4 flex-1 mb-8">
                {LIFETIME_FEATURES.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-ink shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-muted text-center mt-auto">
                One-time payment.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-5 sm:px-8 max-w-3xl mx-auto mb-24 text-center">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-display font-medium mb-4">
            You don't need another place to organize everything.
          </h2>
          <p className="text-lg text-ink-muted">
            Forgot AI is built around a simpler idea: save useful things now and find them when you actually need them.
          </p>
        </Reveal>
      </section>

      {/* How it Works Summary */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <Reveal>
          <div className="bg-cream rounded-3xl p-8 md:p-12 border border-line shadow-soft">
            <h2 className="text-2xl font-display font-medium mb-8 text-center">Start remembering in minutes.</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="font-semibold mb-2 text-ink">1. Save</h4>
                <p className="text-sm text-ink-muted">Send or save something useful.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-ink">2. Forget</h4>
                <p className="text-sm text-ink-muted">Go back to your work. Forgot AI remembers it.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-ink">3. Ask</h4>
                <p className="text-sm text-ink-muted">Later, describe what you vaguely remember.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-ink">4. Find it</h4>
                <p className="text-sm text-ink-muted">Forgot AI brings the relevant memory back.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Comparison Table */}
      <section className="px-5 sm:px-8 max-w-4xl mx-auto mb-24">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-display font-medium mb-8 text-center">Everything you need to remember what matters.</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-4 px-4 font-medium text-ink-muted w-1/2"></th>
                  <th className="py-4 px-4 font-semibold text-center w-1/4">Pro</th>
                  <th className="py-4 px-4 font-semibold text-center w-1/4">Founding Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  { label: "Save text", pro: "✓", lifetime: "✓" },
                  { label: "Save links", pro: "✓", lifetime: "✓" },
                  { label: "Save images", pro: "✓", lifetime: "✓" },
                  { label: "AI understanding", pro: "✓", lifetime: "✓" },
                  { label: "Ask your memory", pro: "✓", lifetime: "✓" },
                  { label: "Memory retrieval", pro: "✓", lifetime: "✓" },
                  { label: "Original context preserved", pro: "✓", lifetime: "✓" },
                  { label: "Subscription", pro: "$5/month", lifetime: "—" },
                  { label: "Lifetime access", pro: "—", lifetime: "✓" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-cream transition-colors">
                    <td className="py-4 px-4 text-sm font-medium">{row.label}</td>
                    <td className="py-4 px-4 text-sm text-center text-ink-muted">{row.pro}</td>
                    <td className="py-4 px-4 text-sm text-center text-ink-muted">{row.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-5 sm:px-8 max-w-3xl mx-auto" id="faq">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-display font-medium mb-8 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-line">
                <AccordionTrigger className="text-left font-medium text-ink hover:text-ink/80">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-ink-muted leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </section>
    </div>
  );
}
