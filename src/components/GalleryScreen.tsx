/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PhotoRecord } from '../types';
import { getAllPhotos, deletePhoto, clearAllPhotos } from '../services/db';
import JSZip from 'jszip';
import {
  ArrowLeft,
  Download,
  Trash2,
  Share2,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';

interface GalleryScreenProps {
  onBack: () => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onBack }) => {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadPhotos = async () => {
    const list = await getAllPhotos();
    setPhotos(list);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Save All Photos as a Zip archive
  const handleSaveAll = async () => {
    if (photos.length === 0) return;
    setIsZipping(true);

    try {
      if (photos.length === 1) {
        // Direct download for single photo
        const link = document.createElement('a');
        link.href = photos[0].dataUrl;
        link.download = `photobooth-${new Date(photos[0].timestamp).toISOString().slice(0, 10)}.png`;
        link.click();
        showToast('Downloaded photo.');
        setIsZipping(false);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder('friendsgiving-photos');

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        // Strip data:image/png;base64,
        const base64Data = p.dataUrl.split(',')[1];
        const dateStr = new Date(p.timestamp)
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        folder?.file(`photo-${i + 1}-${dateStr}.png`, base64Data, { base64: true });
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `friendsgiving-photobooth-all-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Exported all ${photos.length} photos in ZIP archive!`);
    } catch {
      showToast('Error exporting photos.');
    } finally {
      setIsZipping(false);
    }
  };

  // Delete All
  const handleConfirmDeleteAll = async () => {
    await clearAllPhotos();
    await loadPhotos();
    setShowDeleteAllModal(false);
    setSelectedPhoto(null);
    showToast('All photos have been deleted.');
  };

  // Delete Single
  const handleDeleteSingle = async (id: string) => {
    await deletePhoto(id);
    await loadPhotos();
    setSelectedPhoto(null);
    showToast('Photo deleted.');
  };

  // Share or Save Single Photo
  const handleShareSingle = async (photo: PhotoRecord) => {
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `photobooth-${photo.id}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Friendsgiving Photobooth',
        });
      } else {
        const link = document.createElement('a');
        link.href = photo.dataUrl;
        link.download = `photobooth-${photo.id}.png`;
        link.click();
      }
    } catch {
      const link = document.createElement('a');
      link.href = photo.dataUrl;
      link.download = `photobooth-${photo.id}.png`;
      link.click();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF3EC] text-[#3D2314] overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/90 border-b border-[#E8D9CD] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-[#D5C2B4] hover:bg-[#F5ECE4] font-semibold text-base transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#3D2314]">Host Photo Gallery</h1>
            <p className="text-sm text-[#7E6351]">
              {photos.length} captured memories safely stored on device.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {photos.length > 0 && (
            <>
              <button
                onClick={handleSaveAll}
                disabled={isZipping}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-base shadow-md transition"
              >
                <Download className="w-5 h-5" />
                {isZipping ? 'Creating ZIP...' : 'Save All (ZIP)'}
              </button>

              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-red-300 text-red-600 hover:bg-red-50 font-semibold text-base transition"
              >
                <Trash2 className="w-5 h-5" />
                Delete All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[#3D2314] text-[#FBF5EE] shadow-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#E68A28]" />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Gallery Content */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-3xl bg-[#EFE6DC] flex items-center justify-center text-[#7E6351] mb-4">
              <ImageIcon className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-[#3D2314] mb-2">No Photos Captured Yet</h2>
            <p className="text-base text-[#7E6351] max-w-md mb-6">
              Photos taken by guests during your Friendsgiving event will appear here automatically.
            </p>
            <button
              onClick={onBack}
              className="px-8 py-4 rounded-2xl bg-[#D95D24] hover:bg-[#C24E1A] text-white font-bold text-lg shadow-md transition"
            >
              Start Photobooth
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-white border-2 border-[#E8D9CD] shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1"
              >
                <img
                  src={photo.dataUrl}
                  alt="Captured photobooth frame"
                  className="w-full h-full object-cover"
                />

                {/* Bottom Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 text-white text-xs opacity-90 group-hover:opacity-100 transition">
                  <p className="font-semibold truncate">{photo.templateName}</p>
                  <div className="flex items-center gap-1 text-white/80 text-[11px] mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(photo.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative max-w-2xl w-full max-h-[92vh] flex flex-col items-center">
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Photo frame */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white max-h-[75vh] flex items-center justify-center bg-neutral-900">
              <img
                src={selectedPhoto.dataUrl}
                alt="Selected Photobooth"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {/* Modal Bottom Controls */}
            <div className="w-full mt-4 flex items-center justify-between bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl">
              <div>
                <p className="font-bold text-[#3D2314] text-base">{selectedPhoto.templateName}</p>
                <p className="text-xs text-[#7E6351]">
                  {new Date(selectedPhoto.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleShareSingle(selectedPhoto)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D95D24] text-white font-bold text-sm hover:bg-[#C24E1A] transition shadow"
                >
                  <Share2 className="w-4 h-4" />
                  Save / Share
                </button>
                <button
                  onClick={() => handleDeleteSingle(selectedPhoto.id)}
                  className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#E8D9CD]">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#3D2314] mb-2">Delete all captured photos?</h3>
            <p className="text-sm text-[#7E6351] mb-6">
              This will permanently delete all {photos.length} photos saved on this device. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#D5C2B4] font-semibold text-[#7E6351] hover:bg-[#F5ECE4] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
