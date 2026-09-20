import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/api";

export function BetaPage({ onOpenApp }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [feedback, setFeedback] = useState({
    name: "",
    email: "",
    tried: "",
    worked: "",
    confusing: "",
    improve: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCtaClick = () => {
    if (user) {
      navigate("/");
    } else {
      onOpenApp();
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await axios.post(`${API}/feedback`, feedback);
      
      toast.success("Feedback sent! Thank you for helping shape Forgot AI.");
      setFeedback({
        name: "",
        email: "",
        tried: "",
        worked: "",
        confusing: "",
        improve: ""
      });
    } catch (err) {
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-20">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Private Beta
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Welcome to the Forgot AI Beta
          </h1>
          <p className="text-xl text-muted-foreground">
            You’re one of the early people helping us build a better way to remember the things you find online.
          </p>
          <p className="text-lg">
            Forgot AI helps you save useful things you come across — posts, articles, ideas, links, images, and more — and find them later by simply describing what you remember.
          </p>
          <div className="pt-4">
            <Button size="lg" onClick={handleCtaClick} className="text-lg px-8 py-6">
              Join the Beta
            </Button>
          </div>
        </div>

        {/* EARLY USER MESSAGE */}
        <div className="bg-muted/50 p-6 rounded-xl border mb-16">
          <h3 className="text-lg font-semibold mb-2">You're early.</h3>
          <p className="text-muted-foreground">
            Forgot AI is currently being tested with a small group of early users. Because you’re testing Forgot AI before it’s publicly available, things may change quickly. Some features may be incomplete or rough around the edges. That’s exactly why your feedback matters.
          </p>
        </div>

        {/* HOW IT WORKS */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">1. Save</div>
              <p>Save something useful when you find it.</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">2. Forget</div>
              <p>Don’t worry about folders, tags, or remembering where you saved it.</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">3. Find</div>
              <p>Later, describe what you remember and find it again.</p>
            </div>
          </div>
        </div>

        {/* WHAT YOU CAN TEST */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">What you can test</h2>
          <ul className="list-disc list-inside space-y-2 text-lg text-muted-foreground">
            <li>Save highlighted text</li>
            <li>Save plain text / notes</li>
            <li>Save links</li>
            <li>Save images</li>
            <li>AI-generated titles, summaries, and keywords</li>
            <li>Search saved memories</li>
            <li>Ask questions about an individual saved memory</li>
          </ul>
        </div>

        {/* FAQ */}
        <div className="mb-16 space-y-8">
          <h2 className="text-3xl font-bold mb-6">Beta FAQ</h2>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg mb-1">How should I use Forgot AI?</h4>
              <p className="text-muted-foreground">Use it naturally. Save things you would normally bookmark, screenshot, put in Notes, send to yourself, or otherwise try to remember.</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Do I need to organize everything?</h4>
              <p className="text-muted-foreground">No. The idea is to save useful things without spending time organizing them.</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-1">What if I find something confusing or broken?</h4>
              <p className="text-muted-foreground">Tell us. During the beta, broken or confusing experiences are expected, and your feedback helps us fix them.</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Is this the final version?</h4>
              <p className="text-muted-foreground">No. This is an early beta and the product will continue changing based on how people use it.</p>
            </div>
          </div>
        </div>

        {/* FEEDBACK */}
        <div className="mb-16 border rounded-xl p-6 sm:p-8 bg-card shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Help shape Forgot AI</h2>
          <p className="text-muted-foreground mb-6">
            Tell us what worked, what confused you, what you expected to happen, and what you wish Forgot AI could do.
          </p>
          <form onSubmit={submitFeedback} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={feedback.name} onChange={e => setFeedback({...feedback, name: e.target.value})} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={feedback.email} onChange={e => setFeedback({...feedback, email: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tried">What did you try?</Label>
              <Textarea id="tried" required value={feedback.tried} onChange={e => setFeedback({...feedback, tried: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worked">What worked?</Label>
              <Textarea id="worked" value={feedback.worked} onChange={e => setFeedback({...feedback, worked: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confusing">What was confusing?</Label>
              <Textarea id="confusing" value={feedback.confusing} onChange={e => setFeedback({...feedback, confusing: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="improve">What should we improve?</Label>
              <Textarea id="improve" value={feedback.improve} onChange={e => setFeedback({...feedback, improve: e.target.value})} />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default BetaPage;
