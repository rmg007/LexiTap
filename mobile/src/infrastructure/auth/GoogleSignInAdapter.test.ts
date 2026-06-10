import {
  GoogleSignInAdapter,
  type GoogleSignInModule,
} from "./GoogleSignInAdapter";

// Env + module are injected via the deps seam (babel inlines EXPO_PUBLIC_* at
// transform time, so tests cannot toggle process.env — same recipe as
// SupabaseAuthService.test.ts).

const CLIENT_ID = "1234-abcd.apps.googleusercontent.com";

function makeModule(
  overrides: Partial<GoogleSignInModule> = {},
): GoogleSignInModule {
  return {
    configure: jest.fn(),
    signIn: jest.fn(async () => ({
      type: "success" as const,
      data: { idToken: "google-id-jwt" as string | null },
    })),
    ...overrides,
  };
}

describe("GoogleSignInAdapter", () => {
  describe("isConfigured", () => {
    it("is true when an iOS client ID is provided", () => {
      const adapter = new GoogleSignInAdapter({
        iosClientId: CLIENT_ID,
        module: makeModule(),
      });
      expect(adapter.isConfigured()).toBe(true);
    });

    it("is false when the env value is absent", () => {
      const adapter = new GoogleSignInAdapter({
        iosClientId: undefined,
        module: makeModule(),
      });
      expect(adapter.isConfigured()).toBe(false);
    });
  });

  describe("signIn", () => {
    it("configures once with the iOS client ID then resolves the idToken", async () => {
      const module = makeModule();
      const adapter = new GoogleSignInAdapter({
        iosClientId: CLIENT_ID,
        module,
      });

      const first = await adapter.signIn();
      const second = await adapter.signIn();

      expect(first.ok).toBe(true);
      if (first.ok) expect(first.value).toBe("google-id-jwt");
      expect(second.ok).toBe(true);
      expect(module.configure).toHaveBeenCalledTimes(1);
      expect(module.configure).toHaveBeenCalledWith({ iosClientId: CLIENT_ID });
    });

    it("maps the typed cancelled response to 'cancelled' (UI shows no error)", async () => {
      const adapter = new GoogleSignInAdapter({
        iosClientId: CLIENT_ID,
        module: makeModule({
          signIn: jest.fn(async () => ({
            type: "cancelled" as const,
            data: null,
          })),
        }),
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("cancelled");
    });

    it("fails closed with 'unavailable' when the env var is unset", async () => {
      const module = makeModule();
      const adapter = new GoogleSignInAdapter({
        iosClientId: undefined,
        module,
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("unavailable");
      expect(module.configure).not.toHaveBeenCalled();
      expect(module.signIn).not.toHaveBeenCalled();
    });

    it("maps a success response missing the idToken to 'unknown'", async () => {
      const adapter = new GoogleSignInAdapter({
        iosClientId: CLIENT_ID,
        module: makeModule({
          signIn: jest.fn(async () => ({
            type: "success" as const,
            data: { idToken: null },
          })),
        }),
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("unknown");
    });

    it("maps a native rejection to 'unknown' without leaking it", async () => {
      const adapter = new GoogleSignInAdapter({
        iosClientId: CLIENT_ID,
        module: makeModule({
          signIn: jest.fn(async () => {
            throw new Error("DEVELOPER_ERROR");
          }),
        }),
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).not.toContain("DEVELOPER_ERROR");
      }
    });
  });
});
