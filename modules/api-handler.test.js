import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { optimizePrompt } from './api-handler.js';

describe('api-handler', () => {
  const apiKey = 'test-api-key';
  const rawPrompt = 'Write a function to add two numbers';
  const systemInstruction = 'You are a coder';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should throw an error if API Key is missing or empty', async () => {
      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey: '' })
      ).rejects.toThrow('API Key is missing. Please configure your Gemini API Key in the Settings tab.');

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey: '   ' })
      ).rejects.toThrow('API Key is missing. Please configure your Gemini API Key in the Settings tab.');

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey: null })
      ).rejects.toThrow('API Key is missing. Please configure your Gemini API Key in the Settings tab.');
    });

    it('should throw an error if rawPrompt is missing or empty', async () => {
      await expect(
        optimizePrompt({ rawPrompt: '', systemInstruction, apiKey })
      ).rejects.toThrow('Input prompt is empty. Please enter a prompt to optimize.');

      await expect(
        optimizePrompt({ rawPrompt: '   ', systemInstruction, apiKey })
      ).rejects.toThrow('Input prompt is empty. Please enter a prompt to optimize.');

      await expect(
        optimizePrompt({ rawPrompt: null, systemInstruction, apiKey })
      ).rejects.toThrow('Input prompt is empty. Please enter a prompt to optimize.');
    });
  });

  describe('custom API error statuses', () => {
    const createMockResponse = (status, errorJson, statusText = '') => {
      return {
        ok: false,
        status,
        statusText,
        json: async () => {
          if (errorJson === null) {
            throw new Error('Parsing failed');
          }
          return errorJson;
        },
      };
    };

    it('should handle 400 Bad Request error', async () => {
      const mockResponse = createMockResponse(400, {
        error: { message: 'Invalid model' }
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Bad Request: Invalid model. Please check model selection or inputs.');
    });

    it('should handle 403 Forbidden error', async () => {
      const mockResponse = createMockResponse(403, {
        error: { message: 'API key not valid' }
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Invalid API Key. Please verify your Gemini API key in the Settings tab.');
    });

    it('should handle 429 Too Many Requests error', async () => {
      const mockResponse = createMockResponse(429, {
        error: { message: 'Quota exceeded' }
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('API Rate Limit Exceeded. You have made too many requests in a short time. Please wait a minute and try again.');
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockResponse = createMockResponse(500, {
        error: { message: 'Internal error' }
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Gemini Server Error. The API is temporarily unavailable. Please try again in a few moments.');
    });

    it('should handle 503 Service Unavailable error', async () => {
      const mockResponse = createMockResponse(503, {
        error: { message: 'Service unavailable' }
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Gemini Server Error. The API is temporarily unavailable. Please try again in a few moments.');
    });

    it('should handle other error statuses with fallback error messages', async () => {
      const mockResponse = createMockResponse(404, null, 'Not Found');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('API Error (404): Not Found');
    });
  });

  describe('request timeout', () => {
    it('should throw timeout error when the fetch times out', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          const signal = options?.signal;
          if (signal?.aborted) {
            return reject(new DOMException('The operation was aborted.', 'AbortError'));
          }
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey, timeoutMs: 10 })
      ).rejects.toThrow('API request timed out (60s limit reached). Please check your internet connection and try again.');
    });
  });

  describe('SSE streaming response body parsing', () => {
    it('should successfully parse complete JSON chunks and call onChunk', async () => {
      const chunk1 = {
        candidates: [{ content: { parts: [{ text: 'Optimized ' }] } }]
      };
      const chunk2 = {
        candidates: [{ content: { parts: [{ text: 'prompt' }] } }]
      };

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`[\n${JSON.stringify(chunk1)},\n`));
          controller.enqueue(new TextEncoder().encode(`${JSON.stringify(chunk2)}\n]`));
          controller.close();
        }
      });

      const mockResponse = {
        ok: true,
        body: stream,
        headers: new Headers(),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const chunksReceived = [];
      const result = await optimizePrompt({
        rawPrompt,
        systemInstruction,
        apiKey,
        onChunk: (text) => chunksReceived.push(text)
      });

      expect(result).toBe('Optimized prompt');
      expect(chunksReceived).toEqual(['Optimized ', 'prompt']);
    });

    it('should successfully parse fragmented/partial JSON chunks correctly', async () => {
      const chunkData = {
        candidates: [{ content: { parts: [{ text: 'Dynamic ' }] } }]
      };
      const chunkStr = JSON.stringify(chunkData);

      // Split the JSON string into two fragments to test buffer concatenation
      const part1 = chunkStr.substring(0, Math.floor(chunkStr.length / 2));
      const part2 = chunkStr.substring(Math.floor(chunkStr.length / 2));

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`[${part1}`));
          controller.enqueue(new TextEncoder().encode(`${part2}]`));
          controller.close();
        }
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await optimizePrompt({ rawPrompt, systemInstruction, apiKey });
      expect(result).toBe('Dynamic');
    });

    it('should clean and strip markdown code blocks from output', async () => {
      const chunk = {
        candidates: [{ content: { parts: [{ text: '```html\nWrite a <button>\n```' }] } }]
      };

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`[${JSON.stringify(chunk)}]`));
          controller.close();
        }
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      const result = await optimizePrompt({ rawPrompt, systemInstruction, apiKey });
      expect(result).toBe('Write a <button>');
    });

    it('should throw an error if streaming response body is missing or unreadable', async () => {
      const mockResponse = {
        ok: true,
        body: null
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Unable to read streaming response body from Gemini API.');
    });

    it('should throw an error if the accumulated text is empty or malformed', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('[]'));
          controller.close();
        }
      });

      const mockResponse = {
        ok: true,
        body: stream,
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

      await expect(
        optimizePrompt({ rawPrompt, systemInstruction, apiKey })
      ).rejects.toThrow('Received an empty or malformed response from the Gemini API. Please try again.');
    });
  });
});
