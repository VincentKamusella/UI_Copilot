import type { AccessibilityIssue, FrictionSeverity } from "../types";

const SEVERITY_COLOR: Record<FrictionSeverity, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

interface Props {
  issues: AccessibilityIssue[];
}

export default function A11yIssues({ issues }: Props) {
  if (issues.length === 0) return null;

  return (
    <section className="section">
      <h2 className="section-title">Accessibility Issues</h2>
      <table className="a11y-table">
        <thead>
          <tr>
            <th>Element</th>
            <th>Issue</th>
            <th>WCAG</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr key={i}>
              <td className="a11y-element">{issue.element}</td>
              <td>{issue.issue}</td>
              <td className="wcag-criterion">{issue.wcag_criterion}</td>
              <td>
                <span
                  className="severity-pill"
                  style={{
                    background: SEVERITY_COLOR[issue.severity] + "22",
                    color: SEVERITY_COLOR[issue.severity],
                  }}
                >
                  {issue.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
