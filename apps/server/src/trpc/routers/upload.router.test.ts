import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    photo: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../modules/upload/upload.service', () => ({
  UploadService: {
    validate: vi.fn(),
    generateCredential: vi.fn(),
    getPublicUrl: vi.fn(),
  },
}));

vi.mock('../../adapters/audit.adapter', () => ({
  audit: {
    auditImage: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { UploadService } from '../../modules/upload/upload.service';
import { audit } from '../../adapters/audit.adapter';

// ── Context Helper ─────────────────────────────────────────────────────────────

function makeCtx(userId = 'user-1') {
  return {
    prisma,
    user: { id: userId, role: 'USER' as const },
    req: {} as any,
  };
}

async function makeCaller(userId = 'user-1') {
  const { uploadRouter } = await import('./upload.router');
  const t = initTRPC.context<ReturnType<typeof makeCtx>>().create();
  const app = t.router({ upload: uploadRouter });
  return app.createCaller(makeCtx(userId));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('uploadRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./upload.router');
    expect(mod.uploadRouter).toBeDefined();
  });

  // ── requestUpload ─────────────────────────────────────────────────────────

  describe('requestUpload mutation', () => {
    const validInput = {
      category: 'photo' as const,
      filename: 'my-photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024 * 1024, // 1MB
    };

    it('returns upload credentials for valid request', async () => {
      vi.mocked(UploadService.validate).mockReturnValue({ valid: true });
      vi.mocked(UploadService.generateCredential).mockResolvedValue({
        uploadUrl: 'https://oss.test/upload',
        publicUrl: 'https://cdn.test/photo/uuid.jpg',
        objectKey: 'photo/2026/01/01/user-1/uuid.jpg',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      const caller = await makeCaller();
      const result = await caller.upload.requestUpload(validInput);

      expect(result.uploadUrl).toBe('https://oss.test/upload');
      expect(result.publicUrl).toBe('https://cdn.test/photo/uuid.jpg');
      expect(result.objectKey).toBeDefined();
      expect(UploadService.generateCredential).toHaveBeenCalledWith(
        'user-1',
        'photo',
        'my-photo.jpg',
        'image/jpeg',
        1024 * 1024,
      );
    });

    it('throws BAD_REQUEST when validation fails (wrong content type)', async () => {
      vi.mocked(UploadService.validate).mockReturnValue({
        valid: false,
        error: 'photo 仅支持 image/jpeg, image/png, image/webp, image/heic',
      });

      const caller = await makeCaller();
      await expect(
        caller.upload.requestUpload({ ...validInput, contentType: 'image/gif' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }));

      expect(UploadService.generateCredential).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when validation fails (file too large)', async () => {
      vi.mocked(UploadService.validate).mockReturnValue({
        valid: false,
        error: '文件大小不能超过 10MB',
      });

      const caller = await makeCaller();
      await expect(
        caller.upload.requestUpload({ ...validInput, sizeBytes: 20 * 1024 * 1024 }),
      ).rejects.toThrow(expect.objectContaining({ code: 'BAD_REQUEST' }));
    });

    it('passes correct user id to generateCredential', async () => {
      vi.mocked(UploadService.validate).mockReturnValue({ valid: true });
      vi.mocked(UploadService.generateCredential).mockResolvedValue({
        uploadUrl: 'https://oss.test/upload',
        publicUrl: 'https://cdn.test/avatar/uuid.png',
        objectKey: 'avatar/2026/01/01/user-42/uuid.png',
        expiresAt: new Date().toISOString(),
      });

      const caller = await makeCaller('user-42');
      await caller.upload.requestUpload({ ...validInput, category: 'avatar' });

      expect(UploadService.generateCredential).toHaveBeenCalledWith(
        'user-42',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('forwards validation error message in BAD_REQUEST', async () => {
      const errorMsg = 'avatar 仅支持 image/jpeg, image/png, image/webp';
      vi.mocked(UploadService.validate).mockReturnValue({ valid: false, error: errorMsg });

      const caller = await makeCaller();
      const err = await caller.upload.requestUpload(validInput).catch((e: TRPCError) => e);
      expect((err as TRPCError).message).toBe(errorMsg);
    });
  });

  // ── confirmUpload ─────────────────────────────────────────────────────────

  describe('confirmUpload mutation', () => {
    const photoInput = {
      objectKey: 'photo/2026/01/01/user-1/uuid.jpg',
      category: 'photo' as const,
    };

    it('returns publicUrl and objectKey for photo upload', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/photo/uuid.jpg');
      vi.mocked(prisma.photo.count).mockResolvedValue(2);
      vi.mocked(prisma.photo.create).mockResolvedValue({ id: 'photo-1' } as any);
      vi.mocked(audit.auditImage).mockResolvedValue({ status: 'APPROVED', reasons: [] });

      const caller = await makeCaller();
      const result = await caller.upload.confirmUpload(photoInput);

      expect(result.publicUrl).toBe('https://cdn.test/photo/uuid.jpg');
      expect(result.objectKey).toBe(photoInput.objectKey);
    });

    it('creates Photo record with correct order and auditStatus=PENDING', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/photo/uuid.jpg');
      vi.mocked(prisma.photo.count).mockResolvedValue(3); // user already has 3 photos
      vi.mocked(prisma.photo.create).mockResolvedValue({ id: 'photo-new', order: 3 } as any);
      vi.mocked(audit.auditImage).mockResolvedValue({ status: 'APPROVED', reasons: [] });

      const caller = await makeCaller();
      await caller.upload.confirmUpload(photoInput);

      expect(prisma.photo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            order: 3,
            isAvatar: false,
            auditStatus: 'PENDING',
          }),
        }),
      );
    });

    it('creates avatar Photo record with isAvatar=true', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/avatar/uuid.png');
      vi.mocked(prisma.photo.count).mockResolvedValue(0);
      vi.mocked(prisma.photo.create).mockResolvedValue({ id: 'photo-avatar' } as any);
      vi.mocked(audit.auditImage).mockResolvedValue({ status: 'APPROVED', reasons: [] });

      const caller = await makeCaller();
      await caller.upload.confirmUpload({
        objectKey: 'avatar/2026/01/01/user-1/uuid.png',
        category: 'avatar',
      });

      expect(prisma.photo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isAvatar: true }),
        }),
      );
    });

    it('does NOT create Photo record for non-photo categories (chat)', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/chat/uuid.mp4');

      const caller = await makeCaller();
      const result = await caller.upload.confirmUpload({
        objectKey: 'chat/2026/01/01/user-1/uuid.mp4',
        category: 'chat',
      });

      expect(prisma.photo.create).not.toHaveBeenCalled();
      expect(result.objectKey).toBe('chat/2026/01/01/user-1/uuid.mp4');
    });

    it('does NOT block response when audit is async (fire-and-forget)', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/photo/uuid.jpg');
      vi.mocked(prisma.photo.count).mockResolvedValue(0);
      vi.mocked(prisma.photo.create).mockResolvedValue({ id: 'photo-1' } as any);

      // Audit takes 100ms — confirm should resolve immediately without waiting
      vi.mocked(audit.auditImage).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return { status: 'APPROVED', reasons: [] };
      });

      const caller = await makeCaller();
      const start = Date.now();
      await caller.upload.confirmUpload(photoInput);
      const elapsed = Date.now() - start;

      // Should complete well before the 100ms audit delay
      expect(elapsed).toBeLessThan(80);
    });

    it('does NOT create Photo for verify category', async () => {
      vi.mocked(UploadService.getPublicUrl).mockReturnValue('https://cdn.test/verify/uuid.jpg');

      const caller = await makeCaller();
      await caller.upload.confirmUpload({
        objectKey: 'verify/2026/01/01/user-1/uuid.jpg',
        category: 'verify',
      });

      expect(prisma.photo.create).not.toHaveBeenCalled();
    });
  });
});
