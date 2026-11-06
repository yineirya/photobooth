/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Slot, TemplateType } from '../types';

export interface DetectionResult {
  slots: Slot[];
  detectedCount: number;
  message: string;
}

/**
 * Scans alpha channel of a 1200x1800 template image and locates
 * large fully transparent rectangles (minimum 10% of template area = 216,000 px).
 */
export async function detectSlotsFromImage(
  imageSource: string | HTMLImageElement,
  templateType: TemplateType
): Promise<DetectionResult> {
  const img = await loadImage(imageSource);

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
      slots: getDefaultSlots(templateType),
      detectedCount: 0,
      message: 'Canvas context not available, using default slots.',
    };
  }

  // Draw template onto 1200x1800 canvas
  ctx.clearRect(0, 0, 1200, 1800);
  ctx.drawImage(img, 0, 0, 1200, 1800);

  const imageData = ctx.getImageData(0, 0, 1200, 1800);
  const data = imageData.data;

  const totalArea = 1200 * 1800;
  const minRequiredArea = totalArea * 0.1; // 216,000 pixels (10%)

  // Downsample grid by factor of 4 for fast connected-component analysis (300 x 450)
  const scale = 4;
  const gridW = Math.floor(1200 / scale); // 300
  const gridH = Math.floor(1800 / scale); // 450
  const isTransparentGrid = new Uint8Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const origX = gx * scale + 2;
      const origY = gy * scale + 2;
      const pixelIdx = (origY * 1200 + origX) * 4;
      const alpha = data[pixelIdx + 3];

      // Alpha < 30 counts as transparent
      if (alpha < 30) {
        isTransparentGrid[gy * gridW + gx] = 1;
      }
    }
  }

  // Find connected components using Breadth-First Search
  const visited = new Uint8Array(gridW * gridH);
  interface Component {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    count: number;
  }
  const components: Component[] = [];

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gy * gridW + gx;
      if (isTransparentGrid[idx] === 1 && visited[idx] === 0) {
        // Start BFS
        let minX = gx;
        let maxX = gx;
        let minY = gy;
        let maxY = gy;
        let count = 0;

        const queue: number[] = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          count++;
          const cx = curr % gridW;
          const cy = Math.floor(curr / gridW);

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4-way neighbors
          const neighbors = [
            cy > 0 ? curr - gridW : -1,
            cy < gridH - 1 ? curr + gridW : -1,
            cx > 0 ? curr - 1 : -1,
            cx < gridW - 1 ? curr + 1 : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && isTransparentGrid[n] === 1 && visited[n] === 0) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        // Check if area roughly qualifies
        const approxPixelArea = count * scale * scale;
        const boxPixelArea = (maxX - minX + 1) * scale * (maxY - minY + 1) * scale;

        if (approxPixelArea >= minRequiredArea * 0.7 || boxPixelArea >= minRequiredArea) {
          components.push({ minX, maxX, minY, maxY, count });
        }
      }
    }
  }

  // Refine full-resolution rectangles for each detected component
  const detectedSlots: Slot[] = [];

  for (const comp of components) {
    let startX = Math.max(0, comp.minX * scale);
    let endX = Math.min(1200, (comp.maxX + 1) * scale);
    let startY = Math.max(0, comp.minY * scale);
    let endY = Math.min(1800, (comp.maxY + 1) * scale);

    // Refine boundaries to exact transparent edges
    // Check horizontal center slice to find exact left & right edges
    const midY = Math.floor((startY + endY) / 2);
    while (startX < endX && data[(midY * 1200 + startX) * 4 + 3] > 30) {
      startX++;
    }
    while (endX > startX && data[(midY * 1200 + (endX - 1)) * 4 + 3] > 30) {
      endX--;
    }

    // Check vertical center slice to find exact top & bottom edges
    const midX = Math.floor((startX + endX) / 2);
    while (startY < endY && data[(startY * 1200 + midX) * 4 + 3] > 30) {
      startY++;
    }
    while (endY > startY && data[((endY - 1) * 1200 + midX) * 4 + 3] > 30) {
      endY--;
    }

    const w = endX - startX;
    const h = endY - startY;
    const area = w * h;

    if (area >= minRequiredArea) {
      detectedSlots.push({
        id: 0,
        x: Math.round(startX),
        y: Math.round(startY),
        width: Math.round(w),
        height: Math.round(h),
      });
    }
  }

  // Sort slots vertically from top to bottom
  detectedSlots.sort((a, b) => a.y - b.y);

  // If template is 'single' and we detected slots, pick the largest or top one
  if (templateType === 'single') {
    if (detectedSlots.length > 0) {
      const best = detectedSlots.reduce((prev, curr) =>
        curr.width * curr.height > prev.width * prev.height ? curr : prev
      );
      return {
        slots: [{ ...best, id: 1 }],
        detectedCount: 1,
        message: 'Successfully detected 1 single photo window from alpha channel.',
      };
    }
  } else if (templateType === '2pose') {
    if (detectedSlots.length >= 2) {
      // Pick top 2 slots
      return {
        slots: [
          { ...detectedSlots[0], id: 1 },
          { ...detectedSlots[1], id: 2 },
        ],
        detectedCount: 2,
        message: 'Successfully detected 2 photo windows from alpha channel.',
      };
    } else if (detectedSlots.length === 1) {
      // Detected 1 slot, generate a second paired slot below or split
      const s1 = detectedSlots[0];
      const slotHeight = Math.round(s1.height / 2 - 20);
      return {
        slots: [
          { ...s1, id: 1, height: slotHeight },
          { ...s1, id: 2, y: s1.y + slotHeight + 40, height: slotHeight },
        ],
        detectedCount: 1,
        message: 'Detected 1 large window, split into 2 slots for 2-Pose.',
      };
    }
  }

  // Fallback to default slots if no valid transparent regions detected
  return {
    slots: getDefaultSlots(templateType),
    detectedCount: 0,
    message: 'No transparent slots found in template. Please draw slots manually in the Slot Editor.',
  };
}

export function getDefaultSlots(templateType: TemplateType): Slot[] {
  if (templateType === 'single') {
    return [
      {
        id: 1,
        x: 120,
        y: 120,
        width: 960,
        height: 1280,
      },
    ];
  } else {
    // 2-pose default slots
    return [
      {
        id: 1,
        x: 120,
        y: 120,
        width: 960,
        height: 720,
      },
      {
        id: 2,
        x: 120,
        y: 920,
        width: 960,
        height: 720,
      },
    ];
  }
}

function loadImage(src: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (typeof src !== 'string') {
    return Promise.resolve(src);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
