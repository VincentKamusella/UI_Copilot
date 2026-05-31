import { useEffect, useState } from "react";
import { clearHistory, deleteAudit, fetchAudit, fetchHistory } from "../api";
import type { AuditHistoryItem, AuditReport } from "../types";

interface Props {
  onRestore: (report: AuditReport) => void;
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

export default function AuditHistory({ onRestore }: Props) {
  const [items, setItems] = useState<AuditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchHistory());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRestore(id: string) {
    setRestoring(id);
    try {
      const report = await fetchAudit(id);
      onRestore(report);
    } finally {
      setRestoring(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteAudit(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleClear() {
    await clearHistory();
    setItems([]);
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="history-section">
      <div className="history-header">
        <h3 className="section-title">Past Audits</h3>
        <button className="btn-ghost" onClick={handleClear}>Clear all</button>
      </div>
      <div className="history-list">
        {items.map((item) => (
          <div key={item.id} className="history-item">
            <div className="history-item-info">
              <span className="history-score" style={{ color: scoreColor(item.ux_score) }}>
                {item.ux_score}
              </span>
              <div className="history-item-meta">
                <span className="history-title">
                  {item.page_title ?? item.source_url ?? "Uploaded image"}
                </span>
                <span className="history-date">
                  {formatDate(item.created_at)}
                  {item.pages_crawled > 1 && ` · ${item.pages_crawled} pages`}
                </span>
              </div>
            </div>
            <div className="history-item-actions">
              <button
                className="btn-ghost"
                onClick={() => handleRestore(item.id)}
                disabled={restoring === item.id}
              >
                {restoring === item.id ? "Loading…" : "View"}
              </button>
              <button className="btn-ghost btn-danger" onClick={() => handleDelete(item.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
