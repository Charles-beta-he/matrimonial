import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { logger } from '../../lib/logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorCode =
      exception instanceof HttpException
        ? (exception.getResponse() as any)?.error ?? 'UNKNOWN_ERROR'
        : 'INTERNAL_SERVER_ERROR';

    const timestamp = new Date().toISOString();

    // Structured error logging
    logger.error('Request failed', {
      type: 'http_error',
      method: request.method,
      path: request.url,
      status,
      error_code: errorCode,
      message,
      stack: exception instanceof Error ? exception.stack?.slice(0, 500) : undefined,
      user_id: request.user?.id ?? request.user?.sub,
    });

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      timestamp,
      path: request.url,
    });
  }
}
