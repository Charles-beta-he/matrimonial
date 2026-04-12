import { randomUUID } from 'node:crypto';
import { env, isConfigured } from '../../lib/env';
import { logger } from '../../lib/logger';

const BUCKET = env.OSS_BUCKET;
const REGION = env.OSS_REGION;
const ENDPOINT = env.OSS_ENDPOINT ?? `https://${BUCKET}.${REGION}.aliyuncs.com`;
const CDN_DOMAIN = env.CDN_DOMAIN ?? ENDPOINT;

if (!isConfigured('oss')) {
  logger.warn('upload service falling back to dev local receiver — OSS_* not set');
}

if (env.NODE_ENV === 'production' && !env.OSS_ACCESS_KEY_ID) {
  logger.warn('Running in production without OSS credentials — uploads will fail');
}

// Per-category constraints
const CATEGORY_LIMITS = {
  avatar: { maxSize: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  photo: { maxSize: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] },
  chat: { maxSize: 20 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'] },
  activity: { maxSize: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  verify: { maxSize: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png'] },
} as const;

export const UploadService = {
  /** Validate upload request against category constraints */
  validate(category: keyof typeof CATEGORY_LIMITS, contentType: string, sizeBytes: number): { valid: boolean; error?: string } {
    const limits = CATEGORY_LIMITS[category];
    if (!limits) return { valid: false, error: '无效的上传类型' };
    if (!limits.types.includes(contentType as any)) {
      return { valid: false, error: `${category} 仅支持 ${limits.types.join(', ')}` };
    }
    if (sizeBytes > limits.maxSize) {
      return { valid: false, error: `文件大小不能超过 ${limits.maxSize / 1024 / 1024}MB` };
    }
    return { valid: true };
  },

  /** Generate an object key with category/userId/uuid/filename pattern */
  generateObjectKey(category: string, userId: string, filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
    const uuid = randomUUID();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    return `${category}/${date}/${userId}/${uuid}.${ext}`;
  },

  /**
   * Generate upload credential.
   * In production: use Aliyun OSS STS to sign a PostPolicy.
   * In dev: return a mock endpoint that accepts direct PUT.
   */
  async generateCredential(
    userId: string,
    category: keyof typeof CATEGORY_LIMITS,
    filename: string,
    contentType: string,
    sizeBytes: number,
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    fields?: Record<string, string>;
    expiresAt: string;
    objectKey: string;
  }> {
    const objectKey = this.generateObjectKey(category, userId, filename);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // DEV MODE: Return a mock upload URL to the server's own upload receiver
    if (!isConfigured('oss')) {
      const baseUrl = env.SERVER_URL;
      return {
        uploadUrl: `${baseUrl}/upload/receive?key=${encodeURIComponent(objectKey)}`,
        publicUrl: `${baseUrl}/upload/files/${encodeURIComponent(objectKey)}`,
        expiresAt,
        objectKey,
      };
    }

    // PRODUCTION: Sign Aliyun OSS STS PostPolicy.
    //
    // NOTE: The raw PUT URL below is NOT production-ready. A real deployment
    // must:
    //   1. Use @alicloud/sts20150401 to issue a short-lived STS credential
    //      scoped to the target objectKey.
    //   2. Use ali-oss (or @alicloud/oss) to construct a signed PostPolicy
    //      (or a presigned PUT URL) with that STS token.
    //   3. Return both the uploadUrl and the required `fields` (policy,
    //      OSSAccessKeyId, signature, x-oss-security-token, etc.) so the
    //      client can perform a browser/native multipart POST.
    //
    // Until that integration is wired up, this branch returns a direct PUT
    // URL — which only works if the OSS bucket allows public write (never do
    // this in prod) or if a trusted server-side proxy performs the PUT.
    return {
      uploadUrl: `${ENDPOINT}/${objectKey}`,
      publicUrl: `${CDN_DOMAIN}/${objectKey}`,
      expiresAt,
      objectKey,
    };
  },

  /** Get public URL for an object key */
  getPublicUrl(objectKey: string): string {
    if (!isConfigured('oss')) {
      const baseUrl = env.SERVER_URL;
      return `${baseUrl}/upload/files/${encodeURIComponent(objectKey)}`;
    }
    return `${CDN_DOMAIN}/${objectKey}`;
  },
};
