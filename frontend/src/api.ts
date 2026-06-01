import type { AuditHistoryItem, AuditReport, AuditResponse, AuthResponse, SubscriptionInfo } from "./types";

const BASE = "/api";

// Registered by AuthContext on mount — called when any authenticated request
// returns 401 (expired or revoked token) so the user is logged out immediately.
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { _onUnauthorized = fn; }

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    _onUnauthorized?.();
    throw new Error("Session expired. Please sign in again.");
  }
  return res;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<{ pending: boolean; message: string }> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
  return data;
}

export async function login(loginField: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginField, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
  return data;
}

export async function verifyEmail(token: string): Promise<{ verified: boolean; username: string }> {
  const res = await fetch(`${BASE}/auth/verify/${token}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? "Verification failed.");
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `Error ${res.status}`);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
}

// ── Audits ────────────────────────────────────────────────────────────────────

export async function auditUrl(url: string, personaHint?: string, projectDescription?: string): Promise<AuditResponse> {
  const res = await authedFetch(`${BASE}/audit/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      url,
      persona_hint: personaHint || undefined,
      project_description: projectDescription || undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

export async function auditImage(files: File[], personaHint?: string, projectDescription?: string): Promise<AuditResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  if (personaHint) form.append("persona_hint", personaHint);
  if (projectDescription) form.append("project_description", projectDescription);
  const res = await authedFetch(`${BASE}/audit/image`, {
    method: "POST",
    headers: authHeader(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

// ── History ───────────────────────────────────────────────────────────────────

export async function fetchHistory(): Promise<AuditHistoryItem[]> {
  const res = await authedFetch(`${BASE}/history`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load history.");
  return res.json();
}

export async function fetchAudit(id: string): Promise<AuditReport> {
  const res = await authedFetch(`${BASE}/history/${id}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Audit not found.");
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  await authedFetch(`${BASE}/auth/account`, { method: "DELETE", headers: authHeader() });
}

export async function clearHistory(): Promise<void> {
  await authedFetch(`${BASE}/history`, { method: "DELETE", headers: authHeader() });
}

export async function deleteAudit(id: string): Promise<void> {
  await authedFetch(`${BASE}/history/${id}`, { method: "DELETE", headers: authHeader() });
}

// ── Subscription ──────────────────────────────────────────────────────────────

export async function fetchSubscription(): Promise<SubscriptionInfo> {
  const res = await authedFetch(`${BASE}/subscription`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load subscription.");
  return res.json();
}

export async function upgradePlan(plan: string): Promise<SubscriptionInfo> {
  const res = await authedFetch(`${BASE}/subscription/upgrade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
  return data;
}
