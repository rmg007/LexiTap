import { getCurrentSessionId, resetSessionId } from './AnonIdStore';

describe('AnonIdStore', () => {
  beforeEach(() => {
    resetSessionId(); // Clear in-memory session_id
  });

  describe('getCurrentSessionId', () => {
    it('generates a new session_id on first call', () => {
      const id = getCurrentSessionId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('returns the same session_id on repeated calls', () => {
      const id1 = getCurrentSessionId();
      const id2 = getCurrentSessionId();
      expect(id1).toBe(id2);
    });

    it('generates a fresh session_id after resetSessionId()', () => {
      const id1 = getCurrentSessionId();
      resetSessionId();
      const id2 = getCurrentSessionId();

      expect(id1).not.toBe(id2);
      expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  // NOTE: getOrCreateAnonId requires AsyncStorage which is a React Native native module.
  // Testing it requires native module setup, which is out of scope for these unit tests.
  // The function is tested implicitly via integration tests when the app runs.
});
