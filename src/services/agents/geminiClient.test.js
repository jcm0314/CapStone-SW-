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

  it('returns candidate models even if ListModels network call fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const models = await getAvailableGeminiModels('fake-api-key-12345');
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain('gemini-1.5-flash');
  });

  it('discovers live models when ListModels responds with valid list', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-1.5-flash-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-1.5-pro-latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }
        ]
      })
    });

    const models = await getAvailableGeminiModels('unique-key-' + Date.now());
    expect(models).toBeInstanceOf(Array);
    expect(models[0]).toContain('flash');
  });
});
