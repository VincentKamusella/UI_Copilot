import { useState } from "react";
import { auditImage, auditUrl, deleteAccount, fetchAudit } from "./api";
import A11yIssues from "./components/A11yIssues";
import AuditForm from "./components/AuditForm";
import AuditHistory from "./components/AuditHistory";
import AuthPage from "./components/AuthPage";
import ComparePicker from "./components/ComparePicker";
import CompareView from "./components/CompareView";
import SubscriptionPanel from "./components/SubscriptionPanel";
import CoverageGaps from "./components/CoverageGaps";
import ScoreBadge from "./components/ScoreBadge";
import Timeline from "./components/Timeline";
import { useAuth } from "./lib/AuthContext";
import type { AuditReport } from "./types";
import "./index.css";

export default function App() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comparePickerOpen, setComparePickerOpen] = useState(false);
  const [compareReport, setCompareReport] = useState<AuditReport | null>(null);
  const [subRefreshKey, setSubRefreshKey] = useState(0);

  async function handleComparePick(id: string) {
    setComparePickerOpen(false);
    const r = await fetchAudit(id);
    setCompareReport(r);
  }

  async function handleDeleteAccount() {
    await deleteAccount();
    logout();
  }

  if (!user) return <AuthPage />;

  async function handleUrlAudit(url: string, persona?: string, projectDescription?: string) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await auditUrl(url, persona, projectDescription);
      if (!res.success || !res.report) throw new Error(res.error ?? "Audit failed");
      setReport(res.report);
      setSubRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageAudit(files: File[], persona?: string, projectDescription?: string) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await auditImage(files, persona, projectDescription);
      if (!res.success || !res.report) throw new Error(res.error ?? "Audit failed");
      setReport(res.report);
      setSubRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const frictionCounts = report
    ? (() => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const s of report.user_story_timeline) {
          if (s.friction_point && s.friction_point.toLowerCase() !== "none")
            counts[s.friction_severity]++;
        }
        return counts;
      })()
    : null;

  const a11yCounts = report
    ? (() => {
        const counts = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const a of report.accessibility_issues) counts[a.severity]++;
        return counts;
      })()
    : null;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="logo">UI Copilot</h1>
          <p className="tagline">Automated usability audits powered by Playwright + GPT-4o Vision</p>
        </div>
        <div className="header-user">
          <span className="header-username">{user.username}</span>
          {confirmDelete ? (
            <>
              <span className="header-confirm-label">Delete account?</span>
              <button className="btn-ghost btn-danger" onClick={handleDeleteAccount}>Confirm</button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setConfirmDelete(true)}>Delete account</button>
              <button className="btn-ghost" onClick={logout}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="main">
        <AuditForm
          onAuditUrl={handleUrlAudit}
          onAuditImage={handleImageAudit}
          loading={loading}
        />

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Crawling pages and running analysis… this may take 30–60 s</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        {report && frictionCounts && a11yCounts && (
          <div className="report">
            <div className="report-header">
              <div>
                <h2 className="report-title">
                  {report.page_title ?? report.source_url ?? "Uploaded Image"}
                </h2>
                {report.source_url && (
                  <a className="report-url" href={report.source_url} target="_blank" rel="noreferrer">
                    {report.source_url}
                  </a>
                )}
                <p className="report-meta">
                  {report.pages_crawled > 1 && `${report.pages_crawled} pages crawled · `}
                  {report.dom_element_count != null && `${report.dom_element_count} DOM elements · `}
                  {report.user_story_timeline.length} story steps ·{" "}
                  {report.accessibility_issues.length} accessibility issues
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ScoreBadge score={report.summary.overall_ux_score} />
                <button className="btn-ghost" onClick={() => setComparePickerOpen(true)}>
                  Compare
                </button>
              </div>
            </div>

            <div className="counts-section">
              <div className="counts-group">
                <span className="counts-label">UX Friction</span>
                <div className="summary-cards">
                  {(["critical", "high", "medium", "low"] as const).map((sev) => (
                    <div key={sev} className={`summary-card ${sev}`}>
                      <span className="count">{frictionCounts[sev]}</span>
                      <span className="label">{sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="counts-group">
                <span className="counts-label">Accessibility</span>
                <div className="summary-cards">
                  {(["critical", "high", "medium", "low"] as const).map((sev) => (
                    <div key={sev} className={`summary-card ${sev}`}>
                      <span className="count">{a11yCounts[sev]}</span>
                      <span className="label">{sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="insight-row">
              <div className="insight-box">
                <span className="insight-label">Persona</span>
                <p>{report.summary.persona_description}</p>
              </div>
              <div className="insight-box highlight">
                <span className="insight-label">Top Recommendation</span>
                <p>{report.summary.top_recommendation}</p>
              </div>
            </div>

            <Timeline steps={report.user_story_timeline} />
            <CoverageGaps gaps={report.coverage_gaps} />
            <A11yIssues issues={report.accessibility_issues} />
          </div>
        )}

        {compareReport && report && (
          <CompareView
            base={compareReport}
            current={report}
            onClose={() => setCompareReport(null)}
          />
        )}

        {comparePickerOpen && report && (
          <ComparePicker
            excludeId={report.audit_id}
            onPick={handleComparePick}
            onClose={() => setComparePickerOpen(false)}
          />
        )}

        <AuditHistory onRestore={(r) => { setReport(r); setCompareReport(null); }} />
        <SubscriptionPanel refreshKey={subRefreshKey} />
      </main>
    </div>
  );
}
