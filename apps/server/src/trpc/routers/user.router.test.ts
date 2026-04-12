import { describe, it, expect, vi } from 'vitest';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

describe('user router', () => {
  it('should be importable', async () => {
    const { userRouter } = await import('./user.router');
    expect(userRouter).toBeDefined();
  });
});
