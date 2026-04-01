import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";

type Section = "profile" | "password";

function formatDate(ts?: number | null) {
  if (!ts) return "Unknown";
  return new Date(ts).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" });
}

export function Account() {
  const { user, logout, updateProfile } = useAuth();
  const [, navigate] = useLocation();

  const [section, setSection] = useState<Section>("profile");

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (!displayName.trim()) {
      setProfileError("Display name cannot be empty");
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile(displayName.trim());
      setProfileSuccess("Display name updated successfully.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change password");
      }
      setPwSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and security settings</p>
      </div>

      {/* User Card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">
            {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-lg truncate">{user?.displayName || user?.username}</p>
          <p className="text-muted-foreground text-sm font-mono truncate">@{user?.username}</p>
          <p className="text-muted-foreground text-xs mt-1">Member since {formatDate(user?.createdAt)}</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex bg-secondary/30 rounded-xl p-1">
        <button
          onClick={() => setSection("profile")}
          data-testid="tab-profile"
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${section === "profile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Profile
        </button>
        <button
          onClick={() => setSection("password")}
          data-testid="tab-security"
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${section === "password" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Security
        </button>
      </div>

      {/* Profile Section */}
      {section === "profile" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Icons.User className="w-4 h-4 text-primary" />
            Profile Information
          </h2>

          {/* Read-only: Username */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <Icons.AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={user?.username || ""}
                readOnly
                className="w-full pl-10 pr-4 py-3 bg-secondary/20 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                data-testid="input-username-readonly"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
          </div>

          {/* Editable: Display Name */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Display Name
              </label>
              <div className="relative">
                <Icons.Pen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setProfileSuccess(""); setProfileError(""); }}
                  placeholder="Your display name"
                  maxLength={64}
                  className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  data-testid="input-display-name"
                />
              </div>
            </div>

            {profileError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Icons.AlertCircle className="w-3 h-3" /> {profileError}
              </p>
            )}
            {profileSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Icons.CheckCircle2 className="w-3 h-3" /> {profileSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={profileLoading || displayName.trim() === (user?.displayName || "")}
              data-testid="button-save-profile"
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {profileLoading ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Save className="w-4 h-4" />}
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Security Section */}
      {section === "password" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Icons.Lock className="w-4 h-4 text-primary" />
            Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
                  placeholder="Your current password"
                  className="w-full pl-10 pr-10 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <Icons.KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
                  placeholder="New password (min 6 characters)"
                  className="w-full pl-10 pr-10 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Icons.KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-10 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {pwError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <Icons.AlertCircle className="w-3 h-3" /> {pwError}
              </p>
            )}
            {pwSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Icons.CheckCircle2 className="w-3 h-3" /> {pwSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              data-testid="button-change-password"
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {pwLoading ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Shield className="w-4 h-4" />}
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* Logout */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
          <Icons.LogOut className="w-4 h-4 text-red-400" />
          Sign Out
        </h2>
        <p className="text-muted-foreground text-xs mb-4">
          Your data is saved in the cloud and will be available when you sign back in.
        </p>
        <button
          onClick={handleLogout}
          data-testid="button-logout"
          className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 font-semibold rounded-xl hover:bg-red-500/20 transition-all text-sm flex items-center justify-center gap-2"
        >
          <Icons.LogOut className="w-4 h-4" />
          Sign Out of MoneyTrace
        </button>
      </div>
    </div>
  );
}
