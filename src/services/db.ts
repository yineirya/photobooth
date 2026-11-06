/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoboothTemplate, PhotoRecord, AppSettings } from '../types';

const DB_NAME = 'friendsgiving_photobooth_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// ----------------- Templates -----------------

export async function getTemplate(id: 'templateA' | 'templateB'): Promise<PhotoboothTemplate | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTemplates(): Promise<{ templateA: PhotoboothTemplate | null; templateB: PhotoboothTemplate | null }> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const request = store.getAll();

    request.onsuccess = () => {
      const results: PhotoboothTemplate[] = request.result || [];
      const templateA = results.find((t) => t.id === 'templateA') || null;
      const templateB = results.find((t) => t.id === 'templateB') || null;
      resolve({ templateA, templateB });
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplate(template: PhotoboothTemplate): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const request = store.put(template);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTemplate(id: 'templateA' | 'templateB'): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Captured Photos -----------------

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.put(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    const index = store.index('timestamp');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const items: PhotoRecord[] = request.result || [];
      items.sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllPhotos(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- App Settings -----------------

const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  autoResetSeconds: 60,
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('app_settings');

    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'app_settings', value: settings });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
