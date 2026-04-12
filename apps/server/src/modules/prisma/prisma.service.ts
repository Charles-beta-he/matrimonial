import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly prismaLogger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Pre-warm the connection but DO NOT crash the app if the database
    // is temporarily unreachable. Prisma will lazily reconnect on the
    // first query, and /health will report `db: false` (degraded) until
    // the DB is back. This prevents Railway/K8s pods from restart-looping
    // when Postgres has a blip.
    try {
      await this.$connect();
    } catch (err) {
      this.prismaLogger.warn(
        `Prisma initial $connect() failed — will retry lazily on first query. ` +
          `Error: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Nothing to do — shutting down anyway
    }
  }
}
