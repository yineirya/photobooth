/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Slot {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TemplateType = '2pose' | 'single';

export interface PhotoboothTemplate {
  id: 'templateA' | 'templateB';
  name: string;
  type: TemplateType;
  dataUrl: string; // Base64 data URL of 1200x1800 PNG
  width: number; // 1200
  height: number; // 1800
  slots: Slot[];
  updatedAt: number;
}

export interface PhotoRecord {
  id: string;
  timestamp: number;
  dataUrl: string; // Composed 1200x1800 JPEG/PNG
  templateId: 'templateA' | 'templateB';
  templateName: string;
}

export interface AppSettings {
  pin: string;
  autoResetSeconds: number;
}

export type AppScreen =
  | 'start'
  | 'camera'
  | 'result'
  | 'setup'
  | 'gallery';
