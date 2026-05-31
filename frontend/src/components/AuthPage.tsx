import { useEffect, useState } from "react";
import { verifyEmail } from "../api";
import { useAuth } from "../lib/AuthContext";

type Mode = "signin" | "register";
type Stage = "form" | "pending" | "verified" | "verify-error";

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

  const [loginField, setLoginField] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ login: false, username: false, email: false, password: false });
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle ?verify=TOKEN in the URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("verify");
    if (!token) return;

    // Strip the token from the URL without reloading
    window.history.replaceState({}, "", window.location.pathname);

    verifyEmail(token)
      .then((res) => {
        setVerifiedUsername(res.username);
        setStage("verified");
      })
      .catch(() => setStage("verify-error"));
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
        </form>
      </div>
    </div>
  );
}
