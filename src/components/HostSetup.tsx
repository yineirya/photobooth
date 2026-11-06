/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhotoboothTemplate, TemplateType, AppSettings } from '../types';
import { saveTemplate, deleteTemplate, saveSettings } from '../services/db';
import { detectSlotsFromImage, getDefaultSlots } from '../services/slotDetector';
import { createFriendsgivingTemplate } from '../services/templateGenerator';
import { SlotEditor } from './SlotEditor';
import {
  Upload,
  Sparkles,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Settings,
  Images,
  Layers,
  Wand2
} from 'lucide-react';

interface HostSetupProps {
  templateA: PhotoboothTemplate | null;
  templateB: PhotoboothTemplate | null;
  settings: AppSettings;
  onRefreshTemplates: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExit: () => void;
  onOpenGallery: () => void;
}

export const HostSetup: React.FC<HostSetupProps> = ({
  templateA,
  templateB,
  settings,
  onRefreshTemplates,
  onUpdateSettings,
  onExit,
  onOpenGallery,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'settings'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<PhotoboothTemplate | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Settings form state
  const [pinInput, setPinInput] = useState<string>(settings.pin);
  const [resetTimerInput, setResetTimerInput] = useState<number>(settings.autoResetSeconds);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Handle PNG Upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    templateId: 'templateA' | 'templateB',
    templateType: TemplateType
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      showStatus('Please upload a PNG file with transparent photo windows.', 'error');
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: 'success', text: 'Reading image and scanning alpha channel...' });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        // Check image dimensions
        const img = new Image();
        img.src = dataUrl;
        img.onload = async () => {
          let finalDataUrl = dataUrl;

          // If dimensions aren't 1200x1800, scale to 1200x1800
          if (img.width !== 1200 || img.height !== 1800) {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 1800;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 1200, 1800);
              finalDataUrl = canvas.toDataURL('image/png');
            }
          }

          // Auto-detect slots
          const detection = await detectSlotsFromImage(finalDataUrl, templateType);

          const newTemplate: PhotoboothTemplate = {
            id: templateId,
            name: templateType === '2pose' ? '2 Pose Template' : 'Single Pose Template',
            type: templateType,
            dataUrl: finalDataUrl,
            width: 1200,
            height: 1800,
            slots: detection.slots,
            updatedAt: Date.now(),
          };

          await saveTemplate(newTemplate);
          await onRefreshTemplates();
          setIsProcessing(false);

          if (detection.detectedCount === 0) {
            showStatus(
              'No transparent slots found in template. Please draw slots manually in the Slot Editor.',
              'error'
            );
          } else {
            showStatus(
              `Uploaded successfully! ${detection.message}`,
              'success'
            );
          }
        };
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessing(false);
      showStatus('Failed to process image file.', 'error');
    }
  };

  // Generate Sample Friendsgiving Template
  const handleGenerateTemplate = async (templateType: TemplateType) => {
    setIsProcessing(true);
    try {
      const generated = await createFriendsgivingTemplate(templateType);
      await saveTemplate(generated);
      await onRefreshTemplates();
      setIsProcessing(false);
      showStatus(`Generated Friendsgiving ${templateType === '2pose' ? '2 Pose' : 'Single Pose'} template!`, 'success');
    } catch {
      setIsProcessing(false);
      showStatus('Failed to generate template.', 'error');
    }
  };

  // Load sample image from assets
  const handleLoadSampleAsset = async () => {
    setIsProcessing(true);
    try {
      const assetUrl = `${import.meta.env.BASE_URL}assets/aistudio/single-photo_db3713c2.png`.replace(/\/\//g, '/');
      const response = await fetch(assetUrl).catch(() => fetch('/assets/aistudio/single-photo_db3713c2.png'));
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const detection = await detectSlotsFromImage(dataUrl, 'single');
        const newTemplate: PhotoboothTemplate = {
          id: 'templateB',
          name: 'Friendsgiving Sample (Single Pose)',
          type: 'single',
          dataUrl,
          width: 1200,
          height: 1800,
          slots: detection.slots.length > 0 ? detection.slots : getDefaultSlots('single'),
          updatedAt: Date.now(),
        };
        await saveTemplate(newTemplate);
        await onRefreshTemplates();
        setIsProcessing(false);
        if (detection.detectedCount === 0) {
          showStatus('Loaded template. No transparent slots found in template image. Please draw slots manually in the Slot Editor.', 'error');
        } else {
          showStatus('Loaded sample Friendsgiving template.', 'success');
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsProcessing(false);
      showStatus('Failed to load sample image asset.', 'error');
    }
  };

  const handleDelete = async (id: 'templateA' | 'templateB') => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(id);
      await onRefreshTemplates();
      showStatus('Template deleted.', 'success');
    }
  };

  const handleSaveSlotEdits = async (updated: PhotoboothTemplate) => {
    await saveTemplate(updated);
    await onRefreshTemplates();
    setEditingTemplate(null);
    showStatus('Updated slot positions saved to device.', 'success');
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      showStatus('PIN must be exactly 4 digits.', 'error');
      return;
    }
    const newSettings: AppSettings = {
      pin: pinInput,
      autoResetSeconds: Math.max(10, Math.min(300, Number(resetTimerInput) || 60)),
    };
    await saveSettings(newSettings);
    onUpdateSettings(newSettings);
    showStatus('Settings saved successfully.', 'success');
  };

  // If currently editing slots, render SlotEditor full screen
  if (editingTemplate) {
    return (
      <SlotEditor
        template={editingTemplate}
        onSave={handleSaveSlotEdits}
        onCancel={() => setEditingTemplate(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF3EC] text-[#3D2314] overflow-y-auto">
      {/* Host Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/90 border-b border-[#E8D9CD] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D5C2B4] hover:bg-[#F5ECE4] font-medium text-base transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Exit Setup
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#3D2314]">Photobooth Setup & Administration</h1>
            <p className="text-sm text-[#7E6351]">
              Manage 1200x1800 PNG templates, window detection, and app settings.
            </p>
          </div>
        </div>

        {/* Tab & Gallery Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenGallery}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#D5C2B4] text-[#3D2314] hover:bg-[#F5ECE4] font-semibold text-sm transition shadow-sm"
          >
            <Images className="w-5 h-5 text-[#D95D24]" />
            Host Gallery
          </button>

          <div className="flex bg-[#EFE6DC] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'templates'
                  ? 'bg-white text-[#3D2314] shadow-sm'
                  : 'text-[#7E6351] hover:text-[#3D2314]'
              }`}
            >
              <Layers className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-white text-[#3D2314] shadow-sm'
                  : 'text-[#7E6351] hover:text-[#3D2314]'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mx-6 mt-4 p-4 rounded-2xl flex items-center gap-3 shadow-md transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          )}
          <span className="font-medium text-sm">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'templates' ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#3D2314]">Template Slots Configuration</h2>
                <p className="text-sm text-[#7E6351]">
                  Templates must be PNG images (1200 x 1800 px) with transparent window cutouts.
                </p>
              </div>

              {/* Starter helpers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSampleAsset}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D5C2B4] hover:bg-[#F5ECE4] text-xs font-semibold text-[#7E6351] transition"
                  title="Loads the uploaded sample image from assets"
                >
                  <Wand2 className="w-4 h-4 text-[#D95D24]" />
                  Load Sample Friendsgiving Image
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template A: 2 Pose */}
              <TemplateCard
                title="Template A: 2 Pose"
                badgeText="Two Photo Windows"
                template={templateA}
                expectedType="2pose"
                onUpload={(e) => handleFileUpload(e, 'templateA', '2pose')}
                onGenerate={() => handleGenerateTemplate('2pose')}
                onEditSlots={() => templateA && setEditingTemplate(templateA)}
                onDelete={() => handleDelete('templateA')}
              />

              {/* Template B: Single Pose */}
              <TemplateCard
                title="Template B: Single Pose"
                badgeText="One Photo Window"
                template={templateB}
                expectedType="single"
                onUpload={(e) => handleFileUpload(e, 'templateB', 'single')}
                onGenerate={() => handleGenerateTemplate('single')}
                onEditSlots={() => templateB && setEditingTemplate(templateB)}
                onDelete={() => handleDelete('templateB')}
              />
            </div>
          </div>
        ) : (
          /* Settings Tab */
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-[#E8D9CD] shadow-sm">
            <h2 className="text-2xl font-bold text-[#3D2314] mb-2">Host Preferences</h2>
            <p className="text-sm text-[#7E6351] mb-6">
              Configure PIN protection and guest kiosk timeouts.
            </p>

            <form onSubmit={handleSaveSettingsSubmit} className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold text-[#3D2314] mb-1">
                  Host Access PIN (4 digits)
                </label>
                <p className="text-xs text-[#7E6351] mb-2">
                  Protects Host Setup and Gallery from guest access.
                </p>
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-2xl tracking-widest px-4 py-3 rounded-xl border border-[#D5C2B4] focus:outline-none focus:ring-2 focus:ring-[#D95D24] bg-[#FBF5EE] text-[#3D2314]"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3D2314] mb-1">
                  Result Screen Inactivity Timeout (Seconds)
                </label>
                <p className="text-xs text-[#7E6351] mb-2">
                  Auto-returns to start screen after guests finish taking photos (Default: 60s).
                </p>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={resetTimerInput}
                  onChange={(e) => setResetTimerInput(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-[#D5C2B4] focus:outline-none focus:ring-2 focus:ring-[#D95D24] bg-[#FBF5EE] text-[#3D2314]"
                />
              </div>

              <button
                type="submit"
                className="mt-4 py-4 rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-lg shadow-md transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------- Template Card Subcomponent -----------------

interface TemplateCardProps {
  title: string;
  badgeText: string;
  template: PhotoboothTemplate | null;
  expectedType: TemplateType;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  onEditSlots: () => void;
  onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  title,
  badgeText,
  template,
  expectedType,
  onUpload,
  onGenerate,
  onEditSlots,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-[#E8D9CD] shadow-sm flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#3D2314]">{title}</h3>
            <span className="text-xs font-semibold text-[#D95D24] uppercase tracking-wider">
              {badgeText}
            </span>
          </div>

          {template && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </span>
          )}
        </div>

        {/* Thumbnail Preview Area */}
        <div className="relative aspect-[2/3] w-full max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-[#EFE6DC] border-2 border-[#DFCFC2] shadow-inner mb-6 flex items-center justify-center">
          {template ? (
            <div className="relative w-full h-full">
              <img
                src={template.dataUrl}
                alt={template.name}
                className="w-full h-full object-contain"
              />
              {/* Show gray placeholder boxes overlay */}
              {template.slots.map((slot, idx) => (
                <div
                  key={idx}
                  className="absolute bg-neutral-400/80 border-2 border-dashed border-neutral-600 flex items-center justify-center text-white text-xs font-bold"
                  style={{
                    left: `${(slot.x / 1200) * 100}%`,
                    top: `${(slot.y / 1800) * 100}%`,
                    width: `${(slot.width / 1200) * 100}%`,
                    height: `${(slot.height / 1800) * 100}%`,
                  }}
                >
                  Slot {idx + 1}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#D5C2B4]/40 flex items-center justify-center mb-3 text-[#7E6351]">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-[#3D2314] mb-1">No Template Uploaded</p>
              <p className="text-xs text-[#7E6351]">
                Upload 1200x1800 PNG with {expectedType === '2pose' ? 'two photo cutouts' : 'one photo cutout'}
              </p>
            </div>
          )}
        </div>

        {/* Template Metadata Info */}
        {template && (
          <div className="bg-[#FAF3EC] p-3.5 rounded-xl border border-[#E8D9CD] mb-6 flex justify-between items-center text-xs text-[#7E6351]">
            <div>
              <p className="font-semibold text-[#3D2314]">{template.name}</p>
              <p>Resolution: 1200 × 1800 px</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#D95D24]">{template.slots.length} Window(s) Configured</p>
              <p>Updated: {new Date(template.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-sm shadow cursor-pointer transition">
          <Upload className="w-5 h-5" />
          {template ? 'Replace with New PNG' : 'Upload Template PNG'}
          <input
            type="file"
            accept="image/png"
            className="hidden"
            onChange={onUpload}
          />
        </label>

        {template ? (
          <div className="flex gap-2">
            <button
              onClick={onEditSlots}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5ECE4] hover:bg-[#EBDDCF] text-[#3D2314] font-semibold text-sm border border-[#D5C2B4] transition"
            >
              <Edit className="w-4 h-4 text-[#D95D24]" />
              Adjust Slots
            </button>
            <button
              onClick={onDelete}
              className="p-3 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition"
              title="Delete template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-[#D5C2B4] hover:bg-[#F5ECE4] text-[#3D2314] font-semibold text-sm transition"
          >
            <Sparkles className="w-4 h-4 text-[#E68A28]" />
            Generate Starter Template
          </button>
        )}
      </div>
    </div>
  );
};
