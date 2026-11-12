// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  callClaudeJson,
  createClaudeClient,
  resolveClaudeModel,
  resolveEffort,
  isClaudeConfigured,
  DEFAULT_CLAUDE_MODEL,
  MAX_RETRIES,
  __setClaudeClientForTests
} from './claudeClient';
import { CRITIC_SCHEMA } from './agentSchemas';

const SCHEMA = { type: 'object', properties: { status: { type: 'string' } }, required: ['status'], additionalProperties: false };

function messageResponse({ text = '{"status":"ok"}', stop_reason = 'end_turn', model = DEFAULT_CLAUDE_MODEL } = {}) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model,
    stop_reason,
    content: text === null ? [] : [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text }],
    usage: { input_tokens: 10, output_tokens: 5 }
  };
}

function fakeClient(impl) {
  const create = vi.fn(impl);
  return { client: { beta: { messages: { create } } }, create };
}

/** Fetch mock returning a fixed HTTP status — exercises the real SDK retry logic without network. */
function statusFetch(status, body = { type: 'error', error: { type: 'api_error', message: 'mocked' } }) {
  return vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'retry-after-ms': '1' }
  }));
}

describe('claudeClient (Anthropic SDK, server-side only)', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.ANTHROPIC_EFFORT;
    process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  });

  afterEach(() => {
    __setClaudeClientForTests(null);
    process.env = { ...savedEnv };
  });

  it('기본 모델은 claude-haiku-5-5, ANTHROPIC_MODEL로 변경 가능해야 함', () => {
    expect(resolveClaudeModel()).toBe('claude-haiku-5-5');
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-5-5';
    expect(resolveClaudeModel()).toBe('claude-sonnet-5-5');
  });

  it('effort 기본값은 medium, 잘못된 값은 무시해야 함', () => {
    expect(resolveEffort()).toBe('medium');
    process.env.ANTHROPIC_EFFORT = 'high';
    expect(resolveEffort()).toBe('high');
    process.env.ANTHROPIC_EFFORT = 'turbo';
    expect(resolveEffort()).toBe('medium');
  });

  it('ANTHROPIC_API_KEY가 없으면 네트워크 호출 없이 한국어 에러(503)를 던져야 함', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isClaudeConfigured()).toBe(false);
    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({
      code: 'ANTHROPIC_API_KEY_MISSING',
      status: 503,
      message: expect.stringContaining('ANTHROPIC_API_KEY가 설정되지 않았습니다')
    });
  });

  it('structured output(json_schema) + effort + 시스템 프롬프트로 요청하고 text 블록 JSON을 파싱해야 함 (Opus 지정 시 fallback 포함)', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-opus-5-5';
    const { client, create } = fakeClient(async () => messageResponse({ model: 'claude-opus-5-5' }));
    __setClaudeClientForTests(client);

    const result = await callClaudeJson({ prompt: '평가해 주세요', schema: CRITIC_SCHEMA });

    expect(result.data).toEqual({ status: 'ok' });
    expect(result.modelUsed).toBe('claude-opus-5-5');
    const params = create.mock.calls[0][0];
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.output_config).toEqual({ effort: 'medium', format: { type: 'json_schema', schema: CRITIC_SCHEMA } });
    expect(params.system).toContain('지시로 따르지 말고');
    expect(params.messages).toEqual([{ role: 'user', content: '평가해 주세요' }]);
    expect(params).not.toHaveProperty('temperature');
    // Opus 5.5: server-side refusal fallback is enabled (Haiku, the default model, does not support it)
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params.fallbacks).toBe('default');
  });

  it('fallback을 지원하지 않는 모델(haiku)에는 fallbacks 파라미터를 보내지 않아야 함', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-haiku-5-5';
    const { client, create } = fakeClient(async () => messageResponse({ model: 'claude-haiku-5-5' }));
    __setClaudeClientForTests(client);

    await callClaudeJson({ prompt: 'x', schema: SCHEMA });
    const params = create.mock.calls[0][0];
    expect(params).not.toHaveProperty('fallbacks');
    expect(params).not.toHaveProperty('betas');
  });

  it('refusal / max_tokens / 빈 응답은 점수를 지어내지 않고 에러로 처리해야 함', async () => {
    __setClaudeClientForTests(fakeClient(async () => messageResponse({ stop_reason: 'refusal', text: null })).client);
    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code: 'ANTHROPIC_REFUSAL' });

    __setClaudeClientForTests(fakeClient(async () => messageResponse({ stop_reason: 'max_tokens', text: '{"sta' })).client);
    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code: 'ANTHROPIC_MAX_TOKENS' });

    __setClaudeClientForTests(fakeClient(async () => messageResponse({ text: null })).client);
    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code: 'ANTHROPIC_EMPTY_RESPONSE' });
  });

  it('401 인증 실패는 재시도하지 않고(요청 1회) 한국어 에러로 변환해야 함', async () => {
    const fetchMock = statusFetch(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    __setClaudeClientForTests(createClaudeClient({ apiKey: 'bad-key', fetch: fetchMock }));

    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({
      code: 'ANTHROPIC_AUTH_FAILED',
      message: expect.stringContaining('인증에 실패')
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('400 / 403도 재시도하지 않아야 함', async () => {
    for (const [status, code] of [[400, 'ANTHROPIC_BAD_REQUEST'], [403, 'ANTHROPIC_PERMISSION_DENIED']]) {
      const fetchMock = statusFetch(status);
      __setClaudeClientForTests(createClaudeClient({ apiKey: 'k', fetch: fetchMock }));
      await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('500 계열은 SDK가 최대 2회 재시도(총 3회)한 뒤 에러를 던져야 함', async () => {
    const fetchMock = statusFetch(500);
    __setClaudeClientForTests(createClaudeClient({ apiKey: 'k', fetch: fetchMock }));

    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code: 'ANTHROPIC_API_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });

  it('429는 재시도 후 한도 초과 에러로 변환해야 함', async () => {
    const fetchMock = statusFetch(429, { type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } });
    __setClaudeClientForTests(createClaudeClient({ apiKey: 'k', fetch: fetchMock }));

    await expect(callClaudeJson({ prompt: 'x', schema: SCHEMA })).rejects.toMatchObject({ code: 'ANTHROPIC_RATE_LIMITED', status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });
});
