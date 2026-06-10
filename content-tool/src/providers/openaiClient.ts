/**
 * Shared OpenAI Chat Completions caller for the content-tool's paid providers
 * (Phase 3 `categorize`, Phase 4 `enrich-master`). Dependency-light: uses the
 * global `fetch` (Node 18+), no SDK. The OpenAI surface here is the classic
 * Chat Completions endpoint with `response_format: { type: 'json_object' }` —
 * the gpt-4.1 / gpt-4o families honour `max_tokens` + `temperature` + JSON mode.
 *
 * The real network call is built by `makeOpenAiChat(apiKey)`; providers depend
 * only on the `OpenAiChatFn` seam, so tests inject a fake and run offline with
 * zero network (mirrors the OpenAiSynonymProvider `fetchSynonyms` pattern).
 *
 * A response cut off by `max_tokens` (`finish_reason === 'length'`) throws
 * `OpenAiTruncationError`: the JSON is incomplete by construction, so a caller
 * should split the batch rather than retry the same call. Transient HTTP errors
 * (429 / 5xx) are retried with backoff inside the real caller; other non-2xx
 * statuses throw immediately with the API's error message.
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAiChatResult {
  text: string;
  usage: OpenAiUsage | null;
}

export interface OpenAiChatRequest {
  model: string;
  system: string;
  /** Conversation turns after the system prompt (supports a repair retry turn). */
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens: number;
  /** Defaults to 0.4 — low enough for consistent JSON, warm enough for prose. */
  temperature?: number;
}

/** Injectable network seam: real impl from `makeOpenAiChat`, fake in tests. */
export type OpenAiChatFn = (req: OpenAiChatRequest) => Promise<OpenAiChatResult>;

/**
 * Thrown when the model response was cut off by `max_tokens`
 * (`finish_reason === 'length'`). The JSON is incomplete — the correct recovery
 * is to split the batch, never to re-issue the identical call.
 */
export class OpenAiTruncationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAiTruncationError';
  }
}

/** Sleep helper (real caller only; tests inject a synchronous fake). */
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

interface RawChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: OpenAiUsage;
  error?: { message?: string };
}

/**
 * Build a real OpenAI Chat Completions caller bound to `apiKey`. Retries 429 /
 * 5xx up to `maxRetries` times with exponential backoff; throws on other
 * non-2xx; throws `OpenAiTruncationError` when the model hit `max_tokens`.
 */
export function makeOpenAiChat(apiKey: string, maxRetries = 3): OpenAiChatFn {
  if (!apiKey) throw new Error('makeOpenAiChat requires an OpenAI API key');
  return async (req: OpenAiChatRequest): Promise<OpenAiChatResult> => {
    const body = JSON.stringify({
      model: req.model,
      messages: [{ role: 'system', content: req.system }, ...req.messages],
      response_format: { type: 'json_object' },
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.4,
    });

    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res: Response;
      try {
        res = await fetch(OPENAI_CHAT_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body,
        });
      } catch (err) {
        // Network-level failure (DNS / socket) — transient, retry with backoff.
        lastErr = err instanceof Error ? err.message : String(err);
        if (attempt < maxRetries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new Error(`OpenAI request failed after ${maxRetries + 1} attempts: ${lastErr}`);
      }

      if (res.status === 429 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`;
        if (attempt < maxRetries) {
          // Honour Retry-After when present, else exponential backoff.
          const retryAfter = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
          const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : 800 * 2 ** attempt;
          await sleep(wait);
          continue;
        }
      }

      const json = (await res.json()) as RawChatResponse;
      if (!res.ok) {
        throw new Error(`OpenAI HTTP ${res.status}: ${json.error?.message ?? 'unknown error'}`);
      }
      const choice = json.choices?.[0];
      if (choice?.finish_reason === 'length') {
        throw new OpenAiTruncationError(
          `response truncated at max_tokens (${req.maxTokens}) — JSON is incomplete by construction`,
        );
      }
      return { text: choice?.message?.content ?? '', usage: json.usage ?? null };
    }
    throw new Error(`OpenAI request failed after ${maxRetries + 1} attempts: ${lastErr}`);
  };
}

// ─── shared JSON helpers ─────────────────────────────────────────────────────

/**
 * Strip a single wrapping markdown code fence (``` or ```json). JSON mode rarely
 * fences, but a defensive strip keeps a stray fence from forcing a paid retry.
 */
export function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/.exec(trimmed);
  return match ? match[1]!.trim() : trimmed;
}

/** Parse a JSON object response; throws with a helpful message on malformed JSON. */
export function parseJsonObject(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(text));
  } catch (err) {
    throw new Error(`response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('response must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

// ─── cost estimation ─────────────────────────────────────────────────────────

/**
 * USD per million tokens. APPROXIMATE — verify against current OpenAI pricing
 * before a large run. Unknown models are priced as gpt-4.1 to over- rather than
 * under-warn.
 */
export const OPENAI_PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

export function priceFor(model: string): { input: number; output: number } {
  return OPENAI_PRICES_USD_PER_MTOK[model] ?? OPENAI_PRICES_USD_PER_MTOK['gpt-4.1']!;
}

export function estimateCostUsd(
  wordCount: number,
  model: string,
  inTokensPerWord: number,
  outTokensPerWord: number,
): number {
  const price = priceFor(model);
  return (wordCount * (inTokensPerWord * price.input + outTokensPerWord * price.output)) / 1_000_000;
}
