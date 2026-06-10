/**
 * LexiTap content-tool CLI (Track A). Dispatches the five pipeline commands:
 *   import -> validate -> enrich -> review -> export
 * Run via `tsx src/cli.ts <command>` (see package.json scripts `cli`/`build:db`).
 */

import { importCommand, importPseudoWordsCommand } from '@/commands/import';
import { importMasterCommand } from '@/commands/import-master';
import { validateCommand } from '@/commands/validate';
import { enrichCommand } from '@/commands/enrich';
import { reviewCommand, reviewFinalizeCommand } from '@/commands/review';
import { exportCommand } from '@/commands/export';
import { releaseCommand } from '@/commands/release';
import { ingestSensesCommand } from '@/commands/ingest-senses';
import { enrichSensesCommand } from '@/commands/enrich-senses';
import { exportMasterCommand } from '@/commands/export-master';
import { logger } from '@/lib/logger';

const USAGE = `lexitap-tool <command> [options]

Commands:
  import           --source <path> [--tier <slug>] [--type t] [--on-conflict update|skip|error] [--dry-run]
                   (a .jsonl source = master importer, no --tier; a .csv source = legacy per-tier import)
  import-master    --source <path.jsonl> [--dry-run]  (load words_master.jsonl: words + categories + senses + questions)
  import-pseudo    --source <path>   (import pseudo_words CSV for DIAG-A false-alarm detection)
  ingest-senses    --source <path.jsonl>  [--dry-run]  (load rich sense/example enrichment)
  export-master    [--output <path.jsonl>]  (dump working DB -> words_master.jsonl, round-trip/bootstrap)
  enrich-senses    --limit <n> [--tier <slug>] [--model <id>] [--output <path.jsonl>] [--dry-run] [--no-resume]
                   (CONTENT-2: generate rich senses via Anthropic into a JSONL for ingest-senses)
  validate         [--tier <slug>] [--strict]
  enrich           (DB mode)  --tier <slug> [--add-definitions] [--add-synonyms] [--add-audio] [--add-images] [--limit n] [--force] [--dry-run]
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
    case 'import-master':
      importMasterCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'import-pseudo':
      importPseudoWordsCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'ingest-senses':
      ingestSensesCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'export-master':
      exportMasterCommand([secondArg ?? '', ...rest].filter(Boolean));
      break;
    case 'enrich-senses':
      await enrichSensesCommand([secondArg ?? '', ...rest].filter(Boolean));
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
