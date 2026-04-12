import { logger } from '../lib/logger';
import { env, isConfigured as checkConfigured } from '../lib/env';

const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
const isConfigured = checkConfigured('claude');

interface GenerateOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export const AIAdapter = {
  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    if (!isConfigured) {
      logger.info('ai mock (not configured)');
      return this._mockResponse(prompt);
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: options.maxTokens ?? 512,
          temperature: options.temperature ?? 0.8,
          system: options.system ?? '你是一个友好的婚恋交友助手，用简洁自然的中文回答。',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        logger.error('anthropic api error', { status: res.status });
        return this._mockResponse(prompt);
      }

      const data: any = await res.json();
      return data.content?.[0]?.text ?? this._mockResponse(prompt);
    } catch (err: any) {
      logger.error('ai error', { error: err?.message });
      return this._mockResponse(prompt);
    }
  },

  /** Generate 3 icebreaker messages based on two users' profiles */
  async generateIcebreakers(selfProfile: any, targetProfile: any): Promise<string[]> {
    const prompt = `
我是一个${selfProfile.age}岁的${selfProfile.gender === 'MALE' ? '男生' : '女生'}，${selfProfile.bio ?? ''}，兴趣：${selfProfile.tags?.join('、') ?? '未知'}。
对方是一个${targetProfile.age}岁的${targetProfile.gender === 'MALE' ? '男生' : '女生'}，${targetProfile.bio ?? ''}，兴趣：${targetProfile.tags?.join('、') ?? '未知'}。
我们刚刚匹配成功，请给我推荐 3 条破冰开场白。
要求：每条独立一行，自然友好，20 字以内，不要编号，不要任何前缀，只返回 3 行文字。
`.trim();

    const response = await this.generate(prompt, { maxTokens: 256, temperature: 0.9 });
    return response
      .split('\n')
      .map((l) => l.trim().replace(/^[0-9]+[.、]\s*/, '').replace(/^[-*]\s*/, ''))
      .filter((l) => l.length > 0 && l.length < 50)
      .slice(0, 3);
  },

  /** Evaluate a registration prompt answer and suggest improvements */
  async evaluatePromptAnswer(question: string, answer: string): Promise<{ score: number; suggestion?: string }> {
    const prompt = `
用户正在填写婚恋档案，问题是：${question}
用户的回答是：${answer}

请评估这个回答的质量（1-10分，主要看：是否具体、是否有个性、是否引人互动），并用一句话给出改进建议。
只返回 JSON 格式：{"score": 数字, "suggestion": "..."}
`.trim();

    const response = await this.generate(prompt, { maxTokens: 200, temperature: 0.3 });
    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch {
      // JSON parse failure → fall back to default score
    }
    return { score: 7 };
  },

  _mockResponse(prompt: string): string {
    if (prompt.includes('破冰开场白')) {
      return '你好呀，你的头像好好看！\n看到你也喜欢旅行，最近有什么有趣的经历吗？\n嗨，我也是刚匹配成功，紧张又期待~';
    }
    if (prompt.includes('评估')) {
      return '{"score": 7, "suggestion": "可以加入一个具体的例子让回答更生动"}';
    }
    return '很高兴认识你！';
  },
};
