import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  makeOpenAiChat,
  OpenAiTruncationError,
  stripMarkdownFences,
  parseJsonObject,
  estimateCostUsd,
  priceFor,
  OPENAI_PRICES_USD_PER_MTOK,
} from '@/providers/openaiClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function fakeResponse(opts: {
  ok?: boolean;
  status: number;
  body: unknown;
  retryAfter?: string;
}): Response {
  return {
    ok: opts.ok ?? (opts.status >= 200 && opts.status < 300),
    status: opts.status,
    headers: { get: (h: string) => (h.toLowerCase() === 'retry-after' ? (opts.retryAfter ?? null) : null) },
    json: async () => opts.body,
  } as unknown as Response;
}

describe('pure helpers', () => {
  it('strips a ```json fence', () => {
    expect(stripMarkdownFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripMarkdownFences('{"a":1}')).toBe('{"a":1}');
  });

  it('parseJsonObject returns the object / throws on non-object / throws on array', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(() => parseJsonObject('not json')).toThrow(/not valid JSON/);
    expect(() => parseJsonObject('[1,2]')).toThrow(/must be a JSON object/);
  });

  it('priceFor falls back to gpt-4.1 for unknown models', () => {
    expect(priceFor('gpt-4.1-mini')).toEqual(OPENAI_PRICES_USD_PER_MTOK['gpt-4.1-mini']);
    expect(priceFor('made-up')).toEqual(OPENAI_PRICES_USD_PER_MTOK['gpt-4.1']);
  });

  it('estimateCostUsd multiplies tokens by price', () => {
    // 10 words × (100 in × $0.4 + 50 out × $1.6) / 1e6  (gpt-4.1-mini)
    const cost = estimateCostUsd(10, 'gpt-4.1-mini', 100, 50);
    expect(cost).toBeCloseTo((10 * (100 * 0.4 + 50 * 1.6)) / 1_000_000, 10);
  });
});

describe('makeOpenAiChat', () => {
  it('requires an api key', () => {
    expect(() => makeOpenAiChat('')).toThrow(/requires an OpenAI API key/);
  });

  it('returns text + usage on a 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        fakeResponse({
          status: 200,
          body: { choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } },
        }),
      ),
    );
    const chat = makeOpenAiChat('k');
    const res = await chat({ model: 'gpt-4.1-mini', system: 's', messages: [{ role: 'user', content: 'u' }], maxTokens: 100 });
    expect(res.text).toBe('{"ok":true}');
    expect(res.usage?.total_tokens).toBe(8);
  });

  it('throws OpenAiTruncationError when finish_reason is length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fakeResponse({ status: 200, body: { choices: [{ message: { content: '{partial' }, finish_reason: 'length' }] } })),
    );
    const chat = makeOpenAiChat('k');
    await expect(
      chat({ model: 'm', system: 's', messages: [{ role: 'user', content: 'u' }], maxTokens: 10 }),
    ).rejects.toBeInstanceOf(OpenAiTruncationError);
  });

  it('throws with the API error message on a non-retryable 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fakeResponse({ status: 400, ok: false, body: { error: { message: 'bad request' } } })),
    );
    const chat = makeOpenAiChat('k');
    await expect(
      chat({ model: 'm', system: 's', messages: [{ role: 'user', content: 'u' }], maxTokens: 10 }),
    ).rejects.toThrow(/HTTP 400: bad request/);
  });

  it('retries a 429 then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ status: 429, ok: false, body: {}, retryAfter: '0' }))
      .mockResolvedValueOnce(
        fakeResponse({ status: 200, body: { choices: [{ message: { content: '{"ok":1}' }, finish_reason: 'stop' }], usage: null } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const chat = makeOpenAiChat('k', 2);
    const p = chat({ model: 'm', system: 's', messages: [{ role: 'user', content: 'u' }], maxTokens: 10 });
    await vi.runAllTimersAsync();
    const res = await p;
    expect(res.text).toBe('{"ok":1}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
