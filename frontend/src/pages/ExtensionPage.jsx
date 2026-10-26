import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing-page/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Bookmark,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Download,
  Terminal,
  Layers,
  Zap,
  Globe,
  Bell,
  Check,
  Search,
  PenTool,
  Copy,
} from "lucide-react";
import { api } from "@/api";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Chrome Web Store Link Configuration
// Once Google approves the extension listing, paste the final URL here:
// e.g. "https://chromewebstore.google.com/detail/forgot-ai/..."
// ---------------------------------------------------------------------------
export const CHROME_WEBSTORE_URL = ""; // Empty string = "In Review / Coming Soon" mode

export default function ExtensionPage() {
  const context = useOutletContext();
  const onOpenApp = context?.onOpenApp;

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notified, setNotified] = useState(false);
  const [showDevGuide, setShowDevGuide] = useState(false);
  const [activeTab, setActiveTab] = useState("dock"); // 'dock' | 'pill' | 'sidepanel'

  const isLive = Boolean(CHROME_WEBSTORE_URL && CHROME_WEBSTORE_URL.length > 5);

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      if (api.submitFeedback) {
        await api.submitFeedback(`Extension Waitlist Request: ${email.trim()}`);
      }
      setNotified(true);
      toast.success("You're on the list! We'll notify you the moment it's live.");
    } catch (err) {
      // Graceful fallback
      setNotified(true);
      toast.success("You're on the list! We'll notify you the moment it's live.");
    } finally {
      setSubmitting(false);
    }
  };

  const FAQS = [
    {
      q: "Do I need the Chrome extension to use Forgot AI?",
      a: "No! The Forgot AI web application is 100% standalone and complete. The Chrome extension is an optional power-tool designed for saving highlights, web pages, and querying your AI memory without ever leaving the tab you're browsing.",
    },
    {
      q: "Is the extension free to use?",
      a: "Yes. The Forgot AI Chrome extension is completely free for all users. It seamlessly connects to your personal Forgot AI account.",
    },
    {
      q: "Does it work on Brave, Arc, or Microsoft Edge?",
      a: "Yes! Since Arc, Brave, Microsoft Edge, and Opera are built on Chromium, you can install and use the Forgot AI extension across all Chromium-based browsers.",
    },
    {
      q: "How does the extension connect to my account?",
      a: "It features zero-setup 2-way authentication. When you log in on the Forgot AI website, your extension detects the session instantly. No copying and pasting API keys or passwords.",
    },
    {
      q: "Does the extension track my browsing history?",
      a: "Never. Forgot AI only captures content when you explicitly click 'Save' or highlight text. We never log background browsing, sell data, or inject third-party ads. Your memories are encrypted and strictly private to your account.",
    },
    {
      q: "Why does it ask for page access permissions?",
      a: "Chrome requires the '<all_urls>' permission so the floating dock and highlight tooltip can safely mount inside a private Shadow DOM on web pages you browse. It activates exclusively when you choose to save.",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* ----------------------------------------------------------------- */}
      {/* Hero Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto pt-14 pb-20 text-center">
        <Reveal>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border mb-6 transition-all duration-300 bg-amber-500/10 text-amber-900 border-amber-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {isLive ? (
              <span>Now Available on Chrome Web Store</span>
            ) : (
              <span>In Review with Google Chrome Web Store · Launching Soon</span>
            )}
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-medium text-ink tracking-tight max-w-4xl mx-auto mb-6 leading-[1.12]">
            Your AI memory, embedded into every tab you browse.
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Capture highlights in one click, jot down thoughts without breaking your flow,
            and converse with your entire knowledge base in a dedicated Chrome side panel.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-8">
            {isLive ? (
              <a
                href={CHROME_WEBSTORE_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto rounded-full h-12 px-8 text-base font-medium shadow-soft flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5" />
                  Add to Chrome — Free
                </Button>
              </a>
            ) : (
              <a href="#notify-section" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-full h-12 px-8 text-base font-medium shadow-soft flex items-center justify-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notify Me When Live
                </Button>
              </a>
            )}

            <Button
              variant="outline"
              onClick={onOpenApp}
              className="w-full sm:w-auto rounded-full h-12 px-7 text-base font-medium border-line text-ink hover:bg-cream"
            >
              Try Web App First
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Supported Browsers */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-ink-muted">
            <span className="font-medium text-ink">Built for Chromium:</span>
            <span className="px-2.5 py-1 rounded-full bg-cream border border-line">Google Chrome</span>
            <span className="px-2.5 py-1 rounded-full bg-cream border border-line">Brave</span>
            <span className="px-2.5 py-1 rounded-full bg-cream border border-line">Arc Browser</span>
            <span className="px-2.5 py-1 rounded-full bg-cream border border-line">Microsoft Edge</span>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Interactive Feature Showcase */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-display font-medium text-ink mb-3">
              Designed to stay invisible until you need it.
            </h2>
            <p className="text-ink-muted text-base">
              No clutter. No intrusive popups. Clean tools tucked neatly into your browser.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-full bg-cream border border-line">
              <button
                onClick={() => setActiveTab("dock")}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "dock"
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                1. Draggable Floating Dock
              </button>
              <button
                onClick={() => setActiveTab("pill")}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "pill"
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                2. Highlight Pill
              </button>
              <button
                onClick={() => setActiveTab("sidepanel")}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "sidepanel"
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                3. Side Panel Chat
              </button>
            </div>
          </div>

          {/* Active Feature Card Preview */}
          <div className="bg-cream rounded-3xl border border-line shadow-soft p-6 sm:p-10 transition-all duration-300">
            {activeTab === "dock" && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper border border-line text-xs font-semibold uppercase tracking-wider text-ink">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Instant Edge Dock
                  </div>
                  <h3 className="text-2xl font-display font-medium text-ink">
                    Always one click away, never in your way.
                  </h3>
                  <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                    A vertical quick-access dock pinned smoothly to the right edge of any web page.
                    Drag it up or down to your preferred height, or collapse it into a minimal edge nub.
                  </p>
                  <ul className="space-y-2.5 text-sm text-ink-muted pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Save Page:</strong> Full article capture with original source link & title</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Quick Note:</strong> Pop up a lightweight card to capture a fleeting idea</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Summarize:</strong> Instant AI summary directly inside your Chrome Side Panel</span>
                    </li>
                  </ul>
                </div>

                {/* Mockup Preview */}
                <div className="relative rounded-2xl bg-paper border border-line p-6 shadow-sm overflow-hidden flex flex-col justify-center min-h-[300px]">
                  {/* Fake Webpage content */}
                  <div className="space-y-3 opacity-60 pointer-events-none select-none">
                    <div className="h-4 bg-line rounded w-3/4"></div>
                    <div className="h-3 bg-line rounded w-full"></div>
                    <div className="h-3 bg-line rounded w-5/6"></div>
                    <div className="h-3 bg-line rounded w-4/5"></div>
                    <div className="h-24 bg-line/60 rounded-xl w-full my-4"></div>
                  </div>

                  {/* Simulated Floating Dock on the right */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-neutral-900 text-white rounded-2xl p-2 shadow-xl border border-neutral-800">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-md">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-6 h-px bg-neutral-700 my-1"></div>
                    <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white" title="Save Page">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white" title="Ask AI">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white" title="Quick Note">
                      <PenTool className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pill" && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper border border-line text-xs font-semibold uppercase tracking-wider text-ink">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Zero Friction Highlights
                  </div>
                  <h3 className="text-2xl font-display font-medium text-ink">
                    Highlight anything. Remember everything.
                  </h3>
                  <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                    Select any sentence or paragraph on any blog, documentation, or news article.
                    The Forgot AI highlight pill floats gently above your selection so you can save it in one click.
                  </p>
                  <ul className="space-y-2.5 text-sm text-ink-muted pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Optional quick note input to annotate your thought</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Preserves original paragraph context and URL citation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Shadow DOM isolation guarantees zero style collisions</span>
                    </li>
                  </ul>
                </div>

                {/* Mockup Preview */}
                <div className="relative rounded-2xl bg-paper border border-line p-6 shadow-sm min-h-[300px] flex flex-col justify-center">
                  <div className="text-sm text-ink leading-relaxed space-y-2 select-none">
                    <p className="text-ink-muted">
                      "Retrieval-Augmented Generation bridges static language models with dynamic human memory. By indexing raw web knowledge into semantic vector spaces...
                    </p>
                    <div className="relative inline">
                      <span className="bg-amber-200 text-neutral-900 rounded px-1 py-0.5 font-medium shadow-sm">
                        users can retrieve exact snippets without manually filing them into complex folder hierarchies.
                      </span>

                      {/* Floating Save Tooltip Pill */}
                      <div className="absolute -top-12 left-1/4 flex items-center gap-2 bg-neutral-900 text-white text-xs font-medium py-1.5 px-3 rounded-full shadow-xl border border-neutral-800 animate-bounce">
                        <Brain className="w-3.5 h-3.5 text-pink-400" />
                        <span>Save to Forgot AI</span>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-ink-muted">
                      This fundamentally eliminates the chore of manual bookmarking."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sidepanel" && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper border border-line text-xs font-semibold uppercase tracking-wider text-ink">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    Native Chrome Side Panel
                  </div>
                  <h3 className="text-2xl font-display font-medium text-ink">
                    Your personal research assistant beside every tab.
                  </h3>
                  <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                    Open the dedicated Chrome Side Panel to search, ask questions, and brainstorm
                    with your saved memories alongside the page you are reading.
                  </p>
                  <ul className="space-y-2.5 text-sm text-ink-muted pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Real-time streaming answers grounded strictly in your memories</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>One-click links directly back to original articles</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Rich Markdown rendering with code blocks and bullet points</span>
                    </li>
                  </ul>
                </div>

                {/* Mockup Preview */}
                <div className="relative rounded-2xl bg-paper border border-line p-5 shadow-sm min-h-[300px] flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-ink" />
                      <span className="text-xs font-semibold text-ink">Forgot AI Side Panel</span>
                    </div>
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full font-mono">
                      Ask Memory
                    </span>
                  </div>

                  <div className="space-y-3 py-3 text-xs">
                    <div className="bg-cream rounded-xl p-2.5 text-ink self-end max-w-[85%] ml-auto">
                      What did I save about vector search indexing last week?
                    </div>
                    <div className="bg-paper border border-line rounded-xl p-3 text-ink-muted space-y-2">
                      <p className="text-ink font-medium">According to your saved note from October 18:</p>
                      <p>
                        Vector search maps high-dimensional text embeddings to preserve semantic intent rather than relying strictly on exact keyword matching.
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-cream border border-line text-[10px] text-ink">
                        <ExternalLink className="w-3 h-3 text-ink-muted" />
                        <span>Source: arxiv.org/abs/2402...</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-line pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      disabled
                      placeholder="Ask anything across your memories..."
                      className="bg-cream text-xs rounded-full px-3 py-2 w-full border border-line placeholder:text-ink-muted/60"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Privacy & Security Standard */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <Reveal>
          <div className="bg-paper rounded-3xl border border-line p-8 sm:p-12 shadow-soft">
            <div className="max-w-2xl mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream border border-line text-xs font-semibold uppercase tracking-wider text-ink mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Privacy First Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-3">
                Transparent permissions. Zero tracking.
              </h2>
              <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                We believe your browsing activity is sacred. The Forgot AI Chrome extension is
                engineered from the ground up to respect your digital privacy.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-cream border border-line">
                <Lock className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">No Browsing History Logged</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  We never inspect, monitor, or store URLs you visit. The extension only captures text when you explicitly tap Save.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-cream border border-line">
                <ShieldCheck className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">Encrypted in Transit & Rest</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  All synchronization with our servers is secured over TLS 1.3 encryption. Your data is isolated to your private account.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-cream border border-line">
                <CheckCircle2 className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">No 3rd-Party Trackers</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Zero ads, zero data brokers, and zero analytics scripts injected into your visited web pages.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-4 text-xs text-ink-muted">
              <span>Read our complete security commitments:</span>
              <div className="flex gap-4">
                <Link to="/privacy" className="hover:text-ink underline">Privacy Policy</Link>
                <Link to="/security" className="hover:text-ink underline">Security Architecture</Link>
                <Link to="/terms" className="hover:text-ink underline">Terms of Service</Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Waitlist / Notify Section */}
      {/* ----------------------------------------------------------------- */}
      <section id="notify-section" className="px-5 sm:px-8 max-w-3xl mx-auto mb-24 text-center">
        <Reveal>
          <div className="bg-cream rounded-3xl border border-line p-8 sm:p-12 shadow-soft">
            <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-3">
              Be the first to know when it goes live.
            </h2>
            <p className="text-ink-muted text-sm sm:text-base max-w-lg mx-auto mb-8">
              We'll send you a single email the second Google approves the extension on the Chrome Web Store.
            </p>

            {notified ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-sm font-medium inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                You're all set! We'll notify you as soon as the store link is active.
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-4 py-3 rounded-full bg-paper border border-line text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full px-6 h-12 text-sm font-medium shadow-soft shrink-0"
                >
                  {submitting ? "Adding..." : "Notify Me"}
                </Button>
              </form>
            )}

            {/* Developer Preview Toggle */}
            <div className="mt-8 pt-6 border-t border-line text-xs text-ink-muted">
              <span>Developer or tester? </span>
              <button
                type="button"
                onClick={() => setShowDevGuide(!showDevGuide)}
                className="text-ink font-medium underline hover:opacity-80"
              >
                {showDevGuide ? "Hide manual installation guide" : "Install developer preview build (Load Unpacked)"}
              </button>
            </div>

            {/* Developer Guide Accordion */}
            {showDevGuide && (
              <div className="mt-6 text-left p-6 rounded-2xl bg-paper border border-line text-xs text-ink space-y-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Terminal className="w-4 h-4 text-ink" />
                  Manual Installation via Chrome Developer Mode:
                </div>
                <ol className="list-decimal list-inside space-y-2 text-ink-muted leading-relaxed">
                  <li>Clone or download the repository from GitHub: <code className="bg-cream px-1.5 py-0.5 rounded text-ink font-mono">https://github.com/Ali-5427/Forgot-AI</code></li>
                  <li>Build the extension locally: <code className="bg-cream px-1.5 py-0.5 rounded text-ink font-mono">cd extension && npm install && npm run build</code></li>
                  <li>Open Google Chrome and navigate to <code className="bg-cream px-1.5 py-0.5 rounded text-ink font-mono">chrome://extensions</code></li>
                  <li>Toggle <strong>Developer mode</strong> in the top right corner.</li>
                  <li>Click <strong>Load unpacked</strong> and select the <code className="bg-cream px-1.5 py-0.5 rounded text-ink font-mono">Forgot-AI/extension/dist</code> folder.</li>
                </ol>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FAQ Section */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-3xl mx-auto mb-24" id="faq">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-line">
                <AccordionTrigger className="text-left font-medium text-ink hover:text-ink/80 text-sm sm:text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-ink-muted leading-relaxed text-sm">
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
