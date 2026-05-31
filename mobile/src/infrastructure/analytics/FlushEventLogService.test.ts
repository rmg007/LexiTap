import { FlushEventLogService, type EventLogRow } from './FlushEventLogService';
import type { DatabaseHandle } from '@/infrastructure/db';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('FlushEventLogService', () => {
  let mockDb: jest.Mocked<DatabaseHandle>;
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let service: FlushEventLogService;

  beforeEach(() => {
    mockDb = {
      all: jest.fn(),
      first: jest.fn(),
      exec: jest.fn(),
      run: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<DatabaseHandle>;

    mockAnalytics = {
      track: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsPort>;

    service = new FlushEventLogService(mockDb, mockAnalytics);
  });

  describe('flush', () => {
    it('fetches unsync\'d rows and emits them to analytics', async () => {
      const rows: EventLogRow[] = [
        {
          id: 1,
          event_type: 'answer_recorded',
          payload: JSON.stringify({ wordId: 'w1', correct: true }),
          occurred_at: 1000,
          synced_at: null,
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(rows);
      (mockDb.run as jest.Mock).mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledWith('answer_recorded', {
        wordId: 'w1',
        correct: true,
        occurred_at: 1000,
        event_log_id: 1,
      });
    });

    it('marks rows as synced_at after flush', async () => {
      const rows: EventLogRow[] = [
        {
          id: 1,
          event_type: 'test_event',
          payload: null,
          occurred_at: 1000,
          synced_at: null,
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(rows);
      (mockDb.run as jest.Mock).mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      const beforeFlush = Date.now();
      await service.flush();
      const afterFlush = Date.now();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE event_log'),
        expect.arrayContaining([expect.any(Number)]),
      );

      const updateTime = (mockDb.run as jest.Mock).mock.calls[0][1][0];
      expect(updateTime).toBeGreaterThanOrEqual(beforeFlush);
      expect(updateTime).toBeLessThanOrEqual(afterFlush);
    });

    it('is idempotent: does not re-emit synced rows', async () => {
      const rows: EventLogRow[] = []; // No unsync'd rows

      (mockDb.all as jest.Mock).mockResolvedValue(rows);

      await service.flush();
      await service.flush();

      expect(mockAnalytics.track).not.toHaveBeenCalled();
    });

    it('batches multiple rows in a single flush', async () => {
      const rows: EventLogRow[] = [
        {
          id: 1,
          event_type: 'event1',
          payload: JSON.stringify({ a: 1 }),
          occurred_at: 1000,
          synced_at: null,
        },
        {
          id: 2,
          event_type: 'event2',
          payload: JSON.stringify({ b: 2 }),
          occurred_at: 2000,
          synced_at: null,
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(rows);
      (mockDb.run as jest.Mock).mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledTimes(2);
      expect(mockAnalytics.track).toHaveBeenNthCalledWith(1, 'event1', expect.objectContaining({ a: 1 }));
      expect(mockAnalytics.track).toHaveBeenNthCalledWith(2, 'event2', expect.objectContaining({ b: 2 }));
    });

    it('falls back to client-side dedup if synced_at column doesn\'t exist', async () => {
      // First call: synced_at column doesn't exist, use fallback
      (mockDb.all as jest.Mock)
        .mockRejectedValueOnce(new Error('no such column: synced_at'))
        .mockResolvedValueOnce([
          {
            id: 1,
            event_type: 'test_event',
            payload: null,
            occurred_at: 1000,
          },
        ]);

      (mockDb.run as jest.Mock).mockRejectedValue(new Error('no such column: synced_at'));

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledWith('test_event', expect.objectContaining({ event_log_id: 1 }));

      // Second call: client-side dedup should prevent re-emission
      (mockDb.all as jest.Mock).mockRejectedValue(new Error('no such column: synced_at'));

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledTimes(1); // Still only 1, not 2
    });

    it('swallows flush errors and logs warning', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (mockDb.all as jest.Mock).mockRejectedValue(new Error('db error'));

      await service.flush();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'FlushEventLogService: flush failed',
        expect.objectContaining({ error: expect.any(String) }),
      );

      consoleWarnSpy.mockRestore();
    });

    it('preserves occurred_at timestamp in payload', async () => {
      const rows: EventLogRow[] = [
        {
          id: 1,
          event_type: 'test_event',
          payload: JSON.stringify({ foo: 'bar' }),
          occurred_at: 12345,
          synced_at: null,
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(rows);
      (mockDb.run as jest.Mock).mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledWith('test_event', {
        foo: 'bar',
        occurred_at: 12345,
        event_log_id: 1,
      });
    });

    it('handles null payload gracefully', async () => {
      const rows: EventLogRow[] = [
        {
          id: 1,
          event_type: 'test_event',
          payload: null,
          occurred_at: 1000,
          synced_at: null,
        },
      ];

      (mockDb.all as jest.Mock).mockResolvedValue(rows);
      (mockDb.run as jest.Mock).mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await service.flush();

      expect(mockAnalytics.track).toHaveBeenCalledWith('test_event', {
        occurred_at: 1000,
        event_log_id: 1,
      });
    });
  });
});
