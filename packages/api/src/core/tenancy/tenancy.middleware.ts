import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '@org/shared-types';
import { tenantStorage } from './tenant-context';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/refresh', '/api/health'];

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;
    if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
      return next();
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice('Bearer '.length);

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    tenantStorage.run(
      {
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        schemaName: payload.schemaName,
        userId: payload.sub,
      },
      () => next(),
    );
  }
}
