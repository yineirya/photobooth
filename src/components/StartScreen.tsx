/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PhotoboothTemplate } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { Camera, Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface StartScreenProps {
  templateA: PhotoboothTemplate | null;
  templateB: PhotoboothTemplate | null;
  onSelectTemplate: (template: PhotoboothTemplate) => void;
  onOpenHostSetup: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  templateA,
  templateB,
  onSelectTemplate,
  onOpenHostSetup,
}) => {
  const hasAnyTemplate = !!(templateA || templateB);

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF3EC] bg-gingham text-[#3D2314] overflow-y-auto relative p-6 md:p-10 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          {/* Decorative Pumpkin Icon */}
          <div className="w-12 h-12 rounded-2xl bg-[#D95D24]/15 border border-[#D95D24]/30 flex items-center justify-center text-[#D95D24] shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#8E2A18]">
              Friendsgiving 2026
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton />
          <button
            onClick={onOpenHostSetup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 border border-[#D5C2B4] hover:bg-[#F5ECE4] text-[#7E6351] hover:text-[#3D2314] text-xs font-bold transition shadow-sm"
            title="Host Settings & Gallery"
          >
            <Lock className="w-4 h-4 text-[#D95D24]" />
            Host Setup
          </button>
        </div>
      </div>

      {/* Main Hero & Greeting */}
      <div className="flex flex-col items-center text-center my-auto max-w-4xl mx-auto w-full">
        {/* Script Title */}
        <h1 className="font-script text-6xl sm:text-7xl md:text-8xl text-[#4A2010] leading-none mb-3 drop-shadow-sm">
          Happy Friendsgiving
        </h1>
        <p className="text-xl sm:text-2xl font-medium text-[#7E6351] max-w-2xl mb-8">
          Tap a style below to strike a pose with friends and save your memory!
        </p>

        {/* If no templates are configured yet */}
        {!hasAnyTemplate ? (
          <div className="w-full max-w-xl bg-white/95 rounded-3xl p-8 border-2 border-[#E8D9CD] shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#3D2314] mb-2">No Templates Configured Yet</h2>
            <p className="text-base text-[#7E6351] mb-6">
              Host setup is needed to load or generate 1200x1800 photobooth templates before guests can take photos.
            </p>
            <button
              onClick={onOpenHostSetup}
              className="touch-btn w-full flex items-center justify-center gap-3 rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-xl shadow-lg transition transform active:scale-95"
            >
              <Sparkles className="w-6 h-6" />
              Configure Templates in Setup
            </button>
          </div>
        ) : (
          /* Template Selection Cards (Sized specifically for big touch targets on iPad) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Card 1: 2 Pose */}
            <div
              onClick={() => templateA && onSelectTemplate(templateA)}
              className={`relative rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between transition-all duration-200 border-3 ${
                templateA
                  ? 'bg-white/95 hover:bg-white border-[#E8D9CD] hover:border-[#D95D24] shadow-xl hover:shadow-2xl cursor-pointer group transform hover:-translate-y-1 active:scale-98'
                  : 'bg-white/60 border-dashed border-[#D5C2B4] opacity-75'
              }`}
            >
              {/* Badge */}
              <div className="w-full flex items-center justify-between mb-4">
                <span className="px-4 py-1.5 rounded-full bg-[#FAF3EC] text-[#8E2A18] font-bold text-sm uppercase tracking-wider">
                  Two Photos
                </span>
                <span className="text-xs font-semibold text-[#7E6351]">Classic Strip</span>
              </div>

              {/* Template Graphic Representation */}
              <div className="relative aspect-[2/3] w-48 sm:w-56 rounded-2xl overflow-hidden bg-[#FBF5EE] border-2 border-[#DFCFC2] shadow-md my-4 flex items-center justify-center group-hover:border-[#D95D24] transition">
                {templateA ? (
                  <div className="relative w-full h-full">
                    <img
                      src={templateA.dataUrl}
                      alt="2 Pose Preview"
                      className="w-full h-full object-contain"
                    />
                    {/* Simulated photo cutouts with soft camera icons */}
                    {templateA.slots.map((s, idx) => (
                      <div
                        key={idx}
                        className="absolute bg-[#3D2314]/10 border border-white/80 rounded flex items-center justify-center text-[10px] text-[#3D2314]/60 font-bold"
                        style={{
                          left: `${(s.x / 1200) * 100}%`,
                          top: `${(s.y / 1800) * 100}%`,
                          width: `${(s.width / 1200) * 100}%`,
                          height: `${(s.height / 1800) * 100}%`,
                        }}
                      >
                        Pose #{idx + 1}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-sm font-semibold text-[#7E6351]">Template Not Loaded</p>
                  </div>
                )}
              </div>

              <div className="w-full text-center mt-2 mb-4">
                <h3 className="text-3xl font-extrabold text-[#3D2314] group-hover:text-[#D95D24] transition">
                  2 Pose
                </h3>
                <p className="text-base text-[#7E6351] mt-1 font-medium">
                  Two photos arranged in a strip
                </p>
              </div>

              {/* Large touch button - minimum height 80px */}
              {templateA ? (
                <button
                  type="button"
                  className="touch-btn w-full rounded-2xl bg-[#D95D24] group-hover:bg-[#C24E1A] text-white font-extrabold text-2xl shadow-lg transition flex items-center justify-center gap-3"
                >
                  <Camera className="w-7 h-7" />
                  Choose 2 Pose
                  <ArrowRight className="w-6 h-6 ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenHostSetup}
                  className="touch-btn w-full rounded-2xl bg-[#EFE6DC] text-[#7E6351] font-bold text-lg"
                >
                  Load in Setup
                </button>
              )}
            </div>

            {/* Card 2: Single Pose */}
            <div
              onClick={() => templateB && onSelectTemplate(templateB)}
              className={`relative rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between transition-all duration-200 border-3 ${
                templateB
                  ? 'bg-white/95 hover:bg-white border-[#E8D9CD] hover:border-[#D95D24] shadow-xl hover:shadow-2xl cursor-pointer group transform hover:-translate-y-1 active:scale-98'
                  : 'bg-white/60 border-dashed border-[#D5C2B4] opacity-75'
              }`}
            >
              {/* Badge */}
              <div className="w-full flex items-center justify-between mb-4">
                <span className="px-4 py-1.5 rounded-full bg-[#FAF3EC] text-[#8E2A18] font-bold text-sm uppercase tracking-wider">
                  One Photo
                </span>
                <span className="text-xs font-semibold text-[#7E6351]">Full Portrait</span>
              </div>

              {/* Template Graphic Representation */}
              <div className="relative aspect-[2/3] w-48 sm:w-56 rounded-2xl overflow-hidden bg-[#FBF5EE] border-2 border-[#DFCFC2] shadow-md my-4 flex items-center justify-center group-hover:border-[#D95D24] transition">
                {templateB ? (
                  <div className="relative w-full h-full">
                    <img
                      src={templateB.dataUrl}
                      alt="Single Pose Preview"
                      className="w-full h-full object-contain"
                    />
                    {templateB.slots.map((s, idx) => (
                      <div
                        key={idx}
                        className="absolute bg-[#3D2314]/10 border border-white/80 rounded flex items-center justify-center text-[10px] text-[#3D2314]/60 font-bold"
                        style={{
                          left: `${(s.x / 1200) * 100}%`,
                          top: `${(s.y / 1800) * 100}%`,
                          width: `${(s.width / 1200) * 100}%`,
                          height: `${(s.height / 1800) * 100}%`,
                        }}
                      >
                        Single Pose
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-sm font-semibold text-[#7E6351]">Template Not Loaded</p>
                  </div>
                )}
              </div>

              <div className="w-full text-center mt-2 mb-4">
                <h3 className="text-3xl font-extrabold text-[#3D2314] group-hover:text-[#D95D24] transition">
                  Single Pose
                </h3>
                <p className="text-base text-[#7E6351] mt-1 font-medium">
                  One portrait photo
                </p>
              </div>

              {/* Large touch button - minimum height 80px */}
              {templateB ? (
                <button
                  type="button"
                  className="touch-btn w-full rounded-2xl bg-[#D95D24] group-hover:bg-[#C24E1A] text-white font-extrabold text-2xl shadow-lg transition flex items-center justify-center gap-3"
                >
                  <Camera className="w-7 h-7" />
                  Choose Single Pose
                  <ArrowRight className="w-6 h-6 ml-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenHostSetup}
                  className="touch-btn w-full rounded-2xl bg-[#EFE6DC] text-[#7E6351] font-bold text-lg"
                >
                  Load in Setup
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer reassurance */}
    </div>
  );
};
