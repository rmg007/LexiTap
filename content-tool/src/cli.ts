/**
 * LexiTap content-tool CLI (Track A). Dispatches the four pipeline commands:
 *   import -> validate -> enrich -> export
 * Run via `tsx src/cli.ts <command>` (see package.json scripts `cli`/`build:db`).
 */

import { importCommand } from '@/commands/import';
import { validateCommand } from '@/commands/validate';
import { enrichCommand } from '@/commands/enrich';
import { exportCommand } from '@/commands/export';
import { logger } from '@/lib/logger';

const USAGE = `lexitap-tool <command> [options]

Commands:
  import    --source <path> --tier <slug> [--type t] [--on-conflict update|skip|error] [--dry-run]
  validate  [--tier <slug>] [--strict]
  enrich    (DB mode)  --tier <slug> [--add-synonyms] [--add-audio] [--add-images] [--limit n] [--force] [--dry-run]
            (CSV mode) --input <path> --output <path> [--budget usd] [--dry-run]
  export    [--output <path>] [--bump major|minor|patch]`;

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'import':
      importCommand(args);
      break;
    case 'validate':
      validateCommand(args);
      break;
    case 'enrich':
      await enrichCommand(args);
      break;
    case 'export':
      await exportCommand(args);
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
