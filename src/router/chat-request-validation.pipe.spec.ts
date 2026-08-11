import { ChatRequestValidationPipe } from './chat-request-validation.pipe';
import { HttpException } from '@nestjs/common';
import { ChatRequest } from '../shared/types';

describe('ChatRequestValidationPipe', () => {
  let pipe: ChatRequestValidationPipe;

  beforeEach(() => {
    pipe = new ChatRequestValidationPipe();
  });

  // ─── Valid requests ───────────────────────────────────────────────────

  it('should pass through a valid minimal request', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
    };
    expect(pipe.transform(req)).toEqual(req);
  });

  it('should pass through a full valid request', () => {
    const req: ChatRequest = {
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Tell me a joke.' },
      ],
      max_tokens: 256,
      temperature: 0.7,
      stream: false,
    };
    expect(pipe.transform(req)).toEqual(req);
  });

  it('should accept max_tokens at boundary (4096)', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 4096,
    };
    expect(pipe.transform(req)).toEqual(req);
  });

  it('should accept temperature at boundaries (0 and 2)', () => {
    const req0: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0,
    };
    expect(pipe.transform(req0)).toEqual(req0);

    const req2: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 2,
    };
    expect(pipe.transform(req2)).toEqual(req2);
  });

  // ─── Invalid messages ─────────────────────────────────────────────────

  it('should reject missing messages', () => {
    expect(() => pipe.transform({} as ChatRequest)).toThrow(HttpException);
  });

  it('should reject empty messages array', () => {
    expect(() => pipe.transform({ messages: [] } as ChatRequest)).toThrow(HttpException);
  });

  it('should reject null messages', () => {
    expect(() => pipe.transform({ messages: null } as any)).toThrow(HttpException);
  });

  // ─── Invalid message content ──────────────────────────────────────────

  it('should reject invalid role', () => {
    const req = {
      messages: [{ role: 'admin', content: 'Hello' }],
    } as any;
    expect(() => pipe.transform(req)).toThrow(HttpException);
    try {
      pipe.transform(req);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(400);
      const response = (e as HttpException).getResponse() as any;
      expect(response.error.message).toContain('role');
    }
  });

  it('should reject non-string content', () => {
    const req = {
      messages: [{ role: 'user', content: 123 }],
    } as any;
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  // ─── Invalid max_tokens ───────────────────────────────────────────────

  it('should reject max_tokens above 4096', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5000,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  it('should reject max_tokens of 0', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 0,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  it('should reject negative max_tokens', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: -1,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  it('should reject non-integer max_tokens', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 100.5,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  // ─── Invalid temperature ──────────────────────────────────────────────

  it('should reject temperature above 2', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 2.5,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  it('should reject negative temperature', () => {
    const req: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: -0.1,
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
  });

  // ─── Body size limit ──────────────────────────────────────────────────

  it('should reject oversized request bodies', () => {
    const hugeContent = 'x'.repeat(110_000); // >100KB
    const req: ChatRequest = {
      messages: [{ role: 'user', content: hugeContent }],
    };
    expect(() => pipe.transform(req)).toThrow(HttpException);
    try {
      pipe.transform(req);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(400);
      const response = (e as HttpException).getResponse() as any;
      expect(response.error.message).toContain('too large');
    }
  });

  // ─── Error format ─────────────────────────────────────────────────────

  it('should return OpenAI-compatible error shape', () => {
    try {
      pipe.transform({ messages: [] } as ChatRequest);
      throw new Error('Should have thrown');
    } catch (e) {
      const response = (e as HttpException).getResponse() as any;
      expect(response.error).toBeDefined();
      expect(response.error.message).toBeDefined();
      expect(response.error.type).toBe('invalid_request_error');
    }
  });
});
