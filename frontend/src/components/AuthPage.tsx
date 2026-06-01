import { useEffect, useState } from "react";
import { forgotPassword, resetPassword, verifyEmail } from "../api";
import { useAuth } from "../lib/AuthContext";

type Mode = "signin" | "register";
type Stage = "form" | "pending" | "verified" | "verify-error" | "forgot" | "forgot-sent" | "reset" | "reset-done" | "reset-error";

function validateUsername(v: string): string {
  if (v.length < 4 || v.length > 20) return "Must be 4–20 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Letters, numbers, and underscores only.";
  return "";
}

function validatePassword(v: string): string {
  if (v.length < 4 || v.length > 20) return "Must be 4–20 characters.";
  if (!/[a-zA-Z]/.test(v)) return "Must contain at least one letter.";
  if (!/[0-9]/.test(v)) return "Must contain at least one number.";
  return "";
}

function validateEmail(v: string): string {
  if (v.split("@").length !== 2) return "Must contain exactly one @.";
  const [, domain] = v.split("@");
  if (!domain.includes(".")) return "Domain must have a valid extension.";
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return "Extension must be at least 2 characters.";
  return "";
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [stage, setStage] = useState<Stage>("form");
  const [verifiedUsername, setVerifiedUsername] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [loginField, setLoginField] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [touched, setTouched] = useState({ login: false, username: false, email: false, password: false });
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle ?verify=TOKEN and ?reset=TOKEN in the URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    window.history.replaceState({}, "", window.location.pathname);

    const verifyToken = params.get("verify");
    if (verifyToken) {
      verifyEmail(verifyToken)
        .then((res) => { setVerifiedUsername(res.username); setStage("verified"); })
        .catch(() => setStage("verify-error"));
      return;
    }

    const rToken = params.get("reset");
    if (rToken) {
      setResetToken(rToken);
      setStage("reset");
    }
  }, []);

  const errors = {
    login: touched.login && mode === "signin" ? (loginField.trim() ? "" : "Required.") : "",
    username: touched.username && mode === "register" ? validateUsername(username) : "",
    email: touched.email && mode === "register" ? validateEmail(email) : "",
    password: touched.password ? validatePassword(password) : "",
  };

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setTouched({ login: true, username: true, email: true, password: true });
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setServerError("");
    try {
      if (mode === "signin") {
        await login(loginField, password);
      } else {
        await register(username, email, password);
        setStage("pending");
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setStage("form");
    setServerError("");
    setTouched({ login: false, username: false, email: false, password: false });
  }

  async function handleForgot(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    try {
      await forgotPassword(forgotEmail.trim());
      setStage("forgot-sent");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: { preventDefault(): void }) {
    e.preventDefault();
    const err = validatePassword(newPassword);
    if (err) { setServerError(err); return; }
    setLoading(true);
    setServerError("");
    try {
      await resetPassword(resetToken, newPassword);
      setStage("reset-done");
    } catch (err) {
      setStage("reset-error");
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot password form ─────────────────────────────────────────────────
  if (stage === "forgot") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <p className="tagline" style={{ marginBottom: 28 }}>Reset your password</p>
          <form onSubmit={handleForgot} className="form-body">
            <div className="field-group">
              <input
                className="input"
                type="email"
                placeholder="Your email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {serverError && <div className="error-banner">{serverError}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "…" : "Send reset link"}
            </button>
            <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => { setStage("form"); setServerError(""); }}>
              Back to sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Forgot password sent ──────────────────────────────────────────────────
  if (stage === "forgot-sent") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon pending">⏳</div>
            <h2>Check the server terminal</h2>
            <p>A password reset link was printed to the backend terminal.<br />Open that link to set a new password.</p>
            <button className="btn-primary" onClick={() => { setStage("form"); setMode("signin"); }}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset password form (arrived via ?reset=TOKEN) ────────────────────────
  if (stage === "reset") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <p className="tagline" style={{ marginBottom: 28 }}>Choose a new password</p>
          <form onSubmit={handleReset} className="form-body">
            <div className="field-group">
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <span className="field-hint">4–20 characters, at least one letter and one number.</span>
            </div>
            {serverError && <div className="error-banner">{serverError}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "…" : "Set new password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Reset success ─────────────────────────────────────────────────────────
  if (stage === "reset-done") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon">✓</div>
            <h2>Password updated!</h2>
            <p>Your password has been changed. You can now sign in.</p>
            <button className="btn-primary" onClick={() => { setStage("form"); setMode("signin"); }}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset error (bad/expired token) ──────────────────────────────────────
  if (stage === "reset-error") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon error">✗</div>
            <h2>Link expired</h2>
            <p>This reset link is invalid or has expired (links last 1 hour).</p>
            <button className="btn-primary" onClick={() => { setStage("forgot"); setServerError(""); }}>
              Request a new link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Verified success state ────────────────────────────────────────────────
  if (stage === "verified") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon">✓</div>
            <h2>Email verified!</h2>
            <p>Welcome, <strong>{verifiedUsername}</strong>. You can now sign in.</p>
            <button className="btn-primary" onClick={() => { setStage("form"); setMode("signin"); }}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Bad token state ───────────────────────────────────────────────────────
  if (stage === "verify-error") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon error">✗</div>
            <h2>Invalid link</h2>
            <p>This verification link is invalid or has already been used.</p>
            <button className="btn-primary" onClick={() => { setStage("form"); setMode("register"); }}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending verification state ────────────────────────────────────────────
  if (stage === "pending") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
          <div className="verify-success">
            <div className="verify-icon pending">⏳</div>
            <h2>Check the server terminal</h2>
            <p>
              A verification link was printed to the backend terminal.<br />
              Open that link to activate your account, then sign in.
            </p>
            <button className="btn-primary" onClick={() => { setStage("form"); setMode("signin"); }}>
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
        <p className="tagline" style={{ marginBottom: 28 }}>
          Automated usability audits powered by Playwright + GPT-4o Vision
        </p>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={mode === "signin" ? "tab active" : "tab"} onClick={() => switchMode("signin")}>
            Sign In
          </button>
          <button className={mode === "register" ? "tab active" : "tab"} onClick={() => switchMode("register")}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          {mode === "signin" ? (
            <div className="field-group">
              <input
                className={`input${errors.login ? " input-error" : ""}`}
                placeholder="Username or email"
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, login: true }))}
                autoComplete="username"
              />
              {errors.login && <span className="field-error">{errors.login}</span>}
            </div>
          ) : (
            <>
              <div className="field-group">
                <input
                  className={`input${errors.username ? " input-error" : ""}`}
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  autoComplete="username"
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>
              <div className="field-group">
                <input
                  className={`input${errors.email ? " input-error" : ""}`}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  autoComplete="email"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
            </>
          )}

          <div className="field-group">
            <input
              className={`input${errors.password ? " input-error" : ""}`}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
            {mode === "register" && !errors.password && (
              <span className="field-hint">4–20 characters, at least one letter and one number.</span>
            )}
          </div>

          {serverError && <div className="error-banner">{serverError}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 4, fontSize: "0.8rem" }}
              onClick={() => { setStage("forgot"); setServerError(""); }}
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
