// Mock AsyncStorage before any imports
jest.mock('@react-native-async-storage/async-storage');

// Mock PostHog
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock AnalyticsOptOutStore
jest.mock('./AnalyticsOptOutStore');

import PostHog from 'posthog-react-native';
import { PostHogAnalyticsService } from './PostHogAnalyticsService';
import * as AnalyticsOptOutStore from './AnalyticsOptOutStore';

describe('PostHogAnalyticsService', () => {
  let mockPostHogInstance: { identify: jest.Mock; capture: jest.Mock };
  let service: PostHogAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock PostHog instance
    mockPostHogInstance = {
      identify: jest.fn(),
      capture: jest.fn(),
    };

    (PostHog as jest.Mock).mockReturnValue(mockPostHogInstance);
    (AnalyticsOptOutStore.getAnalyticsOptOut as jest.Mock).mockResolvedValue(false);

    service = new PostHogAnalyticsService('test-api-key', 'test-anon-id', 'test-session-id');
  });

  describe('constructor', () => {
    it('initializes PostHog with EU host', () => {
      expect(PostHog).toHaveBeenCalledWith('test-api-key', { host: 'https://eu.i.posthog.com' });
    });

    it('identifies with anon_id', () => {
      expect(mockPostHogInstance.identify).toHaveBeenCalledWith('test-anon-id');
    });
  });

  describe('track', () => {
    it('attaches session_id to every event', async () => {
      await service.track('test_event', { foo: 'bar' });

      expect(mockPostHogInstance.capture).toHaveBeenCalledWith('test_event', {
        foo: 'bar',
        session_id: 'test-session-id',
      });
    });

    it('does not send event if user has opted out', async () => {
      (AnalyticsOptOutStore.getAnalyticsOptOut as jest.Mock).mockResolvedValue(true);

      await service.track('test_event', { foo: 'bar' });

      expect(mockPostHogInstance.capture).not.toHaveBeenCalled();
    });

    it('checks opt-out before each capture', async () => {
      (AnalyticsOptOutStore.getAnalyticsOptOut as jest.Mock).mockResolvedValue(false);

      await service.track('event1', {});
      expect(AnalyticsOptOutStore.getAnalyticsOptOut).toHaveBeenCalledTimes(1);

      await service.track('event2', {});
      expect(AnalyticsOptOutStore.getAnalyticsOptOut).toHaveBeenCalledTimes(2);
    });

    it('swallows errors and does not throw', async () => {
      mockPostHogInstance.capture.mockImplementation(() => {
        throw new Error('PostHog capture failed');
      });

      // Should not throw
      await expect(service.track('test_event', {})).resolves.toBeUndefined();
    });

    it('handles missing properties gracefully', async () => {
      await service.track('test_event');

      expect(mockPostHogInstance.capture).toHaveBeenCalledWith('test_event', {
        session_id: 'test-session-id',
      });
    });

    it('includes no PII (enforced by use cases)', async () => {
      // This test documents the contract: track() receives clean payloads.
      // Use cases are responsible for filtering PII.
      await service.track('test_event', {
        word_id: 'word-123',
        session_id: 'test-session-id', // allowed (overridden by constructor's injection)
        tier_id: 'tier-1', // allowed
      });

      const call = (mockPostHogInstance.capture as jest.Mock).mock.calls[0];
      const payload = call[1];

      // Verify no PII fields
      expect(payload.email).toBeUndefined();
      expect(payload.user_id).toBeUndefined();
      expect(payload.token).toBeUndefined();
    });
  });
});
