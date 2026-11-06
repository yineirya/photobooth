/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS / iPadOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 border border-[#D5C2B4] text-[#3D2314] hover:bg-[#F5ECE4] text-xs font-semibold shadow-sm transition"
        title="Install as Fullscreen iPad App"
      >
        <Download className="w-4 h-4 text-[#D95D24]" />
        Install App
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#FBF5EE] p-6 shadow-2xl border-2 border-[#E8D9CD]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#3D2314]">Add to iPad Home Screen</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-[#7E6351] hover:bg-[#EFE6DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm text-[#3D2314]">
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-[#E8D9CD]">
                <div className="p-2 rounded-xl bg-[#FAF3EC] text-[#D95D24]">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Step 1</p>
                  <p className="text-xs text-[#7E6351]">
                    Tap the <strong>Share</strong> icon in Safari toolbar (top right or bottom).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-[#E8D9CD]">
                <div className="p-2 rounded-xl bg-[#FAF3EC] text-[#D95D24]">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Step 2</p>
                  <p className="text-xs text-[#7E6351]">
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full py-3 rounded-2xl bg-[#D95D24] text-white font-bold text-sm shadow hover:bg-[#C24E1A] transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
