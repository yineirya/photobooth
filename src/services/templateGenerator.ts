/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoboothTemplate, TemplateType } from '../types';

/**
 * Procedurally generates a warm fall Friendsgiving 1200x1800 PNG template
 * with genuine transparent cutouts (alpha = 0) matching the Friendsgiving aesthetic.
 */
export async function createFriendsgivingTemplate(
  type: TemplateType
): Promise<PhotoboothTemplate> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1800;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not initialize canvas context');

  // 1. Draw warm cream / peach gingham background
  ctx.fillStyle = '#FCE7D8';
  ctx.fillRect(0, 0, 1200, 1800);

  // Gingham grid pattern
  const gridSize = 48;
  ctx.fillStyle = 'rgba(235, 140, 80, 0.22)';
  for (let x = 0; x < 1200; x += gridSize * 2) {
    ctx.fillRect(x, 0, gridSize, 1800);
  }
  for (let y = 0; y < 1800; y += gridSize * 2) {
    ctx.fillRect(0, y, 1200, gridSize);
  }

  // 2. Determine slot dimensions
  let slots = [];
  if (type === 'single') {
    slots = [
      {
        id: 1,
        x: 120,
        y: 110,
        width: 960,
        height: 1300,
      },
    ];
  } else {
    slots = [
      {
        id: 1,
        x: 120,
        y: 100,
        width: 960,
        height: 670,
      },
      {
        id: 2,
        x: 120,
        y: 820,
        width: 960,
        height: 670,
      },
    ];
  }

  // 3. Clear transparent holes for photo windows
  slots.forEach((slot) => {
    // Clear transparent rectangle
    ctx.clearRect(slot.x, slot.y, slot.width, slot.height);

    // Draw rich burnt orange & gold borders around the cutout
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#D95D24';
    ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#F4A261';
    ctx.strokeRect(slot.x - 7, slot.y - 7, slot.width + 14, slot.height + 14);
  });

  // 4. Draw Fall Decorative Accents (Pumpkins and Leaves)
  drawFallAccents(ctx, type);

  // 5. Draw Script Calligraphy
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (type === 'single') {
    // Elegant Script at bottom
    ctx.font = 'normal 92px "Satisfy", "Playfair Display", cursive';
    ctx.fillStyle = '#4A2010';
    ctx.fillText('Happy', 600, 1510);
    ctx.font = 'normal 108px "Satisfy", "Playfair Display", cursive';
    ctx.fillText('Friendsgiving', 600, 1630);
  } else {
    // Script banner between slots & bottom
    ctx.font = 'normal 86px "Satisfy", "Playfair Display", cursive';
    ctx.fillStyle = '#4A2010';
    ctx.fillText('Happy Friendsgiving', 600, 1580);
    ctx.font = '600 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#8E2A18';
    ctx.fillText('GATHER & CELEBRATE', 600, 1680);
  }
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/png');

  return {
    id: type === '2pose' ? 'templateA' : 'templateB',
    name: type === '2pose' ? '2 Pose Friendsgiving' : 'Single Pose Friendsgiving',
    type,
    dataUrl,
    width: 1200,
    height: 1800,
    slots,
    updatedAt: Date.now(),
  };
}

/**
 * Draws watercolor-style pumpkins and autumn oak leaves on the frame
 */
function drawFallAccents(ctx: CanvasRenderingContext2D, type: TemplateType) {
  // Pumpkin helper
  const drawPumpkin = (cx: number, cy: number, scale: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Stem
    ctx.beginPath();
    ctx.moveTo(-6, -35);
    ctx.bezierCurveTo(-4, -55, 12, -65, 24, -58);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2F6A30';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Ribs
    const ribs = [
      { rx: 56, ry: 46, ox: 0, color: '#E86328' },
      { rx: 42, ry: 44, ox: -24, color: '#F27F2E' },
      { rx: 42, ry: 44, ox: 24, color: '#F27F2E' },
      { rx: 26, ry: 42, ox: -40, color: '#F49D37' },
      { rx: 26, ry: 42, ox: 40, color: '#F49D37' },
    ];

    ribs.forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(r.ox, 0, r.rx, r.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = r.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#C24E1A';
      ctx.stroke();
    });

    ctx.restore();
  };

  // Leaf helper
  const drawLeaf = (cx: number, cy: number, angle: number, scale: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.bezierCurveTo(35, -20, 30, 20, 0, 40);
    ctx.bezierCurveTo(-30, 20, -35, -20, 0, -40);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(142, 42, 24, 0.4)';
    ctx.stroke();

    // Stem & Veins
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 48);
    ctx.stroke();

    ctx.restore();
  };

  // Top left pumpkin
  drawPumpkin(95, 85, 0.95);
  drawLeaf(50, 220, 25, 1.1, '#D95D24');
  drawLeaf(60, 340, -15, 1.0, '#E88B2A');

  // Top right foliage
  drawLeaf(1135, 90, 45, 1.2, '#D97706');
  drawLeaf(1145, 230, -35, 1.0, '#8E2A18');

  // Bottom accents
  if (type === 'single') {
    drawPumpkin(1085, 330, 1.15);
    drawPumpkin(55, 545, 0.9);
    drawLeaf(1145, 600, -20, 1.1, '#D95D24');

    drawLeaf(65, 830, 35, 1.15, '#E88B2A');
    drawPumpkin(950, 1560, 1.05);
    drawLeaf(1125, 1690, -45, 1.2, '#8E2A18');
    drawLeaf(100, 1540, 20, 1.0, '#D95D24');
    drawLeaf(80, 1670, -30, 1.1, '#E88B2A');
  } else {
    // 2-pose accents
    drawPumpkin(1110, 450, 1.1);
    drawPumpkin(60, 770, 0.9);
    drawPumpkin(1010, 1580, 1.1);
    drawLeaf(1130, 1150, 30, 1.1, '#D95D24');
    drawLeaf(70, 1420, -25, 1.2, '#E88B2A');
    drawLeaf(120, 1680, 15, 1.0, '#8E2A18');
  }
}
