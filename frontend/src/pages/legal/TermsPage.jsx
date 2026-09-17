
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Terms of Service</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: September 17, 2026</p>
        
        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>By accessing or using Forgot AI, you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.</p>
          
          <h2 className="text-ink font-medium text-xl mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>Forgot AI provides a personal memory and bookmarking service through a website and a browser extension. By creating an account or using our services, you confirm you accept these Terms.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">2. Your Account</h2>
          <p>You must provide a valid email address to create an account. You are responsible for maintaining the security of your account credentials. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">3. User Content</h2>
          <p>You retain all rights to the content you save using Forgot AI. By saving content, you grant us a license to store, process, and display that content exclusively to you for the purpose of providing the service.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">4. AI Processing and Accuracy</h2>
          <p>Forgot AI utilizes artificial intelligence to summarize and organize the content you save. Because AI can make mistakes, metadata, summaries, or search results may occasionally be inaccurate. You should not rely on AI-generated summaries for critical medical, legal, or financial decisions.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">5. Acceptable Use</h2>
          <p>You agree not to use Forgot AI to store illegal content, distribute malware, or attempt to exploit the service's API or infrastructure. We reserve the right to limit API usage to prevent abuse.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">6. Third-Party Content</h2>
          <p>Because Forgot AI allows you to save content from anywhere on the web, you may encounter third-party content. We are not responsible for the accuracy, legality, or safety of the content you choose to save from external websites.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">7. Service Availability</h2>
          <p>We strive to keep Forgot AI running smoothly, but the service is provided "as is" and "as available." We do not guarantee uninterrupted access and are not liable for temporary downtime or data loss, though we take active measures to protect your data.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">8. Changes to the Service</h2>
          <p>We are continuously improving Forgot AI. We may add, modify, or remove features at any time. We will notify users of any significant changes to the service or these Terms.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">9. Contact</h2>
          <p>For questions about these Terms, contact us at: <a href="mailto:support@forgot-ai.vercel.app">support@forgot-ai.vercel.app</a></p>
        </div>
      </div>
      
    </div>
  );
}

