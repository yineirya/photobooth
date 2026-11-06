/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { PhotoboothTemplate, AppScreen, AppSettings, PhotoRecord } from './types';
import { getAllTemplates, getSettings, savePhoto } from './services/db';
import { composeFinalImage } from './services/imageComposer';
import { StartScreen } from './components/StartScreen';
import { CameraScreen } from './components/CameraScreen';
import { ResultScreen } from './components/ResultScreen';
import { HostSetup } from './components/HostSetup';
import { GalleryScreen } from './components/GalleryScreen';
import { PinModal } from './components/PinModal';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('start');
  const [templateA, setTemplateA] = useState<PhotoboothTemplate | null>(null);
  const [templateB, setTemplateB] = useState<PhotoboothTemplate | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<PhotoboothTemplate | null>(null);
  const [composedPhotoUrl, setComposedPhotoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ pin: '1234', autoResetSeconds: 60 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Host PIN authorization modal state
  const [pinTarget, setPinTarget] = useState<'setup' | 'gallery' | null>(null);

  // Load templates & settings from IndexedDB
  const refreshAppData = useCallback(async () => {
    try {
      const [{ templateA: tA, templateB: tB }, appSettings] = await Promise.all([
        getAllTemplates(),
        getSettings(),
      ]);
      setTemplateA(tA);
      setTemplateB(tB);
      if (appSettings) setSettings(appSettings);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAppData();
  }, [refreshAppData]);

  // Handle template selection from Start Screen
  const handleSelectTemplate = (template: PhotoboothTemplate) => {
    setActiveTemplate(template);
    setScreen('camera');
  };

  // Handle all photos captured from Camera Screen
  const handlePhotosCaptured = async (photoDataUrls: string[]) => {
    if (!activeTemplate) return;

    setIsComposing(true);
    try {
      const finalImage = await composeFinalImage(activeTemplate, photoDataUrls);

      // Save to IndexedDB Gallery
      const record: PhotoRecord = {
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        dataUrl: finalImage,
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
      };
      await savePhoto(record);

      setComposedPhotoUrl(finalImage);
      setScreen('result');
    } catch {
      alert('An error occurred while compiling your photobooth strip. Please try again.');
      setScreen('start');
    } finally {
      setIsComposing(false);
    }
  };

  // Prompt for PIN before accessing Host Setup
  const handleOpenHostSetup = () => {
    setPinTarget('setup');
  };

  // On PIN success
  const handlePinSuccess = () => {
    const target = pinTarget;
    setPinTarget(null);
    if (target === 'setup') {
      setScreen('setup');
    } else if (target === 'gallery') {
      setScreen('gallery');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#FAF3EC] text-[#3D2314]">
        <div className="w-12 h-12 border-4 border-[#D95D24] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-script text-3xl text-[#4A2010]">Friendsgiving Photobooth</p>
        <p className="text-sm text-[#7E6351] mt-1">Starting up...</p>
      </div>
    );
  }

  return (
    <main className="h-full w-full relative overflow-hidden bg-[#FAF3EC] font-sans">
      {/* Composing Loading Overlay */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white p-6">
          <div className="w-16 h-16 border-4 border-[#D95D24] border-t-white rounded-full animate-spin mb-6" />
          <h2 className="text-3xl font-extrabold mb-2">Composing Your Photobooth Frame...</h2>
          <p className="text-base text-neutral-300">
            Fitting photos and applying high-resolution template.
          </p>
        </div>
      )}

      {/* Screen Router */}
      {screen === 'start' && (
        <StartScreen
          templateA={templateA}
          templateB={templateB}
          onSelectTemplate={handleSelectTemplate}
          onOpenHostSetup={handleOpenHostSetup}
        />
      )}

      {screen === 'camera' && activeTemplate && (
        <CameraScreen
          template={activeTemplate}
          onPhotosCaptured={handlePhotosCaptured}
          onCancel={() => setScreen('start')}
        />
      )}

      {screen === 'result' && composedPhotoUrl && (
        <ResultScreen
          photoDataUrl={composedPhotoUrl}
          autoResetSeconds={settings.autoResetSeconds}
          onTakeAnother={() => {
            setComposedPhotoUrl(null);
            setActiveTemplate(null);
            setScreen('start');
          }}
        />
      )}

      {screen === 'setup' && (
        <HostSetup
          templateA={templateA}
          templateB={templateB}
          settings={settings}
          onRefreshTemplates={refreshAppData}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onExit={() => setScreen('start')}
          onOpenGallery={() => setScreen('gallery')}
        />
      )}

      {screen === 'gallery' && (
        <GalleryScreen onBack={() => setScreen('start')} />
      )}

      {/* Host Authorization PIN Modal */}
      {pinTarget !== null && (
        <PinModal
          expectedPin={settings.pin}
          title={pinTarget === 'setup' ? 'Host Administration' : 'Host Gallery'}
          subtitle={`Enter 4-digit PIN to access host controls (Default: ${settings.pin})`}
          onSuccess={handlePinSuccess}
          onCancel={() => setPinTarget(null)}
        />
      )}
    </main>
  );
}
