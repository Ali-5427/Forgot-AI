import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing-page/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FolderTree,
  Search,
  HardDrive,
  CopyCheck,
  CheckCircle2,
  ShieldCheck,
  Download,
  Laptop,
  Apple,
  AlertCircle,
  Bell,
  Check,
  ArrowRight,
  FileText,
  Sparkles,
} from "lucide-react";
import { api } from "@/api";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Den Desktop Installers Configuration
// v1.0.0 Official GitHub Release Binaries
// ---------------------------------------------------------------------------
export const DEN_DMG_URL = "https://github.com/Ali-5427/Homy/releases/download/v1.0.0/Den-1.0.0.dmg";
export const DEN_DMG_ARM64_URL = "https://github.com/Ali-5427/Homy/releases/download/v1.0.0/Den-1.0.0-arm64.dmg";
export const DEN_EXE_URL = "https://github.com/Ali-5427/Homy/releases/download/v1.0.0/Den.Setup.1.0.0.exe";

export default function DenPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notified, setNotified] = useState(false);

  const hasMacUrl = Boolean(DEN_DMG_URL && DEN_DMG_URL.trim().length > 0);
  const hasMacArm64Url = Boolean(DEN_DMG_ARM64_URL && DEN_DMG_ARM64_URL.trim().length > 0);
  const hasWinUrl = Boolean(DEN_EXE_URL && DEN_EXE_URL.trim().length > 0);

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      if (api.submitFeedback) {
        await api.submitFeedback(`Den Desktop Updates Request: ${email.trim()}`);
      }
      setNotified(true);
      toast.success("You're on the list! We'll keep you updated on new releases.");
    } catch (err) {
      setNotified(true);
      toast.success("You're on the list! We'll keep you updated on new releases.");
    } finally {
      setSubmitting(false);
    }
  };

  const FAQS = [
    {
      q: "How is Den different from Forgot AI?",
      a: "Forgot AI is your online memory for text, links, highlights, and web browsing. Den is a standalone desktop app built specifically for the files already resting on your computer's hard drive (Downloads, Desktop, Documents).",
    },
    {
      q: "Does Den upload my files to the cloud?",
      a: "Never. Den runs entirely on your local machine. Your files, folder structures, and search index stay 100% on your device. There is no cloud storage, no account requirement, and zero telemetry on your file contents.",
    },
    {
      q: "Will Den move, rename, or delete files on its own?",
      a: "No. Den never touches or deletes files automatically. It organizes files into virtual shelves so you can find them easily. If Den detects duplicate downloads or old junk, it only cleans them up after you review and explicitly confirm.",
    },
    {
      q: "What operating systems are supported?",
      a: "Den is built for both macOS (Apple Silicon M-series and Intel) and Windows (64-bit). Linux support is planned for later.",
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border mb-6 bg-emerald-500/10 text-emerald-900 border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>v1.0.0 Available for macOS & Windows</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-medium text-ink tracking-tight max-w-3xl mx-auto mb-6 leading-[1.12]">
            A simple home for files already on your computer.
          </h1>

          {/* Subtitle / Problem */}
          <p className="text-lg sm:text-xl text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Downloads pile up, Desktops get cluttered, and cryptic filenames get lost.
            Den gives your local files clear shelves, natural search, and safe cleanup—with zero cloud uploads.
          </p>

          {/* Download Buttons Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-4">
            {/* Mac Installer Button */}
            {hasMacUrl ? (
              <a href={DEN_DMG_URL} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-full h-12 px-7 text-sm font-medium shadow-soft flex items-center justify-center gap-2">
                  <Apple className="w-4 h-4" />
                  Download for Mac (.dmg)
                </Button>
              </a>
            ) : (
              <Button
                disabled
                variant="outline"
                className="w-full sm:w-auto rounded-full h-12 px-6 text-sm font-medium border-line text-ink-muted opacity-75 cursor-not-allowed flex items-center justify-center gap-2 bg-cream/50"
              >
                <Apple className="w-4 h-4" />
                Mac (.dmg) — Coming soon
              </Button>
            )}

            {/* Windows Installer Button */}
            {hasWinUrl ? (
              <a href={DEN_EXE_URL} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto rounded-full h-12 px-7 text-sm font-medium shadow-soft flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Download for Windows (.exe)
                </Button>
              </a>
            ) : (
              <Button
                disabled
                variant="outline"
                className="w-full sm:w-auto rounded-full h-12 px-6 text-sm font-medium border-line text-ink-muted opacity-75 cursor-not-allowed flex items-center justify-center gap-2 bg-cream/50"
              >
                <Download className="w-4 h-4" />
                Windows (.exe) — Coming soon
              </Button>
            )}
          </div>

          {/* Apple Silicon link note */}
          {hasMacArm64Url && (
            <div className="text-xs text-ink-muted mb-6">
              <span>Apple Silicon (M1/M2/M3/M4)? </span>
              <a
                href={DEN_DMG_ARM64_URL}
                className="text-ink font-medium underline hover:opacity-80"
              >
                Download ARM64 .dmg
              </a>
            </div>
          )}

          {/* Installation Honesty Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-ink-muted max-w-xl mx-auto mb-8 bg-cream/60 border border-line rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
            <p className="text-left sm:text-center">
              <strong>Install note:</strong> Early preview builds are indie-signed. macOS Gatekeeper or Windows SmartScreen may show a standard safety prompt on first launch.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* What It Does (4 Calm Pillars) */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-display font-medium text-ink mb-3">
              How Den brings calm to your local files.
            </h2>
            <p className="text-ink-muted text-base">
              You shouldn't have to spend your weekend organizing folders. Den does the heavy lifting while keeping you in full control.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-cream border border-line shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-paper border border-line flex items-center justify-center text-ink">
                <FolderTree className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-medium text-ink">
                1. Pick your folders
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Point Den to your Downloads, Desktop, or project folders. Your files stay exactly where they are—Den indexes them quietly without moving or scattering them.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-cream border border-line shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-paper border border-line flex items-center justify-center text-ink">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-medium text-ink">
                2. Clear shelves & groups
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Den groups loose files into neat, logical shelves—invoices, receipts, books, screenshots, archives—without forcing you into nested subfolder mazes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-cream border border-line shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-paper border border-line flex items-center justify-center text-ink">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-medium text-ink">
                3. Search in normal words
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Remember what the file was, not what it was named. Search for "tax return from March" or "Figma mobile export", hit Enter, and open the real file instantly.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-7 rounded-3xl bg-cream border border-line shadow-soft space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-paper border border-line flex items-center justify-center text-ink">
                <CopyCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-medium text-ink">
                4. Duplicates & cleanup with confirm
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Downloads folder full of duplicate copies like <code>report (1).pdf</code>? Den spots duplicate files and temporary clutter, and cleans them only after you review and approve.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Local-Only Guarantee */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-5 sm:px-8 max-w-5xl mx-auto mb-24">
        <Reveal>
          <div className="bg-paper rounded-3xl border border-line p-8 sm:p-12 shadow-soft">
            <div className="max-w-2xl mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream border border-line text-xs font-semibold uppercase tracking-wider text-ink mb-3">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                100% On-Device
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-3">
                Your computer. Your files. Period.
              </h2>
              <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                Most modern tools immediately try to sync your entire hard drive to someone else's server. Den does the opposite.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-cream border border-line">
                <ShieldCheck className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">Zero Cloud Uploads</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your documents, spreadsheets, and personal files never leave your local storage. Den works completely offline.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-cream border border-line">
                <FolderTree className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">No Proprietary Vaults</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Den points to your existing folders in Finder or Explorer. If you ever close Den, your files remain right where you left them.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-cream border border-line">
                <CheckCircle2 className="w-5 h-5 text-ink mb-3" />
                <h4 className="text-sm font-semibold text-ink mb-1.5">No Account Required</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  No sign-in, no passwords, and no subscription paywalls for your own disk. Open the app and start organizing.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Notify / Updates Section */}
      {/* ----------------------------------------------------------------- */}
      <section id="notify-den" className="px-5 sm:px-8 max-w-3xl mx-auto mb-24 text-center">
        <Reveal>
          <div className="bg-cream rounded-3xl border border-line p-8 sm:p-12 shadow-soft">
            <h2 className="text-2xl sm:text-3xl font-display font-medium text-ink mb-3">
              Stay in the loop with Den releases.
            </h2>
            <p className="text-ink-muted text-sm sm:text-base max-w-lg mx-auto mb-8">
              We'll send you an occasional email when major feature updates and new versions of Den are released.
            </p>

            {notified ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-sm font-medium inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                You're all set! We'll keep you posted on new releases.
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
                  {submitting ? "Adding..." : "Get Updates"}
                </Button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-line text-xs text-ink-muted flex items-center justify-center gap-2">
              <span>Looking to save web articles and highlights online?</span>
              <Link to="/" className="text-ink font-medium underline hover:opacity-80">
                Explore Forgot AI Web
              </Link>
            </div>
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
