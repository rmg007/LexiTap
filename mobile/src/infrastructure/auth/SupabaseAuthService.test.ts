// Mock SecureStore (native) and the Supabase SDK before importing the service.
jest.mock("expo-secure-store");

const mockFunctions = {
  invoke: jest.fn(),
};
const mockAuth = {
  signInWithOtp: jest.fn(),
  verifyOtp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
};
const mockCreateClient = jest.fn((..._args: unknown[]) => ({ auth: mockAuth, functions: mockFunctions }));
const mockIsRetryable = jest.fn((_e: unknown) => false);

jest.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  // The factory object is otherwise structurally checked against the real
  // module's (overloaded) export types; we only stub the two members the
  // service touches and forward to the closure mocks for assertions.
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  isAuthRetryableFetchError: (e: unknown) => mockIsRetryable(e),
}));

import { SupabaseAuthService } from "./SupabaseAuthService";
import type { Session } from "@supabase/supabase-js";

// Credentials are INJECTED (not read from process.env) because
// babel-preset-expo inlines static process.env.EXPO_PUBLIC_* references to
// literals at transform time, so a runtime env assignment cannot configure the
// gate. The injectable deps mirror how PostHogAnalyticsService takes its apiKey.
const CREDS = {
  url: "https://example.supabase.co",
  anonKey: "anon-key",
} as const;

function makeService(extra: Record<string, unknown> = {}): SupabaseAuthService {
  return new SupabaseAuthService({ ...CREDS, ...extra });
}

// Build a Supabase-error-shaped object with a given HTTP status.
function authError(
  status: number | undefined,
  message = "boom",
): { status?: number; message: string } {
  return { status, message };
}

// Minimal Supabase Session fixture.
function supabaseSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: "jwt-access-token",
    refresh_token: "jwt-refresh-token",
    expires_in: 3600,
    expires_at: 1_700_000_000, // epoch seconds
    token_type: "bearer",
    user: {
      id: "user-uuid",
      email: "learner@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  } as Session;
}

describe("SupabaseAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRetryable.mockReturnValue(false);
    mockAuth.signOut.mockResolvedValue({ error: null });
  });

  describe("construction / env-gate", () => {
    it("passes SecureStore-backed storage + offline-first auth options to createClient", () => {
      makeService();
      expect(mockCreateClient).toHaveBeenCalledWith(
        CREDS.url,
        CREDS.anonKey,
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: expect.objectContaining({
              getItem: expect.any(Function),
              setItem: expect.any(Function),
              removeItem: expect.any(Function),
            }),
          }),
        }),
      );
    });

    it("does NOT construct a client when credentials are absent", () => {
      new SupabaseAuthService({ url: undefined, anonKey: undefined });
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it("returns not_configured from every method when credentials are absent", async () => {
      const service = new SupabaseAuthService({
        url: undefined,
        anonKey: undefined,
      });

      const send = await service.signInWithOtp("learner@example.com");
      const verify = await service.verifyOtp("learner@example.com", "123456");
      expect(send.ok).toBe(false);
      expect(verify.ok).toBe(false);
      if (!send.ok) expect(send.error.kind).toBe("not_configured");
      if (!verify.ok) expect(verify.error.kind).toBe("not_configured");

      // Read paths fail soft, never throw.
      expect(await service.getSession()).toBeNull();
      await expect(service.signOut()).resolves.toBeUndefined();
      // onAuthStateChange returns a no-op unsubscribe and never subscribes.
      const unsub = service.onAuthStateChange(() => {});
      expect(typeof unsub).toBe("function");
      expect(mockAuth.onAuthStateChange).not.toHaveBeenCalled();

      const del = await service.deleteAccount();
      expect(del.ok).toBe(false);
      if (!del.ok) expect(del.error.kind).toBe("not_configured");
    });
  });

  describe("signInWithOtp", () => {
    it("returns ok when the OTP email is sent", async () => {
      mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
      const result = await makeService().signInWithOtp("learner@example.com");
      expect(result.ok).toBe(true);
      expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
        email: "learner@example.com",
      });
    });

    it("maps a 429 response to rate_limited", async () => {
      mockAuth.signInWithOtp.mockResolvedValue({
        data: {},
        error: authError(429),
      });
      const result = await makeService().signInWithOtp("learner@example.com");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("rate_limited");
    });

    it("maps a retryable fetch error to network", async () => {
      mockIsRetryable.mockReturnValue(true);
      mockAuth.signInWithOtp.mockResolvedValue({
        data: {},
        error: authError(undefined),
      });
      const result = await makeService().signInWithOtp("learner@example.com");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("network");
    });

    it("maps a thrown error (not just returned) without leaking it", async () => {
      mockAuth.signInWithOtp.mockRejectedValue(new Error("kaboom"));
      const result = await makeService().signInWithOtp("learner@example.com");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).not.toContain("kaboom");
      }
    });
  });

  describe("verifyOtp", () => {
    it("maps a returned session to an AuthSession with ms expiry", async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: supabaseSession(), user: {} },
        error: null,
      });
      const result = await makeService().verifyOtp(
        "learner@example.com",
        "123456",
      );
      expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
        email: "learner@example.com",
        token: "123456",
        type: "email",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.user.id).toBe("user-uuid");
        expect(result.value.user.email).toBe("learner@example.com");
        expect(result.value.accessToken).toBe("jwt-access-token");
        // epoch seconds (1_700_000_000) → ms
        expect(result.value.expiresAt).toBe(1_700_000_000 * 1000);
      }
    });

    it("normalises an undefined user email to null", async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: {
          session: supabaseSession({
            user: { ...supabaseSession().user, email: undefined },
          }),
          user: {},
        },
        error: null,
      });
      const result = await makeService().verifyOtp(
        "learner@example.com",
        "123456",
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.user.email).toBeNull();
    });

    it("maps an invalid-code 401 to invalid_otp", async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: null, user: null },
        error: authError(401),
      });
      const result = await makeService().verifyOtp(
        "learner@example.com",
        "wrong",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_otp");
    });

    it("treats a verified-but-sessionless response as invalid_otp", async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: null, user: { id: "x" } },
        error: null,
      });
      const result = await makeService().verifyOtp(
        "learner@example.com",
        "123456",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_otp");
    });

    it("maps a 5xx response to network", async () => {
      mockAuth.verifyOtp.mockResolvedValue({
        data: { session: null, user: null },
        error: authError(503),
      });
      const result = await makeService().verifyOtp(
        "learner@example.com",
        "123456",
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("network");
    });
  });

  describe("getSession", () => {
    it("returns the mapped session when one exists", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: supabaseSession() },
        error: null,
      });
      const session = await makeService().getSession();
      expect(session?.user.id).toBe("user-uuid");
      expect(session?.expiresAt).toBe(1_700_000_000 * 1000);
    });

    it("returns null when there is no session", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      expect(await makeService().getSession()).toBeNull();
    });

    it("returns null (never throws) when getSession errors", async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: authError(500),
      });
      expect(await makeService().getSession()).toBeNull();
    });

    it("returns null when getSession rejects", async () => {
      mockAuth.getSession.mockRejectedValue(new Error("keychain locked"));
      expect(await makeService().getSession()).toBeNull();
    });
  });

  describe("signOut", () => {
    it("delegates to the SDK and resolves", async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      await makeService().signOut();
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it("swallows SDK errors (never throws)", async () => {
      mockAuth.signOut.mockRejectedValue(new Error("network"));
      await expect(makeService().signOut()).resolves.toBeUndefined();
    });
  });

  describe("deleteAccount", () => {
    it("invokes the delete-account edge function and signs out on success", async () => {
      mockFunctions.invoke.mockResolvedValue({ data: null, error: null });
      const result = await makeService().deleteAccount();
      expect(result.ok).toBe(true);
      expect(mockFunctions.invoke).toHaveBeenCalledWith("delete-account");
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it("maps a 404 (function not yet deployed) to network", async () => {
      mockFunctions.invoke.mockResolvedValue({ data: null, error: { status: 404, message: "Not Found" } });
      const result = await makeService().deleteAccount();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("network");
      expect(mockAuth.signOut).not.toHaveBeenCalled();
    });

    it("maps a 429 to rate_limited", async () => {
      mockFunctions.invoke.mockResolvedValue({ data: null, error: { status: 429, message: "Too Many Requests" } });
      const result = await makeService().deleteAccount();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("rate_limited");
    });

    it("maps a 5xx to network", async () => {
      mockFunctions.invoke.mockResolvedValue({ data: null, error: { status: 503, message: "Service Unavailable" } });
      const result = await makeService().deleteAccount();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("network");
    });

    it("maps a thrown error to network (never throws)", async () => {
      mockFunctions.invoke.mockRejectedValue(new Error("fetch failed"));
      const result = await makeService().deleteAccount();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("network");
    });
  });

  describe("onAuthStateChange", () => {
    it("forwards mapped sessions and returns an unsubscribe that calls the SDK", () => {
      const unsubscribe = jest.fn();
      let captured:
        | ((event: string, session: Session | null) => void)
        | undefined;
      mockAuth.onAuthStateChange.mockImplementation((cb: typeof captured) => {
        captured = cb;
        return { data: { subscription: { unsubscribe } } };
      });

      const received: Array<unknown> = [];
      const off = makeService().onAuthStateChange((s) => received.push(s));

      captured?.("SIGNED_IN", supabaseSession());
      captured?.("SIGNED_OUT", null);

      expect(received).toHaveLength(2);
      expect((received[0] as { user: { id: string } }).user.id).toBe(
        "user-uuid",
      );
      expect(received[1]).toBeNull();

      off();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
