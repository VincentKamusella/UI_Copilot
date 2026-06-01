import { useEffect, useState } from "react";
import { fetchHistory } from "../api";
import type { AuditHistoryItem } from "../types";

interface Props {
  excludeId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

function scoreColor(n: number) {
  if (n >= 80) return "#22c55e";
  if (n >= 60) return "#f59e0b";
  if (n >= 40) return "#f97316";
  return "#ef4444";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ComparePicker({ excludeId, onPick, onClose }: Props) {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then((h) => setItems(h.filter((i) => i.id !== excludeId)))
      .finally(() => setLoading(false));
  }, [excludeId]);

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="picker-header">
          <h3>Compare against…</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <p className="picker-empty">Loading…</p>
        ) : items.length === 0 ? (
          <p className="picker-empty">No other audits in history to compare against.</p>
        ) : (
          <div className="picker-list">
            {items.map((item) => (
              <button key={item.id} className="picker-item" onClick={() => onPick(item.id)}>
                <span className="history-score" style={{ color: scoreColor(item.ux_score) }}>
                  {item.ux_score}
                </span>
                <div className="history-item-meta">
                  <span className="history-title">
                    {item.page_title ?? item.source_url ?? "Uploaded image"}
                  </span>
                  <span className="history-date">{formatDate(item.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
