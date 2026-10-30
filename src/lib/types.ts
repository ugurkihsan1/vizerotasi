import type { PreviousVisa } from "./schemas";
import type { ProgressMetrics } from "./community";
export type Kind = "experience" | "general" | "question" | "tip" | "update";
export type Status = "pending" | "approved" | "rejected" | "needs_revision";
export interface Country {
  cover_url?: string | null;
  summary?: string;
  source_url?: string | null;
  appointment_url?: string | null;
  is_schengen?: boolean;
  community_ready?: boolean;
  id: string;
  name: string;
  flag: string;
  code: string;
}
export interface Profile {
  needs_onboarding?: boolean;
  is_private?: boolean;
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  role: "user" | "moderator" | "admin";
  reputation: number;
  badge_score?: number;
  member_number?: number;
  is_pioneer?: boolean;
  reputation_metrics?: ProgressMetrics;
  membership_level: string;
  created_at: string;
}
export interface Post {
  category_id?: string | null;
  previous_visas?: PreviousVisa[];
  invitation_notes?: string;
  invitation?: boolean | null;
  id: string;
  user_id: string;
  country_id: string;
  kind: Kind;
  title: string;
  body: string;
  advice: string;
  status: Status;
  created_at: string;
  helpful_count: number;
  comment_count: number;
  is_sample: boolean;
  city: string | null;
  result: "approved" | "rejected" | "waiting" | null;
  first_schengen: boolean | null;
  employment_status: string | null;
  financing: string | null;
  processing_days?: number | null;
  application_date: string | null;
  decision_date: string | null;
  appointment_date: string | null;
  passport_date: string | null;
  requested_days: number | null;
  granted_days: number | null;
  entries: string | null;
  purpose: string | null;
  source_type: string;
  source_url: string | null;
  last_verified_at: string | null;
}
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  status: Status;
  created_at: string;
}
export interface Notice {
  actor_id?: string | null;
  kind?: "activity" | "follow";
  id: string;
  message: string;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
}
export interface Document {
  id: string;
  country_id: string;
  title: string;
  body: string;
  category: string;
  source_url: string | null;
}
