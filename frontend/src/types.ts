export type FrictionSeverity = "low" | "medium" | "high" | "critical";

export interface UserStoryStep {
  step: number;
  persona: string;
  action: string;
  system_response: string;
  friction_point: string;
  friction_severity: FrictionSeverity;
  emotional_state: string;
  ux_recommendation: string;
}

export interface AccessibilityIssue {
  element: string;
  issue: string;
  wcag_criterion: string;
  severity: FrictionSeverity;
}

export interface AuditSummary {
  overall_ux_score: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  top_recommendation: string;
  persona_description: string;
}

export interface CoverageGap {
  use_case: string;
  finding: string;
  severity: FrictionSeverity;
}

export interface AuditReport {
  audit_id: string;
  source_url: string | null;
  source_type: "url" | "image";
  page_title: string | null;
  created_at: string;
  summary: AuditSummary;
  user_story_timeline: UserStoryStep[];
  accessibility_issues: AccessibilityIssue[];
  coverage_gaps: CoverageGap[];
  pages_crawled: number;
  dom_element_count: number | null;
  screenshot_captured: boolean;
}

export interface AuditResponse {
  success: boolean;
  report: AuditReport | null;
  error: string | null;
}

export interface AuthUser {
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

export interface AuditHistoryItem {
  id: string;
  source_url: string | null;
  source_type: "url" | "image";
  page_title: string | null;
  ux_score: number;
  pages_crawled: number;
  created_at: string;
}
