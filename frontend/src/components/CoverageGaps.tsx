import type { CoverageGap, FrictionSeverity } from "../types";

const SEVERITY_COLOR: Record<FrictionSeverity, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

interface Props {
  gaps: CoverageGap[];
}

export default function CoverageGaps({ gaps }: Props) {
  if (gaps.length === 0) return null;

  return (
    <section className="section">
      <h2 className="section-title">Feature Coverage Gaps</h2>
      <p className="section-subtitle">
        Use cases that appear missing or hard to discover in the UI — sourced from the project description and inferred from the UI context.
      </p>
      <table className="a11y-table">
        <thead>
          <tr>
            <th>Use Case</th>
            <th>Finding</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap, i) => (
            <tr key={i}>
              <td className="a11y-element">{gap.use_case}</td>
              <td>{gap.finding}</td>
              <td>
                <span
                  className="severity-pill"
                  style={{
                    background: SEVERITY_COLOR[gap.severity] + "22",
                    color: SEVERITY_COLOR[gap.severity],
                  }}
                >
                  {gap.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
