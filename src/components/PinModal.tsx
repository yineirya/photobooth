/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, X, Delete } from 'lucide-react';

interface PinModalProps {
  expectedPin: string;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  expectedPin,
  title = 'Host Access',
  subtitle = 'Enter 4-digit host PIN (Default: 1234)',
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorShake, setErrorShake] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin === expectedPin) {
        setTimeout(() => {
          onSuccess();
        }, 150);
      } else {
        // Shake error
        setErrorShake(true);
        setTimeout(() => {
          setErrorShake(false);
          setPin('');
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-sm rounded-3xl bg-[#FBF5EE] border-2 border-[#E8D9CD] p-6 shadow-2xl flex flex-col items-center ${
          errorShake ? 'animate-bounce text-red-500' : ''
        }`}
      >
        {/* Header */}
        <div className="w-full flex justify-end">
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-[#7E6351] hover:bg-[#EFE6DC] transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-[#D95D24]/15 flex items-center justify-center text-[#D95D24] mb-3">
          <Lock className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-bold text-[#3D2314]">{title}</h3>
        <p className="text-sm text-[#7E6351] text-center mt-1 mb-6">{subtitle}</p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#D95D24] border-[#D95D24] scale-110'
                    : 'border-[#CBB9AC] bg-white'
                }`}
              />
            );
          })}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl bg-white border border-[#E8D9CD] shadow-sm text-2xl font-bold text-[#3D2314] active:bg-[#F5ECE4] transition flex items-center justify-center"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-16 rounded-2xl bg-[#F5ECE4] text-xs font-bold text-[#7E6351] uppercase tracking-wider active:bg-[#EBDDCF] transition flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-white border border-[#E8D9CD] shadow-sm text-2xl font-bold text-[#3D2314] active:bg-[#F5ECE4] transition flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-[#F5ECE4] text-[#7E6351] active:bg-[#EBDDCF] transition flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
