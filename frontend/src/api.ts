import type { AuditHistoryItem, AuditReport, AuditResponse, AuthResponse } from "./types";

const BASE = "/api";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`);
  return data;
}

// ── Audits ────────────────────────────────────────────────────────────────────

export async function auditUrl(url: string, personaHint?: string, projectDescription?: string): Promise<AuditResponse> {
  const res = await fetch(`${BASE}/audit/url`, {
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
  const res = await fetch(`${BASE}/audit/image`, {
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
  const res = await fetch(`${BASE}/history`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load history.");
  return res.json();
}

export async function fetchAudit(id: string): Promise<AuditReport> {
  const res = await fetch(`${BASE}/history/${id}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Audit not found.");
  return res.json();
}

export async function clearHistory(): Promise<void> {
  await fetch(`${BASE}/history`, { method: "DELETE", headers: authHeader() });
}

export async function deleteAudit(id: string): Promise<void> {
  await fetch(`${BASE}/history/${id}`, { method: "DELETE", headers: authHeader() });
}
