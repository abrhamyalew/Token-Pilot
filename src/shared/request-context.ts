import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

interface RequestContext {
  requestId: string;
}

const store = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return store.getStore()?.requestId;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-Id', requestId);
    store.run({ requestId }, () => next());
  }
}
