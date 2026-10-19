import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAvailableGeminiModels, callGeminiJson } from './geminiClient';

describe('geminiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when apiKey is empty or too short', async () => {
    await expect(callGeminiJson({ prompt: 'test', apiKey: '' })).rejects.toThrow('Google Gemini API 키가 유효하지 않습니다.');
    await expect(callGeminiJson({ prompt: 'test', apiKey: 'abc' })).rejects.toThrow('Google Gemini API 키가 유효하지 않습니다.');
  });

  it('returns primary models', async () => {
    const models = await getAvailableGeminiModels();
    expect(models).toBeInstanceOf(Array);
    expect(models).toContain('gemini-3.8-flash');
  });

  it('parses valid JSON response from Gemini', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '```json\n{"status": "ok"}\n```' }]
            }
          }
        ]
      })
    });

    const result = await callGeminiJson({ prompt: 'hello', apiKey: 'valid-api-key-12345' });
    expect(result.data).toEqual({ status: 'ok' });
    expect(result.modelUsed).toBe('gemini-3.8-flash');
  });
});
