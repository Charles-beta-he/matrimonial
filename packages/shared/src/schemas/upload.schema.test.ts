import { describe, it, expect } from 'vitest';
import { uploadRequestSchema, confirmUploadSchema } from './upload.schema';

const valid = {
  category: 'avatar' as const,
  filename: 'a.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 1024,
};

describe('uploadRequestSchema', () => {
  it('accepts valid image upload', () => {
    expect(uploadRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts valid video upload', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, contentType: 'video/mp4' }).success,
    ).toBe(true);
  });

  it('accepts all category enum values', () => {
    for (const category of ['avatar', 'photo', 'chat', 'activity', 'verify'] as const) {
      expect(uploadRequestSchema.safeParse({ ...valid, category }).success).toBe(true);
    }
  });

  it('rejects invalid category', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, category: 'banner' as any }).success,
    ).toBe(false);
  });

  it('rejects non-image/video contentType', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, contentType: 'application/pdf' }).success,
    ).toBe(false);
  });

  it('rejects sizeBytes > 50MB', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, sizeBytes: 50 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
  });

  it('accepts sizeBytes at 50MB boundary', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, sizeBytes: 50 * 1024 * 1024 }).success,
    ).toBe(true);
  });

  it('rejects zero sizeBytes', () => {
    expect(uploadRequestSchema.safeParse({ ...valid, sizeBytes: 0 }).success).toBe(false);
  });

  it('rejects filename too long', () => {
    expect(
      uploadRequestSchema.safeParse({ ...valid, filename: 'a'.repeat(256) }).success,
    ).toBe(false);
  });

  it('rejects empty filename', () => {
    expect(uploadRequestSchema.safeParse({ ...valid, filename: '' }).success).toBe(false);
  });
});

describe('confirmUploadSchema', () => {
  it('accepts valid input', () => {
    expect(
      confirmUploadSchema.safeParse({ objectKey: 'k', category: 'avatar' }).success,
    ).toBe(true);
  });

  it('rejects invalid category', () => {
    expect(
      confirmUploadSchema.safeParse({ objectKey: 'k', category: 'xx' as any }).success,
    ).toBe(false);
  });
});
