import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-medium text-ink">Forgot AI</p>
          <p className="text-sm text-ink-muted">Private to your account.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          <Link to="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-ink transition-colors">Terms</Link>
          <Link to="/security" className="hover:text-ink transition-colors">Security</Link>
          <Link to="/data-deletion" className="hover:text-ink transition-colors">Data & Account Deletion</Link>
          <Link to="/contact" className="hover:text-ink transition-colors">Contact / Support</Link>
        </div>
      </div>
    </footer>
  );
}
