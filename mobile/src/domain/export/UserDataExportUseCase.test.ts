import { UserDataExportUseCase } from './UserDataExportUseCase';
import type { ExportDataPort } from './UserDataExportUseCase';

const NOW_MS = 1_700_000_000_000; // 2023-11-14T22:13:20.000Z

const SAMPLE_STATS: Awaited<ReturnType<ExportDataPort['getUserStats']>> = {
  totalSessions: 42,
  totalWordsMastered: 120,
  streak: { currentStreak: 7, longestStreak: 14 },
};

const SAMPLE_PROGRESS: Awaited<ReturnType<ExportDataPort['getAllProgress']>> = [
  {
    wordId: 'word-1',
    masteryLevel: 3,
    nextReviewDate: NOW_MS + 86_400_000,
    lastReviewedAt: NOW_MS - 3_600_000,
    consecutiveCorrect: 3,
    totalAttempts: 10,
    totalCorrect: 8,
    firstSeenAt: NOW_MS - 7_200_000,
    schedulerVersion: 'v1-fixed',
  },
];

function makePort(overrides: Partial<ExportDataPort> = {}): ExportDataPort {
  return {
    getAllProgress: jest.fn().mockResolvedValue(SAMPLE_PROGRESS),
    getUserStats: jest.fn().mockResolvedValue(SAMPLE_STATS),
    ...overrides,
  };
}

describe('UserDataExportUseCase', () => {
  it('happy path — returns valid JSON with stats and progress', async () => {
    const uc = new UserDataExportUseCase(makePort());

    const json = await uc.execute(NOW_MS);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe(new Date(NOW_MS).toISOString());

    expect(parsed.stats).toMatchObject({
      totalSessions: 42,
      totalWordsMastered: 120,
      streak: { currentStreak: 7, longestStreak: 14 },
    });

    expect(parsed.progress).toHaveLength(1);
    expect(parsed.progress[0]).toMatchObject({
      wordId: 'word-1',
      masteryLevel: 3,
      consecutiveCorrect: 3,
      totalAttempts: 10,
      totalCorrect: 8,
      schedulerVersion: 'v1-fixed',
    });
  });

  it('stats null — payload.stats is null, progress still present', async () => {
    const uc = new UserDataExportUseCase(
      makePort({ getUserStats: jest.fn().mockResolvedValue(null) }),
    );

    const json = await uc.execute(NOW_MS);
    const parsed = JSON.parse(json);

    expect(parsed.stats).toBeNull();
    expect(parsed.progress).toHaveLength(1);
  });

  it('no progress rows — payload.progress is empty array', async () => {
    const uc = new UserDataExportUseCase(
      makePort({ getAllProgress: jest.fn().mockResolvedValue([]) }),
    );

    const json = await uc.execute(NOW_MS);
    const parsed = JSON.parse(json);

    expect(parsed.progress).toEqual([]);
  });

  it('omits undefined optional fields from progress entries', async () => {
    const minimalProgress: Awaited<ReturnType<ExportDataPort['getAllProgress']>> = [
      {
        wordId: 'word-2',
        masteryLevel: 0,
        nextReviewDate: NOW_MS,
        consecutiveCorrect: 0,
        totalAttempts: 1,
        totalCorrect: 0,
        schedulerVersion: 'v1-fixed',
        // lastReviewedAt and firstSeenAt intentionally absent
      },
    ];
    const uc = new UserDataExportUseCase(
      makePort({ getAllProgress: jest.fn().mockResolvedValue(minimalProgress) }),
    );

    const json = await uc.execute(NOW_MS);
    const parsed = JSON.parse(json);

    expect(parsed.progress[0]).not.toHaveProperty('lastReviewedAt');
    expect(parsed.progress[0]).not.toHaveProperty('firstSeenAt');
  });

  it('error path — rejects when port throws', async () => {
    const uc = new UserDataExportUseCase(
      makePort({ getAllProgress: jest.fn().mockRejectedValue(new Error('DB error')) }),
    );

    await expect(uc.execute(NOW_MS)).rejects.toThrow('DB error');
  });
});
