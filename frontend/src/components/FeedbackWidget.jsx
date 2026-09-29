import { useState, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Twitter, Linkedin, Mail, Smartphone } from "lucide-react";
import { api } from "@/api";
import { toast } from "sonner";

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
    { name: "X (Twitter)", url: "https://x.com/mohammad_j43370", icon: Twitter, color: "hover:bg-neutral-100 text-neutral-700" },
    { name: "LinkedIn", url: "https://www.linkedin.com/in/j-mohammad-ali-ai", icon: Linkedin, color: "hover:bg-blue-50 hover:text-blue-600 text-neutral-700" },
    { name: "WhatsApp", url: "https://wa.me/918688697765", icon: Smartphone, color: "hover:bg-green-50 hover:text-green-600 text-neutral-700" },
    { name: "Email", url: "mailto:founder@tesima-media.com", icon: Mail, color: "hover:bg-red-50 hover:text-red-600 text-neutral-700" },
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-white border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-3.5 rounded-full hover:shadow-lg transition-all hover:scale-105 group"
        aria-label="Send Feedback"
      >
        <MessageSquare className="h-5 w-5 text-neutral-600 group-hover:text-neutral-900 transition-colors" />
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
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
                <div className="flex justify-center gap-2">
                  {socials.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl transition-all border border-transparent hover:border-neutral-200 ${s.color}`}
                      title={s.name}
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
