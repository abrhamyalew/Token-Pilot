import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { getRequestId } from './request-context';

export class StructuredLogger extends ConsoleLogger {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    if (!this.isProduction) {
      const requestId = getRequestId();
      const prefix = requestId ? `[${requestId.slice(0, 8)}] ` : '';
      return `${prefix}${super.formatMessage(logLevel, message, pidMessage, formattedLogLevel, contextMessage, timestampDiff)}`;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level: logLevel.toUpperCase(),
      requestId: getRequestId() ?? null,
      context: this.context ?? null,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };
    return JSON.stringify(entry) + '\n';
  }
}
