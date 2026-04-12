import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '@matrimonial/api-client';
import type { UploadCategory } from '@matrimonial/shared';
import { toast } from '@matrimonial/ui';

interface UploadResult {
  publicUrl: string;
  objectKey: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const requestUpload = api.upload.requestUpload.useMutation();
  const confirmUpload = api.upload.confirmUpload.useMutation();

  const pickAndUpload = async (category: UploadCategory): Promise<UploadResult | null> => {
    try {
      // Request permission
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error('需要相册访问权限');
        return null;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: category === 'avatar',
        aspect: category === 'avatar' ? [1, 1] : undefined,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return null;

      return uploadFile(result.assets[0].uri, category);
    } catch (err: any) {
      toast.error(err?.message ?? '上传失败');
      return null;
    }
  };

  const uploadFile = async (uri: string, category: UploadCategory): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);
    try {
      // Get file info
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error('文件不存在');
      const filename = uri.split('/').pop() ?? `file.jpg`;
      const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

      // Request credential
      const credential = await requestUpload.mutateAsync({
        category,
        filename,
        contentType,
        sizeBytes: (info as any).size ?? 0,
      });

      // Upload file using FileSystem.uploadAsync (supports progress)
      const uploadResult = await FileSystem.uploadAsync(credential.uploadUrl, uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': contentType },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`上传失败 (${uploadResult.status})`);
      }

      // Confirm upload
      await confirmUpload.mutateAsync({
        objectKey: credential.objectKey,
        category,
      });

      setProgress(100);
      toast.success('上传成功');
      return { publicUrl: credential.publicUrl, objectKey: credential.objectKey };
    } catch (err: any) {
      toast.error(err?.message ?? '上传失败');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploadFile, uploading, progress };
}
