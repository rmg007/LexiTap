import type { Word } from '@/domain/vocabulary/Word';

// In-flight study-session snapshot (SESSION_RESUME_PLAN Part B). Persisted as a
// single row in user.db `active_session` (id = 1) so the learner can leave a
// learn session at any point and resume EXACTLY where they left off — Home
// offers "Resume (n/10)" while a snapshot exists. Device-local navigation state,
// not learning truth (mastery lives in user_progress); wiped on account deletion
// and cleared when a session completes normally.
//
// Only the learn flow is snapshotted at v1 — reviews self-heal (an answered word
// drops from the due queue), so a resumed review is just "you still have N due",
// which Home already surfaces.

// Which sub-screen of the learn flow the learner was on when they left.
//   'card'  — reading the LearnCard batch (no SRS written yet).
//   'check' — the LearnQuickCheck (each answer already wrote SRS per-answer, so
//             `index` points at the next unanswered check).
export type ActiveSessionStage = 'card' | 'check';

export interface ActiveSession {
  kind: 'learn';
  tierId: string;
  // The full learn batch, self-contained so resume renders without re-fetching
  // (<=10 words; the same Word[] already handed between routes as JSON).
  batch: Word[];
  stage: ActiveSessionStage;
  index: number; // card index (stage 'card') or check index (stage 'check')
}

export interface ActiveSessionRepository {
  get(): Promise<ActiveSession | null>;
  save(session: ActiveSession): Promise<void>;
  clear(): Promise<void>;
}
