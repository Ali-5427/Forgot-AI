
import { Link } from "react-router-dom";
import { useEffect } from "react";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col mx-auto max-w-5xl w-full text-ink">
      <div className="flex-1 mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link to="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="font-display text-4xl font-medium tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-sm text-ink-muted mb-8">Last updated: October 20, 2026</p>

        <div className="prose prose-neutral max-w-none text-ink-muted">
          <p>This Privacy Policy explains how Forgot AI ("we", "us", or "our") collects, uses, and protects your information when you use our website and Chrome extension.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">1. What information we collect</h2>
          <p>We only collect the information necessary to provide the Forgot AI service:</p>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Account Information:</strong> When you sign up, we collect your email address to securely authenticate you and tie your memories to your account.</li>
            <li><strong>Intentionally Saved Content:</strong> When you use the "Save to Forgot AI" button in our extension or web app, we capture the exact text, images, or links you chose to save, along with the source URL and page title.</li>
            <li><strong>AI Metadata:</strong> Our system processes your saved content to generate private metadata (like summaries, titles, and searchable text) to help you find it later.</li>
            <li><strong>Conversational Chat History:</strong> When you use the "Ask your memory" chat feature, we store your questions and the AI-generated responses in your account so you can refer back to past conversations.</li>
          </ul>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">2. Chrome Extension Data Collection</h2>
          <p>The Forgot AI Chrome extension requires the <code>&lt;all_urls&gt;</code> permission. This is strictly necessary to allow the "Save to Forgot AI" button to appear when you highlight text on any webpage. We do NOT monitor your background browsing activity, and we only access and transmit webpage data when you explicitly interact with the "Save" button.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">3. How we process your data (AI)</h2>
          <p>To enrich and organize your saved content, our backend uses AI services from multiple providers: <strong>Ollama</strong> processes your saved text to generate titles, summaries, and keywords; <strong>Groq</strong> processes uploaded images to extract and describe visual content; and <strong>Nvidia</strong> generates vector embeddings that power semantic search. For conversational chat queries, your question and relevant saved memories are sent to an AI language model for response generation. Your content is processed solely to provide the service and is not used to train our own foundational AI models.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">4. Third-Party Services</h2>
          <p>We rely on trusted third-party providers to operate our service:</p>
          <ul className="list-disc pl-5 space-y-2 mt-4">
            <li><strong>Supabase:</strong> For secure database storage and user authentication.</li>
            <li><strong>Vercel &amp; Render:</strong> For hosting our website and backend API.</li>
            <li><strong>Ollama:</strong> For AI-powered text enrichment — generating titles, summaries, keywords, and categories from your saved content, and for powering conversational chat responses. Your saved content text is transmitted to this provider for processing.</li>
            <li><strong>Groq:</strong> For AI vision processing — extracting and describing content from images you save.</li>
            <li><strong>Nvidia:</strong> For vector embedding generation used to power semantic search.</li>
            <li><strong>Dodo Payments:</strong> Merchant of Record for Pro subscriptions and Lifetime purchases. Payment processing is handled entirely by Dodo Payments — we do not store your card details.</li>
            <li><strong>Web3Forms:</strong> Used to securely deliver in-app feedback messages to our team's inbox.</li>
            <li><strong>Umami:</strong> A privacy-focused analytics service we use to understand general website usage patterns (such as page views). Umami does not use cookies and does not collect personal identifiers.</li>
          </ul>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">5. What we do NOT do</h2>
          <p>We believe your memories are yours. We do NOT sell your personal data. We do NOT use your saved content for targeted advertising. We do NOT track your browsing history outside of the specific items you intentionally save.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">6. Local Storage and Tracking</h2>
          <p>We use browser local storage (localStorage) to securely store your authentication token and keep you logged in across sessions. We do not set advertising or cross-site tracking cookies. We use Umami Analytics for privacy-friendly, cookieless website usage statistics — no personal identifiers are collected.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">7. Data Retention and Deletion</h2>
          <p>We retain your account information and saved memories as long as your account is active. You can request full deletion of your account and all associated data at any time. For more information, see our <Link to="/data-deletion" className="underline">Data &amp; Account Deletion</Link> page.</p>

          <h2 className="text-ink font-medium text-xl mt-8 mb-4">8. Contact Us</h2>
          <p>For privacy questions or data deletion requests, please contact us at: <a href="mailto:jmohammadali5427@gmail.com">jmohammadali5427@gmail.com</a></p>
        </div>
      </div>

    </div>
  );
}
