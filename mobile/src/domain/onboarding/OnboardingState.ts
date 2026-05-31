export type LearningGoal = 'exam' | 'general' | 'professional' | 'academic';

// Maps 1:1 to the six CEFR bands we surface in the UI (A2 is the entry point;
// A1 is below our content floor).
export type ProficiencyBand = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface OnboardingState {
  goal?: LearningGoal;
  band?: ProficiencyBand;
  // Approximate word-frequency rank at the learner's frontier (e.g. 3000 means
  // they know ~3k common words). Optional: only set if the Knowledge Map step
  // runs; omitted for learners who skip that step.
  frontierRank?: number;
  completedAt: number; // Unix ms
}
