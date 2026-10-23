import { Database, LogOut, User, Trash2, ShieldAlert, CreditCard, Lock, HelpCircle, Download, Eye, EyeOff, CheckCircle2, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { API, getToken } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { resetTour } from "@/components/ProductTour";
import { Input } from "@/components/ui/input";
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
import { Link } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [billing, setBilling] = useState(null);
  const [loadingBilling, setLoadingBilling] = useState(true);

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Load billing status
  useEffect(() => {
    const loadBilling = async () => {
      try {
        const data = await fetch(`${API}/billing/status`, {
          headers: { "Authorization": `Bearer ${getToken()}` },
        }).then(r => r.json());
        setBilling(data);
      } catch (e) {
        console.error("Failed to load billing status:", e);
      } finally {
        setLoadingBilling(false);
      }
    };
    loadBilling();
  }, []);

  const handleExportRequest = async () => {
    try {
      toast.loading("Compiling your data...", { id: "export" });
      const response = await fetch(`${API}/export`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("forgot_ai_token")}`,
          "X-Library-Id": localStorage.getItem("forgot_ai_library")
        }
      }).then(r => r.json());
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forgot_ai_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Export complete!", { id: "export" });
    } catch (e) {
      toast.error("Export failed. Please try again.", { id: "export" });
    }
  };

  const handleDeleteRequest = async () => {
    try {
      setDeleteModalOpen(false);
      toast.loading("Deleting your account...", { id: "delete" });
      await fetch(`${API}/account`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("forgot_ai_token")}`,
          "X-Library-Id": localStorage.getItem("forgot_ai_library")
        }
      });
      toast.success("Account permanently deleted.", { id: "delete" });
      logout();
    } catch (e) {
      toast.error("Failed to delete account. Please contact support.", { id: "delete" });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update password");
      }
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully. Please sign in with your new password.");
      logout();
    } catch (err) {
      toast.error(err.message || "Failed to update password. Please check your current password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelModalOpen(false);
      toast.loading("Canceling subscription...", { id: "cancel" });
      const response = await fetch(`${API}/billing/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setBilling(data);
      toast.success("Subscription canceled successfully. Access continues until billing period ends.", { id: "cancel" });
    } catch (err) {
      const errorData = await err.response?.json?.() || {};
      toast.error(errorData.detail || "Failed to cancel subscription. Please contact support.", { id: "cancel" });
    }
  };

  const formatBillingDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const isPro = billing?.plan_type === 'pro' && billing?.status === 'active_pro';
  const isTrial = billing?.status === 'trial';
  const isLifetime = billing?.plan_type === 'lifetime' || billing?.status === 'lifetime';
  const isExpired = billing && !isPro && !isTrial && !isLifetime;

  return (
    <div className="max-w-5xl mx-auto px-5 py-12 md:px-8 flex flex-col md:flex-row gap-12 min-h-[85vh]">
      {/* Left Sidebar Menu */}
      <div className="w-full md:w-56 shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display tracking-tight text-neutral-900">Settings</h1>
          <p className="text-xs text-neutral-500 mt-1">Manage your account & subscription</p>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("account")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "account"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <User className="h-4 w-4" />
            Account
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "billing"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4" />
              Subscription
            </div>
            {isTrial && (
              <span className="text-[10px] font-semibold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Trial
              </span>
            )}
            {isPro && (
              <span className="text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Pro
              </span>
            )}
            {isLifetime && (
              <span className="text-[10px] font-semibold uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                Life
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "security"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <Lock className="h-4 w-4" />
            Security
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "privacy"
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <Database className="h-4 w-4" />
            Data & Privacy
          </button>
        </nav>

        <div className="mt-8 pt-6 border-t border-neutral-200 space-y-1">
          <button
            onClick={() => { resetTour(); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Replay Product Tour
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 max-w-2xl">
        
        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Account Overview</h2>
              <p className="text-sm text-neutral-500 mt-1">Your identity and access tier across Forgot AI.</p>
            </div>
            
            <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Email Address</label>
                  <p className="text-base font-medium text-neutral-900 mt-0.5">{user?.email || "Not signed in"}</p>
                </div>
                <div className="text-right">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Current Plan</label>
                  <div className="mt-0.5">
                    {isTrial && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">7-Day Free Trial</span>}
                    {isPro && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Pro Active ($5/mo)</span>}
                    {isLifetime && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Founding Lifetime</span>}
                    {isExpired && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Inactive / Expired</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm text-neutral-500">
                <span>Chrome Extension Sync</span>
                <span className="flex items-center gap-1.5 text-neutral-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Synced via Web Session
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
                <p className="text-sm text-neutral-500 mt-1">Irreversible and destructive actions.</p>
              </div>
              
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">Delete Account</h3>
                  <p className="text-[13px] text-neutral-600 mt-0.5">Permanently remove your account, all memories, images, and cancel any active subscription.</p>
                </div>
                <Button variant="destructive" onClick={() => setDeleteModalOpen(true)} className="shrink-0">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION TAB */}
        {activeTab === "billing" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Subscription & Billing</h2>
              <p className="text-sm text-neutral-500 mt-1">Forgot AI is a paid-only memory vault with a 7-day free trial or lifetime access.</p>
            </div>

            {loadingBilling ? (
              <p className="text-sm text-muted-foreground">Loading subscription information...</p>
            ) : billing ? (
              <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-6">
                
                {/* Status Header */}
                <div className="flex items-start justify-between pb-6 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {isLifetime && "Founding Lifetime"}
                        {isPro && "Forgot AI Pro"}
                        {isTrial && "7-Day Free Trial"}
                        {isExpired && "Subscription Inactive"}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                        isLifetime ? "bg-purple-100 text-purple-800" :
                        isPro ? "bg-emerald-100 text-emerald-800" :
                        isTrial ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {billing.status || "none"}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-600">
                      {isLifetime && "You have unlimited lifetime access to saving, AI enrichment, and semantic search."}
                      {isPro && "Your Pro plan includes unlimited saves, AI enrichment, OCR, and semantic search."}
                      {isTrial && "You are currently in your 7-day free trial with full Pro features enabled."}
                      {isExpired && "Your trial or subscription has ended. Choose a plan to continue saving and searching."}
                    </p>
                  </div>
                </div>

                {/* Trial or Active Pro Details */}
                {(isTrial || isPro) && (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Plan Rate</span>
                      <span className="font-medium text-neutral-900">{isTrial ? "$5/mo (Starts after 7-day trial)" : "$5 / month"}</span>
                    </div>
                    {billing.current_period_end && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500">{isTrial ? "Trial concludes on" : "Next billing date"}</span>
                        <span className="font-medium text-neutral-900">{formatBillingDate(billing.current_period_end)}</span>
                      </div>
                    )}
                    <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
                      <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(true)} className="text-neutral-600 hover:text-red-600 hover:border-red-200">
                        Cancel Subscription
                      </Button>
                      <Link to="/pricing">
                        <Button variant="ghost" size="sm" className="text-xs text-neutral-600">
                          Upgrade to Lifetime ($49) <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Lifetime Details */}
                {isLifetime && (
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-neutral-500">Billing Cycle</span>
                    <span className="font-medium text-neutral-900">One-time payment â€” Never expires</span>
                  </div>
                )}

                {/* Inactive / Expired State */}
                {isExpired && (
                  <div className="pt-2 space-y-4">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Access Paused</p>
                        <p className="text-xs text-amber-800 mt-0.5">Your existing saved memories remain safe and exportable, but creating new saves and searches requires an active plan.</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Link to="/pricing" className="flex-1">
                        <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
                          Subscribe to Pro ($5/mo)
                        </Button>
                      </Link>
                      <Link to="/pricing" className="flex-1">
                        <Button variant="outline" className="w-full">
                          Get Founding Lifetime ($49)
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load subscription information.</p>
            )}
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === "security" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Security</h2>
              <p className="text-sm text-neutral-500 mt-1">Manage your password and authentication.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Current password</label>
                <Input
                  type="password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">New password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Confirm new password</label>
                <Input
                  type="password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </div>
        )}

        {/* PRIVACY TAB */}
        {activeTab === "privacy" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Data & Privacy</h2>
              <p className="text-sm text-neutral-500 mt-1">Control your data and export options.</p>
            </div>

            <div className="space-y-6">
              <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">Export Data</h3>
                  <p className="text-[13px] text-neutral-500 mt-0.5">Download a JSON file of all your saved memories.</p>
                </div>
                <Button variant="outline" onClick={handleExportRequest} className="shrink-0">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will immediately cancel your subscription and permanently delete all your memories, images, and notes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-red-600 hover:bg-red-700 text-white">
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Modal */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your Pro subscription? You will continue to have full access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
