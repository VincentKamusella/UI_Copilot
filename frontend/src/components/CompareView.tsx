import type { AccessibilityIssue, AuditReport, FrictionSeverity, UserStoryStep } from "../types";

interface Props {
  base: AuditReport;     // A — selected from history
  current: AuditReport;  // B — currently shown report
  onClose: () => void;
}

const SEVS = ["critical", "high", "medium", "low"] as const;
const SEV_NUM: Record<FrictionSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function scoreColor(n: number) {
  if (n >= 80) return "#22c55e";
  if (n >= 60) return "#f59e0b";
  if (n >= 40) return "#f97316";
  return "#ef4444";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Delta({ v }: { v: number }) {
  if (v === 0) return <span className="delta neutral">±0</span>;
  return <span className={`delta ${v > 0 ? "pos" : "neg"}`}>{v > 0 ? "+" : ""}{v}</span>;
}

function frictionCounts(steps: UserStoryStep[]) {
  const c = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const s of steps)
    if (s.friction_point && s.friction_point.toLowerCase() !== "none")
      c[s.friction_severity]++;
  return c;
}

function a11yCounts(issues: AccessibilityIssue[]) {
  const c = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues) c[i.severity]++;
  return c;
}

function hasFriction(s: UserStoryStep) {
  return s.friction_point && s.friction_point.toLowerCase() !== "none";
}

function stepStatus(a: UserStoryStep | undefined, b: UserStoryStep | undefined) {
  const aF = a ? hasFriction(a) : false;
  const bF = b ? hasFriction(b) : false;
  if (!aF && !bF) return "clean";
  if (aF && !bF) return "resolved";
  if (!aF && bF) return "new";
  if (aF && bF) {
    const diff = SEV_NUM[b!.friction_severity] - SEV_NUM[a!.friction_severity];
    if (diff < 0) return "improved";
    if (diff > 0) return "worsened";
    return "same";
  }
  return "clean";
}

function issueKey(i: AccessibilityIssue) {
  return `${i.element.trim().toLowerCase()}||${i.issue.trim().toLowerCase()}`;
}

function reportLabel(r: AuditReport) {
  return r.page_title ?? r.source_url ?? "Uploaded image";
}

export default function CompareView({ base, current, onClose }: Props) {
  const scoreDelta = current.summary.overall_ux_score - base.summary.overall_ux_score;

  const baseFr = frictionCounts(base.user_story_timeline);
  const curFr = frictionCounts(current.user_story_timeline);
  const baseA = a11yCounts(base.accessibility_issues);
  const curA = a11yCounts(current.accessibility_issues);

  const baseKeys = new Set(base.accessibility_issues.map(issueKey));
  const curKeys = new Set(current.accessibility_issues.map(issueKey));
  const resolvedIssues = base.accessibility_issues.filter((i) => !curKeys.has(issueKey(i)));
  const newIssues = current.accessibility_issues.filter((i) => !baseKeys.has(issueKey(i)));
  const unchangedIssues = current.accessibility_issues.filter((i) => baseKeys.has(issueKey(i)));

  const baseSteps = new Map(base.user_story_timeline.map((s) => [s.step, s]));
  const curSteps = new Map(current.user_story_timeline.map((s) => [s.step, s]));
  const stepNums = [
    ...new Set([
      ...base.user_story_timeline.map((s) => s.step),
      ...current.user_story_timeline.map((s) => s.step),
    ]),
  ].sort((a, b) => a - b);

  return (
    <div className="compare-view">
      <div className="compare-view-header">
        <h2 className="compare-view-title">Side-by-side Comparison</h2>
        <button className="btn-ghost" onClick={onClose}>✕ Close</button>
      </div>

      {/* ── Score ── */}
      <div className="compare-score-row">
        <div className="compare-score-block">
          <span className="compare-side-tag">A</span>
          <div className="compare-side-name">{reportLabel(base)}</div>
          <div className="compare-side-date">{formatDate(base.created_at)}</div>
          <div className="compare-score-num" style={{ color: scoreColor(base.summary.overall_ux_score) }}>
            {base.summary.overall_ux_score}
          </div>
        </div>
        <div className="compare-arrow-col">
          <Delta v={scoreDelta} />
          <div className="compare-arrow">→</div>
        </div>
        <div className="compare-score-block">
          <span className="compare-side-tag current-tag">B · current</span>
          <div className="compare-side-name">{reportLabel(current)}</div>
          <div className="compare-side-date">{formatDate(current.created_at)}</div>
          <div className="compare-score-num" style={{ color: scoreColor(current.summary.overall_ux_score) }}>
            {current.summary.overall_ux_score}
          </div>
        </div>
      </div>

      {/* ── Counts ── */}
      <div className="compare-counts-row">
        {[
          { title: "UX Friction", base: baseFr, cur: curFr },
          { title: "Accessibility", base: baseA, cur: curA },
        ].map(({ title, base: b, cur: c }) => (
          <div key={title} className="compare-counts-block">
            <div className="compare-counts-title">{title}</div>
            <div className="compare-counts-head">
              <span>Severity</span><span>A</span><span>Δ</span><span>B</span>
            </div>
            {SEVS.map((sev) => (
              <div key={sev} className={`compare-count-line ${sev}`}>
                <span className="count-sev-label">{sev}</span>
                <span>{b[sev]}</span>
                <Delta v={c[sev] - b[sev]} />
                <span>{c[sev]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="compare-section">
        <h3 className="compare-section-title">User Story Timeline</h3>
        <div className="compare-timeline-head">
          <span>A — {reportLabel(base)}</span>
          <span></span>
          <span>B — {reportLabel(current)}</span>
        </div>
        {stepNums.map((n) => {
          const a = baseSteps.get(n);
          const b = curSteps.get(n);
          const status = stepStatus(a, b);
          return (
            <div key={n} className={`compare-step-row status-${status}`}>
              <div className="compare-step-cell">
                {a ? (
                  <>
                    <div className="step-action">
                      <strong>Step {a.step}:</strong> {a.action}
                    </div>
                    {hasFriction(a) && (
                      <div className={`step-friction ${a.friction_severity}`}>⚠ {a.friction_point}</div>
                    )}
                  </>
                ) : (
                  <span className="step-absent">—</span>
                )}
              </div>
              <div className="compare-step-mid">
                {status === "resolved" && <span className="step-tag resolved">✓ Resolved</span>}
                {status === "new" && <span className="step-tag new-issue">✗ New</span>}
                {status === "improved" && <span className="step-tag improved">↓ Improved</span>}
                {status === "worsened" && <span className="step-tag worsened">↑ Worsened</span>}
                {status === "same" && <span className="step-tag same">= Same</span>}
              </div>
              <div className="compare-step-cell">
                {b ? (
                  <>
                    <div className="step-action">
                      <strong>Step {b.step}:</strong> {b.action}
                    </div>
                    {hasFriction(b) && (
                      <div className={`step-friction ${b.friction_severity}`}>⚠ {b.friction_point}</div>
                    )}
                  </>
                ) : (
                  <span className="step-absent">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── A11y diff ── */}
      <div className="compare-section">
        <h3 className="compare-section-title">Accessibility Issues</h3>

        {resolvedIssues.length === 0 && newIssues.length === 0 && unchangedIssues.length === 0 && (
          <p className="compare-empty-text">No accessibility issues in either audit.</p>
        )}

        {resolvedIssues.length > 0 && (
          <div className="a11y-diff-group resolved">
            <div className="a11y-diff-label">✓ Resolved ({resolvedIssues.length})</div>
            {resolvedIssues.map((i, idx) => (
              <div key={idx} className="a11y-diff-item">
                <span className="a11y-el">{i.element}</span>
                <span className="a11y-iss">{i.issue}</span>
                <span className={`sev-badge ${i.severity}`}>{i.severity}</span>
              </div>
            ))}
          </div>
        )}

        {newIssues.length > 0 && (
          <div className="a11y-diff-group new-issues">
            <div className="a11y-diff-label">✗ New ({newIssues.length})</div>
            {newIssues.map((i, idx) => (
              <div key={idx} className="a11y-diff-item">
                <span className="a11y-el">{i.element}</span>
                <span className="a11y-iss">{i.issue}</span>
                <span className={`sev-badge ${i.severity}`}>{i.severity}</span>
              </div>
            ))}
          </div>
        )}

        {unchangedIssues.length > 0 && (
          <div className="a11y-diff-group unchanged">
            <div className="a11y-diff-label">= Unchanged ({unchangedIssues.length})</div>
            {unchangedIssues.map((i, idx) => (
              <div key={idx} className="a11y-diff-item">
                <span className="a11y-el">{i.element}</span>
                <span className="a11y-iss">{i.issue}</span>
                <span className={`sev-badge ${i.severity}`}>{i.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
