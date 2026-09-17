import { Link } from "react-router-dom";


export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-ink mb-4">
              <img src="/logo.jpg" alt="Forgot AI Logo" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-display text-lg font-medium tracking-tight">Forgot AI</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Save anything now. Find it later.<br/>
              Private to your account.
            </p>
          </div>
          
          {/* Product */}
          <div>
            <h3 className="font-display text-sm font-medium text-ink mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li><Link to="/" className="hover:text-ink transition-colors">Home</Link></li>
              <li><a href="https://chrome.google.com/webstore" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Chrome Extension</a></li>
              <li><Link to="/#faq" className="hover:text-ink transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-display text-sm font-medium text-ink mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li><Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link></li>
              <li><Link to="/security" className="hover:text-ink transition-colors">Security</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display text-sm font-medium text-ink mb-4">Support</h3>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li><Link to="/contact" className="hover:text-ink transition-colors">Contact Us</Link></li>
              <li><Link to="/data-deletion" className="hover:text-ink transition-colors">Data Deletion</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-ink-muted">
          <p>Â© {new Date().getFullYear()} Forgot AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

