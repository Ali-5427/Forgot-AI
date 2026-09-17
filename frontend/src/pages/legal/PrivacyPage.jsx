import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: September 17, 2026</p>
        
        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>This Privacy Policy explains how Forgot AI ("we", "us", or "our") collects, uses, and protects your information when you use our website and Chrome extension.</p>
          
          <h2 className="text-ink font-medium text-xl mt-8 mb-4">1. What information we collect</h2>
          <p>We only collect the information necessary to provide the Forgot AI service:</p>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Account Information:</strong> When you sign up, we collect your email address to securely authenticate you and tie your memories to your account.</li>
            <li><strong>Intentionally Saved Content:</strong> When you use the "Save to Forgot AI" button in our extension or web app, we capture the exact text, images, or links you chose to save, along with the source URL and page title.</li>
            <li><strong>AI Metadata:</strong> Our system processes your saved content to generate private metadata (like summaries, titles, and searchable text) to help you find it later.</li>
          </ul>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">2. Chrome Extension Data Collection</h2>
          <p>The Forgot AI Chrome extension requires the <code>&lt;all_urls&gt;</code> permission. This is strictly necessary to allow the "Save to Forgot AI" button to appear when you highlight text on any webpage. We do NOT monitor your background browsing activity, and we only access and transmit webpage data when you explicitly interact with the "Save" button.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">3. How we process your data (AI)</h2>
          <p>To make your memories searchable using natural language, your saved content is processed by a backend AI model (currently utilizing Groq). The generated metadata is stored securely in our database. We do not use your private saved content to train our own foundational AI models, and your data remains isolated to your personal account.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">4. Third-Party Services</h2>
          <p>We rely on trusted third-party providers to operate our service:</p>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Supabase:</strong> For secure database storage and user authentication.</li>
            <li><strong>Vercel & Render:</strong> For hosting our website and backend API.</li>
            <li><strong>Groq:</strong> For AI processing of your saved text.</li>
          </ul>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">5. What we do NOT do</h2>
          <p>We believe your memories are yours. We do NOT sell your personal data. We do NOT use your saved content for targeted advertising. We do NOT track your browsing history outside of the specific items you intentionally save.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">6. Cookies and Tracking</h2>
          <p>We use essential cookies strictly necessary for authenticating your session and keeping you logged in. We do not use third-party advertising or cross-site tracking cookies.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">7. Data Retention and Deletion</h2>
          <p>We retain your account information and saved memories as long as your account is active. You can request full deletion of your account and all associated data at any time. For more information, see our <Link to="/data-deletion" className="underline">Data & Account Deletion</Link> page.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">8. Contact Us</h2>
          <p>For privacy questions or data deletion requests, please contact us at: <a href="mailto:support@forgot-ai.vercel.app">support@forgot-ai.vercel.app</a></p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
