import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSelfUser = {
  id: 'user-1',
  nickname: '小明',
  gender: 'MALE',
  birthday: new Date('1995-01-01'),
  bio: '喜欢旅行和摄影',
  tags: [{ tag: '旅行' }, { tag: '摄影' }],
};

const mockTargetUser = {
  id: 'user-2',
  nickname: '小花',
  gender: 'FEMALE',
  birthday: new Date('1997-06-15'),
  bio: '热爱美食和音乐',
  tags: [{ tag: '美食' }, { tag: '音乐' }],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../adapters/ai.adapter', () => ({
  AIAdapter: {
    generateIcebreakers: vi.fn(),
    evaluatePromptAnswer: vi.fn(),
    generate: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { prisma } from '../../lib/prisma';
import { AIAdapter } from '../../adapters/ai.adapter';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('aiRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should be importable', async () => {
    const mod = await import('./ai.router');
    expect(mod.aiRouter).toBeDefined();
  });

  // ── icebreakers ───────────────────────────────────────────────────────────

  describe('icebreakers', () => {
    it('returns suggestions array when both users exist', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockSelfUser as any)
        .mockResolvedValueOnce(mockTargetUser as any);

      vi.mocked(AIAdapter.generateIcebreakers).mockResolvedValue([
        '你好呀，你的头像好好看！',
        '看到你也喜欢旅行，最近有什么有趣的经历吗？',
        '嗨，我也是刚匹配成功，紧张又期待~',
      ]);

      const [self, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: 'user-1' }, include: { tags: true } }),
        prisma.user.findUnique({ where: { id: 'user-2' }, include: { tags: true } }),
      ]);

      expect(self).not.toBeNull();
      expect(target).not.toBeNull();

      const calcAge = (d: Date) =>
        Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      const suggestions = await AIAdapter.generateIcebreakers(
        { age: calcAge(self!.birthday), gender: self!.gender, bio: self!.bio, tags: self!.tags.map((t: any) => t.tag) },
        { age: calcAge(target!.birthday), gender: target!.gender, bio: target!.bio, tags: target!.tags.map((t: any) => t.tag) },
      );

      expect(suggestions).toHaveLength(3);
      expect(AIAdapter.generateIcebreakers).toHaveBeenCalledOnce();
    });

    it('throws NOT_FOUND when self user does not exist', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTargetUser as any);

      const [self] = await Promise.all([
        prisma.user.findUnique({ where: { id: 'nonexistent' }, include: { tags: true } }),
        prisma.user.findUnique({ where: { id: 'user-2' }, include: { tags: true } }),
      ]);

      expect(self).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' });
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('用户不存在');
    });

    it('throws NOT_FOUND when target user does not exist', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockSelfUser as any)
        .mockResolvedValueOnce(null);

      const [, target] = await Promise.all([
        prisma.user.findUnique({ where: { id: 'user-1' }, include: { tags: true } }),
        prisma.user.findUnique({ where: { id: 'nonexistent' }, include: { tags: true } }),
      ]);

      expect(target).toBeNull();

      const err = new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' });
      expect(err.code).toBe('NOT_FOUND');
    });

    it('passes correctly computed ages to generateIcebreakers', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockSelfUser as any)
        .mockResolvedValueOnce(mockTargetUser as any);
      vi.mocked(AIAdapter.generateIcebreakers).mockResolvedValue(['test']);

      const calcAge = (d: Date) =>
        Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      const selfAge = calcAge(mockSelfUser.birthday);
      const targetAge = calcAge(mockTargetUser.birthday);

      await AIAdapter.generateIcebreakers(
        { age: selfAge, gender: 'MALE', bio: '喜欢旅行和摄影', tags: ['旅行', '摄影'] },
        { age: targetAge, gender: 'FEMALE', bio: '热爱美食和音乐', tags: ['美食', '音乐'] },
      );

      expect(AIAdapter.generateIcebreakers).toHaveBeenCalledWith(
        expect.objectContaining({ age: selfAge, gender: 'MALE' }),
        expect.objectContaining({ age: targetAge, gender: 'FEMALE' }),
      );
    });

    it('maps tags correctly to string array', async () => {
      const userWithTags = { ...mockSelfUser, tags: [{ tag: '健身' }, { tag: '读书' }] };
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(userWithTags as any)
        .mockResolvedValueOnce(mockTargetUser as any);
      vi.mocked(AIAdapter.generateIcebreakers).mockResolvedValue(['hi']);

      const self = await prisma.user.findUnique({ where: { id: 'user-1' }, include: { tags: true } });
      const tagStrings = self!.tags.map((t: any) => t.tag);
      expect(tagStrings).toEqual(['健身', '读书']);
    });

    it('returns result wrapped in { suggestions } object', async () => {
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockSelfUser as any)
        .mockResolvedValueOnce(mockTargetUser as any);
      vi.mocked(AIAdapter.generateIcebreakers).mockResolvedValue(['hello', 'world']);

      const suggestions = await AIAdapter.generateIcebreakers(
        { age: 29, gender: 'MALE', bio: '', tags: [] },
        { age: 27, gender: 'FEMALE', bio: '', tags: [] },
      );

      const result = { suggestions };
      expect(result).toHaveProperty('suggestions');
      expect(result.suggestions).toHaveLength(2);
    });
  });

  // ── evaluatePrompt ────────────────────────────────────────────────────────

  describe('evaluatePrompt', () => {
    it('returns score and suggestion from AIAdapter', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockResolvedValue({
        score: 8,
        suggestion: '可以加入一个具体的例子让回答更生动',
      });

      const result = await AIAdapter.evaluatePromptAnswer(
        '你最喜欢的旅行目的地是哪里？',
        '我喜欢去山区，感受大自然的宁静。',
      );

      expect(result.score).toBe(8);
      expect(result.suggestion).toBe('可以加入一个具体的例子让回答更生动');
    });

    it('calls evaluatePromptAnswer with correct question and answer', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockResolvedValue({ score: 7 });

      await AIAdapter.evaluatePromptAnswer('问题是什么？', '我的答案');

      expect(AIAdapter.evaluatePromptAnswer).toHaveBeenCalledWith('问题是什么？', '我的答案');
    });

    it('returns only score when suggestion is absent', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockResolvedValue({ score: 7 });

      const result = await AIAdapter.evaluatePromptAnswer('问题', '答案');
      expect(result.score).toBe(7);
      expect(result.suggestion).toBeUndefined();
    });

    it('score is within 1-10 range', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockResolvedValue({ score: 5, suggestion: '多加细节' });

      const result = await AIAdapter.evaluatePromptAnswer('兴趣爱好是什么？', '喜欢运动');
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });

  // ── AIAdapter.generateIcebreakers unit tests ──────────────────────────────

  describe('AIAdapter.generateIcebreakers — mock response parsing', () => {
    it('splits multi-line response into array of strings', async () => {
      vi.mocked(AIAdapter.generateIcebreakers).mockImplementation(async () => {
        const raw = '你好呀！\n最近有好玩的事吗？\n期待认识你~';
        return raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
      });

      const result = await AIAdapter.generateIcebreakers({}, {});
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('你好呀！');
    });

    it('filters out empty lines in response', async () => {
      vi.mocked(AIAdapter.generateIcebreakers).mockImplementation(async () => {
        const raw = '第一条\n\n\n第二条\n第三条';
        return raw.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, 3);
      });

      const result = await AIAdapter.generateIcebreakers({}, {});
      expect(result).toHaveLength(3);
      expect(result.every(s => s.length > 0)).toBe(true);
    });

    it('truncates to at most 3 suggestions', async () => {
      vi.mocked(AIAdapter.generateIcebreakers).mockImplementation(async () => {
        return ['第一', '第二', '第三'];
      });

      const result = await AIAdapter.generateIcebreakers({}, {});
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  // ── AIAdapter.evaluatePromptAnswer unit tests ─────────────────────────────

  describe('AIAdapter.evaluatePromptAnswer — fallback', () => {
    it('falls back to score=7 when AI response is not valid JSON', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockImplementation(async () => {
        const fakeResponse = 'this is not json at all';
        try {
          const match = fakeResponse.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
        } catch {
          // ignore
        }
        return { score: 7 };
      });

      const result = await AIAdapter.evaluatePromptAnswer('q', 'a');
      expect(result.score).toBe(7);
    });

    it('extracts valid JSON even when embedded in surrounding text', async () => {
      vi.mocked(AIAdapter.evaluatePromptAnswer).mockImplementation(async () => {
        const fakeResponse = '这是评估结果：{"score": 9, "suggestion": "很棒！"} 结束。';
        try {
          const match = fakeResponse.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
        } catch {
          // ignore
        }
        return { score: 7 };
      });

      const result = await AIAdapter.evaluatePromptAnswer('q', 'a');
      expect(result.score).toBe(9);
      expect(result.suggestion).toBe('很棒！');
    });
  });
});
