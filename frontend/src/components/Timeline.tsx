import type { UserStoryStep, FrictionSeverity } from "../types";

const SEVERITY_COLOR: Record<FrictionSeverity, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

interface Props {
  steps: UserStoryStep[];
}

export default function Timeline({ steps }: Props) {
  return (
    <section className="section">
      <h2 className="section-title">User Story Timeline</h2>
      <ol className="timeline">
        {steps.map((s) => (
          <li key={s.step} className="timeline-step">
            <div className="step-number">{s.step}</div>
            <div className="step-body">
              <div className="step-header">
                <span className="persona-tag">{s.persona}</span>
                <span
                  className="severity-pill"
                  style={{
                    background: SEVERITY_COLOR[s.friction_severity] + "22",
                    color: SEVERITY_COLOR[s.friction_severity],
                  }}
                >
                  {s.friction_severity}
                </span>
              </div>

              <p className="step-action"><strong>Action:</strong> {s.action}</p>
              <p className="step-response"><strong>System:</strong> {s.system_response}</p>

              {s.friction_point !== "None" && s.friction_point && (
                <p
                  className="friction"
                  style={{ borderLeftColor: SEVERITY_COLOR[s.friction_severity] }}
                >
                  <strong>Friction:</strong> {s.friction_point}
                </p>
              )}

              <p className="recommendation">
                <strong>Recommendation:</strong> {s.ux_recommendation}
              </p>

              <p className="emotional-state">
                Emotional state: {s.emotional_state}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
