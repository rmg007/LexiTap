import { applyPendingRestore, type PendingRestoreEffects } from './pendingRestore';

// Build a fake effects port whose four operations are jest mocks, with the two
// query effects (isPending/stagingExists) seeded per test.
function makeEffects(
  seed: { pending: boolean; staged: boolean } = { pending: true, staged: true },
): jest.Mocked<PendingRestoreEffects> {
  return {
    isPending: jest.fn(async () => seed.pending),
    stagingExists: jest.fn(async () => seed.staged),
    applyStaging: jest.fn(async () => undefined),
    clearPending: jest.fn(async () => undefined),
  };
}

describe('applyPendingRestore', () => {
  it('does nothing when no restore is pending', async () => {
    const fx = makeEffects({ pending: false, staged: true });

    await expect(applyPendingRestore(fx)).resolves.toEqual({ applied: false });

    expect(fx.stagingExists).not.toHaveBeenCalled();
    expect(fx.applyStaging).not.toHaveBeenCalled();
    expect(fx.clearPending).not.toHaveBeenCalled();
  });

  it('promotes the staged file then clears the flag when pending and staged', async () => {
    const fx = makeEffects({ pending: true, staged: true });

    await expect(applyPendingRestore(fx)).resolves.toEqual({ applied: true });

    expect(fx.applyStaging).toHaveBeenCalledTimes(1);
    expect(fx.clearPending).toHaveBeenCalledTimes(1);
  });

  it('clears the flag AFTER promoting (crash-safe ordering)', async () => {
    const fx = makeEffects({ pending: true, staged: true });

    await applyPendingRestore(fx);

    // The flag must be cleared last so an interruption mid-apply retries next
    // boot rather than dropping the restore.
    const applyOrder = fx.applyStaging.mock.invocationCallOrder[0] as number;
    const clearOrder = fx.clearPending.mock.invocationCallOrder[0] as number;
    expect(applyOrder).toBeLessThan(clearOrder);
  });

  it('clears the stale flag and does not promote when the staged file is missing', async () => {
    const fx = makeEffects({ pending: true, staged: false });

    await expect(applyPendingRestore(fx)).resolves.toEqual({ applied: false });

    expect(fx.applyStaging).not.toHaveBeenCalled();
    expect(fx.clearPending).toHaveBeenCalledTimes(1);
  });

  it('leaves the flag set (does NOT clear) if promotion throws, so it retries next boot', async () => {
    const fx = makeEffects({ pending: true, staged: true });
    fx.applyStaging.mockRejectedValue(new Error('move failed'));

    await expect(applyPendingRestore(fx)).rejects.toThrow('move failed');

    expect(fx.clearPending).not.toHaveBeenCalled();
  });
});
