/**
 * qa/cli.ts — CLI entry point for QA commands (sample, validate, etc).
 */

import { qaSampleCommand } from '@/qa/sample';
import { logger } from '@/lib/logger';

async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;

  if (!command || command === 'help' || command === '-h') {
    logger.print(`
QA commands:

  qa:sample [--size 300] [--seed 1234] [--dry-run]
    Pick a random 10% sample of foundation.csv, enrich via C4, validate, and report.

    Options:
      --size N      Sample size (default: 300)
      --seed N      Seed for reproducible sampling (optional)
      --dry-run     Skip API calls, just show plan

Examples:
  npm run qa:sample
  npm run qa:sample -- --size 450 --seed 42
  npm run qa:sample -- --dry-run
    `);
    return;
  }

  if (command === 'sample') {
    await qaSampleCommand(rest);
  } else {
    logger.error(`Unknown QA command: ${command}`);
    process.exit(1);
  }
}

main(process.argv.slice(2)).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`Fatal: ${msg}`);
  process.exit(1);
});
