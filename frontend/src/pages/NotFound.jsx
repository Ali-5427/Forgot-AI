import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found | Forgot AI";
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-5">
      <h1 className="font-display text-7xl font-medium tracking-tight text-ink mb-4">404</h1>
      <p className="text-xl text-ink-muted mb-8 max-w-md mx-auto">
        You forgot the URL, but we didn't forget you. The page you're looking for doesn't exist.
      </p>
      <Button asChild className="rounded-full h-11 px-6">
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
}
