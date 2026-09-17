import { Puzzle, Database, Sparkles, LogOut, User, Trash2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { API } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteRequest = () => {
    // In a real app, this would call an API to purge the user's data.
    // For now, we direct them to support per the Data Deletion policy, or simulate the request.
    setDeleteModalOpen(false);
    toast.success("Account deletion request initiated. Our support team will reach out within 24 hours to confirm.");
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-12 md:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Settings</h1>
        <p className="text-[15px] text-muted-foreground">Manage your account preferences, extensions, and data.</p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
            <User className="h-5 w-5 text-neutral-600" />
            <h2 className="font-semibold text-base text-neutral-900">Account & Profile</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-[14px] font-medium text-neutral-900">Email Address</p>
                <p className="text-[15px] text-muted-foreground" data-testid="account-email">{user?.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={logout} 
                  data-testid="logout-btn"
                  className="text-neutral-700 font-medium border-neutral-200 hover:bg-neutral-50"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Browser Extension Section */}
        <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
            <Puzzle className="h-5 w-5 text-neutral-600" />
            <h2 className="font-semibold text-base text-neutral-900">Browser Extension</h2>
          </div>
          <div className="p-6 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="flex-1">
              <h3 className="text-[15px] font-medium text-neutral-900 mb-2">Capture at the speed of thought</h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Save links, highlight text, and capture screenshots directly from any webpage without breaking your flow. 
                The sidebar extension syncs perfectly with your web dashboard.
              </p>
            </div>
            <Button className="shrink-0 rounded-full px-6" onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}>
              Install Chrome Extension
            </Button>
          </div>
        </section>

        {/* AI Processing Section */}
        <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-base text-neutral-900">AI Memory Processing</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                <img src="/logo.jpg" alt="AI Avatar" className="w-6 h-6 rounded-md object-cover opacity-80" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-neutral-900 mb-1.5">How your data is read</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground mb-4 max-w-2xl">
                  Every item you save is privately processed by our AI to extract meaning, generate summaries, and assign 
                  semantic keywords. This is what allows you to search using natural language instead of exact folders.
                </p>
                <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Your private memories are never used to train public AI models.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white border border-red-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
            <Database className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-base text-red-700">Danger Zone</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
              <div>
                <h3 className="text-[15px] font-medium text-neutral-900 mb-1">Export Data</h3>
                <p className="text-[14px] text-muted-foreground">Download a JSON file containing all your saved memories and metadata.</p>
              </div>
              <Button variant="outline" className="shrink-0" onClick={() => toast.info("Your data is being compiled. We will email you a download link shortly.")}>
                Request Export
              </Button>
            </div>
            
            <div className="w-full h-px bg-neutral-100" />
            
            <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
              <div>
                <h3 className="text-[15px] font-medium text-neutral-900 mb-1">Delete Account</h3>
                <p className="text-[14px] text-muted-foreground">Permanently delete your account and all associated memories. This action cannot be undone.</p>
              </div>
              <Button 
                variant="destructive" 
                className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed pt-2">
              Are you absolutely sure? This will permanently delete your account, 
              erase all of your saved memories, and remove your data from our servers. 
              <br/><br/>
              <strong>This action cannot be reversed.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRequest}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

