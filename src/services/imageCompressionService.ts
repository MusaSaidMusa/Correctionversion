/**
 * ExamGuard Pro - Image Compression and Normalization Service
 * Ensures all image uploads (PNG, JPG, WebP, SVG, camera snapshots)
 * are cleanly compressed and resized before serialization to JSON / localStorage / backend.
 * Eliminates quota crashes, prevents "unexpected end of JSON input" errors,
 * and strips out raw Base64/encryption strings from the user interface.
 */

export interface ProcessedImageResult {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isImage: boolean;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Checks if a string is a raw data URL or base64 encoded payload
 */
export function isDataUrl(str?: string | null): boolean {
  if (!str) return false;
  return str.startsWith('data:') || str.startsWith('blob:') || /^[A-Za-z0-9+/=]{100,}$/.test(str);
}

/**
 * Returns a human-friendly display label instead of raw base64 data URL
 * If caption is missing, raw data URL, or encryption string, returns an empty string.
 */
export function cleanDisplayCaption(caption?: string | null, url?: string | null): string {
  if (!caption) return '';
  const trimmed = caption.trim();
  if (isDataUrl(trimmed)) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/uploads/')) return '';
  // Check for long base64 or encryption strings
  if (trimmed.length > 50 && /^[A-Za-z0-9+/=_-]+$/.test(trimmed)) return '';
  if (url && trimmed === url.trim()) return '';
  return trimmed;
}

/**
 * Compresses an image file client-side using an HTML5 Offscreen Canvas
 * Downscales images larger than maxWidth/maxHeight and outputs high-quality compressed JPEG/WebP.
 * Preserves PDFs and non-image documents without modification.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<ProcessedImageResult> {
  const originalSize = file.size;
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic|heif)$/i.test(file.name);

  // If it's a PDF or non-image document, read as Data URL safely without canvas manipulation
  if (!isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({
            dataUrl: reader.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/pdf',
            isImage: false,
            originalSize,
            compressionRatio: 1,
          });
        } else {
          reject(new Error('Failed to read document file.'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader error.'));
      reader.readAsDataURL(file);
    });
  }

  // Handle images via Image loading & Canvas resize
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read image data.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute aspect ratio scaling
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original reader result if canvas 2D is unavailable
            resolve({
              dataUrl: reader.result as string,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type || 'image/jpeg',
              isImage: true,
              originalSize,
              compressionRatio: 1,
            });
            return;
          }

          // Use high quality interpolation
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for transparent PNGs converted to JPEG
          if (file.type === 'image/jpeg' || file.name.match(/\.(jpg|jpeg)$/i)) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Output format: prefer WebP if supported or JPEG with specified quality
          const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputMime, quality);

          // Approximate size from data URL length
          const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

          resolve({
            dataUrl: compressedDataUrl,
            fileName: file.name,
            fileSize: approxBytes,
            fileType: outputMime,
            isImage: true,
            originalSize,
            compressionRatio: originalSize > 0 ? approxBytes / originalSize : 1,
          });
        } catch (err) {
          // If canvas throws (e.g. tainted or memory), fallback to direct reader result
          resolve({
            dataUrl: reader.result as string,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'image/jpeg',
            isImage: true,
            originalSize,
            compressionRatio: 1,
          });
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization. Please check file format.'));
      };

      img.src = reader.result;
    };

    reader.onerror = () => reject(reader.error || new Error('FileReader error.'));
    reader.readAsDataURL(file);
  });
}
