import { Puzzle, Database, Sparkles, LogOut, User, Trash2, ShieldAlert, CreditCard, Lock, HelpCircle, Download, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { API, getToken } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="max-w-4xl mx-auto px-5 py-12 md:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Settings</h1>
        <p className="text-[15px] text-muted-foreground">Manage your account, billing, and data.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account" className="text-sm">Account</TabsTrigger>
          <TabsTrigger value="security" className="text-sm">Security</TabsTrigger>
          <TabsTrigger value="billing" className="text-sm">Billing</TabsTrigger>
          <TabsTrigger value="privacy" className="text-sm">Data & Privacy</TabsTrigger>
          <TabsTrigger value="support" className="text-sm">Support</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <User className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Account Information</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Email</label>
                  <p className="text-[15px] text-muted-foreground mt-1" data-testid="account-email">{user?.email}</p>
                </div>
                {user?.name && (
                  <div>
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Name</label>
                    <p className="text-[15px] text-muted-foreground mt-1">{user.name}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-neutral-200">
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
          </section>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <Lock className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Change Password</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Current password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="h-11 bg-neutral-50/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">New password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="h-11 bg-neutral-50/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Confirm new password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 bg-neutral-50/50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full md:w-auto"
                >
                  {changingPassword ? "Updating..." : "Update password"}
                </Button>
              </form>
            </div>
          </section>

          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <Button
                variant="outline"
                onClick={logout}
                className="text-neutral-700 font-medium border-neutral-200 hover:bg-neutral-50"
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Subscription</h2>
            </div>
            <div className="p-6">
              {loadingBilling ? (
                <p className="text-sm text-muted-foreground">Loading billing information...</p>
              ) : billing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current plan</p>
                      <p className="text-2xl font-semibold text-neutral-900 capitalize">
                        {billing.plan_type === 'lifetime' ? 'Founding Lifetime' : billing.plan_type}
                      </p>
                    </div>
                    {billing.status && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 capitalize">
                        {billing.status}
                      </span>
                    )}
                  </div>

                  {billing.plan_type === 'free' && (
                    <div className="pt-4 border-t border-neutral-200">
                      <p className="text-sm text-muted-foreground mb-3">Upgrade to Pro for more features</p>
                      <Link to="/pricing">
                        <Button className="w-full md:w-auto">Upgrade to Pro</Button>
                      </Link>
                    </div>
                  )}

                  {billing.plan_type === 'pro' && (
                    <div className="pt-4 border-t border-neutral-200 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        ${billing.status === 'trial' ? '5/month after trial' : '5/month'}
                      </p>
                      {billing.current_period_end && (
                        <p className="text-sm text-muted-foreground">
                          {billing.status === 'trial' ? 'Trial ends' : 'Next billing date'}:{' '}
                          {formatBillingDate(billing.current_period_end)}
                        </p>
                      )}
                      {billing.status === 'active_pro' && (
                        <Button
                          variant="destructive"
                          onClick={() => setCancelModalOpen(true)}
                          className="w-full md:w-auto"
                        >
                          Cancel subscription
                        </Button>
                      )}
                    </div>
                  )}

                  {billing.plan_type === 'lifetime' && (
                    <div className="pt-4 border-t border-neutral-200 space-y-3">
                      <p className="text-sm text-muted-foreground">$49 one-time payment</p>
                      <p className="text-sm text-muted-foreground">No recurring renewal</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load billing information.</p>
              )}
            </div>
          </section>
        </TabsContent>

        {/* Data & Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <Database className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Data Management</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                <div>
                  <h3 className="text-[15px] font-medium text-neutral-900 mb-1">Export Data</h3>
                  <p className="text-[14px] text-muted-foreground">Download a JSON file containing all your saved memories and metadata.</p>
                </div>
                <Button variant="outline" className="shrink-0" onClick={handleExportRequest}>
                  <Download className="h-4 w-4 mr-2" /> Request Export
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
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                </Button>
              </div>
            </div>
          </section>

          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Legal</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-neutral-900">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-neutral-900">Terms of Service</Link>
                <Link to="/data-deletion" className="block text-sm text-muted-foreground hover:text-neutral-900">Data Deletion</Link>
              </div>
            </div>
          </section>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Get Help</h2>
            </div>
            <div className="p-6">
              <Link to="/contact">
                <Button className="w-full md:w-auto">Contact Support</Button>
              </Link>
            </div>
          </section>

          <section className="bg-white border border-neutral-200/60 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-neutral-50/80 px-6 py-4 border-b border-neutral-200/60 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-neutral-600" />
              <h2 className="font-semibold text-base text-neutral-900">Legal & Policies</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-neutral-900">Privacy Policy</Link>
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-neutral-900">Terms of Service</Link>
                <Link to="/security" className="block text-sm text-muted-foreground hover:text-neutral-900">Security</Link>
                <Link to="/refund" className="block text-sm text-muted-foreground hover:text-neutral-900">Refund Policy</Link>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {/* Delete Account Dialog */}
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
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
