import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

type Mode = "signin" | "register";

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, email: false, password: false });
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const errors = {
    username: touched.username ? validateUsername(username) : "",
    email: mode === "register" && touched.email ? validateEmail(email) : "",
    password: touched.password ? validatePassword(password) : "",
  };
  const hasErrors = !!errors.username || !!errors.email || !!errors.password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true });
    if (hasErrors) return;
    setLoading(true);
    setServerError("");
    try {
      if (mode === "signin") {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setServerError("");
    setTouched({ username: false, email: false, password: false });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="logo" style={{ marginBottom: 4 }}>UI Copilot</h1>
        <p className="tagline" style={{ marginBottom: 28 }}>Automated usability audits powered by Playwright + GPT-4o Vision</p>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={mode === "signin" ? "tab active" : "tab"} onClick={() => switchMode("signin")}>
            Sign In
          </button>
          <button className={mode === "register" ? "tab active" : "tab"} onClick={() => switchMode("register")}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
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

          {mode === "register" && (
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
