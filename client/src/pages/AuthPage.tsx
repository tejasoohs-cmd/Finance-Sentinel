import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import * as Icons from "lucide-react";

type Mode = "login" | "register" | "forgot" | "reset";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  // Login / Register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Reset password (use token)
  const [resetTokenInput, setResetTokenInput] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password, displayName || username);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setResetToken("");
    if (!forgotUsername.trim()) {
      setForgotError("Please enter your username");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      });
      const data = await res.json();
      if (data.token) {
        setResetToken(data.token);
        setTokenExpiry(data.expiresAt);
        setResetTokenInput(data.token);
      } else {
        setForgotError("No account found with that username.");
      }
    } catch {
      setForgotError("Failed to generate reset token. Try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(resetToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    if (!resetTokenInput.trim() || !resetNewPassword || !resetConfirm) {
      setResetError("All fields are required");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (resetNewPassword !== resetConfirm) {
      setResetError("Passwords do not match");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetTokenInput.trim(), newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      setResetSuccess("Password reset successfully! You can now sign in.");
      setTimeout(() => {
        setMode("login");
        setResetSuccess("");
        setResetTokenInput("");
        setResetNewPassword("");
        setResetConfirm("");
      }, 2500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setForgotError("");
    setResetError("");
    setResetToken("");
    setResetSuccess("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Icons.Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">MoneyTrace</h1>
          <p className="text-muted-foreground text-sm mt-1">Personal Finance for the UAE</p>
        </div>

        <div className="bg-card border border-border rounded-3xl shadow-2xl p-8">

          {/* ── LOGIN / REGISTER ── */}
          {(mode === "login" || mode === "register") && (
            <>
              <div className="flex bg-secondary/30 rounded-xl p-1 mb-6">
                <button
                  onClick={() => switchMode("login")}
                  data-testid="tab-login"
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "login" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode("register")}
                  data-testid="tab-register"
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "register" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="animate-in slide-in-from-top-2 duration-200 fade-in">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Display Name</label>
                    <div className="relative">
                      <Icons.User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                        data-testid="input-displayname"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <Icons.AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                      placeholder="your_username"
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono"
                      data-testid="input-username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                      data-testid="input-password"
                    />
                  </div>
                  {mode === "register" && (
                    <p className="text-xs text-muted-foreground mt-1.5">Minimum 6 characters</p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2 animate-in fade-in duration-200">
                    <Icons.AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !username || !password}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <>
                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                      {mode === "login" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? <Icons.LogIn className="w-4 h-4" /> : <Icons.UserPlus className="w-4 h-4" />}
                      {mode === "login" ? "Sign In" : "Create Account"}
                    </>
                  )}
                </button>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    data-testid="link-forgot-password"
                    className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors pt-1"
                  >
                    Forgot your password?
                  </button>
                )}
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => switchMode("login")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-login"
                >
                  <Icons.ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-foreground">Forgot Password</h2>
                  <p className="text-xs text-muted-foreground">Enter your username to get a reset token</p>
                </div>
              </div>

              {!resetToken ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Username</label>
                    <div className="relative">
                      <Icons.AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={forgotUsername}
                        onChange={e => setForgotUsername(e.target.value.toLowerCase().trim())}
                        placeholder="your_username"
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm font-mono"
                        data-testid="input-forgot-username"
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <Icons.AlertCircle className="w-3 h-3" /> {forgotError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotUsername.trim()}
                    data-testid="button-generate-token"
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {forgotLoading ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.KeyRound className="w-4 h-4" />}
                    {forgotLoading ? "Generating..." : "Generate Reset Token"}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Icons.Key className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <p className="text-xs font-semibold text-amber-400">Your reset token (expires in 1 hour)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-foreground bg-background/50 rounded-lg px-3 py-2 break-all select-all">
                        {resetToken}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        data-testid="button-copy-token"
                        className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
                        title="Copy token"
                      >
                        {tokenCopied ? <Icons.Check className="w-4 h-4 text-emerald-400" /> : <Icons.Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Copy this token. Then use it below to set your new password.
                    </p>
                  </div>

                  <button
                    onClick={() => switchMode("reset")}
                    data-testid="button-go-to-reset"
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Icons.Lock className="w-4 h-4" />
                    Use Token to Reset Password
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── RESET PASSWORD ── */}
          {mode === "reset" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => switchMode("forgot")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-back-forgot"
                >
                  <Icons.ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-foreground">Reset Password</h2>
                  <p className="text-xs text-muted-foreground">Enter your token and choose a new password</p>
                </div>
              </div>

              {resetSuccess ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <Icons.CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-400">{resetSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reset Token</label>
                    <div className="relative">
                      <Icons.Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={resetTokenInput}
                        onChange={e => setResetTokenInput(e.target.value.trim())}
                        placeholder="Paste your reset token"
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs font-mono"
                        data-testid="input-reset-token"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showResetPw ? "text" : "password"}
                        value={resetNewPassword}
                        onChange={e => setResetNewPassword(e.target.value)}
                        placeholder="New password (min 6 characters)"
                        className="w-full pl-10 pr-10 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                        data-testid="input-reset-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showResetPw ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Confirm Password</label>
                    <div className="relative">
                      <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={resetConfirm}
                        onChange={e => setResetConfirm(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-10 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
                        data-testid="input-reset-confirm-password"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <Icons.AlertCircle className="w-3 h-3" /> {resetError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    data-testid="button-reset-password"
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {resetLoading ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.ShieldCheck className="w-4 h-4" />}
                    {resetLoading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Bottom security notice — only on login/register */}
          {(mode === "login" || mode === "register") && (
            <div className="mt-6 p-4 bg-secondary/20 rounded-xl border border-border">
              <div className="flex items-start gap-3">
                <Icons.ShieldCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your financial data is encrypted and stored securely. Only you can access your account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
