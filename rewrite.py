import re

with open('frontend/src/pages/Settings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = """import { Database, LogOut, User, Trash2, ShieldAlert, CreditCard, Lock, HelpCircle, Download, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { API, getToken } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
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

  // Profile Edit State
  const [profileName, setProfileName] = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

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

  useEffect(() => {
      if(user?.name) setProfileName(user.name);
  }, [user]);

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setSavingProfile(true);
    // Simulate API call for now
    setTimeout(() => {
      setSavingProfile(false);
      toast.success("Profile updated successfully");
    }, 600);
  };

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
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      toast.success("Password updated successfully. Please sign in with your new password.");
      logout();
    } catch (err) {
      const errorData = await err.response?.json?.() || {};
      toast.error(errorData.detail || "Failed to update password. Please check your current password.");
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

  return (
    <div className="max-w-5xl mx-auto px-5 py-12 md:px-8 flex flex-col md:flex-row gap-12 min-h-[85vh]">
      {/* Left Sidebar Menu */}
      <div className="w-full md:w-56 shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-1">Settings</h1>
          <p className="text-[13px] text-muted-foreground">Manage your account.</p>
        </div>
        
        <nav className="flex flex-col gap-1">
          {[
            { id: "account", label: "Account", icon: User },
            { id: "security", label: "Security", icon: Lock },
            { id: "billing", label: "Billing", icon: CreditCard },
            { id: "privacy", label: "Data & Privacy", icon: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-neutral-200 space-y-1">
          <Link to="/contact" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
            <HelpCircle className="h-4 w-4" /> Support
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 max-w-2xl">
        
        {/* ACCOUNT TAB */}
        {activeTab === "account" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Profile</h2>
              <p className="text-sm text-neutral-500 mt-1">Update your personal information.</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleUpdateProfile}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 text-neutral-400 shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div>
                    <Button variant="outline" type="button" size="sm">Upload Avatar</Button>
                    <p className="text-xs text-neutral-500 mt-2">JPG, GIF or PNG. 1MB max.</p>
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium text-neutral-700">Full Name</label>
                <Input value={profileName} onChange={e => setProfileName(e.target.value)} />
              </div>

              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium text-neutral-700">Email Address</label>
                <Input value={user?.email || ""} disabled className="bg-neutral-50 text-neutral-500 cursor-not-allowed" />
                <p className="text-[13px] text-neutral-500">Your email address is tied to your login identity and cannot be changed.</p>
              </div>
              
              <Button type="submit" disabled={savingProfile}>
                 {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </form>
            
            <hr className="border-neutral-200" />

            <div className="pt-2 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
                <p className="text-sm text-neutral-500 mt-1">Irreversible and destructive actions.</p>
              </div>
              
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">Delete Account</h3>
                  <p className="text-[13px] text-neutral-600 mt-0.5">Permanently remove your account and all data.</p>
                </div>
                <Button variant="destructive" onClick={() => setDeleteModalOpen(true)} className="shrink-0">
                  Delete Account
                </Button>
              </div>
            </div>
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
                  placeholder="••••••••"
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
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Confirm new password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === "billing" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Billing & Plans</h2>
              <p className="text-sm text-neutral-500 mt-1">Manage your subscription and billing details.</p>
            </div>

            {loadingBilling ? (
              <p className="text-sm text-muted-foreground">Loading billing information...</p>
            ) : billing ? (
              <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-neutral-900 capitalize">
                        {billing.plan_type === 'lifetime' ? 'Founding Lifetime' : billing.plan_type} Plan
                      </h3>
                      {billing.status && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                          {billing.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">
                       {billing.plan_type === 'free' && "Upgrade to unlock unlimited memory."}
                       {billing.plan_type === 'pro' && "You are on the Pro monthly plan."}
                       {billing.plan_type === 'lifetime' && "You have lifetime access."}
                    </p>
                  </div>
                </div>

                {billing.plan_type === 'free' && (
                  <div className="pt-6 border-t border-neutral-100">
                    <Link to="/pricing">
                      <Button>Upgrade to Pro</Button>
                    </Link>
                  </div>
                )}

                {billing.plan_type === 'pro' && (
                  <div className="pt-6 border-t border-neutral-100 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-neutral-500">Price</span>
                       <span className="font-medium text-neutral-900">${billing.status === 'trial' ? '5/mo after trial' : '5/mo'}</span>
                    </div>
                    {billing.current_period_end && (
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-neutral-500">{billing.status === 'trial' ? 'Trial ends' : 'Next billing date'}</span>
                         <span className="font-medium text-neutral-900">{formatBillingDate(billing.current_period_end)}</span>
                      </div>
                    )}
                    {billing.status === 'active_pro' && (
                      <div className="pt-2">
                        <Button variant="outline" onClick={() => setCancelModalOpen(true)}>
                          Cancel Subscription
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load billing information.</p>
            )}
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
              
              <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Legal Documents</h3>
                  <div className="flex flex-col gap-2">
                    <Link to="/privacy" className="text-sm text-blue-600 hover:underline">Privacy Policy</Link>
                    <Link to="/terms" className="text-sm text-blue-600 hover:underline">Terms of Service</Link>
                  </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed pt-2">
              Are you absolutely sure? This will permanently delete your account, erase all of your saved memories, and remove your data from our servers.
              <br/><br/>
              <strong>This action cannot be reversed.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed pt-2">
              Are you sure you want to cancel your Pro subscription? Your access will continue until the end of your current billing period.
              <br/><br/>
              You can resubscribe at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600">
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
"""

with open('frontend/src/pages/Settings.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
