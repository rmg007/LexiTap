// The factory dynamically require()s SupabaseAuthService only when the env-gate
// is open, and reads credentials through ./supabaseEnv. Mock both: the env seam
// so we can toggle the gate at runtime (babel-preset-expo inlines static
// process.env.EXPO_PUBLIC_* to literals, so it cannot be toggled directly), and
// the service so the configured branch never touches the real SDK/native deps.
jest.mock("./supabaseEnv");
jest.mock("expo-secure-store");
jest.mock("@supabase/supabase-js", () => ({
  __esModule: true,
  createClient: jest.fn(() => ({ auth: {} })),
  isAuthRetryableFetchError: jest.fn(() => false),
}));

import { createAuthService } from "./createAuthService";
import { SupabaseAuthService } from "./SupabaseAuthService";
import { StubAuthService } from "./StubAuthService";
import { getSupabaseEnv } from "./supabaseEnv";

const mockGetSupabaseEnv = getSupabaseEnv as jest.MockedFunction<
  typeof getSupabaseEnv
>;

describe("createAuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns SupabaseAuthService when both env vars are present", () => {
    mockGetSupabaseEnv.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
    expect(createAuthService()).toBeInstanceOf(SupabaseAuthService);
  });

  it("returns StubAuthService when both env vars are absent", () => {
    mockGetSupabaseEnv.mockReturnValue({ url: undefined, anonKey: undefined });
    expect(createAuthService()).toBeInstanceOf(StubAuthService);
  });

  it("returns StubAuthService when only the URL is present", () => {
    mockGetSupabaseEnv.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: undefined,
    });
    expect(createAuthService()).toBeInstanceOf(StubAuthService);
  });

  it("returns StubAuthService when only the anon key is present", () => {
    mockGetSupabaseEnv.mockReturnValue({ url: undefined, anonKey: "anon-key" });
    expect(createAuthService()).toBeInstanceOf(StubAuthService);
  });

  it("returns StubAuthService when credentials are empty strings", () => {
    mockGetSupabaseEnv.mockReturnValue({ url: "", anonKey: "" });
    expect(createAuthService()).toBeInstanceOf(StubAuthService);
  });
});
