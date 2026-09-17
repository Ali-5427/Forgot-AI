
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function ContactPage() {
  useEffect(() => {
    document.title = "Contact Support | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Contact & Support</h1>
        
        <div className="prose prose-neutral max-w-none text-ink-muted mt-8">
          <p>We are here to help you with any issues, questions, or requests regarding Forgot AI.</p>
          
          <div className="bg-neutral-50 p-6 rounded-lg border border-border mt-8">
            <h2 className="text-ink font-medium text-xl mb-4 mt-0">Support Email</h2>
            <p className="mb-0">Please reach out to us directly at:</p>
            <p className="mt-2 mb-0"><a href="mailto:support@forgot-ai.vercel.app" className="text-ink font-medium text-lg">support@forgot-ai.vercel.app</a></p>
          </div>

          <h3 className="text-ink font-medium mt-8 mb-2">When contacting us, please indicate if your request is regarding:</h3>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Technical Issues:</strong> Bugs, extension problems, or website errors.</li>
            <li><strong>Account Assistance:</strong> Login trouble or account management.</li>
            <li><strong>Data & Privacy:</strong> Requests to view, export, or delete your personal data.</li>
            <li><strong>Feedback:</strong> Feature requests or general thoughts on the product.</li>
          </ul>

          <p className="mt-8">We aim to respond to all inquiries within 1-2 business days.</p>
        </div>
      </div>
      
    </div>
  );
}

