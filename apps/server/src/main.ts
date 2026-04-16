import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as trpcExpress from '@trpc/server/adapters/express';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { appRouter } from './trpc';
import { createContext } from './trpc/context';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { assertRequiredEnv, env } from './lib/env';
import { WechatPayAdapter } from './adapters/wechat-pay.adapter';
import { AlipayAdapter } from './adapters/alipay.adapter';
import { PaymentService } from './modules/payment/payment.service';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { startRecallJob } from './jobs/recall.job';

async function bootstrap() {
  assertRequiredEnv();

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // CORS — restrict in production
  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' },
  }));

  // Stricter rate limit for auth endpoints
  app.use('/trpc/auth.sendCode', rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { error: '验证码发送过于频繁' },
  }));

  // Health check — pings database; Railway uses this for healthcheck
  app.use('/health', async (_req: any, res: any) => {
    const startTime = Date.now();
    let dbOk = false;
    const redisOk = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      // db unreachable → status will report degraded
    }

    res.json({
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { db: dbOk, redis: redisOk },
      uptime_ms: process.uptime() * 1000,
      response_ms: Date.now() - startTime,
      env: process.env.NODE_ENV ?? 'unknown',
    });
  });

  // Analytics event ingestion (high-throughput, no auth required)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/analytics/events', require('express').json({ limit: '100kb' }));
  expressApp.post('/analytics/events', (req: any, res: any) => {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'events must be an array' });
    }
    AnalyticsService.ingest(events);
    res.json({ accepted: events.length });
  });

  // Dev-only file upload receiver — uses local filesystem which doesn't
  // work on ephemeral containers (Railway, K8s). Only enable when explicitly
  // NODE_ENV=development. preview/staging/production use OSS adapter instead.
  //
  // Also: Express 5 / path-to-regexp 8 dropped the `:param(*)` syntax, so the
  // wildcard file-serve route uses a regex instead.
  if (env.NODE_ENV === 'development') {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const express = require('express');
    const uploadDir = path.join(process.cwd(), '.uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Receive uploaded file
    expressApp.use('/upload/receive', express.raw({ type: '*/*', limit: '50mb' }));
    expressApp.put('/upload/receive', async (req: any, res: any) => {
      const key = req.query.key as string;
      if (!key) return res.status(400).json({ error: 'Missing key' });
      const filePath = path.join(uploadDir, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, req.body);
      res.json({ success: true, key });
    });

    // Serve uploaded files (wildcard via regex — Express 5 compatible)
    expressApp.get(/^\/upload\/files\/(.+)$/, async (req: any, res: any) => {
      const key = req.params[0];
      const filePath = path.join(uploadDir, key);
      try {
        const data = await fs.readFile(filePath);
        res.set('Content-Type', 'image/jpeg'); // rough default
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(data);
      } catch {
        res.status(404).json({ error: 'Not found' });
      }
    });
  }

  // Payment callbacks (must be registered before tRPC mount)
  const expressLib = require('express');

  // WeChat Pay v3 webhook — raw body needed for signature verify
  expressApp.post(
    '/webhooks/wechat-pay',
    expressLib.raw({ type: '*/*' }),
    async (req: any, res: any) => {
      const body = req.body?.toString('utf8') || '';
      const headers = req.headers as Record<string, string>;

      if (!WechatPayAdapter.verifyCallback(headers, body)) {
        return res.status(401).json({ code: 'FAIL', message: 'signature verify failed' });
      }

      try {
        const payload = JSON.parse(body);
        const decrypted = WechatPayAdapter.decryptCallback(payload.resource);
        if (decrypted?.trade_state === 'SUCCESS') {
          await PaymentService.markOrderPaid(
            decrypted.out_trade_no,
            decrypted.transaction_id,
          );
        }
        res.json({ code: 'SUCCESS', message: 'OK' });
      } catch (err: any) {
        logger.error('wechat callback error', { error: err?.message });
        res.status(500).json({ code: 'FAIL', message: err?.message });
      }
    },
  );

  // Alipay webhook — form-urlencoded
  expressApp.use('/webhooks/alipay', expressLib.urlencoded({ extended: false }));
  expressApp.post('/webhooks/alipay', async (req: any, res: any) => {
    const params = req.body as Record<string, string>;
    if (!AlipayAdapter.verifyCallback(params)) {
      return res.send('fail');
    }
    if (
      params.trade_status === 'TRADE_SUCCESS' ||
      params.trade_status === 'TRADE_FINISHED'
    ) {
      await PaymentService.markOrderPaid(params.out_trade_no, params.trade_no);
    }
    res.send('success');
  });

  // Mount tRPC
  app.use('/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }));

  const port = env.PORT;
  // Bind to 0.0.0.0 so Railway / Docker edge proxies can reach the server.
  // Default 'localhost' binding only accepts requests from inside the container.
  await app.listen(port, '0.0.0.0');
  AnalyticsService.startAutoFlush();
  startRecallJob();
  logger.info('server started', { port, env: env.NODE_ENV });
}

void bootstrap();

