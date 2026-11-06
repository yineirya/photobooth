/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, MessageCircle, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';

interface ResultScreenProps {
  photoDataUrl: string;
  autoResetSeconds: number;
  onTakeAnother: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  photoDataUrl,
  autoResetSeconds = 60,
  onTakeAnother,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoResetSeconds);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Convert dataUrl to a real File instance for navigator.share
  const getPhotoFile = useCallback(async (): Promise<File> => {
    const res = await fetch(photoDataUrl);
    const blob = await res.blob();
    return new File([blob], `friendsgiving-photo-${Date.now()}.png`, {
      type: 'image/png',
    });
  }, [photoDataUrl]);

  // Reset inactivity countdown on any user interaction
  const resetTimer = useCallback(() => {
    setSecondsRemaining(autoResetSeconds);
  }, [autoResetSeconds]);

  useEffect(() => {
    const events = ['touchstart', 'pointerdown', 'mousemove', 'click', 'keydown'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onTakeAnother();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [resetTimer, onTakeAnother]);

  // Fallback direct download
  const triggerDownloadFallback = () => {
    const link = document.createElement('a');
    link.href = photoDataUrl;
    link.download = `friendsgiving-photo-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Saved to device Downloads!');
  };

  // 1. "Save to Device": uses navigator.share with file so "Save Image" to Photos appears in iOS Share Sheet
  const handleSaveToDevice = async () => {
    resetTimer();
    try {
      const file = await getPhotoFile();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Friendsgiving Photobooth',
        });
      } else {
        triggerDownloadFallback();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return; // User closed sheet
      triggerDownloadFallback();
    }
  };

  // 2. "Text It To Me": open share sheet for Messages or AirDrop
  const handleTextItToMe = async () => {
    resetTimer();
    try {
      const file = await getPhotoFile();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Friendsgiving Photobooth',
          text: 'Here is our photobooth picture from Friendsgiving!',
        });
      } else {
        triggerDownloadFallback();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      triggerDownloadFallback();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF3EC] bg-gingham text-[#3D2314] select-none overflow-y-auto p-4 sm:p-6 lg:p-8">
      {/* Toast feedback */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#3D2314] text-[#FBF5EE] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-[#E68A28]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Container - Responsive for iPad Landscape & Portrait */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10 max-w-6xl mx-auto w-full my-auto">
        {/* Left: Large Photo Preview (1200x1800 aspect ratio) */}
        <div className="relative flex-1 flex items-center justify-center w-full max-h-[70vh] lg:max-h-[82vh]">
          <div className="relative aspect-[2/3] h-full max-h-[70vh] lg:max-h-[82vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
            <img
              src={photoDataUrl}
              alt="Final Composed Friendsgiving Photobooth"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right: Actions Column with Big Touch Buttons (Min height 80px) */}
        <div className="w-full lg:w-[420px] flex flex-col justify-between gap-5 bg-white/95 rounded-3xl p-6 sm:p-8 border-2 border-[#E8D9CD] shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-[#8E2A18] font-bold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span></span>
            </div>
            <h2 className="font-script text-4xl sm:text-5xl text-[#4A2010] leading-tight mb-2">
              Save Your Picture!
            </h2>
            <p className="text-base text-[#7E6351] font-medium">
              Choose how you want to share your copy:
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {/* Button 1: Save to Device */}
            <button
              onClick={handleSaveToDevice}
              className="touch-btn w-full rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-extrabold text-2xl shadow-lg transition flex items-center justify-center gap-3 active:scale-95"
            >
              <Download className="w-7 h-7" />
              Save to Device
            </button>

            {/* Button 2: Text It To Me */}
            <div className="flex flex-col">
              {/* Short instructions above button per user specification */}
              <button
                onClick={handleTextItToMe}
                className="touch-btn w-full rounded-2xl bg-[#E68A28] hover:bg-[#CF781B] text-white font-extrabold text-2xl shadow-lg transition flex items-center justify-center gap-3 active:scale-95"
              >
                <MessageCircle className="w-7 h-7" />
                Text It To Me
              </button>
            </div>

            {/* Button 3: Take Another */}
            <button
              onClick={onTakeAnother}
              className="touch-btn w-full rounded-2xl bg-[#FAF3EC] hover:bg-[#F3E7DC] text-[#3D2314] font-bold text-xl border-2 border-[#D5C2B4] transition flex items-center justify-center gap-3 active:scale-95 mt-1"
            >
              <RotateCcw className="w-6 h-6 text-[#D95D24]" />
              Take Another
            </button>
          </div>

          {/* Inactivity Auto-Return Countdown */}
          <div className="pt-2 border-t border-[#E8D9CD] flex items-center justify-between text-xs text-[#7E6351]">
            <span>Auto-returning to start:</span>
            <span className="font-mono font-bold text-[#D95D24] px-2 py-0.5 rounded bg-[#FAF3EC]">
              {secondsRemaining}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
