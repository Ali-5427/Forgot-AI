import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function RefundPage() {
  useEffect(() => {
    document.title = "Refund Policy | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Refund Policy</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: October 4, 2026</p>

        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>This Refund Policy explains our refund policy for Forgot AI subscriptions and purchases.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Refund Requests</h2>
          <p>To request a refund, please contact support at <a href="mailto:jmohammadali5427@gmail.com" className="underline">jmohammadali5427@gmail.com</a> with your order details and reason for the refund request.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Pro Subscriptions</h2>
          <p>Pro subscriptions are recurring monthly subscriptions. You may cancel your subscription at any time to stop future charges. Refunds for past months are not provided except in cases of billing errors or technical issues that prevent access to the service.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Founding Lifetime</h2>
          <p>Founding Lifetime is a one-time purchase. Due to the nature of lifetime access, refunds are not available after purchase unless there is a technical issue that prevents access to the service.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Technical Issues</h2>
          <p>If you experience technical issues that prevent you from using the service, please contact our support team. We will work to resolve the issue and may provide a refund if the issue cannot be resolved.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Contact Us</h2>
          <p>For refund requests or questions about this policy, please contact us at: <a href="mailto:jmohammadali5427@gmail.com" className="underline">jmohammadali5427@gmail.com</a></p>
        </div>
      </div>
    </div>
  );
}
