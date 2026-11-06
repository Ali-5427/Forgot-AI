import { useState, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { api } from "@/api";
import { toast } from "sonner";

const SocialIcons = {
  X: ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  LinkedIn: ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  ),
  WhatsApp: ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  Email: ({ className = "h-5 w-5" }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

export const FeedbackWidget = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-feedback", handleOpen);
    return () => window.removeEventListener("open-feedback", handleOpen);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setLoading(true);
    try {
      await api.submitFeedback(message);
      setSent(true);
      toast.success("Feedback sent! Thank you.");
      setTimeout(() => {
        setOpen(false);
        setTimeout(() => setSent(false), 300); // reset after transition
      }, 2000);
    } catch (err) {
      toast.error("Failed to send feedback. Please try again or use social links.");
    } finally {
      setLoading(false);
      setMessage("");
    }
  };

  const socials = [
    {
      name: "X (formerly Twitter)",
      url: "https://x.com/mohammad_j43370",
      icon: SocialIcons.X,
      color: "text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border-neutral-200/80",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/j-mohammad-ali-ai",
      icon: SocialIcons.LinkedIn,
      color: "text-[#0A66C2] bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/60",
    },
    {
      name: "WhatsApp",
      url: "https://wa.me/918688697765",
      icon: SocialIcons.WhatsApp,
      color: "text-[#25D366] bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200/60",
    },
    {
      name: "Email",
      url: "mailto:founder@tesima-media.com",
      icon: SocialIcons.Email,
      color: "text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border-neutral-200/80",
    },
  ];

  return (
    <>
      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-neutral-100">
              <div>
                <h3 className="font-semibold text-lg text-neutral-900">Feedback & Support</h3>
                <p className="text-sm text-neutral-500 mt-0.5">Help me improve Forgot AI</p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {sent ? (
                <div className="py-8 flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-neutral-900">Message Received!</h4>
                  <p className="text-sm text-neutral-500">Thanks for helping make Forgot AI better.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      How can I help you?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Found a bug? Have a feature request? Just want to say hi?"
                      className="w-full h-32 p-3 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all text-[15px]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" /> Send directly to founder</>}
                  </button>
                </form>
              )}

              <div className="mt-6 pt-5 border-t border-neutral-100">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3 text-center">
                  Or reach me directly
                </p>
                <div className="flex justify-center gap-3">
                  {socials.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${s.color}`}
                      title={s.name}
                      aria-label={s.name}
                    >
                      <s.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
