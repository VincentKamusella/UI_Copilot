import { useEffect, useState } from "react";
import { fetchSubscription, upgradePlan } from "../api";
import type { PlanId, SubscriptionInfo } from "../types";

interface Props {
  refreshKey?: number;
}

interface PlanDef {
  id: PlanId;
  name: string;
  price: string;
  credits: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0 / month",
    credits: "3 audits / month",
    features: ["URL & image audits", "Full UX report", "Audit history"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99 / month",
    credits: "10 audits / month",
    features: ["Everything in Free", "Side-by-side comparison", "Priority analysis"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$19.99 / month",
    credits: "Unlimited audits",
    features: ["Everything in Pro", "No credit limits", "Early access to new features"],
  },
];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function SubscriptionPanel({ refreshKey }: Props) {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);

  async function load() {
    try {
      setInfo(await fetchSubscription());
    } catch {
      // silently ignore — non-critical UI
    }
  }

  useEffect(() => { load(); }, [refreshKey]);

  async function handleSelect(planId: PlanId) {
    if (!info || planId === info.subscription) return;
    setUpgrading(planId);
    try {
      setInfo(await upgradePlan(planId));
    } finally {
      setUpgrading(null);
    }
  }

  if (!info) return null;

  const isLimited = info.credits_limit !== null;
  const used = info.credits_used;
  const limit = info.credits_limit ?? 0;
  const pct = isLimited && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const days = daysUntil(info.next_reset);

  return (
    <div className="sub-panel">
      <div className="sub-header">
        <h3 className="sub-title">Your Plan</h3>
        {isLimited && (
          <span className="sub-usage-text">
            {info.credits_remaining} of {limit} audits remaining
            {days !== null && ` · resets in ${days}d`}
          </span>
        )}
        {!isLimited && (
          <span className="sub-usage-text">Unlimited audits</span>
        )}
      </div>

      {isLimited && (
        <div className="sub-progress-bar">
          <div className="sub-progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#2563eb" }} />
        </div>
      )}

      <div className="sub-cards">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === info.subscription;
          const isLoading = upgrading === plan.id;
          return (
            <div key={plan.id} className={`sub-card${isCurrent ? " sub-card-active" : ""}`}>
              {isCurrent && <div className="sub-current-badge">Current plan</div>}
              <div className="sub-card-name">{plan.name}</div>
              <div className="sub-card-price">{plan.price}</div>
              <div className="sub-card-credits">{plan.credits}</div>
              <ul className="sub-card-features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                className={`sub-card-btn${isCurrent ? " sub-card-btn-current" : ""}`}
                disabled={isCurrent || upgrading !== null}
                onClick={() => handleSelect(plan.id)}
              >
                {isLoading ? "…" : isCurrent ? "Current" : plan.id === "free" ? "Switch to Free" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
