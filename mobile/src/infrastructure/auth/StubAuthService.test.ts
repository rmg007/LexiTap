import { StubAuthService } from "./StubAuthService";

describe("StubAuthService", () => {
  let service: StubAuthService;

  beforeEach(() => {
    service = new StubAuthService();
  });

  it("starts with no session", async () => {
    expect(await service.getSession()).toBeNull();
  });

  it("signInWithOtp succeeds without sending anything", async () => {
    const result = await service.signInWithOtp("learner@example.com");
    expect(result.ok).toBe(true);
  });

  it("verifyOtp returns a fake session carrying the email", async () => {
    const result = await service.verifyOtp("learner@example.com", "123456");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("learner@example.com");
      expect(result.value.user.id).toBe("stub-user-id");
      expect(result.value.accessToken).toBe("stub-access-token");
      expect(result.value.expiresAt).toBeGreaterThan(Date.now());
    }
  });

  it("round-trips: getSession returns the session set by verifyOtp", async () => {
    await service.verifyOtp("learner@example.com", "123456");
    const session = await service.getSession();
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe("learner@example.com");
  });

  it("signOut clears the session", async () => {
    await service.verifyOtp("learner@example.com", "123456");
    await service.signOut();
    expect(await service.getSession()).toBeNull();
  });

  it("deleteAccount signs out and returns ok", async () => {
    await service.verifyOtp("learner@example.com", "123456");
    expect(await service.getSession()).not.toBeNull();
    const result = await service.deleteAccount();
    expect(result.ok).toBe(true);
    expect(await service.getSession()).toBeNull();
  });

  it("onAuthStateChange fires on sign-in and sign-out, and stops after unsubscribe", async () => {
    const sessions: Array<unknown> = [];
    const unsubscribe = service.onAuthStateChange((s) => sessions.push(s));

    await service.verifyOtp("learner@example.com", "123456");
    await service.signOut();

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).not.toBeNull(); // sign-in
    expect(sessions[1]).toBeNull(); // sign-out

    unsubscribe();
    await service.verifyOtp("learner@example.com", "999999");
    expect(sessions).toHaveLength(2); // no further callbacks after unsubscribe
  });
});
