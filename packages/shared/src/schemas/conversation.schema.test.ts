import { describe, it, expect } from 'vitest';
import { sendMessageSchema } from './conversation.schema';

const validText = {
  conversationId: 'conv-1',
  type: 'TEXT' as const,
  content: '你好！',
};

describe('sendMessageSchema', () => {
  it('accepts valid TEXT message', () => {
    expect(sendMessageSchema.safeParse(validText).success).toBe(true);
  });

  it('accepts all valid message types', () => {
    const types = ['TEXT', 'VOICE', 'IMAGE', 'VIDEO', 'EPHEMERAL_IMAGE'] as const;
    for (const type of types) {
      expect(sendMessageSchema.safeParse({ ...validText, type }).success).toBe(true);
    }
  });

  it('rejects invalid message type', () => {
    expect(sendMessageSchema.safeParse({ ...validText, type: 'STICKER' as any }).success).toBe(false);
  });

  it('rejects empty conversationId', () => {
    expect(sendMessageSchema.safeParse({ ...validText, conversationId: '' }).success).toBe(false);
  });

  it('rejects content longer than 2000 chars', () => {
    expect(sendMessageSchema.safeParse({ ...validText, content: 'A'.repeat(2001) }).success).toBe(false);
  });

  it('accepts valid mediaUrl for IMAGE type', () => {
    const res = sendMessageSchema.safeParse({
      ...validText,
      type: 'IMAGE',
      mediaUrl: 'https://cdn.example.com/img.jpg',
    });
    expect(res.success).toBe(true);
  });

  it('rejects invalid mediaUrl', () => {
    expect(sendMessageSchema.safeParse({ ...validText, mediaUrl: 'not-a-url' }).success).toBe(false);
  });

  it('defaults isEphemeral to false when omitted', () => {
    const res = sendMessageSchema.safeParse(validText);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.isEphemeral).toBe(false);
  });

  it('accepts isEphemeral: true for EPHEMERAL_IMAGE', () => {
    const res = sendMessageSchema.safeParse({
      ...validText,
      type: 'EPHEMERAL_IMAGE',
      mediaUrl: 'https://cdn.example.com/img.jpg',
      isEphemeral: true,
    });
    expect(res.success).toBe(true);
  });
});
