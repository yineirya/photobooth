/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { PhotoboothTemplate, Slot } from '../types';
import { detectSlotsFromImage, getDefaultSlots } from '../services/slotDetector';
import { Check, RotateCcw, Sparkles, Eye, Edit3, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

interface SlotEditorProps {
  template: PhotoboothTemplate;
  onSave: (updatedTemplate: PhotoboothTemplate) => void;
  onCancel: () => void;
}

type DragMode =
  | { type: 'move'; slotIndex: number; startX: number; startY: number; origSlot: Slot }
  | { type: 'resize'; slotIndex: number; handle: string; startX: number; startY: number; origSlot: Slot }
  | null;

export const SlotEditor: React.FC<SlotEditorProps> = ({ template, onSave, onCancel }) => {
  const [slots, setSlots] = useState<Slot[]>(() => JSON.parse(JSON.stringify(template.slots)));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 400, height: 600 });
  const dragRef = useRef<DragMode>(null);

  // Measure container and update scale
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availW = rect.width;
      const availH = rect.height;

      // 1200:1800 aspect ratio = 2:3
      const targetRatio = 1200 / 1800;
      let w = availW;
      let h = w / targetRatio;

      if (h > availH) {
        h = availH;
        w = h * targetRatio;
      }

      setContainerSize({ width: Math.round(w), height: Math.round(h) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const scale = containerSize.width / 1200;

  // Handle Auto-detection
  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setDetectStatus('Scanning template alpha channel...');
    try {
      const result = await detectSlotsFromImage(template.dataUrl, template.type);
      setSlots(result.slots);
      setSelectedSlotIndex(0);
      setDetectStatus(result.message);
    } catch {
      setDetectStatus('Could not auto-detect transparency. Using defaults.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleReset = () => {
    setSlots(getDefaultSlots(template.type));
    setDetectStatus('Reset to standard default slot positions.');
  };

  const handleSave = () => {
    const updated: PhotoboothTemplate = {
      ...template,
      slots: slots.map((s, idx) => ({ ...s, id: idx + 1 })),
      updatedAt: Date.now(),
    };
    onSave(updated);
  };

  const addSlot = () => {
    if (slots.length >= 4) return;
    const newSlot: Slot = {
      id: slots.length + 1,
      x: 180,
      y: 200 + slots.length * 200,
      width: 840,
      height: 500,
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotIndex(slots.length);
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) return;
    const newSlots = slots.filter((_, i) => i !== index);
    setSlots(newSlots);
    setSelectedSlotIndex(Math.max(0, index - 1));
  };

  // Pointer drag and resize handlers
  const onPointerDownMove = (e: React.PointerEvent, slotIndex: number) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedSlotIndex(slotIndex);
    dragRef.current = {
      type: 'move',
      slotIndex,
      startX: e.clientX,
      startY: e.clientY,
      origSlot: { ...slots[slotIndex] },
    };
  };

  const onPointerDownResize = (e: React.PointerEvent, slotIndex: number, handle: string) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedSlotIndex(slotIndex);
    dragRef.current = {
      type: 'resize',
      slotIndex,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origSlot: { ...slots[slotIndex] },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || scale <= 0) return;
    const { type, slotIndex, startX, startY, origSlot } = dragRef.current;

    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;

    const updated = [...slots];
    const s = { ...origSlot };

    if (type === 'move') {
      s.x = Math.max(0, Math.min(1200 - s.width, Math.round(origSlot.x + dx)));
      s.y = Math.max(0, Math.min(1800 - s.height, Math.round(origSlot.y + dy)));
    } else if (type === 'resize') {
      const handle = dragRef.current.handle;
      const minSize = 150;

      if (handle.includes('e')) {
        s.width = Math.max(minSize, Math.min(1200 - origSlot.x, Math.round(origSlot.width + dx)));
      }
      if (handle.includes('s')) {
        s.height = Math.max(minSize, Math.min(1800 - origSlot.y, Math.round(origSlot.height + dy)));
      }
      if (handle.includes('w')) {
        const potentialW = origSlot.width - dx;
        if (potentialW >= minSize && origSlot.x + dx >= 0) {
          s.x = Math.round(origSlot.x + dx);
          s.width = Math.round(potentialW);
        }
      }
      if (handle.includes('n')) {
        const potentialH = origSlot.height - dy;
        if (potentialH >= minSize && origSlot.y + dy >= 0) {
          s.y = Math.round(origSlot.y + dy);
          s.height = Math.round(potentialH);
        }
      }
    }

    updated[slotIndex] = s;
    setSlots(updated);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch if pointer was not explicitly captured
      }
      dragRef.current = null;
    }
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-[#FAF3EC] select-none text-[#3D2314]"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 border-b border-[#E8D9CD] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D5C2B4] hover:bg-[#F5ECE4] font-medium text-base transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#3D2314] flex items-center gap-2">
              Slot Placement: <span className="text-[#D95D24]">{template.name}</span>
            </h2>
            <p className="text-sm text-[#7E6351]">
              Drag and resize rectangular windows over photo cutouts.
            </p>
          </div>
        </div>

        {/* View Mode & Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-base transition shadow-sm ${
              previewMode
                ? 'bg-[#3D2314] text-[#FBF5EE]'
                : 'bg-white border border-[#D5C2B4] text-[#3D2314] hover:bg-[#F5ECE4]'
            }`}
          >
            {previewMode ? <Edit3 className="w-5 h-5" /> : <Eye className="w-5 h-5 text-[#D95D24]" />}
            {previewMode ? 'Edit Mode' : 'Live Preview'}
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-base shadow-md transition"
          >
            <Check className="w-5 h-5" />
            Save Slots
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Canvas Display Viewport */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center relative rounded-2xl bg-[#EFE6DC] border border-[#DFCFC2] overflow-hidden p-2"
        >
          <div
            className="relative shadow-2xl bg-white select-none overflow-hidden"
            style={{
              width: `${containerSize.width}px`,
              height: `${containerSize.height}px`,
            }}
          >
            {/* Background Template PNG */}
            <img
              src={template.dataUrl}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {/* In Live Preview mode: render gray placeholder boxes into each slot */}
            {previewMode &&
              slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="absolute bg-neutral-300/90 border-2 border-dashed border-neutral-500 flex flex-col items-center justify-center p-3 text-neutral-700 font-bold transition-all shadow-inner"
                  style={{
                    left: `${slot.x * scale}px`,
                    top: `${slot.y * scale}px`,
                    width: `${slot.width * scale}px`,
                    height: `${slot.height * scale}px`,
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center mb-1 shadow-sm">
                    <Eye className="w-6 h-6 text-neutral-600" />
                  </div>
                  <span className="text-sm font-semibold tracking-wide">
                    Photo Slot #{idx + 1}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono mt-0.5">
                    {slot.width} × {slot.height} px
                  </span>
                </div>
              ))}

            {/* In Edit mode: render interactive editable boxes with handles */}
            {!previewMode &&
              slots.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                const left = slot.x * scale;
                const top = slot.y * scale;
                const width = slot.width * scale;
                const height = slot.height * scale;

                return (
                  <div
                    key={idx}
                    onPointerDown={(e) => onPointerDownMove(e, idx)}
                    className={`absolute cursor-move transition-shadow ${
                      isSelected
                        ? 'border-3 border-[#D95D24] bg-[#D95D24]/25 shadow-lg ring-4 ring-[#D95D24]/20'
                        : 'border-2 border-[#8E2A18] bg-[#8E2A18]/15 hover:bg-[#8E2A18]/25'
                    }`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    {/* Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#3D2314] text-white text-xs font-bold shadow pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-[#E68A28]" />
                      Slot #{idx + 1}
                    </div>

                    {/* Dimensions Pill */}
                    <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded bg-black/75 text-white text-[11px] font-mono pointer-events-none">
                      {slot.width} × {slot.height}
                    </div>

                    {/* Resize Handles (8 directions) */}
                    {isSelected && (
                      <>
                        {/* Corners */}
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'nw')}
                          className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-white border-3 border-[#D95D24] shadow cursor-nwse-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'ne')}
                          className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border-3 border-[#D95D24] shadow cursor-nesw-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'sw')}
                          className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-white border-3 border-[#D95D24] shadow cursor-nesw-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'se')}
                          className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-white border-3 border-[#D95D24] shadow cursor-nwse-resize"
                        />

                        {/* Midpoints */}
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'n')}
                          className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-4 rounded-md bg-white border-2 border-[#D95D24] shadow cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 's')}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-4 rounded-md bg-white border-2 border-[#D95D24] shadow cursor-ns-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'w')}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 h-7 w-4 rounded-md bg-white border-2 border-[#D95D24] shadow cursor-ew-resize"
                        />
                        <div
                          onPointerDown={(e) => onPointerDownResize(e, idx, 'e')}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 h-7 w-4 rounded-md bg-white border-2 border-[#D95D24] shadow cursor-ew-resize"
                        />
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-96 flex flex-col gap-4 bg-white/90 rounded-2xl p-5 border border-[#E8D9CD] shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-[#3D2314] mb-1">Window Controls</h3>
            <p className="text-xs text-[#7E6351]">
              Auto-detect transparent cutouts or adjust slots manually.
            </p>
          </div>

          {/* Auto-detect button */}
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#F5ECE4] hover:bg-[#EBDDCF] text-[#3D2314] font-semibold text-sm transition border border-[#D5C2B4]"
          >
            <Sparkles className="w-5 h-5 text-[#D95D24]" />
            {isDetecting ? 'Scanning Alpha Channel...' : 'Auto-Detect Transparent Windows'}
          </button>

          {detectStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                detectStatus.includes('No transparent')
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                  : 'bg-[#FBF5EE] border-[#E8D9CD] text-[#7E6351]'
              }`}
            >
              {detectStatus.includes('No transparent') && (
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              )}
              <span>{detectStatus}</span>
            </div>
          )}

          {/* Slots List */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-60">
            <span className="text-xs font-bold text-[#7E6351] uppercase tracking-wider">
              Configured Windows ({slots.length})
            </span>
            {slots.map((slot, idx) => {
              const isSelected = selectedSlotIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#FBF5EE] border-[#D95D24] ring-2 ring-[#D95D24]/20'
                      : 'bg-white border-[#E8D9CD] hover:border-[#D5C2B4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-[#D95D24] text-white' : 'bg-[#EFE6DC] text-[#3D2314]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#3D2314]">Window {idx + 1}</p>
                      <p className="text-[11px] text-[#7E6351] font-mono">
                        {slot.width} × {slot.height} px (at {slot.x}, {slot.y})
                      </p>
                    </div>
                  </div>

                  {slots.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSlot(idx);
                      }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                      title="Remove slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons at bottom */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8D9CD]">
            {slots.length < 3 && (
              <button
                onClick={addSlot}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#D5C2B4] hover:bg-[#F5ECE4] text-sm font-medium text-[#7E6351] transition"
              >
                <Plus className="w-4 h-4" />
                Add Extra Window
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#D5C2B4] hover:bg-[#F5ECE4] text-sm font-medium text-[#7E6351] transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
