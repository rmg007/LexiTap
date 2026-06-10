import { AppleSignInAdapter, type AppleAuthModule } from "./AppleSignInAdapter";

// The native module is injected via the deps seam (babel-inlined env / native
// modules cannot be toggled at runtime under Jest — same recipe as
// SupabaseAuthService.test.ts). The expo-apple-authentication import inside the
// adapter resolves to src/__mocks__ via jest.config.js moduleNameMapper, so the
// enum references are safe.

function makeModule(overrides: Partial<AppleAuthModule> = {}): AppleAuthModule {
  return {
    isAvailableAsync: jest.fn(async () => true),
    signInAsync: jest.fn(async () => ({
      identityToken: "apple-identity-jwt" as string | null,
    })),
    ...overrides,
  };
}

function cancelError(): Error & { code: string } {
  const e = new Error("The user canceled the authorization attempt.") as Error & {
    code: string;
  };
  e.code = "ERR_REQUEST_CANCELED";
  return e;
}

describe("AppleSignInAdapter", () => {
  describe("isAvailable", () => {
    it("is true on iOS when the OS supports Apple authentication", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule(),
        platformOs: "ios",
      });
      expect(await adapter.isAvailable()).toBe(true);
    });

    it("is false off iOS without touching the module", async () => {
      const module = makeModule();
      const adapter = new AppleSignInAdapter({ module, platformOs: "android" });
      expect(await adapter.isAvailable()).toBe(false);
      expect(module.isAvailableAsync).not.toHaveBeenCalled();
    });

    it("is false when the OS reports unavailable", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule({ isAvailableAsync: jest.fn(async () => false) }),
        platformOs: "ios",
      });
      expect(await adapter.isAvailable()).toBe(false);
    });

    it("is false (never throws) when the module check rejects", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule({
          isAvailableAsync: jest.fn(async () => {
            throw new Error("native module missing");
          }),
        }),
        platformOs: "ios",
      });
      expect(await adapter.isAvailable()).toBe(false);
    });
  });

  describe("signIn", () => {
    it("resolves the identityToken on success", async () => {
      const module = makeModule();
      const adapter = new AppleSignInAdapter({ module, platformOs: "ios" });
      const result = await adapter.signIn();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe("apple-identity-jwt");
      expect(module.signInAsync).toHaveBeenCalledWith({
        requestedScopes: expect.any(Array),
      });
    });

    it("maps ERR_REQUEST_CANCELED to 'cancelled' (UI shows no error)", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule({
          signInAsync: jest.fn(async () => {
            throw cancelError();
          }),
        }),
        platformOs: "ios",
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("cancelled");
    });

    it("maps a missing identityToken to 'unknown'", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule({
          signInAsync: jest.fn(async () => ({ identityToken: null })),
        }),
        platformOs: "ios",
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("unknown");
    });

    it("maps an unusable platform to 'unavailable' without invoking the sheet", async () => {
      const module = makeModule();
      const adapter = new AppleSignInAdapter({ module, platformOs: "android" });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("unavailable");
      expect(module.signInAsync).not.toHaveBeenCalled();
    });

    it("maps an unexpected native rejection to 'unknown' without leaking it", async () => {
      const adapter = new AppleSignInAdapter({
        module: makeModule({
          signInAsync: jest.fn(async () => {
            throw new Error("ASAuthorizationError 1000");
          }),
        }),
        platformOs: "ios",
      });
      const result = await adapter.signIn();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).not.toContain("ASAuthorizationError");
      }
    });
  });
});
