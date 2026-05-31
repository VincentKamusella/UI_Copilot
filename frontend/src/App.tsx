import { useState } from "react";
import { auditImage, auditUrl } from "./api";
import A11yIssues from "./components/A11yIssues";
import AuditForm from "./components/AuditForm";
import ScoreBadge from "./components/ScoreBadge";
import Timeline from "./components/Timeline";
import type { AuditReport } from "./types";
import "./index.css";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);

  async function handleUrlAudit(url: string, persona?: string) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await auditUrl(url, persona);
      if (!res.success || !res.report) throw new Error(res.error ?? "Audit failed");
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageAudit(file: File, persona?: string) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await auditImage(file, persona);
      if (!res.success || !res.report) throw new Error(res.error ?? "Audit failed");
      setReport(res.report);
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
          const hasFriction = s.friction_point && s.friction_point.toLowerCase() !== "none";
          if (hasFriction) counts[s.friction_severity]++;
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
        <h1 className="logo">UI Copilot</h1>
        <p className="tagline">Automated usability audits powered by Playwright + GPT-4o Vision</p>
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
            <p>Capturing page and running analysis…</p>
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
                  {report.dom_element_count != null && `${report.dom_element_count} DOM elements · `}
                  {report.user_story_timeline.length} story steps ·{" "}
                  {report.accessibility_issues.length} accessibility issues
                </p>
              </div>
              <ScoreBadge score={report.summary.overall_ux_score} />
            </div>

            <div className="counts-section">
              <div className="counts-group">
                <span className="counts-label">UX Friction</span>
                <div className="summary-cards">
                  <div className="summary-card critical">
                    <span className="count">{frictionCounts.critical}</span>
                    <span className="label">Critical</span>
                  </div>
                  <div className="summary-card high">
                    <span className="count">{frictionCounts.high}</span>
                    <span className="label">High</span>
                  </div>
                  <div className="summary-card medium">
                    <span className="count">{frictionCounts.medium}</span>
                    <span className="label">Medium</span>
                  </div>
                  <div className="summary-card low">
                    <span className="count">{frictionCounts.low}</span>
                    <span className="label">Low</span>
                  </div>
                </div>
              </div>
              <div className="counts-group">
                <span className="counts-label">Accessibility</span>
                <div className="summary-cards">
                  <div className="summary-card critical">
                    <span className="count">{a11yCounts.critical}</span>
                    <span className="label">Critical</span>
                  </div>
                  <div className="summary-card high">
                    <span className="count">{a11yCounts.high}</span>
                    <span className="label">High</span>
                  </div>
                  <div className="summary-card medium">
                    <span className="count">{a11yCounts.medium}</span>
                    <span className="label">Medium</span>
                  </div>
                  <div className="summary-card low">
                    <span className="count">{a11yCounts.low}</span>
                    <span className="label">Low</span>
                  </div>
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
            <A11yIssues issues={report.accessibility_issues} />
          </div>
        )}
      </main>
    </div>
  );
}
