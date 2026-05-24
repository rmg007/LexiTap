import { SyncProgressUseCase } from '@/application/user/SyncProgressUseCase';
import type { SyncService } from '@/application/user/SyncService';

class MockSync implements SyncService {
  pulled = false;
  pushed = false;
  constructor(
    private readonly pullFails = false,
    private readonly pushFails = false,
  ) {}
  async pull(): Promise<void> {
    if (this.pullFails) throw new Error('offline');
    this.pulled = true;
  }
  async push(): Promise<void> {
    if (this.pushFails) throw new Error('offline');
    this.pushed = true;
  }
}

describe('SyncProgressUseCase', () => {
  it('pulls and pushes when online', async () => {
    const sync = new MockSync();
    const out = await new SyncProgressUseCase(sync).execute({ userId: 'u', sinceCursor: 0 });
    expect(out).toEqual({ pulled: true, pushed: true, errors: [] });
    expect(sync.pulled).toBe(true);
    expect(sync.pushed).toBe(true);
  });

  it('is offline-tolerant: a pull failure is a no-op, not a throw', async () => {
    const out = await new SyncProgressUseCase(new MockSync(true, false)).execute({
      userId: 'u',
      sinceCursor: 0,
    });
    expect(out.pulled).toBe(false);
    expect(out.pushed).toBe(true); // push still attempted
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]?.direction).toBe('pull');
  });

  it('reports both failures without throwing', async () => {
    const out = await new SyncProgressUseCase(new MockSync(true, true)).execute({
      userId: 'u',
      sinceCursor: 5,
    });
    expect(out.pulled).toBe(false);
    expect(out.pushed).toBe(false);
    expect(out.errors).toHaveLength(2);
  });

  it('respects the directions filter', async () => {
    const sync = new MockSync();
    const out = await new SyncProgressUseCase(sync).execute({
      userId: 'u',
      sinceCursor: 0,
      directions: ['push'],
    });
    expect(out.pulled).toBe(false);
    expect(out.pushed).toBe(true);
    expect(sync.pulled).toBe(false);
  });
});
