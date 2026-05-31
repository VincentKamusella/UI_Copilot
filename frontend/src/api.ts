import type { AuditResponse } from "./types";

const BASE = "/api";

export async function auditUrl(url: string, personaHint?: string): Promise<AuditResponse> {
  const res = await fetch(`${BASE}/audit/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, persona_hint: personaHint || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}

export async function auditImage(file: File, personaHint?: string): Promise<AuditResponse> {
  const form = new FormData();
  form.append("file", file);
  if (personaHint) form.append("persona_hint", personaHint);
  const res = await fetch(`${BASE}/audit/image`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${res.status}`);
  }
  return res.json();
}
