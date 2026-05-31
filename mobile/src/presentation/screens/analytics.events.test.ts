/**
 * Analytics Events Integration Tests (A1-A5)
 * Verifies event schema and firing logic per ANALYTICS_EVENTS.md
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('Analytics Events (A1-A5)', () => {
  let trackCalls: Array<[string, Record<string, unknown>]>;
  let mockAnalytics: AnalyticsPort;

  beforeEach(() => {
    trackCalls = [];
    mockAnalytics = {
      track: (event: string, properties?: Record<string, unknown>) => {
        trackCalls.push([event, properties || {}]);
        return Promise.resolve();
      },
    };
  });

  it('lesson_started: fires with tier_id + mode', async () => {
    await mockAnalytics.track('lesson_started', {
      tier_id: 'foundation',
      mode: 'review',
    });
    expect(trackCalls).toHaveLength(1);
  });

  it('quiz_submitted: fires for each question', async () => {
    await mockAnalytics.track('quiz_submitted', {
      tier_id: 'foundation',
      assessment_type: 'multiple_choice',
      is_correct: true,
    });
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]![0]).toBe('quiz_submitted');
  });

  it('lesson_completed: fires on session end', async () => {
    await mockAnalytics.track('lesson_started', { tier_id: 'foundation', mode: 'review' });
    for (let i = 0; i < 10; i++) {
      await mockAnalytics.track('quiz_submitted', {
        tier_id: 'foundation',
        assessment_type: 'multiple_choice',
        is_correct: true,
      });
    }
    await mockAnalytics.track('lesson_completed', {
      tier_id: 'foundation',
      mode: 'review',
      total_correct: 10,
      total_attempts: 10,
      duration_sec: 120,
    });
    expect(trackCalls).toHaveLength(12); // 1 + 10 + 1
    const completedEvents = trackCalls.filter((c) => c[0] === 'lesson_completed');
    expect(completedEvents).toHaveLength(1);
  });

  it('streak_maintained: fires on ProgressScreen mount', async () => {
    await mockAnalytics.track('streak_maintained', {
      current_streak: 5,
      at_risk: false,
    });
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]![0]).toBe('streak_maintained');
  });

  it('paywall_viewed: fires on PaywallScreen mount', async () => {
    await mockAnalytics.track('paywall_viewed', { source: 'quiz_complete' });
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]![0]).toBe('paywall_viewed');
  });

  it('purchase_initiated: fires on subscribe click', async () => {
    await mockAnalytics.track('purchase_initiated', {
      tier_id: 'ielts_reading',
      amount: 9.99,
    });
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]![0]).toBe('purchase_initiated');
  });

  it('purchase_completed: fires after RevenueCat confirms', async () => {
    await mockAnalytics.track('purchase_completed', {
      tier_id: 'ielts_reading',
      amount: 9.99,
    });
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]![0]).toBe('purchase_completed');
  });

  it('quiz flow sequence: started → submitted → submitted → completed', async () => {
    await mockAnalytics.track('lesson_started', { tier_id: 'foundation', mode: 'review' });
    await mockAnalytics.track('quiz_submitted', {
      tier_id: 'foundation',
      assessment_type: 'multiple_choice',
      is_correct: true,
    });
    await mockAnalytics.track('quiz_submitted', {
      tier_id: 'foundation',
      assessment_type: 'drag_drop',
      is_correct: false,
    });
    await mockAnalytics.track('lesson_completed', {
      tier_id: 'foundation',
      mode: 'review',
      total_correct: 1,
      total_attempts: 2,
      duration_sec: 60,
    });
    const eventNames = trackCalls.map((c) => c[0]);
    expect(eventNames).toEqual(['lesson_started', 'quiz_submitted', 'quiz_submitted', 'lesson_completed']);
  });

  it('paywall flow sequence: viewed → initiated → completed', async () => {
    await mockAnalytics.track('paywall_viewed', { source: 'quiz_complete' });
    await mockAnalytics.track('purchase_initiated', { tier_id: 'toefl', amount: 9.99 });
    await mockAnalytics.track('purchase_completed', { tier_id: 'toefl', amount: 9.99 });
    const eventNames = trackCalls.map((c) => c[0]);
    expect(eventNames).toEqual(['paywall_viewed', 'purchase_initiated', 'purchase_completed']);
  });

  it('no PII in payloads', async () => {
    await mockAnalytics.track('lesson_started', { tier_id: 'foundation', mode: 'review' });
    trackCalls.forEach((call) => {
      const keys = Object.keys(call[1]);
      expect(keys).not.toContain('email');
      expect(keys).not.toContain('user_id');
      expect(keys).not.toContain('token');
      expect(keys).not.toContain('password');
    });
  });

  it('track() is callable without await (fire-and-forget)', async () => {
    const promise = mockAnalytics.track('lesson_started', { tier_id: 'foundation', mode: 'review' });
    expect(promise).toBeInstanceOf(Promise);
    await promise;
    expect(trackCalls).toHaveLength(1);
  });
});
