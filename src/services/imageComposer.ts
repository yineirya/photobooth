/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoboothTemplate } from '../types';

/**
 * Loads an image from a data URL or image source.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Composes photos into the 1200 x 1800 template:
 * - Each photo is drawn into its designated slot using cover-fit (fill slot, center crop, no stretching)
 * - The template PNG is drawn directly on top
 * - High-quality image smoothing enabled
 */
export async function composeFinalImage(
  template: PhotoboothTemplate,
  capturedPhotoDataUrls: string[]
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas 2D rendering context.');
  }

  // High quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clean background
  ctx.clearRect(0, 0, 1200, 1800);

  // 1. Draw the template PNG FIRST as the background
  const templateImg = await loadImage(template.dataUrl);
  ctx.drawImage(templateImg, 0, 0, 1200, 1800);

  // 2. Load all captured photos
  const photoImages = await Promise.all(
    capturedPhotoDataUrls.map((url) => loadImage(url))
  );

  // 3. Draw each photo ON TOP inside its slot rectangle using cover-fit cropping
  template.slots.forEach((slot, index) => {
    const photoImg = photoImages[index];
    if (!photoImg) return;

    ctx.save();
    // Clip strictly to the slot rectangle (from auto-detect or manual editor)
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, slot.width, slot.height);
    ctx.clip();

    // Cover-fit calculation: fill slot completely, center crop, no stretch
    const scale = Math.max(
      slot.width / photoImg.width,
      slot.height / photoImg.height
    );
    const drawWidth = photoImg.width * scale;
    const drawHeight = photoImg.height * scale;
    const drawX = slot.x + (slot.width - drawWidth) / 2;
    const drawY = slot.y + (slot.height - drawHeight) / 2;

    ctx.drawImage(photoImg, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  });

  // Output as high-resolution PNG data URL
  return canvas.toDataURL('image/png', 0.98);
}

/**
 * Crops a full video frame according to normalized guide coordinates:
 * Normalized coordinates are fractions of the video element [0..1]
 */
export function cropVideoFrameToGuide(
  sourceCanvas: HTMLCanvasElement,
  normCrop: { x: number; y: number; width: number; height: number }
): string {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Pixel coordinates in source frame
  const cropX = Math.max(0, Math.round(normCrop.x * srcW));
  const cropY = Math.max(0, Math.round(normCrop.y * srcH));
  const cropW = Math.min(srcW - cropX, Math.round(normCrop.width * srcW));
  const cropH = Math.min(srcH - cropY, Math.round(normCrop.height * srcH));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW;
  outCanvas.height = cropH;
  const outCtx = outCanvas.getContext('2d');

  if (!outCtx) return sourceCanvas.toDataURL('image/jpeg', 0.95);

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  outCtx.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  return outCanvas.toDataURL('image/png', 0.98);
}
