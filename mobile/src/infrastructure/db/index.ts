// Public surface of the db infrastructure module. The composition root
// (container.ts, owned by the integration owner) imports openDatabase to
// bootstrap and the repository classes to wire the domain ports.

export { openDatabase, type DatabaseHandle } from '@/infrastructure/db/database';
export {
  runAnswerQuestionTransaction,
  type AnswerQuestionWrite,
} from '@/infrastructure/db/answerQuestionTransaction';

export { SQLiteAnswerWriter } from '@/infrastructure/db/SQLiteAnswerWriter';

export { SQLiteWordRepository } from '@/infrastructure/db/repositories/SQLiteWordRepository';
export { SQLitePseudoWordRepository } from '@/infrastructure/db/repositories/SQLitePseudoWordRepository';
export { SQLiteContentTierRepository } from '@/infrastructure/db/repositories/SQLiteContentTierRepository';
export { SQLiteUserProgressRepository } from '@/infrastructure/db/repositories/SQLiteUserProgressRepository';
export { SQLiteQuizSessionRepository } from '@/infrastructure/db/repositories/SQLiteQuizSessionRepository';
export { SQLiteQuizAttemptRepository } from '@/infrastructure/db/repositories/SQLiteQuizAttemptRepository';
export { SQLiteUserStatsRepository } from '@/infrastructure/db/repositories/SQLiteUserStatsRepository';
export { SQLiteSavedWordRepository } from '@/infrastructure/db/repositories/SQLiteSavedWordRepository';
export { SQLiteActiveSessionRepository } from '@/infrastructure/db/repositories/SQLiteActiveSessionRepository';
