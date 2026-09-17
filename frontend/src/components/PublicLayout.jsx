import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Footer } from "./Footer";
import { Button } from "@/components/ui/button";

function AppButton({ children, size = "default", onClick }) {
  return (
    <Button type="button" size={size} onClick={onClick} className="rounded-full h-11 px-5">
      {children}
    </Button>
  );
}

export function PublicLayout({ onOpenApp }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Handle hash scrolling on page load
  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  const handleNav = (hash) => {
    if (location.pathname !== "/") {
      navigate(`/${hash}`);
    } else {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="forgot-landing paper-grain min-h-screen flex flex-col text-ink relative">
      <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-ink hover:opacity-80 transition-opacity">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-cream">
              <Bookmark className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-medium tracking-tight">Forgot AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
            <button onClick={() => handleNav('#how-it-works')} className="hover:text-ink transition-colors">How it works</button>
            <button onClick={() => handleNav('#use-cases')} className="hover:text-ink transition-colors">Use cases</button>
            <button onClick={() => handleNav('#faq')} className="hover:text-ink transition-colors">FAQ</button>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={onOpenApp} className="hidden sm:block text-sm font-medium text-ink-muted hover:text-ink transition-colors">
              Log in
            </button>
            <AppButton onClick={onOpenApp}>Get started</AppButton>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full">
        <Outlet context={{ onOpenApp }} />
      </main>

      <Footer />
    </div>
  );
}
