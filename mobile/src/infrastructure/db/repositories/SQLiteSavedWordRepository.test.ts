import { SQLiteSavedWordRepository } from '@/infrastructure/db/repositories/SQLiteSavedWordRepository';
import type { DatabaseHandle } from '@/infrastructure/db/database';
import type { SavedWordListRow } from '@/infrastructure/db/rows';
import { asWordId } from '@/domain/vocabulary/ids';

function listRow(id: string, savedAt: number, mastery: number): SavedWordListRow {
  return {
    id,
    word: id,
    definition: 'd',
    tier_id: 'foundation',
    pos: null,
    cefr_level: null,
    grade_level: null,
    word_type: null,
    difficulty: null,
    frequency_rank: null,
    theme: null,
    example_sentence: '_ x',
    image_path: null,
    audio_path: null,
    synonyms: null,
    antonyms: null,
    usage_notes: null,
    created_at: 0,
    deleted_at: null,
    saved_at: savedAt,
    mastery_level: mastery,
  };
}

describe('SQLiteSavedWordRepository', () => {
  it('isSaved maps COUNT > 0 to a boolean', async () => {
    const dbYes = { first: jest.fn(async () => ({ n: 1 })) } as unknown as DatabaseHandle;
    const dbNo = { first: jest.fn(async () => ({ n: 0 })) } as unknown as DatabaseHandle;
    expect(await new SQLiteSavedWordRepository(dbYes).isSaved(asWordId('w'))).toBe(true);
    expect(await new SQLiteSavedWordRepository(dbNo).isSaved(asWordId('w'))).toBe(false);
  });

  it('save is idempotent (delegates to INSERT OR IGNORE, never throws on repeat)', async () => {
    const run = jest.fn().mockResolvedValue({ lastInsertRowId: 0, changes: 0 });
    const db = { run } as unknown as DatabaseHandle;
    const repo = new SQLiteSavedWordRepository(db);
    await repo.save(asWordId('w'), 'learn', 100);
    await repo.save(asWordId('w'), 'learn', 100); // second save: no throw
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[0]![0]).toContain('INSERT OR IGNORE');
  });

  it('count maps the {n} row', async () => {
    const db = { first: jest.fn(async () => ({ n: 7 })) } as unknown as DatabaseHandle;
    expect(await new SQLiteSavedWordRepository(db).count()).toBe(7);
  });

  it('listPage maps joined rows to SavedWordListItem (word + savedAt + mastery)', async () => {
    const rows = [listRow('b', 5000, 3), listRow('a', 4000, 0)];
    const db = { all: jest.fn(async () => rows) } as unknown as DatabaseHandle;
    const items = await new SQLiteSavedWordRepository(db).listPage(null, null, 20);
    expect(items).toHaveLength(2);
    expect(items[0]!.word.word).toBe('b');
    expect(items[0]!.savedAt).toBe(5000);
    expect(items[0]!.masteryLevel).toBe(3);
    expect(items[1]!.masteryLevel).toBe(0);
  });
});
