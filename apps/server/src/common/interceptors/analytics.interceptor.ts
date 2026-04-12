import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/** Logs all tRPC procedure calls for analytics */
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          if (duration > 1000) {
            console.log(JSON.stringify({
              type: 'slow_request',
              path: req?.path,
              method: req?.method,
              duration_ms: duration,
              timestamp: new Date().toISOString(),
            }));
          }
        },
        error: (err) => {
          console.log(JSON.stringify({
            type: 'request_error',
            path: req?.path,
            method: req?.method,
            error: err?.message,
            code: err?.code,
            duration_ms: Date.now() - start,
            timestamp: new Date().toISOString(),
          }));
        },
      }),
    );
  }
}
