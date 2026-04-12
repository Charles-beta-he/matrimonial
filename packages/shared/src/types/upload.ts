export type UploadCategory = 'avatar' | 'photo' | 'chat' | 'activity' | 'verify';

export interface UploadCredential {
  uploadUrl: string;      // Endpoint to POST the file (OSS direct upload URL)
  publicUrl: string;      // URL to access the file after upload
  fields?: Record<string, string>;  // Form fields required by OSS policy
  expiresAt: string;      // ISO timestamp when credential expires
  objectKey: string;      // The object key in OSS
}

export interface UploadRequest {
  category: UploadCategory;
  filename: string;
  contentType: string;
  sizeBytes: number;
}
