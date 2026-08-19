import { HttpException, HttpStatus } from '@nestjs/common';
import { RouterController } from './router.controller';
import { ChatChunk, ChatRequest } from '../shared/types';

const classification = {
  tier: 'low' as const,
  score: 0.1,
  confidence: 0.9,
  classifier: 'rules' as const,
  features: {} as any,
};

const costCalculator = {
  calculate: vi.fn().mockImplementation(() => ({
    actualCost: 0,
    frontierCost: 0.001,
    savings: 0.001,
    savingsPercent: 100,
  })),
};

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  };
}

describe('RouterController', () => {
  const request: ChatRequest = {
    messages: [{ role: 'user', content: 'Hello' }],
  };

  it('returns non-streaming chat responses', async () => {
    const res = makeResponse();
    const routerService = {
      handleRequest: vi.fn().mockResolvedValue({
        classification,
        response: {
          id: 'chat',
          object: 'chat.completion',
          created: 1,
          model: 'test-model',
          choices: [],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      }),
    };
    const controller = new RouterController(routerService as any, {} as any, costCalculator as any);

    await controller.chatCompletions(request, {} as any, res as any);

    expect(routerService.handleRequest).toHaveBeenCalledWith(request);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ model: 'test-model' }));
  });

  it('streams chunks, terminates SSE, and finalizes success logging', async () => {
    const res = makeResponse();
    async function* stream(): AsyncIterable<ChatChunk> {
      yield {
        id: 'chunk',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'test-model',
        choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
      };
      yield {
        id: 'chunk',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'test-model',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
    }
    const finalize = vi.fn();
    const routerService = {
      handleStreamRequest: vi.fn().mockResolvedValue({
        stream: stream(),
        classification,
        model: 'test-model',
        provider: 'mock',
        finalize,
      }),
    };
    const controller = new RouterController(routerService as any, {} as any, costCalculator as any);

    await controller.chatCompletions({ ...request, stream: true }, {} as any, res as any);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('routing_complete'));
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
    expect(res.end).toHaveBeenCalled();
    expect(finalize).toHaveBeenCalledWith('Hi', {
      prompt_tokens: 1,
      completion_tokens: 1,
      total_tokens: 2,
    });
  });

  it('finalizes stream failures and writes an SSE error event', async () => {
    const res = makeResponse();
    async function* stream(): AsyncIterable<ChatChunk> {
      yield {
        id: 'chunk',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'test-model',
        choices: [{ index: 0, delta: { content: 'Partial' }, finish_reason: null }],
      };
      throw new Error('stream failed');
    }
    const finalize = vi.fn();
    const routerService = {
      handleStreamRequest: vi.fn().mockResolvedValue({
        stream: stream(),
        classification,
        model: 'test-model',
        provider: 'mock',
        finalize,
      }),
    };
    const controller = new RouterController(routerService as any, {} as any, costCalculator as any);

    await controller.chatCompletions({ ...request, stream: true }, {} as any, res as any);

    expect(finalize).toHaveBeenCalledWith('Partial', null, expect.any(Error));
    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('Stream interrupted'),
    );
  });

  it('rethrows expected HttpExceptions', async () => {
    const routerService = {
      handleRequest: vi.fn().mockRejectedValue(new HttpException('bad', HttpStatus.BAD_REQUEST)),
    };
    const controller = new RouterController(routerService as any, {} as any, costCalculator as any);

    await expect(controller.chatCompletions(request, {} as any, makeResponse() as any)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('returns a 500 response for unexpected non-stream errors', async () => {
    const res = makeResponse();
    const routerService = {
      handleRequest: vi.fn().mockRejectedValue(new Error('unexpected')),
    };
    const controller = new RouterController(routerService as any, {} as any, costCalculator as any);

    await controller.chatCompletions(request, {} as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error', type: 'server_error' },
    });
  });

  it('returns health and model metadata', async () => {
    const providerRegistry = {
      checkAllHealth: vi.fn().mockResolvedValue({ mock: true }),
    };
    const controller = new RouterController({} as any, providerRegistry as any, costCalculator as any);

    await expect(controller.health()).resolves.toMatchObject({
      status: 'ok',
      providers: { mock: true },
    });
    expect(controller.listModels().data.length).toBeGreaterThan(0);
  });
});
