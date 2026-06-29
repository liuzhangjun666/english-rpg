const MAX_EDGE = 1024;
const TARGET_BYTES = 1.4 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

/** 上传前压缩头像，避免超过 PHP upload_max_filesize(2M) 导致 422 */
export async function prepareAvatarForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }

  if (file.size <= TARGET_BYTES && /jpe?g|png|webp|gif/i.test(file.type)) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('图片处理失败');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export function extractApiErrorMessage(res: unknown, fallback = '操作失败'): string {
  if (!res || typeof res !== 'object') return fallback;
  const payload = res as Record<string, unknown>;
  const errors = payload.errors;
  if (errors && typeof errors === 'object') {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value) && value[0]) return String(value[0]);
    }
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return fallback;
}
