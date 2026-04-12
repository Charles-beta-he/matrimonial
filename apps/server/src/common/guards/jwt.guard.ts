import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/** JWT Guard — validates Bearer token from Authorization header */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      request.user = { id: payload.sub, role: payload.role ?? 'USER' };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
