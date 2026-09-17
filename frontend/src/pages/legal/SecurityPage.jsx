
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function SecurityPage() {
  useEffect(() => {
    document.title = "Security | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Security at Forgot AI</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: September 17, 2026</p>
        
        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>We take the security and privacy of your personal memories seriously. Here is how we protect your data.</p>
          
          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Data Isolation & Ownership</h2>
          <p>Your data is strictly isolated. We utilize Row Level Security (RLS) on our Supabase database to ensure that you, and only you, can access, read, or modify your saved memories. Other users cannot access your data.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Encryption in Transit</h2>
          <p>All data transmitted between your browser, our Chrome extension, our backend, and our database is encrypted using industry-standard HTTPS/TLS protocols.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Secure Extension Architecture</h2>
          <p>The Forgot AI Chrome extension does not embed any secret API keys. All communication with third-party AI services is securely routed through our authenticated backend servers. The extension requests only the permissions strictly necessary to function.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Authentication</h2>
          <p>We use Supabase Auth for secure session management. Your authentication tokens are handled securely, and you are automatically protected from unauthorized access.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Continuous Improvement</h2>
          <p>Security is continuously improved as the product evolves. We regularly audit our dependencies, monitor error logs for anomalies, and adhere to least-privilege architecture principles.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">Report a Vulnerability</h2>
          <p>If you believe you have discovered a security vulnerability in Forgot AI, please report it to us immediately at <a href="mailto:support@forgot-ai.vercel.app">support@forgot-ai.vercel.app</a>.</p>
        </div>
      </div>
      
    </div>
  );
}

