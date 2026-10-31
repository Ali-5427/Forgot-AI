import {
  Database,
  User,
  CreditCard,
  Lock,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  Puzzle,
  Laptop,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { API, getToken } from "@/api";
import { useAuth } from "@/auth";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { startTour } from "@/components/ProductTour";
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
  const { openImporter, items } = useStore();
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
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((r) => r.json());
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
          Authorization: `Bearer ${localStorage.getItem("forgot_ai_token")}`,
          "X-Library-Id": localStorage.getItem("forgot_ai_library"),
        },
      }).then((r) => r.json());
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: "application/json",
      });
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
          Authorization: `Bearer ${localStorage.getItem("forgot_ai_token")}`,
          "X-Library-Id": localStorage.getItem("forgot_ai_library"),
        },
      });
      toast.success("Account permanently deleted.", { id: "delete" });
      logout();
    } catch (e) {
      toast.error("Failed to delete account. Please contact support.", {
        id: "delete",
      });
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
          Authorization: `Bearer ${getToken()}`,
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
      toast.success(
        "Password updated successfully. Please sign in with your new password."
      );
      logout();
    } catch (err) {
      toast.error(
        err.message ||
          "Failed to update password. Please check your current password."
      );
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
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await response.json();
      setBilling(data);
      toast.success(
        "Subscription canceled successfully. Access continues until billing period ends.",
        { id: "cancel" }
      );
    } catch (err) {
      const errorData = (await err.response?.json?.()) || {};
      toast.error(
        errorData.detail ||
          "Failed to cancel subscription. Please contact support.",
        { id: "cancel" }
      );
    }
  };

  const formatBillingDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const isPro = billing?.plan_type === "pro" && billing?.status === "active_pro";
  const isTrial = billing?.status === "trial";
  const isLifetime =
    billing?.plan_type === "lifetime" || billing?.status === "lifetime";
  const isExpired = billing && !isPro && !isTrial && !isLifetime;

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  // Navigation tab configuration matching the Sellfyi design
  const tabs = [
    { id: "account", label: "Account & Profile", Icon: User },
    {
      id: "billing",
      label: "Subscription & Billing",
      Icon: CreditCard,
      badge: isTrial
        ? { text: "Trial", className: "bg-amber-100 text-amber-800" }
        : isPro
        ? { text: "Pro", className: "bg-emerald-100 text-emerald-800" }
        : isLifetime
        ? { text: "Life", className: "bg-purple-100 text-purple-800" }
        : null,
    },
    { id: "security", label: "Security & Login", Icon: Lock },
    { id: "extension", label: "Chrome Extension", Icon: Puzzle },
    { id: "privacy", label: "Data & Backup", Icon: Database },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-white select-none">
      {/* ------------------------------------------------------------- */}
      {/* Column 2: Docked Settings Rail (Option B - Roomy 320px / w-80) */}
      {/* ------------------------------------------------------------- */}
      <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border bg-neutral-50/70 p-4 md:p-6 flex flex-col">
        {/* Rail Header */}
        <div className="mb-6 px-1.5">
          <h1 className="text-base font-bold tracking-tight text-neutral-900">
            Settings
          </h1>
          <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5">
            Preferences & System
          </p>
        </div>

        {/* Rail Tabs */}
        <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {tabs.map(({ id, label, Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-[13px] transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white text-neutral-900 font-semibold shadow-xs border border-border/60"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-neutral-900" : "text-neutral-400"
                    }`}
                  />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span
                    className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* Column 3: Settings Content Canvas (Spacious max-w-5xl) */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 bg-white p-6 md:p-10 lg:p-12 max-w-5xl overflow-y-auto">
        {/* ========================================================= */}
        {/* TAB 1: ACCOUNT & PROFILE */}
        {/* ========================================================= */}
        {activeTab === "account" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Account & Profile
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Manage your personal identity, access tier, and workspace settings.
              </p>
            </div>

            {/* Row List */}
            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {/* Row 1: Profile Identity */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Profile Identity
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your personal vault in Forgot AI
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                    {userInitial}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-900">
                      {user?.email || "Personal Account"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Personal Vault &bull; {items?.length || 0} memories saved
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Email Address */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Email Address
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Used for signing in and syncing with your Chrome extension
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-neutral-700">
                    {user?.email || "Not signed in"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                  </span>
                </div>
              </div>

              {/* Row 3: Current Access Tier */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Access Tier & Plan
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Controls saving capacity, OCR, and AI semantic search
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isTrial && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      7-Day Free Trial
                    </span>
                  )}
                  {isPro && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Pro Active ($5/mo)
                    </span>
                  )}
                  {isLifetime && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                      Founding Lifetime
                    </span>
                  )}
                  {isExpired && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                      Inactive / Expired
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("billing")}
                    className="text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    View Details &rarr;
                  </Button>
                </div>
              </div>

              {/* Row 4: Product Tour */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Interactive Walkthrough
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Replay the 2-minute interactive guide to Forgot AI features
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startTour}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500" /> Replay Tour
                </Button>
              </div>

              {/* Row 5: Danger Zone: Delete Account */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-red-600">
                    Delete Account
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Permanently delete your account, memories, and cancel any subscription
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteModalOpen(true)}
                  className="rounded-xl text-xs"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SUBSCRIPTION & BILLING */}
        {/* ========================================================= */}
        {activeTab === "billing" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Subscription & Billing
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Forgot AI is a paid-only memory vault with a 7-day free trial or lifetime access.
              </p>
            </div>

            {loadingBilling ? (
              <p className="text-xs text-neutral-400">Loading subscription...</p>
            ) : billing ? (
              <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
                {/* Row 1: Current Plan */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">
                      Active Plan
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {isLifetime &&
                        "Unlimited lifetime access to saving, AI enrichment, and semantic search."}
                      {isPro &&
                        "Your Pro plan includes unlimited saves, AI enrichment, OCR, and semantic search."}
                      {isTrial &&
                        "You are in your 7-day free trial with full Pro capabilities enabled."}
                      {isExpired &&
                        "Your subscription has ended. Choose a plan to resume saving and searching."}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                        isLifetime
                          ? "bg-purple-100 text-purple-800"
                          : isPro
                          ? "bg-emerald-100 text-emerald-800"
                          : isTrial
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isLifetime
                        ? "Founding Lifetime"
                        : isPro
                        ? "Forgot AI Pro"
                        : isTrial
                        ? "7-Day Free Trial"
                        : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Row 2: Billing Cycle & Renewal */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">
                      Billing Schedule
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {isLifetime
                        ? "One-time founding purchase &mdash; Never expires"
                        : isTrial
                        ? "Trial conclusion date"
                        : "Next billing renewal date"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-neutral-900">
                    {isLifetime
                      ? "Never Expires"
                      : billing.current_period_end
                      ? formatBillingDate(billing.current_period_end)
                      : "Monthly"}
                  </span>
                </div>

                {/* Row 3: Vault Usage */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">
                      Vault Usage & Storage
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Total memories, links, and documents saved
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-900">
                      {items?.length || 0} items
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      (Unlimited Capacity)
                    </span>
                  </div>
                </div>

                {/* Row 4: Plan Actions */}
                <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">
                      Manage Subscription
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Change payment method or cancel subscription
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(isTrial || isPro) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelModalOpen(true)}
                          className="text-xs text-neutral-600 hover:text-red-600 rounded-xl"
                        >
                          Cancel Subscription
                        </Button>
                        <Link to="/pricing">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-neutral-600"
                          >
                            Get Lifetime ($49){" "}
                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </>
                    )}
                    {isExpired && (
                      <div className="flex items-center gap-2">
                        <Link to="/pricing">
                          <Button
                            size="sm"
                            className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs"
                          >
                            Subscribe to Pro ($5/mo)
                          </Button>
                        </Link>
                        <Link to="/pricing">
                          <Button variant="outline" size="sm" className="rounded-xl text-xs">
                            Get Lifetime ($49)
                          </Button>
                        </Link>
                      </div>
                    )}
                    {isLifetime && (
                      <span className="text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                        ✓ Lifetime Member
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Unable to load subscription info.
              </p>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SECURITY & LOGIN */}
        {/* ========================================================= */}
        {activeTab === "security" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Security & Authentication
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Manage your password and active authenticated sessions.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {/* Row 1: Password Update Form */}
              <div className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="md:w-1/2">
                  <h3 className="text-sm font-medium text-neutral-900">
                    Change Password
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Ensure your account is protected with a secure password of at least 8 characters.
                  </p>
                </div>
                <div className="md:w-1/2 max-w-sm">
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        Current password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        New password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="rounded-xl h-9 text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                        Confirm new password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={changingPassword}
                      className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs h-9 mt-2"
                    >
                      {changingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Row 2: Active Web Sessions */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Active Session
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Devices and clients currently authenticated to your account
                  </p>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/60">
                  <Laptop className="w-4 h-4 text-neutral-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-neutral-900">
                      Chrome on Windows
                    </span>
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active Session (This Device)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CHROME EXTENSION */}
        {/* ========================================================= */}
        {activeTab === "extension" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Chrome Extension
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Capture any webpage, article, note, or screenshot instantly into your AI vault.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {/* Row 1: Sync Status */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Connection & Sync Status
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your extension automatically links with this web library session
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Synced via Web Session
                </span>
              </div>

              {/* Row 2: Quick Save Shortcut */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Quick Save Shortcut
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Press this hotkey on any website to save the page immediately
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-xs text-neutral-800 shadow-2xs">
                    Alt + S
                  </kbd>
                  <span className="text-xs text-neutral-400">or</span>
                  <kbd className="px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-xs text-neutral-800 shadow-2xs">
                    Cmd + S
                  </kbd>
                </div>
              </div>

              {/* Row 3: Web Store Page */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Forgot AI Extension
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Available for Google Chrome, Brave, Arc, Edge, and Chromium browsers
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      "https://chromewebstore.google.com",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="rounded-xl text-xs gap-1.5"
                >
                  Chrome Web Store <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                </Button>
              </div>

              {/* Row 4: Highlight to remember */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Highlight & Quote Capture
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select any text on any page to show the instant save bubble
                  </p>
                </div>
                <span className="text-xs font-medium text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-200/60">
                  Always Active
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DATA & BACKUP */}
        {/* ========================================================= */}
        {activeTab === "privacy" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Data & Backup
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Full control over your data ownership, exports, and bookmark imports.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {/* Row 1: Import Browser Bookmarks */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Import Browser Bookmarks
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Import HTML bookmarks from Chrome, Safari, Edge, or Brave into your AI memory
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openImporter}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5 text-neutral-500" /> Import Bookmarks
                </Button>
              </div>

              {/* Row 2: Export Data */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Export All Data
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Download a full JSON archive of all your saved memories, URLs, and AI summaries
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRequest}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5 text-neutral-500" /> Export JSON
                </Button>
              </div>

              {/* Row 3: Vault Privacy */}
              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Data Privacy & Encryption
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Your memories are indexed privately in your personal vault and never shared
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Private & Secure
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Delete Confirmation Modal */}
      {/* ------------------------------------------------------------- */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will immediately cancel your subscription and permanently delete all your memories, images, and notes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------------------------- */}
      {/* Cancel Subscription Modal */}
      {/* ------------------------------------------------------------- */}
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
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
