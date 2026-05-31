/**
 * LexiTap content-tool CLI (Track A). Dispatches the five pipeline commands:
 *   import -> validate -> enrich -> review -> export
 * Run via `tsx src/cli.ts <command>` (see package.json scripts `cli`/`build:db`).
 */

import { importCommand } from '@/commands/import';
import { validateCommand } from '@/commands/validate';
import { enrichCommand } from '@/commands/enrich';
import { reviewCommand, reviewFinalizeCommand } from '@/commands/review';
import { exportCommand } from '@/commands/export';
import { releaseCommand } from '@/commands/release';
import { logger } from '@/lib/logger';

const USAGE = `lexitap-tool <command> [options]

Commands:
  import           --source <path> --tier <slug> [--type t] [--on-conflict update|skip|error] [--dry-run]
  validate         [--tier <slug>] [--strict]
  enrich           (DB mode)  --tier <slug> [--add-synonyms] [--add-audio] [--add-images] [--limit n] [--force] [--dry-run]
                   (CSV mode) --input <path> --output <path> [--budget usd] [--dry-run]
  review           [--sample-percent <n>] [--output <path>] [--no-flagged]
  review finalize  --input <path> [--pass-rate <n>]
  export           [--output <path>] [--bump major|minor|patch] [--strict]
  release          [--bump major|minor|patch] [--no-copy] [--provider openai]`;

async function main(): Promise<void> {
  const [command, secondArg, ...rest] = process.argv.slice(2);

  switch (command) {
    case 'import':
      importCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'validate':
      validateCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'enrich':
      await enrichCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'review':
      if (secondArg === 'finalize') {
        reviewFinalizeCommand(rest);
      } else {
        reviewCommand([secondArg ?? '', ...rest].filter(Boolean));
      }
      break;
    case 'export':
      await exportCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'release':
      await releaseCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      logger.print(USAGE);
      break;
    default:
      logger.error(`unknown command: ${command}`);
      logger.print(USAGE);
      process.exitCode = 2;
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(message);
  process.exitCode = 1;
});
