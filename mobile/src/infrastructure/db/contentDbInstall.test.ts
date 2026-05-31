import {
  ensureContentDbInstalled,
  type ContentDbInstallEffects,
} from '@/infrastructure/db/contentDbInstall';

// Build a fake effects port that records what the installer did.
function makeEffects(opts: {
  installed: number | null;
  bundled: number;
}): {
  effects: ContentDbInstallEffects;
  calls: { copied: number; versionsWritten: number[] };
} {
  const calls = { copied: 0, versionsWritten: [] as number[] };
  const effects: ContentDbInstallEffects = {
    bundledVersion: opts.bundled,
    readInstalledVersion: async () => opts.installed,
    copyBundledDb: async () => {
      calls.copied += 1;
    },
    writeInstalledVersion: async (v) => {
      calls.versionsWritten.push(v);
    },
  };
  return { effects, calls };
}

describe('ensureContentDbInstalled', () => {
  it('copies on a fresh install (nothing recorded yet)', async () => {
    const { effects, calls } = makeEffects({ installed: null, bundled: 8 });
    const result = await ensureContentDbInstalled(effects);
    expect(result).toEqual({ copied: true, version: 8 });
    expect(calls.copied).toBe(1);
    expect(calls.versionsWritten).toEqual([8]);
  });

  it('copies when the installed version is older than the bundled one', async () => {
    const { effects, calls } = makeEffects({ installed: 7, bundled: 8 });
    const result = await ensureContentDbInstalled(effects);
    expect(result).toEqual({ copied: true, version: 8 });
    expect(calls.copied).toBe(1);
    expect(calls.versionsWritten).toEqual([8]);
  });

  it('does not copy when the installed version matches the bundled one', async () => {
    const { effects, calls } = makeEffects({ installed: 8, bundled: 8 });
    const result = await ensureContentDbInstalled(effects);
    expect(result).toEqual({ copied: false, version: 8 });
    expect(calls.copied).toBe(0);
    expect(calls.versionsWritten).toEqual([]);
  });

  it('never downgrades when the installed version is newer than the bundled one', async () => {
    const { effects, calls } = makeEffects({ installed: 9, bundled: 8 });
    const result = await ensureContentDbInstalled(effects);
    expect(result).toEqual({ copied: false, version: 9 });
    expect(calls.copied).toBe(0);
  });

  it('treats a corrupt/unreadable sentinel (null) as a fresh install', async () => {
    const { effects, calls } = makeEffects({ installed: null, bundled: 8 });
    await ensureContentDbInstalled(effects);
    expect(calls.copied).toBe(1);
  });
});
