/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoboothTemplate } from '../types';
import { playCountdownBeep, playShutterSound } from '../services/audio';
import { Camera, RefreshCw, Check, ArrowLeft, AlertCircle } from 'lucide-react';

interface CameraScreenProps {
  template: PhotoboothTemplate;
  onPhotosCaptured: (photoDataUrls: string[]) => void;
  onCancel: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  template,
  onPhotosCaptured,
  onCancel,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flow State
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [tempCapturedPhoto, setTempCapturedPhoto] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [guideReadyMessage, setGuideReadyMessage] = useState<string | null>(null);

  // Measure container dimensions for framing guide
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  const totalSlots = template.slots.length;
  const currentSlot = template.slots[currentSlotIndex] || template.slots[0];

  // Initialize Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser.');
      }

      // Request ideal 1920x1080 or higher with front camera
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Camera permission denied or camera not found.';
      setCameraError(
        `${errorMsg} Please enable Camera access in iPad Safari Settings (Settings > Safari > Camera: Allow).`
      );
    }
  }, []);

  useEffect(() => {
    startCamera();

    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);

    return () => {
      window.removeEventListener('resize', updateContainerSize);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Clean stream when unmounting
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Calculate guide box dimensions matching slot aspect ratio
  const slotAspect = currentSlot ? currentSlot.width / currentSlot.height : 2 / 3;
  const maxW = containerSize.width * 0.85;
  const maxH = containerSize.height * 0.76;

  let guideW = maxW;
  let guideH = guideW / slotAspect;

  if (guideH > maxH) {
    guideH = maxH;
    guideW = guideH * slotAspect;
  }

  guideW = Math.round(guideW);
  guideH = Math.round(guideH);

  const guideLeft = Math.round((containerSize.width - guideW) / 2);
  const guideTop = Math.round((containerSize.height - guideH) / 2);

  // Capture frame at full native sensor resolution & crop to guide box
  const captureRawFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    // Full resolution canvas
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = video.videoWidth;
    rawCanvas.height = video.videoHeight;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) return;

    rawCtx.imageSmoothingEnabled = true;
    rawCtx.imageSmoothingQuality = 'high';

    // Note: preview is mirrored on screen (scaleX(-1)), but raw video capture is un-mirrored
    rawCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Calculate crop rectangle on the raw frame:
    // Container display is object-cover.
    const contW = containerSize.width;
    const contH = containerSize.height;
    const vidW = video.videoWidth;
    const vidH = video.videoHeight;

    const contAspect = contW / contH;
    const vidAspect = vidW / vidH;

    let displayScale = 1;
    if (contAspect > vidAspect) {
      displayScale = contW / vidW;
    } else {
      displayScale = contH / vidH;
    }

    // Guide width and height on full resolution frame
    const cropW = Math.min(vidW, Math.round(guideW / displayScale));
    const cropH = Math.min(vidH, Math.round(guideH / displayScale));
    const cropX = Math.max(0, Math.round((vidW - cropW) / 2));
    const cropY = Math.max(0, Math.round((vidH - cropH) / 2));

    // Cropped photo canvas
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    cropCtx.drawImage(rawCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const dataUrl = cropCanvas.toDataURL('image/png', 0.98);
    setTempCapturedPhoto(dataUrl);
  };

  // Run Countdown 3, 2, 1
  const startCountdown = () => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    setGuideReadyMessage(null);

    let count = 3;
    setCountdownNumber(count);
    playCountdownBeep(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNumber(count);
        playCountdownBeep(count);
      } else {
        clearInterval(timer);
        setCountdownNumber(null);
        setIsCountingDown(false);

        // Flash and shutter sound
        setIsFlashing(true);
        playShutterSound();
        setTimeout(() => setIsFlashing(false), 500);

        // Capture frame
        captureRawFrame();
      }
    }, 1000);
  };

  // Retake photo
  const handleRetake = () => {
    setTempCapturedPhoto(null);
  };

  // Keep photo
  const handleKeep = () => {
    if (!tempCapturedPhoto) return;

    const nextPhotos = [...capturedPhotos, tempCapturedPhoto];
    setCapturedPhotos(nextPhotos);
    setTempCapturedPhoto(null);

    // If more slots remain
    if (currentSlotIndex + 1 < totalSlots) {
      setCurrentSlotIndex(currentSlotIndex + 1);
      setGuideReadyMessage('Get ready for photo 2!');
      setTimeout(() => setGuideReadyMessage(null), 3000);
    } else {
      // All captured! Proceed to composition
      onPhotosCaptured(nextPhotos);
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-black select-none overflow-hidden fixed inset-0">
      {/* Camera Viewport Container */}
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden">
        {/* Mirrored live video stream */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        />

        {/* Framing Guide Overlay: Dims everything outside the box */}
        {!tempCapturedPhoto && (
          <div
            className="absolute pointer-events-none transition-all duration-300"
            style={{
              left: `${guideLeft}px`,
              top: `${guideTop}px`,
              width: `${guideW}px`,
              height: `${guideH}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              borderRadius: '28px',
              border: '4px solid #E68A28',
            }}
          >
            {/* Guide Corner Accents */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl opacity-90" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl opacity-90" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl opacity-90" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl opacity-90" />

            {/* Pose Indicator Badge */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#D95D24] text-white px-5 py-1.5 rounded-full text-base font-extrabold shadow-lg tracking-wide uppercase">
              {totalSlots > 1
                ? `Photo ${currentSlotIndex + 1} of ${totalSlots}`
                : 'Center Inside Guide'}
            </div>
          </div>
        )}

        {/* Camera Flash Overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none" />
        )}

        {/* Countdown Overlay */}
        {countdownNumber !== null && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div
              key={countdownNumber}
              className="w-48 h-48 rounded-full bg-[#D95D24]/90 text-white font-black text-9xl flex items-center justify-center shadow-2xl animate-countdown border-6 border-white"
            >
              {countdownNumber}
            </div>
          </div>
        )}

        {/* Interstitial Message (e.g. "Get ready for photo 2!") */}
        {guideReadyMessage && (
          <div className="absolute top-1/3 inset-x-0 z-30 flex justify-center pointer-events-none animate-bounce">
            <div className="bg-[#FAF3EC] text-[#3D2314] px-8 py-4 rounded-3xl shadow-2xl border-4 border-[#D95D24] text-2xl font-black">
              {guideReadyMessage}
            </div>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90">
            <div className="max-w-md w-full bg-[#FAF3EC] rounded-3xl p-8 border-2 border-red-300 text-center shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#3D2314] mb-2">Camera Access Required</h3>
              <p className="text-base text-[#7E6351] mb-6">{cameraError}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-4 rounded-2xl border border-[#D5C2B4] font-bold text-base text-[#7E6351]"
                >
                  Cancel
                </button>
                <button
                  onClick={startCamera}
                  className="flex-1 py-4 rounded-2xl bg-[#D95D24] text-white font-bold text-base shadow"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Floating Cancel/Back Button */}
      {!tempCapturedPhoto && !isCountingDown && (
        <div className="absolute top-6 left-6 z-30">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/60 hover:bg-black/80 text-white text-base font-bold backdrop-blur-md border border-white/20 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Cancel
          </button>
        </div>
      )}

      {/* Bottom Shutter Controls Bar */}
      {!tempCapturedPhoto && !cameraError && (
        <div className="absolute bottom-6 inset-x-0 z-30 flex items-center justify-center px-6">
          <div className="flex items-center gap-6 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/20">
            {/* Shutter Button - minimum 80px */}
            <button
              onClick={startCountdown}
              disabled={isCountingDown}
              className={`h-24 px-10 rounded-full font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-all duration-200 active:scale-95 ${
                isCountingDown
                  ? 'bg-neutral-600 text-white/50 cursor-not-allowed'
                  : 'bg-[#D95D24] hover:bg-[#C24E1A] text-white'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span>{isCountingDown ? 'Get Ready...' : 'Take Photo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Capture Review Modal ("Show each capture briefly with Retake and Keep options") */}
      {tempCapturedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="relative max-w-xl w-full flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-white mb-2 text-center">
              Looking Great!
            </h2>
            <p className="text-base text-neutral-300 mb-6 text-center">
              Photo {currentSlotIndex + 1} of {totalSlots}
            </p>

            {/* Preview of cropped photo */}
            <div className="relative max-h-[55vh] rounded-3xl overflow-hidden border-4 border-[#E68A28] shadow-2xl bg-neutral-800 flex items-center justify-center">
              <img
                src={tempCapturedPhoto}
                alt="Captured pose preview"
                className="max-h-[55vh] w-auto object-contain"
              />
            </div>

            {/* Retake and Keep Buttons (Minimum button height 80px!) */}
            <div className="grid grid-cols-2 gap-4 w-full mt-8">
              <button
                onClick={handleRetake}
                className="touch-btn rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xl border-2 border-white/30 flex items-center justify-center gap-3 transition active:scale-95"
              >
                <RefreshCw className="w-6 h-6" />
                Retake
              </button>

              <button
                onClick={handleKeep}
                className="touch-btn rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-extrabold text-2xl shadow-xl flex items-center justify-center gap-3 transition active:scale-95"
              >
                <Check className="w-7 h-7" />
                Keep Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
